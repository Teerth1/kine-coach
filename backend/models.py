from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String) # "patient" or "provider"
    
    # Relationships
    assignments_given = relationship("WorkoutAssignment", back_populates="provider", foreign_keys="WorkoutAssignment.provider_id")
    assignments_received = relationship("WorkoutAssignment", back_populates="patient", foreign_keys="WorkoutAssignment.patient_id")
    sessions = relationship("SessionLog", back_populates="patient")

class WorkoutAssignment(Base):
    __tablename__ = "workout_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("users.id"))
    patient_id = Column(Integer, ForeignKey("users.id"))
    exercise_id = Column(Integer)
    target_angles_json = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    provider = relationship("User", back_populates="assignments_given", foreign_keys=[provider_id])
    patient = relationship("User", back_populates="assignments_received", foreign_keys=[patient_id])

class SessionLog(Base):
    __tablename__ = "session_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    total_reps_attempted = Column(Integer)
    perfect_reps = Column(Integer)
    shallow_reps = Column(Integer)
    fatigue_data_json = Column(String) 
    pain_level = Column(Integer)
    quiz_answers = Column(String)
    adherence_score = Column(Integer)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    patient = relationship("User", back_populates="sessions")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("users.id"))
    patient_id = Column(Integer, ForeignKey("users.id"))
    message_body = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
