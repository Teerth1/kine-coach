import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CameraFeed from './components/CameraFeed';
import ProviderDashboard from './components/ProviderDashboard';
import { voiceFeedback } from './utils/voiceFeedback';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import confetti from 'canvas-confetti';
import { playSuccessChime } from './utils/audio';

export default function App() {
  const { user, token, logout } = useAuth();

  const [sessionData, setSessionData] = useState({
    patient_id: 0,
    total_reps_attempted: 0,
    perfect_reps: 0,
    shallow_reps: 0,
    fatigue_data: [],
    rom_data: [],
    pain_level: 2,
    quiz_answers: "Felt great, pushed hard."
  });

  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [clinicalReport, setClinicalReport] = useState(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Daily Chores State
  const [assignments, setAssignments] = useState([]);

  // Set patient id when user logs in
  useEffect(() => {
    if (user && user.role === 'patient') {
      setSessionData(prev => ({ ...prev, patient_id: user.id }));
    }
  }, [user]);

  // Fetch assignments when patient logs in
  useEffect(() => {
    if (user?.role === 'patient' && sessionData.patient_id) {
      fetch(`http://localhost:8000/api/assignments/${sessionData.patient_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAssignments(data);
          }
        })
        .catch(err => console.error("Error fetching assignments:", err));
    }
  }, [user, sessionData.patient_id, token]);

  // Called dynamically when poseWorker.js math says the rep is officially over
  const handleRepCompleted = (result) => {
    console.log("Rep completed:", result);

    // Speak out loud dynamically!
    voiceFeedback.coachRepCompleted(result.quality);
    if (result.quality === 'PERFECT') {
      playSuccessChime();
    }

    setSessionData(prev => {
      const newTotal = prev.total_reps_attempted + 1;

      setAssignments(currentAssignments => {
        return currentAssignments.map(a => {
          if (a.status !== 'completed') {
            if (newTotal === Math.floor(a.target_reps / 2) && a.target_reps > 1) {
              setToastMessage(`Halfway there! ${newTotal}/${a.target_reps} reps done!`);
              setTimeout(() => setToastMessage(''), 3000);
            }

            if (newTotal >= a.target_reps) {
              // FIRE CONFETTI!
              confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 }
              });
              setToastMessage("All reps complete! Great work! 🎉");
              setTimeout(() => setToastMessage(''), 5000);

              fetch(`http://localhost:8000/api/assignments/${a.id}/status`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'completed' })
              });
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

  const finishSession = async () => {
    setIsFinishing(true);
    try {
      const res = await fetch("http://localhost:8000/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(sessionData)
      });
      const payload = await res.json();
      if (res.ok) {
        setClinicalReport(payload.report);
      } else {
        setClinicalReport("API Error: We could not generate a report.");
      }
      setSessionCompleted(true);
    } catch (err) {
      console.error("Failed to post session:", err);
      setClinicalReport("Great work today. Rest your knee and make sure to ice it this evening.");
      setSessionCompleted(true);
    }
  };

  if (!user) {
    return <ProtectedRoute><div /></ProtectedRoute>;
  }

  if (user.role === 'provider') {
    return (
      <ProtectedRoute allowedRoles={['provider']}>
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.4 }}
          className="dashboard-layout"
        >
          <header className="brand-header border-none pb-0 mb-0">
            <button onClick={logout} className="text-gray-400 hover:text-white mb-6 uppercase tracking-widest text-sm font-bold flex items-center gap-2">
              ← Logout
            </button>
          </header>
          <ProviderDashboard />
        </motion.div>
      </ProtectedRoute>
    );
  }

  // Patient View
  return (
    <ProtectedRoute allowedRoles={['patient']}>
      <AnimatePresence mode="wait">
        <motion.div
          key="patient-view"
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4 }}
          className="dashboard-layout relative z-10"
        >
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 20 }} exit={{ opacity: 0, y: -50 }}
                className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
              >
                <div className="bg-emerald-500 text-white font-bold px-6 py-3 rounded-full shadow-2xl border border-emerald-400">
                  {toastMessage}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <header className="brand-header border-none pb-0">
            <div className="flex items-center gap-6">
              <button onClick={logout} className="text-text-secondary hover:text-white uppercase tracking-widest text-sm font-bold flex items-center gap-2 bg-black/40 px-4 py-2 rounded-lg border border-border-glass transition-colors">
                ← Logout
              </button>
              <h1 className="bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-emerald-400">Kine-Coach</h1>
            </div>
            <div className="patient-badge">Patient ID: {sessionData.patient_id}</div>
          </header>

          <div className="h-8"></div>

          {!sessionCompleted ? (
            <main className="active-workout">
              <section className="feed-container">
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
                  <div className="stat-card relative overflow-hidden group">
                    <motion.div
                      key={sessionData.perfect_reps}
                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 bg-green-500/10 pointer-events-none"
                    />
                    <p className="stat-label z-10 relative">Perfect</p>
                    <p className="stat-value text-brand-green z-10 relative">{sessionData.perfect_reps}</p>
                  </div>
                  <div className="stat-card relative overflow-hidden group">
                    <motion.div
                      key={sessionData.shallow_reps}
                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 bg-red-500/10 pointer-events-none"
                    />
                    <p className="stat-label z-10 relative">Shallow</p>
                    <p className="stat-value text-brand-red z-10 relative">{sessionData.shallow_reps}</p>
                  </div>
                </div>

                <button
                  className={`finish-btn ${isFinishing ? 'loading' : ''}`}
                  onClick={finishSession}
                  disabled={isFinishing || sessionData.total_reps_attempted === 0}
                >
                  {isFinishing ? "Syncing API..." : "Finish Workout"}
                </button>
                {sessionData.total_reps_attempted === 0 && <p className="help-text text-gray-500 mt-2">Do at least 1 rep to finish & save.</p>}
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
    </ProtectedRoute>
  );
}
