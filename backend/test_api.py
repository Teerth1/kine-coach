import urllib.request
import json

base_url = "http://localhost:8000"

def request(endpoint, method="GET", data=None, token=None):
    url = f"{base_url}{endpoint}"
    headers = {}
    if data:
        headers['Content-Type'] = 'application/json'
        if isinstance(data, dict):
             data = json.dumps(data).encode('utf-8')
    
    if token:
        headers['Authorization'] = f"Bearer {token}"
        
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        response = urllib.request.urlopen(req)
        return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())
    except Exception as e:
        return 500, str(e)

def format_form_data(data):
    import urllib.parse
    return urllib.parse.urlencode(data).encode('utf-8')

def test_api():
    print("--- Testing /signup ---")
    p_status, p_res = request("/signup", method="POST", data={"email": "provider@test.com", "password": "pass", "role": "provider"})
    print("Provider Signup:", p_status, p_res)
    if p_status not in (200, 400): return
    provider_id = p_res.get("id")

    pa_status, pa_res = request("/signup", method="POST", data={"email": "patient@test.com", "password": "pass", "role": "patient"})
    print("Patient Signup:", pa_status, pa_res)
    patient_id = pa_res.get("id")

    print("\n--- Testing /login ---")
    form_headers = {'Content-Type': 'application/x-www-form-urlencoded'}

    req_p = urllib.request.Request(f"{base_url}/login", data=format_form_data({"username": "provider@test.com", "password": "pass"}), headers=form_headers, method="POST")
    p_login = json.loads(urllib.request.urlopen(req_p).read().decode())
    p_token = p_login["access_token"]
    print("Provider Token received.")

    req_pa = urllib.request.Request(f"{base_url}/login", data=format_form_data({"username": "patient@test.com", "password": "pass"}), headers=form_headers, method="POST")
    pa_login = json.loads(urllib.request.urlopen(req_pa).read().decode())
    pa_token = pa_login["access_token"]
    print("Patient Token received.")

    print("\n--- Testing Workout API ---")
    w_status, w_res = request("/api/workouts/assign", method="POST", data={
        "patient_id": patient_id,
        "exercise_id": 1,
        "target_angles": {"knee": "< 90", "hip": "< 100"}
    }, token=p_token)
    print("Assign Workout (Provider):", w_status, w_res)

    fw_status, fw_res = request("/api/workouts/assign", method="POST", data={
        "patient_id": patient_id,
        "exercise_id": 1,
        "target_angles": {"knee": "< 90"}
    }, token=pa_token)
    print("Assign Workout (Patient - Should fail 403):", fw_status, fw_res)

    m_status, m_res = request("/api/workouts/me", method="GET", token=pa_token)
    print("Fetch My Workouts (Patient):", m_status, len(m_res), "records")

    print("\n--- Testing Sessions URL ---")
    sess_payload = {
        "patient_id": patient_id,
        "total_reps_attempted": 10,
        "perfect_reps": 8,
        "shallow_reps": 2,
        "fatigue_data": [1.1, 1.2],
        "pain_level": 1,
        "quiz_answers": "Good session."
    }
    s_status, s_res = request("/api/sessions", method="POST", data=sess_payload, token=pa_token)
    print("Log Session (Patient):", s_status, s_res.get('status'))

    print("\n--- Testing Fetch Patient Sessions ---")
    f_status, f_res = request(f"/api/sessions/{patient_id}", method="GET", token=p_token)
    print("Fetch Sessions (Provider):", f_status, len(f_res), "records")

if __name__ == "__main__":
    test_api()
