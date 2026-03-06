# 🦾 Kine-Coach

**AI-powered physical therapy coaching using real-time computer vision.**

Kine-Coach uses your webcam and Google's MediaPipe Pose engine to track exercise form frame-by-frame, count reps with mathematical precision, and generate AI-written physical therapy reports — all running live in the browser with no backend ML required.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🦴 **Live Skeleton Tracking** | MediaPipe Pose generates 33 3D landmarks on the body in real-time via a Web Worker |
| 📐 **Vector Math Engine** | Law of Cosines calculates joint angles (hip, knee, elbow, shoulder) with sub-degree precision |
| 🔄 **Multi-Exercise State Machines** | Squat, Pushup, Lunge, and Overhead Press detection — each with configurable depth thresholds |
| 📊 **Jitter Smoothing** | Exponential Moving Average (EMA) filter eliminates webcam noise before angles hit the UI |
| 🦵 **Lunge Valgus Detection** | Knee-buckling injury prevention via X-coordinate lateral drift analysis |
| 🧠 **Gemini AI PT Reports** | Google Gemini Flash generates personalized physical therapy feedback after each session |
| 📈 **Provider Analytics Dashboard** | Clinicians view adherence scores, fatigue curves, and Range of Motion improvement over time |
| 💬 **Provider Messaging** | Physical therapists can send in-app messages directly to patient dashboards |
| 📋 **Adherence Scoring** | 3-factor compliance score (0-100) based on rep depth, velocity, and consistency |

---

## 🏗️ Architecture

```
kine-coach/
├── frontend/              # React + Vite application (port 5173)
│   └── src/
│       ├── App.jsx                      # Root component & navigation router
│       ├── components/
│       │   ├── CameraFeed.jsx           # getUserMedia hook + canvas skeleton overlay
│       │   └── ProviderDashboard.jsx    # Clinician analytics portal
│       └── utils/
│           └── voiceFeedback.js         # Web Speech API verbal coaching
│
├── cv-model/              # Computer Vision Engine (runs as a Web Worker)
│   ├── poseWorker.js                    # Web Worker dispatcher (routes by exerciseType)
│   ├── angleMath.js                     # Law of Cosines + EMA JitterFilter
│   ├── stateMachine.js                  # Squat state machine
│   ├── pushupStateMachine.js            # Pushup state machine
│   ├── lungeStateMachine.js             # Lunge + valgus detection state machine
│   └── overheadPressStateMachine.js     # Overhead Press state machine
│
└── backend/               # FastAPI Python server (port 8000)
    ├── main.py                          # API routes & Gemini AI integration
    ├── database.py                      # Session storage & adherence scoring
    ├── schemas.py                       # Pydantic request/response models
    └── mock_db.json                     # Local JSON database
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [Python](https://www.python.org/) 3.10+
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)
- A webcam

### 1. Clone the repository
```bash
git clone https://github.com/Teerth1/kine-coach.git
cd kine-coach
```

### 2. Configure environment variables
Create a `.env` file in the root of `backend/`:
```env
GEMINI_API_KEY=your_api_key_here
```

### 3. Start the backend
```bash
cd backend
pip install fastapi uvicorn google-generativeai pydantic
uvicorn main:app --reload
```
The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### 4. Start the frontend
```bash
cd frontend
npm install
npm run dev
```
The application will be available at `http://localhost:5173`.

---

## 🧮 How the CV Engine Works

The pose tracking runs entirely inside a **Web Worker** to prevent the UI from freezing:

1. `CameraFeed.jsx` streams webcam frames to `poseWorker.js` via `postMessage`
2. The worker runs **MediaPipe Pose** to extract 33 skeleton landmarks
3. Raw coordinates pass through the **EMA JitterFilter** (`alpha=0.4`) to eliminate camera noise
4. Smoothed coordinates feed `calculateAngle()` (Law of Cosines) to get joint angles in degrees
5. Angles feed the active **State Machine** which tracks movement phases and counts reps
6. Results are posted back to the React UI for live display

### Switching exercises
Pass `exerciseType` when sending a frame to the worker:
```js
worker.postMessage({
    type: 'PROCESS_FRAME',
    landmarks,
    exerciseType: 'SQUAT' // 'SQUAT' | 'PUSHUP' | 'LUNGE' | 'OVERHEAD_PRESS'
});
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/exercises/{id}` | Get target angles for an exercise |
| `POST` | `/api/sessions` | Save a completed workout session |
| `GET` | `/api/sessions/{patient_id}` | Get all session history for a patient |
| `POST` | `/api/messages` | Send a provider message to a patient |

---

## 👥 Team & Track Assignments

| Track | Owner | Status |
|---|---|---|
| 🎨 Track 1: Frontend Overhaul | TBD | 🔲 In Progress |
| ⚙️ Track 2: Backend / PostgreSQL | TBD | 🔲 In Progress |
| 📊 Track 3: Provider Analytics | Priyansh M | ✅ Complete |
| 🦾 Track 4: CV Engine / New Exercises | Teerth | ✅ Complete |

---

## 🔮 Roadmap

- [ ] PostgreSQL migration (replace `mock_db.json`)
- [ ] JWT authentication with Patient / Provider roles
- [ ] Workout assignment API (providers push daily exercise plans)
- [ ] `framer-motion` page transitions and skeleton loaders
- [ ] Mobile responsiveness & TV casting support
- [ ] PDF medical summary export endpoint
- [ ] Docker + CI/CD deployment to Render/Railway
