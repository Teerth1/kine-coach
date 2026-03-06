from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
import json

from schemas import (
    ExerciseTarget, SessionPayload, ProviderMessage, 
    UserCreate, UserResponse, Token, 
    WorkoutAssignmentCreate, WorkoutAssignmentResponse
)
import models
import crud
import auth
from database import engine, get_db

# Create all database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Kine-Coach API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AUTH ROUTES ---

@app.post("/signup", response_model=UserResponse)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# --- WORKOUT ASSIGNMENT ROUTES ---

@app.post("/api/workouts/assign", response_model=WorkoutAssignmentResponse)
def assign_workout(
    assignment: WorkoutAssignmentCreate, 
    db: Session = Depends(get_db),
    current_provider: models.User = Depends(auth.get_current_provider)
):
    """
    Ticket 2.4: Build a 'Workout Assignments API'
    Provider pushes Daily Chores to patient's app.
    """
    new_assignment = models.WorkoutAssignment(
        provider_id=current_provider.id,
        patient_id=assignment.patient_id,
        exercise_id=assignment.exercise_id,
        target_angles_json=json.dumps(assignment.target_angles)
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    return new_assignment

@app.get("/api/workouts/me", response_model=list[WorkoutAssignmentResponse])
def get_my_workouts(
    db: Session = Depends(get_db),
    current_patient: models.User = Depends(auth.get_current_patient)
):
    """
    Ticket 2.4: Patient fetches their assigned Daily Chores.
    """
    assignments = db.query(models.WorkoutAssignment).filter(
        models.WorkoutAssignment.patient_id == current_patient.id
    ).all()
    return assignments

# --- EXISTING ROUTES (Migrated & Protected) ---

@app.get("/api/exercises/{exercise_id}", response_model=ExerciseTarget)
async def get_exercise_target(exercise_id: int):
    if exercise_id != 1:
        raise HTTPException(status_code=404, detail="Exercise not found")
    dummy_data = {
        "exercise_id": exercise_id,
        "name": "Squat",
        "target_angles": {
            "knee": "< 90",
            "hip": "< 100"
        }
    }
    return dummy_data

from google import genai
import os
from dotenv import load_dotenv

load_dotenv()
client_key = os.environ.get("GEMINI_API_KEY", "")
client = genai.Client(api_key=client_key) if client_key and client_key != "INSERT_YOUR_GEMINI_API_KEY_HERE" else None

async def generate_gemini_report(payload: SessionPayload) -> str:
    if client is None:
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
        f"Keep the tone professional."
    )
    try:
        response = await client.aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return response.text
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return "Warning: Gemini API Error occurred. Mock report fallback."

@app.post("/api/sessions")
async def process_session(
    payload: SessionPayload,
    db: Session = Depends(get_db),
    current_patient: models.User = Depends(auth.get_current_patient) # Only patients submit sessions
):
    print(f"Received SessionPayload: {payload.model_dump()}")
    crud.save_session(db, payload)
    report = await generate_gemini_report(payload)
    return {"status": "success", "report": report}

@app.post("/api/messages")
async def send_message(
    payload: ProviderMessage,
    db: Session = Depends(get_db),
    current_provider: models.User = Depends(auth.get_current_provider) # Only providers send messages
):
    print(f"Received ProviderMessage: {payload.model_dump()}")
    crud.save_message(db, payload)
    return {"status": "success", "message": "Message received"}

@app.get("/api/sessions/{patient_id}")
async def fetch_patient_sessions(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user) # Provider checking patient OR patient checking self
):
    if current_user.role == "patient" and current_user.id != patient_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot view other patient logs")
        
    sessions = crud.get_patient_sessions(db, patient_id)
    return sessions
