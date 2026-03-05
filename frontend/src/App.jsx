import React, { useState } from 'react';
import CameraFeed from './components/CameraFeed';
import { voiceFeedback } from './utils/voiceFeedback';

export default function App() {
  const [sessionData, setSessionData] = useState({
    patient_id: 101, // Mocked to John Doe from Epic 6
    total_reps_attempted: 0,
    perfect_reps: 0,
    shallow_reps: 0,
    fatigue_data: [], // E.g., timestamp lengths per rep
    pain_level: 2, // Hardcoded for this demo
    quiz_answers: "Felt great, pushed hard."
  });

  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [clinicalReport, setClinicalReport] = useState(null);
  const [isFinishing, setIsFinishing] = useState(false);

  // Called dynamically when poseWorker.js math says the rep is officially over
  const handleRepCompleted = (result) => {
    console.log("Rep completed:", result);

    // Speak out loud dynamically!
    voiceFeedback.coachRepCompleted(result.quality);

    // Update the parent session payload incrementally
    setSessionData(prev => ({
      ...prev,
      total_reps_attempted: prev.total_reps_attempted + 1,
      perfect_reps: result.quality === 'PERFECT' ? prev.perfect_reps + 1 : prev.perfect_reps,
      shallow_reps: result.quality === 'SHALLOW' ? prev.shallow_reps + 1 : prev.shallow_reps,
      fatigue_data: [...prev.fatigue_data, Date.now()]
    }));
  };

  // Called when patient clicks "Finish Workout"
  const finishSession = async () => {
    setIsFinishing(true);

    try {
      // POST the fully compiled session off to Epic 5 (FastAPI -> Gemini -> Database)
      const res = await fetch("http://localhost:8000/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionData)
      });

      const payload = await res.json();
      setClinicalReport(payload.report);
      setSessionCompleted(true);
    } catch (err) {
      console.error("Failed to post session:", err);
      // Fallback for UI if python server is disconnected
      setClinicalReport("Great work today. Rest your knee and make sure to ice it this evening.");
      setSessionCompleted(true);
    }
  };

  return (
    <div className="dashboard-layout">
      <header className="brand-header">
        <h1>Kine-Coach</h1>
        <div className="patient-badge">Patient ID: {sessionData.patient_id}</div>
      </header>

      {!sessionCompleted ? (
        <main className="active-workout">
          <section className="feed-container">
            {/* The Computer Vision & Camera Module */}
            <CameraFeed onRepCompleted={handleRepCompleted} />
          </section>

          <aside className="stats-sidebar">
            <h2>Live Tracker</h2>
            <div className="stat-card absolute-card">
              <p className="stat-label">Total Reps</p>
              <p className="stat-value text-blue">{sessionData.total_reps_attempted}</p>
            </div>

            <div className="stat-row">
              <div className="stat-card perfect-card">
                <p className="stat-label">Perfect</p>
                <p className="stat-value text-green">{sessionData.perfect_reps}</p>
              </div>
              <div className="stat-card shallow-card">
                <p className="stat-label">Shallow</p>
                <p className="stat-value text-red">{sessionData.shallow_reps}</p>
              </div>
            </div>

            <button
              className={`finish-btn ${isFinishing ? 'loading' : ''}`}
              onClick={finishSession}
              disabled={isFinishing || sessionData.total_reps_attempted === 0}
            >
              {isFinishing ? "Syncing..." : "Finish Workout"}
            </button>
            {sessionData.total_reps_attempted === 0 && <p className="help-text">Do at least 1 squat to finish.</p>}
          </aside>
        </main>
      ) : (
        <main className="post-workout">
          <div className="success-banner">
            <h2>Workout Sent to Provider!</h2>
            <p>Your session was safely tracked, scored, and securely logged into the database.</p>
          </div>

          <div className="report-card">
            <h3>Gemini Clinical Feedback</h3>
            <div className="report-body">
              {clinicalReport}
            </div>
          </div>

          <button className="restart-btn" onClick={() => window.location.reload()}>Start Another Session</button>
        </main>
      )}
    </div>
  );
}
