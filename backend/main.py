from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from schemas import ExerciseTarget, SessionPayload, ProviderMessage
import database as db

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
