def save_session(payload: dict) -> bool:
    """
    Placeholder for DB Engineer: Saves session data to mock_db.json.
    """
    print(f"DATABASE LAYER: Saving session for patient {payload.get('patient_id')}")
    return True

def save_message(payload: dict) -> bool:
    """
    Placeholder for DB Engineer: Saves message data to mock_db.json.
    """
    print(f"DATABASE LAYER: Saving message for patient {payload.get('patient_id')} from provider {payload.get('provider_id')}")
    return True
