# Kine-Coach

**AI-powered physical therapy coaching using real-time computer vision.**

Kine-Coach uses your webcam and Google's MediaPipe Pose engine to track exercise form frame-by-frame, count reps with mathematical precision, and generate AI-written physical therapy reports -- all running live in the browser with no backend ML required.

---

## Features

| Feature | Description |
|---|---|
| Live Skeleton Tracking | MediaPipe Pose generates 33 3D landmarks on the body in real-time via a Web Worker |
| Vector Math Engine | Law of Cosines calculates joint angles (hip, knee, elbow, shoulder) with sub-degree precision |
| Multi-Exercise State Machines | Squat, Pushup, Lunge, and Overhead Press detection with configurable depth thresholds |
| Jitter Smoothing | Exponential Moving Average (EMA) filter eliminates webcam noise before angles hit the UI |
| Lunge Valgus Detection | Knee-buckling injury prevention via X-coordinate lateral drift analysis |
| Gemini AI PT Reports | Google Gemini Flash generates personalized physical therapy feedback with model fallback chain |
| JWT Authentication | Role-based access (patient/provider) with secure token auth on all protected endpoints |
| Provider Analytics Dashboard | Clinicians view adherence scores, fatigue curves, and Range of Motion improvement over time |
| Provider Messaging | Physical therapists can send in-app messages directly to patient dashboards |
| Adherence Scoring | 3-factor compliance score (0-100) based on rep depth, velocity, and consistency |
| Gamification | Confetti bursts, color feedback, milestone toasts, and synthesized audio chimes |
| Dockerized Deployment | Multi-stage Docker builds with nginx reverse proxy, gzip, and static asset caching |

---

## Architecture

```
kine-coach/
├── frontend/                          # React + Vite + Tailwind (port 5173 dev, 3000 prod)
│   ├── src/
│   │   ├── main.jsx                   # Entry point (AuthProvider wraps App)
│   │   ├── App.jsx                    # Root component, rep tracking, gamification
│   │   ├── api/client.js              # Shared fetch wrapper with auto-auth headers
│   │   ├── context/AuthContext.jsx    # JWT auth state (login, register, logout)
│   │   ├── components/
│   │   │   ├── Login.jsx              # Login + Register form with role selection
│   │   │   ├── ProtectedRoute.jsx     # Auth gate with role-based access control
│   │   │   ├── CameraFeed.jsx         # MediaPipe Pose + Web Worker bridge
│   │   │   ├── ProviderDashboard.jsx  # Clinician analytics portal with charts
│   │   │   └── ui/MilestoneToast.jsx  # Animated milestone notification component
│   │   ├── cv-model/
│   │   │   ├── poseWorker.js          # Web Worker dispatcher (routes by exerciseType)
│   │   │   ├── angleMath.js           # Law of Cosines + EMA JitterFilter
│   │   │   ├── stateMachine.js        # Squat state machine
│   │   │   ├── pushupStateMachine.js  # Pushup state machine
│   │   │   ├── lungeStateMachine.js   # Lunge + valgus detection state machine
│   │   │   └── overheadPressStateMachine.js
│   │   └── utils/
│   │       ├── sounds.js              # Web Audio API synthesized chimes
│   │       ├── audio.js               # Legacy success chime
│   │       └── voiceFeedback.js       # Web Speech API verbal coaching
│   ├── nginx.conf                     # Production nginx with API proxy + gzip + caching
│   ├── Dockerfile                     # Multi-stage: node:20-alpine -> nginx:alpine
│   └── package.json
│
├── backend/                           # FastAPI Python server (port 8000)
│   ├── main.py                        # API routes, Gemini AI with retry + fallback
│   ├── auth.py                        # JWT creation/verification, bcrypt password hashing
│   ├── database.py                    # JSON file DB, adherence scoring, CRUD operations
│   ├── schemas.py                     # Pydantic request/response models
│   ├── mock_db.json                   # Local JSON database
│   ├── Dockerfile                     # python:3.11-slim, non-root user, 2 workers
│   └── requirements.txt
│
├── docker-compose.yml                 # Backend (internal) + Frontend (:3000) with healthcheck
├── Makefile                           # Convenience targets: up, down, logs, restart, seed
└── .env.example                       # All environment variables documented
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS 4, Framer Motion |
| Computer Vision | MediaPipe Pose (Web Worker), custom state machines |
| Backend | FastAPI, Python 3.11, Pydantic |
| AI Reports | Google Gemini (2.5-flash primary, 2.0-flash fallback) |
| Auth | JWT (python-jose), bcrypt (passlib) |
| Deployment | Docker, nginx, docker-compose |

---

## Getting Started

### Option A: Docker (Recommended)

```bash
# 1. Clone and configure
git clone https://github.com/Teerth1/kine-coach.git
cd kine-coach
cp .env.example .env
# Edit .env with your GEMINI_API_KEY

