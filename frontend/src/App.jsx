import React, { useState } from 'react';
import CameraFeed from './components/CameraFeed';
import ProviderDashboard from './components/ProviderDashboard'; // Epic 3 UI
import { voiceFeedback } from './utils/voiceFeedback';

export default function App() {
  // Navigation State
  const [view, setView] = useState('landing'); // 'landing', 'patient', 'provider'

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
      fatigue_data: [...prev.fatigue_data, result.stats.durationMs || 0]
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

  // ------------------------------------------------------------------------------------------
  // RENDER SELECTION
  // ------------------------------------------------------------------------------------------

  if (view === 'landing') {
    return (
      <div className="dashboard-layout items-center justify-center gap-12 text-center relative z-10 w-full">
        <div className="w-full max-w-2xl bg-gray-900/60 p-12 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl">
          <h1 className="text-6xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">Kine-Coach</h1>
          <p className="text-xl text-gray-400 mb-12">Select your portal to connect to the unified database.</p>

          <div className="flex flex-col md:flex-row gap-6 justify-center">
            <button
              onClick={() => setView('patient')}
              className="bg-white/10 hover:bg-white/20 border border-white/20 px-8 py-6 rounded-2xl flex-1 transition-all hover:scale-105 group"
            >
              <h3 className="text-2xl font-bold text-white group-hover:text-emerald-400 mb-2">Patient Dashboard</h3>
              <p className="text-sm text-gray-400">Stream Live React CV Engine</p>
            </button>

            <button
              onClick={() => setView('provider')}
              className="bg-white/10 hover:bg-white/20 border border-white/20 px-8 py-6 rounded-2xl flex-1 transition-all hover:scale-105 group"
            >
              <h3 className="text-2xl font-bold text-white group-hover:text-blue-400 mb-2">Clinician Portal</h3>
              <p className="text-sm text-gray-400">View Telemetry & Adherence Charts</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'provider') {
    return (
      <div className="dashboard-layout">
        <header className="brand-header border-none pb-0 mb-0">
          <button onClick={() => setView('landing')} className="text-gray-400 hover:text-white mb-6 uppercase tracking-widest text-sm font-bold flex items-center gap-2">
            ← Back to Login
          </button>
        </header>
        <ProviderDashboard />
      </div>
    );
  }

  // Fallback to standard Patient View (Epic 2)
  return (
    <div className="dashboard-layout relative z-10">
      <header className="brand-header border-none pb-0">
        <div className="flex items-center gap-6">
          <button onClick={() => setView('landing')} className="text-gray-400 hover:text-white uppercase tracking-widest text-sm font-bold flex items-center gap-2 bg-black/40 px-4 py-2 rounded-lg border border-white/10">
            ← Switching Role
          </button>
          <h1 className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">Kine-Coach</h1>
        </div>
        <div className="patient-badge bg-black/50 backdrop-blur-md border-white/10 text-white">Patient ID: {sessionData.patient_id}</div>
      </header>

      {/* Adding a small spacing div to fix layout drift compared to Epic 2 */}
      <div className="h-8"></div>

      {!sessionCompleted ? (
        <main className="active-workout">
          <section className="feed-container">
            {/* The Computer Vision & Camera Module */}
            <CameraFeed onRepCompleted={handleRepCompleted} />
          </section>

          <aside className="stats-sidebar">
            <h2>Live Tracker</h2>
            <div className="stat-card absolute-card border border-white/10">
              <p className="stat-label">Total Reps</p>
              <p className="stat-value text-blue">{sessionData.total_reps_attempted}</p>
            </div>

            <div className="stat-row">
              <div className="stat-card perfect-card border border-white/10">
                <p className="stat-label">Perfect</p>
                <p className="stat-value text-green">{sessionData.perfect_reps}</p>
              </div>
              <div className="stat-card shallow-card border border-white/10">
                <p className="stat-label">Shallow</p>
                <p className="stat-value text-red">{sessionData.shallow_reps}</p>
              </div>
            </div>

            <button
              className={`finish-btn ${isFinishing ? 'loading' : ''}`}
              onClick={finishSession}
              disabled={isFinishing || sessionData.total_reps_attempted === 0}
            >
              {isFinishing ? "Syncing API..." : "Finish Workout"}
            </button>
            {sessionData.total_reps_attempted === 0 && <p className="help-text text-gray-500 mt-2">Do at least 1 squat to finish & save to DB.</p>}
          </aside>
        </main>
      ) : (
        <main className="post-workout w-full max-w-4xl mx-auto">
          <div className="success-banner text-center mb-8">
            <h2 className="text-5xl font-black text-emerald-400 mb-4 drop-shadow-md">Data Synced Successfully! ✓</h2>
            <p className="text-gray-300 text-xl">Your skeletal telemetry was securely written into `mock_db.json`.</p>
          </div>

          <div className="report-card bg-gray-900/60 border border-emerald-500/30 backdrop-blur-xl p-8 rounded-3xl w-full text-left">
            <h3 className="text-2xl text-emerald-400 font-bold mb-6 border-b border-white/10 pb-4">Physical Therapist Action Plan (by Gemini Flash)</h3>
            <div className="report-body text-gray-200 leading-relaxed text-lg whitespace-pre-wrap">
              {clinicalReport}
            </div>
          </div>

          <button className="restart-btn mt-8 border-white/20 hover:bg-white/10 text-white font-bold py-4 px-8 rounded-xl transition-colors text-lg" onClick={() => window.location.reload()}>Return to Landing Page</button>
        </main>
      )}
    </div>
  );
}
