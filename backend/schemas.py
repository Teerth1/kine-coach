from pydantic import BaseModel, Field
from typing import List, Dict, Any

class ExerciseTarget(BaseModel):
    exercise_id: int = Field(..., description="Unique identifier for the exercise")
    name: str = Field(..., description="Name of the exercise")
    target_angles: Dict[str, Any] = Field(..., description="Target angles, e.g., {'knee': '< 90', 'hip': '< 100'}")

class SessionPayload(BaseModel):
    patient_id: int = Field(..., description="ID of the patient")
    total_reps_attempted: int = Field(..., description="Total reps attempted during the session")
    perfect_reps: int = Field(..., description="Number of perfect reps")
    shallow_reps: int = Field(..., description="Number of shallow reps")
    fatigue_data: List[float] = Field(..., description="Array of time per rep in seconds")
    pain_level: int = Field(..., ge=0, le=10, description="Pain level reported by the patient (0-10)")
    quiz_answers: str = Field(..., description="Answers to the end-of-session quiz")

class ProviderMessage(BaseModel):
    provider_id: int = Field(..., description="ID of the provider sending the message")
    patient_id: int = Field(..., description="ID of the patient receiving the message")
    message_body: str = Field(..., description="Content of the message")