# 2. Build and run
make up

# 3. Open http://localhost:3000
```

### Option B: Local Development

**Prerequisites:** Node.js 18+, Python 3.10+, a webcam

```bash
# Backend
cd backend
pip install -r requirements.txt
cp ../.env.example ../.env  # Edit with your GEMINI_API_KEY
uvicorn main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Demo Credentials

| Role | Email | Password |
|---|---|---|
| Patient | patient@kine.coach | demo1234 |
| Provider | provider@kine.coach | demo1234 |

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | None | Register new user (email, password, role) |
| `POST` | `/api/auth/login` | None | OAuth2 login, returns JWT |
| `GET` | `/api/health` | None | Health check |
| `GET` | `/api/exercises` | None | List all exercises (optional `?category=` filter) |
| `GET` | `/api/exercises/{id}` | None | Get exercise detail with angle_requirements |
| `POST` | `/api/sessions` | Patient | Save workout session + generate Gemini report |
| `GET` | `/api/sessions/{patient_id}` | Patient/Provider | Get session history |
| `GET` | `/api/sessions/{patient_id}/pdf` | Patient/Provider | Download PDF medical summary |
| `POST` | `/api/messages` | Provider | Send message to patient |
| `POST` | `/api/assignments` | Provider | Create exercise assignment |
| `GET` | `/api/assignments/{patient_id}` | Patient/Provider | Get patient assignments |
| `POST` | `/api/assignments/{id}/status` | Authenticated | Update assignment status |

---

## How the CV Engine Works

The pose tracking runs entirely inside a **Web Worker** to prevent the UI from freezing:

1. `CameraFeed.jsx` streams webcam frames to `poseWorker.js` via `postMessage`
2. The worker receives 33 MediaPipe Pose landmarks per frame
3. Raw coordinates pass through the **EMA JitterFilter** (`alpha=0.4`) to eliminate camera noise
4. Smoothed coordinates feed `calculateAngle()` (Law of Cosines) to get joint angles in degrees
5. Angles feed the active **State Machine** which tracks movement phases and counts reps
6. Results are posted back to the React UI for live display

### Switching exercises
```js
worker.postMessage({
    type: 'PROCESS_FRAME',
    landmarks,
    exerciseType: 'SQUAT' // 'SQUAT' | 'PUSHUP' | 'LUNGE' | 'OVERHEAD_PRESS'
});
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key | (required) |
| `GEMINI_MODEL_PRIMARY` | Primary Gemini model | `gemini-2.5-flash` |
| `GEMINI_MODEL_FALLBACK` | Fallback Gemini model | `gemini-2.0-flash` |
| `JWT_SECRET` | JWT signing secret | dev default |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` |

---

## Team

| Track | Owner | Status |
|---|---|---|
| Track 1: Frontend Overhaul | Priyansh M | Complete |
| Track 2: Backend / SQL | -- | Complete |
| Track 3: Provider Analytics | Priyansh M | Complete |
| Track 4: CV Engine / New Exercises | Teerth | Complete |
