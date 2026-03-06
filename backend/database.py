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

import statistics

def calculate_adherence_score(perfect_reps: int, total_reps: int, fatigue_data: list, pain_level: int) -> dict:
    """
    Calculates the Patient Adherence Score (0-100).
    Based on rep depth (perfect/total), velocity (mean duration), and session consistency (std dev of duration).
    """
    if total_reps == 0:
        return {"total": 0, "depth": 0, "velocity": 0, "consistency": 0}
        
    # 1. Rep Depth (up to 40 points)
    accuracy_percentage = (perfect_reps / total_reps) * 40
    
    # 2. Velocity (up to 30 points)
    # Assume ideal rep is around 3000ms - 5000ms. If average is within this, great.
    mean_duration = statistics.mean(fatigue_data) if fatigue_data else 4000
    if mean_duration > 6000:
        velocity_score = max(0, int(30 - ((mean_duration - 6000) / 1000) * 5))
    elif mean_duration < 2000:
        velocity_score = max(0, int(30 - ((2000 - mean_duration) / 1000) * 5))
    else:
        velocity_score = 30
        
    # 3. Consistency (up to 30 points)
    # std_dev of durations. Low is good.
    if len(fatigue_data) > 1:
        stdev_duration = statistics.stdev(fatigue_data)
    else:
        stdev_duration = 0
        
    if stdev_duration > 1000:
        consistency_score = max(0, int(30 - ((stdev_duration - 1000) / 500) * 5))
    else:
        consistency_score = 30
        
    # Pain penalty
    pain_penalty = pain_level * 5
    
    score = int(accuracy_percentage + velocity_score + consistency_score - pain_penalty)
    
    # Ensure the score does not dip below 0 or exceed 100 just in case.
    return {
        "total": max(0, min(100, score)),
        "depth": int(accuracy_percentage),
        "velocity": velocity_score,
        "consistency": consistency_score
    }


def save_session(payload: dict) -> bool:
    """
    Saves the session payload, calculates the Adherence Score, and appends to the DB.
    """
    db = _load_db()
    
    # Calculate Score
    adherence_scores = calculate_adherence_score(
        perfect_reps=payload.get("perfect_reps", 0),
        total_reps=payload.get("total_reps_attempted", 0),
        fatigue_data=payload.get("fatigue_data", []),
        pain_level=payload.get("pain_level", 0)
    )
    
    # Enrich the incoming payload before storing
    log_entry = {
        **payload,
        "adherence_score": adherence_scores["total"],
        "adherence_breakdown": adherence_scores,
        "timestamp": datetime.now().isoformat()
    }
    
    db["session_logs"].append(log_entry)
    
    print(f"DATABASE LAYER: Saved session for patient {payload.get('patient_id')}. Score: {adherence_scores['total']}")
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

def get_patient_sessions(patient_id: int) -> list:
    """
    Fetches all historical session logs for a specific patient.
    """
    db_data = _load_db()
    logs = db_data.get("session_logs", [])
    
    # Filter logs by patient ID
    patient_logs = [log for log in logs if log.get("patient_id") == patient_id]
    
    return patient_logs
