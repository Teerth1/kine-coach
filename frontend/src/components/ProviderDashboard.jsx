import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProviderDashboard() {
    const [patientId, setPatientId] = useState(101); // Default patient
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [providerMessage, setProviderMessage] = useState("");
    const [messageSent, setMessageSent] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, [patientId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:8000/api/sessions/${patientId}`);
            if (res.ok) {
                const data = await res.json();
                // Format dates cleanly for Recharts
                const formattedData = data.map(session => ({
                    ...session,
                    displayDate: new Date(session.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                }));
                setSessions(formattedData);
            } else {
                setSessions([]);
            }
        } catch (err) {
            console.error("Failed to fetch history:", err);
            // Fallback fake data if DB is down
            setSessions([
                { adherence_score: 55, total_reps_attempted: 10, perfect_reps: 2, shallow_reps: 8, pain_level: 5, displayDate: "Mar 1" },
                { adherence_score: 80, total_reps_attempted: 10, perfect_reps: 7, shallow_reps: 3, pain_level: 3, displayDate: "Mar 3" },
            ]);
        }
        setLoading(false);
    };

    const sendMessage = async () => {
        if (!providerMessage.trim()) return;
        try {
            const payload = { provider_id: 1, patient_id: patientId, message: providerMessage.trim() };
            const res = await fetch("http://localhost:8000/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setMessageSent(true);
                setProviderMessage("");
                setTimeout(() => setMessageSent(false), 3000);
            }
        } catch (err) {
            console.error("Message failed:", err);
        }
    };

    // Calculate aggregates
    const totalCompleted = sessions.reduce((sum, s) => sum + (s.total_reps_attempted || 0), 0);
    const averagePain = sessions.length ? (sessions.reduce((sum, s) => sum + (s.pain_level || 0), 0) / sessions.length).toFixed(1) : 0;
    const lastScore = sessions.length ? sessions[sessions.length - 1].adherence_score : 0;

    // Formatting physical therapy fatigue data (Epic 4 Analytics)
    const latestSession = sessions.length ? sessions[sessions.length - 1] : null;
    const fatigueChartData = latestSession?.fatigue_data?.map((duration, index) => ({
        rep: `Rep ${index + 1}`,
        seconds: parseFloat((duration / 1000).toFixed(2)) // Convert raw ms to readable seconds
    })) || [];

    return (
        <div className="w-full flex flex-col gap-6 animate-fade-in relative z-10">

            {/* Top Header & Patient Selection Row */}
            <div className="flex justify-between items-center bg-gray-900/50 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Clinician Portal</h2>
                    <p className="text-gray-400 mt-1">Reviewing telemetry from computer vision engine</p>
                </div>
                <div className="flex items-center gap-4">
                    <label className="text-sm font-bold text-gray-300 uppercase tracking-widest">Select Patient:</label>
                    <select
                        value={patientId}
                        onChange={(e) => setPatientId(Number(e.target.value))}
                        className="bg-black/50 border border-brand-blue text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                    >
                        <option value={101}>Patient 101 (John Doe)</option>
                        <option value={102}>Patient 102 (Jane Smith)</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-blue"></div>
                </div>
            ) : sessions.length === 0 ? (
                <div className="h-64 flex items-center justify-center bg-gray-900/40 rounded-2xl border border-white/5">
                    <p className="text-gray-400 text-lg">No sessions logged for this patient yet.</p>
                </div>
            ) : (
                <>
                    {/* Key Metrics Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="stat-card">
                            <p className="stat-label">Last Session Score</p>
                            <p className="stat-value text-blue">{lastScore}%</p>
                        </div>
                        <div className="stat-card">
                            <p className="stat-label">All-Time Reps</p>
                            <p className="stat-value text-green">{totalCompleted}</p>
                        </div>
                        <div className="stat-card">
                            <p className="stat-label">Avg Reported Pain</p>
                            <p className="stat-value text-red">{averagePain} / 10</p>
                        </div>
                    </div>

                    {/* Adherence Graph */}
                    <div className="bg-gray-900/50 p-6 rounded-2xl border border-white/10 backdrop-blur-md h-[400px]">
                        <h3 className="text-xl font-bold text-white mb-6">Patient Adherence Trend</h3>
                        <ResponsiveContainer width="100%" height="85%">
                            <LineChart data={sessions} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="displayDate" stroke="#888" tick={{ fill: '#888' }} />
                                <YAxis stroke="#888" tick={{ fill: '#888' }} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                                    itemStyle={{ color: '#60a5fa' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="adherence_score"
                                    name="Score"
                                    stroke="#3b82f6"
                                    strokeWidth={4}
                                    activeDot={{ r: 8, fill: '#60a5fa' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Messaging Widget */}
                    <div className="bg-gray-900/50 p-6 rounded-2xl border border-white/10 backdrop-blur-md flex flex-col gap-4">
                        <h3 className="text-xl font-bold text-white">Direct Message Patient {patientId}</h3>
                        <p className="text-gray-400 text-sm">Send encouragement, adjust rep targets, or notify them of physical therapy plan updates.</p>
                        <textarea
                            className="w-full bg-black/40 border border-gray-700 rounded-lg p-4 text-white focus:outline-none focus:border-brand-blue resize-none h-32"
                            placeholder="Type your message here..."
                            value={providerMessage}
                            onChange={(e) => setProviderMessage(e.target.value)}
                        />
                        <div className="flex justify-end gap-3 items-center">
                            {messageSent && <span className="text-green-400 font-medium text-sm animate-pulse">Message Sent to Database! ✓</span>}
                            <button
                                onClick={sendMessage}
                                className="bg-brand-blue hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
                            >
                                Send to Patient
                            </button>
                        </div>
                    </div>

                    {/* Fatigue Curve Graph (Feature 4 Analytics) */}
                    <div className="bg-gray-900/50 p-6 rounded-2xl border border-rose-500/20 backdrop-blur-md h-[400px]">
                        <h3 className="text-xl font-bold text-rose-400 mb-2">Fatigue Curve (Latest Session)</h3>
                        <p className="text-gray-400 text-sm mb-6">Measures muscle tension duration per repetition. A steep upward curve indicates severe muscle exhaustion.</p>
                        <ResponsiveContainer width="100%" height="80%">
                            <LineChart data={fatigueChartData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="rep" stroke="#888" tick={{ fill: '#888' }} />
                                <YAxis stroke="#888" tick={{ fill: '#888' }} domain={[0, 'auto']} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fb7185' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="seconds"
                                    name="Time (Seconds)"
                                    stroke="#fb7185"
                                    strokeWidth={4}
                                    activeDot={{ r: 8, fill: '#fda4af' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}
        </div>
    );
}
