from pydantic import BaseModel, Field, EmailStr
from typing import List, Dict, Any, Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str = Field(..., description="'patient' or 'provider'")

class UserResponse(BaseModel):
    id: int
    email: str
    role: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    id: Optional[int] = None

class ExerciseTarget(BaseModel):
    id: int = Field(..., description="Unique identifier for the exercise")
    name: str = Field(..., description="Name of the exercise")
    description: str = Field(..., description="Description of the exercise")
    target_muscles: List[str] = Field(..., description="Target muscles")
    angle_requirements: Dict[str, Any] = Field(..., description="Target angle parameters for the CV model")
    default_rep_target: int = Field(..., description="Default reps to perform")

class SessionPayload(BaseModel):
    patient_id: int = Field(..., description="ID of the patient")
    exercise_id: Optional[int] = Field(None, description="ID of the exercise performed")
    total_reps_attempted: int = Field(..., description="Total reps attempted during the session")
    perfect_reps: int = Field(..., description="Number of perfect reps")
    shallow_reps: int = Field(..., description="Number of shallow reps")
    fatigue_data: List[float] = Field(..., description="Array of time per rep in seconds")
    rom_data: List[float] = Field(..., description="Array of lowest knee angles per rep")
    pain_level: int = Field(..., ge=0, le=10, description="Pain level reported by the patient (0-10)")
    quiz_answers: str = Field(..., description="Answers to the end-of-session quiz")

class ProviderMessage(BaseModel):
    provider_id: int = Field(..., description="ID of the provider sending the message")
    patient_id: int = Field(..., description="ID of the patient receiving the message")
    message_body: str = Field(..., description="Content of the message")

class AssignmentCreate(BaseModel):
    patient_id: int = Field(..., description="ID of the patient receiving the assignment")
    provider_id: int = Field(..., description="ID of the provider creating the assignment")
    exercise_id: int = Field(..., description="ID of the assigned exercise")
    exercise_name: str = Field(..., description="Name of the assigned exercise")
    target_reps: int = Field(..., description="Number of reps the patient needs to complete")

class AssignmentStatusUpdate(BaseModel):
    status: str = Field(..., description="Status of the assignment (e.g., 'completed')")
