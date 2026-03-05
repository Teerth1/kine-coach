import urllib.request
import json
import time

def test_api():
    base_url = "http://localhost:8000/api"
    
    # 1. Test POST /api/sessions
    session_payload = {
        "patient_id": 101,
        "total_reps_attempted": 15,
        "perfect_reps": 10,
        "shallow_reps": 5,
        "fatigue_data": [1.2, 1.3, 1.5, 2.0, 2.5],
        "pain_level": 3,
        "quiz_answers": "Felt ok but knee is a bit sore."
    }
    
    print("--- Testing POST /api/sessions ---")
    req = urllib.request.Request(
        f"{base_url}/sessions", 
        data=json.dumps(session_payload).encode(), 
        headers={'Content-Type': 'application/json'}
    )
    try:
        response = urllib.request.urlopen(req)
        print("Status:", response.status)
        print("Response:", json.loads(response.read().decode()))
    except Exception as e:
        print("Error details:", getattr(e, 'read', lambda: b"")().decode())
        print("Exception:", e)

    print("\n--- Testing POST /api/messages ---")
    message_payload = {
        "provider_id": 99,
        "patient_id": 101,
        "message_body": "Keep up the good work! Try to go a bit deeper on the squats."
    }
    req2 = urllib.request.Request(
        f"{base_url}/messages", 
        data=json.dumps(message_payload).encode(), 
        headers={'Content-Type': 'application/json'}
    )
    try:
        response2 = urllib.request.urlopen(req2)
        print("Status:", response2.status)
        print("Response:", json.loads(response2.read().decode()))
    except Exception as e:
        print("Exception:", e)

if __name__ == "__main__":
    test_api()
