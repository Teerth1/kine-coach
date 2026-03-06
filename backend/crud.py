from sqlalchemy.orm import Session
from datetime import datetime
import json
import models, schemas

def calculate_adherence_score(perfect_reps: int, total_reps: int, pain_level: int) -> int:
    if total_reps == 0:
        return 0
    accuracy_percentage = (perfect_reps / total_reps) * 100
    pain_penalty = pain_level * 2
    score = int(accuracy_percentage - pain_penalty)
    return max(0, min(100, score))

def save_session(db: Session, payload: schemas.SessionPayload):
    adherence_score = calculate_adherence_score(
        perfect_reps=payload.perfect_reps,
        total_reps=payload.total_reps_attempted,
        pain_level=payload.pain_level
    )
    db_log = models.SessionLog(
        patient_id=payload.patient_id,
        total_reps_attempted=payload.total_reps_attempted,
        perfect_reps=payload.perfect_reps,
        shallow_reps=payload.shallow_reps,
        fatigue_data_json=json.dumps(payload.fatigue_data),
        pain_level=payload.pain_level,
        quiz_answers=payload.quiz_answers,
        adherence_score=adherence_score,
        timestamp=datetime.utcnow()
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

def save_message(db: Session, payload: schemas.ProviderMessage):
    db_msg = models.Message(
        provider_id=payload.provider_id,
        patient_id=payload.patient_id,
        message_body=payload.message_body,
        timestamp=datetime.utcnow()
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg

def get_patient_sessions(db: Session, patient_id: int):
    return db.query(models.SessionLog).filter(models.SessionLog.patient_id == patient_id).all()
