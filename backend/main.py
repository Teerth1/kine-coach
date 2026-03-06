from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from schemas import ExerciseTarget, SessionPayload, ProviderMessage, AssignmentCreate, AssignmentStatusUpdate
import database as db
from fpdf import FPDF

app = FastAPI(title="Kine-Coach API")

# Configure CORS to allow all origins as requested
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/exercises/{exercise_id}", response_model=ExerciseTarget)
async def get_exercise_target(exercise_id: int):
    """
    Returns dummy target angle data to inject into the frontend AI.
    Throws a 404 error if the exercise ID is not found.
    """
    # For now, we only have dummy data for exercise_id 1 (Squat)
    if exercise_id != 1:
        print(f"Error: Exercise {exercise_id} not found.")
        raise HTTPException(status_code=404, detail="Exercise not found")
        
    dummy_data = {
        "exercise_id": exercise_id,
        "name": "Squat",
        "target_angles": {
            "knee": "< 90",
            "hip": "< 100"
        }
    }
    print(f"Returning dummy data for exercise_id: {exercise_id}")
    return dummy_data

from google import genai
import os
from dotenv import load_dotenv
from fastapi import HTTPException

# Load environment variables from .env
load_dotenv()

# Initialize Gemini Client
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

async def generate_gemini_report(payload: SessionPayload) -> str:
    """
    Uses the Gemini API to generate a clinical 'future improvements' report.
    """
    if not os.environ.get("GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY") == "INSERT_YOUR_GEMINI_API_KEY_HERE":
         return "Warning: GEMINI_API_KEY not set. This is a fallback mock report."
         
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
    
    try:
        # Use gemini-2.5-flash as requested, fully async!
        response = await client.aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return response.text
    except Exception as e:
        print(f"Gemini API Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate AI report.")

@app.post("/api/sessions")
async def process_session(payload: SessionPayload):
    """
    Receives the SessionPayload, prints it, and returns the Gemini AI summary.
    """
    # Print the received payload to the console
    print(f"Received SessionPayload: {payload.model_dump()}")
    
    # Hand off to Database Engineer's layer
    db.save_session(payload.model_dump())
    
    # Generate the actual Gemini report
    report = await generate_gemini_report(payload)
    
    return {"status": "success", "report": report}

@app.post("/api/messages")
async def send_message(payload: ProviderMessage):
    """
    Receives the ProviderMessage payload, prints it, and returns a success status.
    """
    # Print the received payload to the console
    print(f"Received ProviderMessage: {payload.model_dump()}")
    
    # Hand off to Database Engineer's layer
    db.save_message(payload.model_dump())
    
    return {"status": "success", "message": "Message received"}

@app.get("/api/sessions/{patient_id}")
async def fetch_patient_sessions(patient_id: int):
    """
    Returns an array of historical workout sessions for the dashboard chart.
    """
    sessions = db.get_patient_sessions(patient_id)
    if not sessions:
        # Return an empty list instead of a 404 so the UI can gracefully show "No Data"
        return []
        
    return sessions

@app.get("/api/sessions/{patient_id}/pdf")
async def generate_pdf_summary(patient_id: int):
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
    from datetime import datetime
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    pdf.cell(200, 10, txt=f"Report Generated: {current_time}", ln=True)
    pdf.ln(10)
    pdf.line(10, pdf.get_y(), 100, pdf.get_y())
    pdf.ln(2)
    pdf.cell(200, 10, txt="Physical Therapist Signature", ln=True)
    
    pdf_content = pdf.output(dest='S').encode('latin1')
    
    return Response(content=pdf_content, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=patient_{patient_id}_summary.pdf"})


@app.post("/api/assignments")
async def create_assignment(payload: AssignmentCreate):
    """
    Creates a new daily chore assignment for a patient.
    """
    assignment = db.create_assignment(payload.model_dump())
    return {"status": "success", "assignment": assignment}

@app.get("/api/assignments/{patient_id}")
async def fetch_patient_assignments(patient_id: int):
    """
    Fetches all daily chore assignments for a patient.
    """
    assignments = db.get_patient_assignments(patient_id)
    return assignments

@app.post("/api/assignments/{assignment_id}/status")
async def update_assignment_status(assignment_id: int, payload: AssignmentStatusUpdate):
    """
    Updates the completion status of a specific assignment.
    """
    success = db.update_assignment_status(assignment_id, payload.status)
    if not success:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"status": "success"}
