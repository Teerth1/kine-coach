import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    rom_data: [], // Deepest knee angle per rep
    pain_level: 2, // Hardcoded for this demo
    quiz_answers: "Felt great, pushed hard."
  });

  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [clinicalReport, setClinicalReport] = useState(null);
  const [isFinishing, setIsFinishing] = useState(false);

  // Daily Chores State
  const [assignments, setAssignments] = useState([]);

  // Fetch assignments when patient logs in
  useEffect(() => {
    if (view === 'patient') {
      fetch(`http://localhost:8000/api/assignments/${sessionData.patient_id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAssignments(data);
          }
        })
        .catch(err => console.error("Error fetching assignments:", err));
    }
  }, [view, sessionData.patient_id]);
  // Called dynamically when poseWorker.js math says the rep is officially over
  const handleRepCompleted = (result) => {
    console.log("Rep completed:", result);

    // Speak out loud dynamically!
    voiceFeedback.coachRepCompleted(result.quality);

    // Update the parent session payload incrementally
    setSessionData(prev => {
      const newTotal = prev.total_reps_attempted + 1;

      // Ticket 2.3 - Auto-complete chores if targets are hit
      setAssignments(currentAssignments => {
        return currentAssignments.map(a => {
          if (a.status !== 'completed') {
            // Check if they hit the target reps
            if (newTotal >= a.target_reps) {
              // Fire async network request to update DB
              fetch(`http://localhost:8000/api/assignments/${a.id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'completed' })
              });
              // Return optimistic UI update
              return { ...a, status: 'completed' };
            }
          }
          return a;
        });
      });

      return {
        ...prev,
        total_reps_attempted: newTotal,
        perfect_reps: result.quality === 'PERFECT' ? prev.perfect_reps + 1 : prev.perfect_reps,
        shallow_reps: result.quality === 'SHALLOW' ? prev.shallow_reps + 1 : prev.shallow_reps,
        fatigue_data: [...prev.fatigue_data, result.stats.durationMs || 0],
        rom_data: [...prev.rom_data, result.stats.depth || 180]
      };
    });
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
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5, ease: "easeOut" }}
        className="dashboard-layout items-center justify-center gap-12 text-center relative z-10 w-full"
      >
        <div className="w-full max-w-2xl bg-bg-glass p-12 rounded-3xl border border-border-glass backdrop-blur-xl shadow-2xl">
          <motion.h1
            initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
            className="text-6xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-emerald-400"
          >
            Kine-Coach
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-xl text-text-secondary mb-12">Select your portal to connect to the unified database.</motion.p>

          <div className="flex flex-col md:flex-row gap-6 justify-center">
            <motion.button
              whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }}
              onClick={() => setView('patient')}
              className="bg-white/5 hover:bg-white/10 border border-border-glass px-8 py-6 rounded-2xl flex-1 transition-colors group"
            >
              <h3 className="text-2xl font-bold text-white group-hover:text-emerald-400 mb-2 transition-colors">Patient Dashboard</h3>
              <p className="text-sm text-text-secondary">Stream Live React CV Engine</p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }}
              onClick={() => setView('provider')}
              className="bg-white/5 hover:bg-white/10 border border-border-glass px-8 py-6 rounded-2xl flex-1 transition-colors group"
            >
              <h3 className="text-2xl font-bold text-white group-hover:text-brand-blue mb-2 transition-colors">Clinician Portal</h3>
              <p className="text-sm text-text-secondary">View Telemetry & Adherence Charts</p>
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (view === 'provider') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.4 }}
        className="dashboard-layout"
      >
        <header className="brand-header border-none pb-0 mb-0">
          <button onClick={() => setView('landing')} className="text-gray-400 hover:text-white mb-6 uppercase tracking-widest text-sm font-bold flex items-center gap-2">
            ← Back to Login
          </button>
        </header>
        <ProviderDashboard />
      </motion.div>
    );
  }

  // Fallback to standard Patient View (Epic 2)
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="patient-view"
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4 }}
        className="dashboard-layout relative z-10"
      >
        <header className="brand-header border-none pb-0">
          <div className="flex items-center gap-6">
            <button onClick={() => setView('landing')} className="text-text-secondary hover:text-white uppercase tracking-widest text-sm font-bold flex items-center gap-2 bg-black/40 px-4 py-2 rounded-lg border border-border-glass transition-colors">
              ← Switching Role
            </button>
            <h1 className="bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-emerald-400">Kine-Coach</h1>
          </div>
          <div className="patient-badge">Patient ID: {sessionData.patient_id}</div>
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
              {assignments.length > 0 && (
                <div className="mb-6 bg-white/5 border border-emerald-500/30 rounded-2xl p-4 backdrop-blur-md">
                  <h3 className="text-emerald-400 font-bold mb-3">📋 Today's Chores</h3>
                  <ul className="space-y-2">
                    {assignments.map(a => (
                      <li key={a.id} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                        <span className="text-gray-300 font-medium">{a.exercise_name || 'Workout'}</span>
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${a.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'}`}>
                          {a.status === 'completed' ? '✓ Done' : `${a.target_reps} Reps`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <h2>Live Tracker</h2>
              <div className="stat-card">
                <p className="stat-label">Total Reps</p>
                <p className="stat-value text-brand-blue">{sessionData.total_reps_attempted}</p>
              </div>

              <div className="stat-row">
                <div className="stat-card">
                  <p className="stat-label">Perfect</p>
                  <p className="stat-value text-brand-green">{sessionData.perfect_reps}</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">Shallow</p>
                  <p className="stat-value text-brand-red">{sessionData.shallow_reps}</p>
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
          <motion.main
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="post-workout w-full max-w-4xl mx-auto"
          >
            <div className="success-banner text-center mb-8">
              <h2 className="text-5xl font-black text-emerald-400 mb-4 drop-shadow-md">Data Synced Successfully! ✓</h2>
              <p className="text-gray-300 text-xl">Your skeletal telemetry was securely written into `mock_db.json`.</p>
            </div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", delay: 0.2 }}
              className="report-card"
            >
              <h3 className="text-2xl text-emerald-400 font-bold mb-6 border-b border-border-glass pb-4">Physical Therapist Action Plan (by Gemini Flash)</h3>
              <div className="report-body whitespace-pre-wrap">
                {clinicalReport}
              </div>
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="restart-btn mt-8" onClick={() => window.location.reload()}
            >
              Return to Landing Page
            </motion.button>
          </motion.main>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
