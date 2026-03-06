import os
import asyncio
import logging
from typing import List
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.security import OAuth2PasswordRequestForm
from google import genai
from datetime import datetime
from fpdf import FPDF
from auth import create_access_token, get_current_user, verify_password, get_password_hash
from schemas import ExerciseTarget, SessionPayload, ProviderMessage, AssignmentCreate, AssignmentStatusUpdate, UserCreate, Token
import database as db

# Load environment variables from .env
load_dotenv()

logger = logging.getLogger("kine-coach")

app = FastAPI(title="Kine-Coach API")

@app.on_event("startup")
async def seed_demo_users():
    """Seed demo users on startup if they don't already exist."""
    demo_users = [
        {"email": "patient@kine.coach", "password": "demo1234", "role": "patient", "id": 101},
        {"email": "provider@kine.coach", "password": "demo1234", "role": "provider", "id": 201},
    ]
    for demo in demo_users:
        existing = db.get_user_by_email(demo["email"])
        if not existing:
            hashed = get_password_hash(demo["password"])
            db.create_user({"email": demo["email"], "password": hashed, "role": demo["role"]})

# Configure CORS to allow all origins as requested
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/auth/register", response_model=dict)
async def register(user: UserCreate):
    existing = db.get_user_by_email(user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = get_password_hash(user.password)
    new_user = db.create_user({"email": user.email, "password": hashed, "role": user.role})
    return {"status": "success", "user": new_user}

@app.post("/api/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.get_user_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user["email"], "role": user["role"], "id": user["id"]})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/exercises", response_model=List[ExerciseTarget])
async def get_all_exercises(category: str = None):
    """
    Returns the list of all supported dynamic exercises configuration and angles.
    Optionally filter by category (e.g., ?category=lower_body).
    """
    exercises = db.get_exercises()
    if category:
        exercises = [e for e in exercises if e.get("category") == category]
    return exercises

@app.get("/api/exercises/{exercise_id}", response_model=ExerciseTarget)
async def get_exercise_target(exercise_id: int):
    """
    Returns target angle requirements for the CV.
    """
    exercise = db.get_exercise(exercise_id)
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return exercise

# Initialize Gemini Client
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# Gemini model configuration with fallback chain
GEMINI_MODEL_PRIMARY = os.environ.get("GEMINI_MODEL_PRIMARY", "gemini-2.5-flash")
GEMINI_MODEL_FALLBACK = os.environ.get("GEMINI_MODEL_FALLBACK", "gemini-2.0-flash")

async def generate_gemini_report(payload: SessionPayload) -> dict:
    """
    Uses the Gemini API with retry + model fallback chain.
    Returns dict with either {"status": "success", "report": "..."}
    or {"status": "report_pending", "message": "..."}
    """
    if not os.environ.get("GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY") == "your_gemini_api_key_here":
        return {"status": "success", "report": "Warning: GEMINI_API_KEY not set. This is a fallback mock report."}

    prompt = (
        f"You are a clinical AI assistant for a physical therapy app called Kine-Coach.\n"
        f"A patient just finished their session. Please write a short (2-3 sentences max) "
        f"clinical 'future improvements' report for their provider.\n\n"
        f"Patient Data:\n"
        f"- Total Reps Attempted: {payload.total_reps_attempted}\n"
        f"- Perfect Reps: {payload.perfect_reps}\n"
        f"- Shallow Reps: {payload.shallow_reps}\n"
        f"- Fatigue Data (Time per rep in sec): {payload.fatigue_data}\n"
        f"- Pain Level (0-10): {payload.pain_level}\n"
        f"- Patient Quiz Feedback: '{payload.quiz_answers}'\n\n"
        f"Keep the tone professional, objective, and actionable for a physical therapist."
    )

    models = [GEMINI_MODEL_PRIMARY, GEMINI_MODEL_FALLBACK]

    for model_name in models:
        delay = 5
        for attempt in range(3):
            try:
                logger.info(f"Gemini attempt {attempt+1}/3 with model {model_name}")
                response = await asyncio.wait_for(
                    client.aio.models.generate_content(model=model_name, contents=prompt),
                    timeout=30.0
                )
                return {"status": "success", "report": response.text}
            except asyncio.TimeoutError:
                logger.warning(f"Gemini timeout on attempt {attempt+1} with model {model_name}")
            except Exception as e:
                error_str = str(e)
                logger.warning(f"Gemini error on attempt {attempt+1} with model {model_name}: {error_str}")
                if "503" in error_str or "CAPACITY" in error_str.upper():
                    if attempt < 2:
                        await asyncio.sleep(min(delay, 60))
                        delay *= 2
                    continue
                # Non-capacity error, try next model
                break

    return {
        "status": "report_pending",
        "message": "AI report generation is temporarily unavailable. Your session data has been saved and the report will be generated automatically when capacity is available."
    }

@app.post("/api/sessions")
async def process_session(payload: SessionPayload, current_user: dict = Depends(get_current_user)):
    """
    Receives the SessionPayload, prints it, and returns the Gemini AI summary.
    """
    if current_user["role"] != "patient" or current_user["id"] != payload.patient_id:
        raise HTTPException(status_code=403, detail="Not authorized to post telemetry for this patient")

    if payload.exercise_id is not None:
        exercise = db.get_exercise(payload.exercise_id)
        if not exercise:
            raise HTTPException(status_code=400, detail=f"Exercise with id {payload.exercise_id} does not exist")

    # Hand off to Database Engineer's layer
    db.save_session(payload.model_dump())

    # Generate the actual Gemini report
    report_result = await generate_gemini_report(payload)

    return {"status": "success", **report_result}

@app.post("/api/messages")
async def send_message(payload: ProviderMessage, current_user: dict = Depends(get_current_user)):
    """
    Receives the ProviderMessage payload, prints it, and returns a success status.
    """
    if current_user["role"] != "provider":
        raise HTTPException(status_code=403, detail="Only providers can send messages")
    # Hand off to Database Engineer's layer
    db.save_message(payload.model_dump())
    
    return {"status": "success", "message": "Message received"}

@app.get("/api/sessions/{patient_id}")
async def fetch_patient_sessions(patient_id: int, current_user: dict = Depends(get_current_user)):
    """
    Returns an array of historical workout sessions for the dashboard chart.
    """
    if current_user["role"] == "patient" and current_user["id"] != patient_id:
        raise HTTPException(status_code=403, detail="Cannot view other patients' data")
    sessions = db.get_patient_sessions(patient_id)
    if not sessions:
        # Return an empty list instead of a 404 so the UI can gracefully show "No Data"
        return []
        
    return sessions

@app.get("/api/sessions/{patient_id}/pdf")
async def generate_pdf_summary(patient_id: int, current_user: dict = Depends(get_current_user)):
    """
    Generates a printable PDF medical summary for insurance providers.
    """
    sessions = db.get_patient_sessions(patient_id)
    if not sessions:
        raise HTTPException(status_code=404, detail="No sessions found for this patient.")
        
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(200, 10, txt=f"Medical Summary Report - Patient {patient_id}", ln=True, align="C")
    
    pdf.set_font("Arial", size=12)
    pdf.ln(10)
    
    total_reps = sum(s.get("total_reps_attempted", 0) for s in sessions)
    avg_score = sum(s.get("adherence_score", 0) for s in sessions) / len(sessions)
    
    pdf.cell(200, 10, txt=f"Total Sessions: {len(sessions)}", ln=True)
    pdf.cell(200, 10, txt=f"Total Reps Attempted All-Time: {total_reps}", ln=True)
    pdf.cell(200, 10, txt=f"Average Adherence Score: {avg_score:.2f}%", ln=True)
    pdf.ln(10)
    
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(200, 10, txt="Session History (Last 5):", ln=True)
    pdf.set_font("Arial", size=12)
    
    for s in sessions[-5:]: # Last 5 sessions
        date = s.get("timestamp", "Unknown Date")[:10]
        score = s.get("adherence_score", 0)
        reps = s.get("total_reps_attempted", 0)
        pain = s.get("pain_level", 0)
        pdf.cell(200, 10, txt=f"- Date: {date} | Score: {score}% | Reps: {reps} | Pain: {pain}/10", ln=True)
        
    pdf.ln(20)
    pdf.set_font("Arial", 'I', 10)
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    pdf.cell(200, 10, txt=f"Report Generated: {current_time}", ln=True)
    pdf.ln(10)
    pdf.line(10, pdf.get_y(), 100, pdf.get_y())
    pdf.ln(2)
    pdf.cell(200, 10, txt="Physical Therapist Signature", ln=True)
    
    pdf_content = pdf.output(dest='S').encode('latin1')
    
    return Response(content=pdf_content, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=patient_{patient_id}_summary.pdf"})


@app.post("/api/assignments")
async def create_assignment(payload: AssignmentCreate, current_user: dict = Depends(get_current_user)):
    """
    Creates a new daily chore assignment for a patient.
    """
    if current_user["role"] != "provider":
        raise HTTPException(status_code=403, detail="Only providers can create assignments")
    assignment = db.create_assignment(payload.model_dump())
    return {"status": "success", "assignment": assignment}

@app.get("/api/assignments/{patient_id}")
async def fetch_patient_assignments(patient_id: int, current_user: dict = Depends(get_current_user)):
    """
    Fetches all daily chore assignments for a patient.
    """
    if current_user["role"] == "patient" and current_user["id"] != patient_id:
        raise HTTPException(status_code=403, detail="Cannot view other patients' data")
    assignments = db.get_patient_assignments(patient_id)
    return assignments

@app.post("/api/assignments/{assignment_id}/status")
async def update_assignment_status(assignment_id: int, payload: AssignmentStatusUpdate, current_user: dict = Depends(get_current_user)):
    """
    Updates the completion status of a specific assignment.
    """
    success = db.update_assignment_status(assignment_id, payload.status)
    if not success:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"status": "success"}

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
