from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from schemas import ExerciseTarget, SessionPayload, ProviderMessage

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
    """
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

def generate_gemini_report(payload: SessionPayload) -> str:
    """
    Placeholder function to generate an AI summary string using the Gemini API.
    TODO: Connect the real Gemini API here to generate future improvements report.
    """
    summary = (
        f"Mock AI Summary:\n"
        f"Patient {payload.patient_id} attempted {payload.total_reps_attempted} reps "
        f"({payload.perfect_reps} perfect, {payload.shallow_reps} shallow). "
        f"Reported pain level: {payload.pain_level}/10.\n"
        f"Quiz response: '{payload.quiz_answers}'."
    )
    return summary

@app.post("/api/sessions")
async def process_session(payload: SessionPayload):
    """
    Receives the SessionPayload, prints it, and returns a mock AI summary.
    """
    # Print the received payload to the console
    print(f"Received SessionPayload: {payload.model_dump()}")
    
    # Generate mock report
    report = generate_gemini_report(payload)
    
    return {"status": "success", "report": report}

@app.post("/api/messages")
async def send_message(payload: ProviderMessage):
    """
    Receives the ProviderMessage payload, prints it, and returns a success status.
    """
    # Print the received payload to the console
    print(f"Received ProviderMessage: {payload.model_dump()}")
    
    return {"status": "success", "message": "Message received"}
