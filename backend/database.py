import json
import os
from datetime import datetime
from typing import Dict, Any

DB_PATH = os.path.join(os.path.dirname(__file__), "mock_db.json")

def _load_db() -> Dict[str, Any]:
    """Helper to load the JSON database."""
    try:
        if not os.path.exists(DB_PATH):
            return {"patients": [], "prescribed_exercises": [], "session_logs": [], "messages": []}
            
        with open(DB_PATH, "r") as f:
            return json.load(f)
    except json.JSONDecodeError:
        print("Warning: Failed to decode mock database. Returning empty schema.")
        return {"patients": [], "prescribed_exercises": [], "session_logs": [], "messages": []}

def _save_db(data: Dict[str, Any]) -> bool:
    """Helper to save the JSON database safely."""
    try:
        with open(DB_PATH, "w") as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving to database: {e}")
        return False

def calculate_adherence_score(perfect_reps: int, total_reps: int, pain_level: int) -> int:
    """
    Calculates the Patient Adherence Score (0-100).
    Base logic: (Perfect / Total) * 100 - (Pain * 2). Floored at 0.
    """
    if total_reps == 0:
        return 0
        
    accuracy_percentage = (perfect_reps / total_reps) * 100
    pain_penalty = pain_level * 2
    
    score = int(accuracy_percentage - pain_penalty)
    
    # Ensure the score does not dip below 0 or exceed 100 just in case.
    return max(0, min(100, score))


def save_session(payload: dict) -> bool:
    """
    Saves the session payload, calculates the Adherence Score, and appends to the DB.
    """
    db = _load_db()
    
    # Calculate Score
    adherence_score = calculate_adherence_score(
        perfect_reps=payload.get("perfect_reps", 0),
        total_reps=payload.get("total_reps_attempted", 0),
        pain_level=payload.get("pain_level", 0)
    )
    
    # Enrich the incoming payload before storing
    log_entry = {
        **payload,
        "adherence_score": adherence_score,
        "timestamp": datetime.now().isoformat()
    }
    
    db["session_logs"].append(log_entry)
    
    print(f"DATABASE LAYER: Saved session for patient {payload.get('patient_id')}. Score: {adherence_score}")
    return _save_db(db)

def save_message(payload: dict) -> bool:
    """
    Saves the provider's message to the patient.
    """
    db = _load_db()
    
    message_entry = {
        **payload,
        "timestamp": datetime.now().isoformat()
    }
    
    db["messages"].append(message_entry)
    
    print(f"DATABASE LAYER: Saved message for patient {payload.get('patient_id')} from provider {payload.get('provider_id')}")
    return _save_db(db)
