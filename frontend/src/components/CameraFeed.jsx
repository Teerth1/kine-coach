import React, { useRef, useEffect, useState } from 'react';
import { Camera } from '@mediapipe/camera_utils';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { playSuccessDing, playErrorBuzzer } from '../utils/audioGamification';

export default function CameraFeed({ onRepCompleted, exerciseType = 'SQUAT' }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const workerRef = useRef(null);
    const [trackingData, setTrackingData] = useState({ kneeAngle: 0, hipAngle: 0, phase: 'STANDING' });

    // Ticket 5.3: Onboarding modal — shows once until the patient clicks "Got it!"
    const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem('kinecoach_onboarded'));

    // Ticket 6.3: Form warning toast — auto-cleared after 2.5s
    const [warningMsg, setWarningMsg] = useState(null);
    const warningTimerRef = useRef(null);

    useEffect(() => {
        // 1. Initialize the AI Web Worker instance
        workerRef.current = new Worker(new URL('../cv-model/poseWorker.js', import.meta.url), { type: 'module' });

        workerRef.current.onmessage = (e) => {
            const data = e.data;
            if (data.type === 'TRACKING_UPDATE') {
                setTrackingData({ kneeAngle: Math.round(data.angles.knee || data.angles.elbow || data.angles.shoulder || 0), hipAngle: Math.round(data.angles.hip || 0), phase: data.phase });
            } else if (data.type === 'REP_COMPLETED') {
                // 🔊 Play audio feedback based on rep quality!
                if (data.quality === 'PERFECT') {
                    playSuccessDing();
                } else {
                    playErrorBuzzer();
                }
                // Fire event up to parent Dashboard with stats (Perfect vs Shallow)
                if (onRepCompleted) onRepCompleted(data);
            } else if (data.type === 'WARNING') {
                // ⚠️ Show form correction warning toast (clears automatically after 2.5s)
                setWarningMsg(data.message);
                if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
                warningTimerRef.current = setTimeout(() => setWarningMsg(null), 2500);
            }
        };

        // 2. Initialize Google MediaPipe Pose Model
        const pose = new Pose({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        // 3. Setup the MediaPipe frame callback
        pose.onResults((results) => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!canvas || !video) return;

            const ctx = canvas.getContext('2d');
            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Paint the web camera frame to the canvas
            ctx.globalCompositeOperation = 'source-in';
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'destination-atop';
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

            // If we see a human body
            if (results.poseLandmarks) {
                // A. Draw the skeletal wireframe dots
                ctx.globalCompositeOperation = 'source-over';
                drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
                drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2, radius: 4 });

                // B. Send the raw 3D coordinates + exercise type to the Web Worker
                workerRef.current.postMessage({
                    type: 'PROCESS_FRAME',
                    landmarks: results.poseLandmarks,
                    exerciseType: exerciseType,
                });
            }
            ctx.restore();
        });

        // 4. Start the HTML5 Webcam streaming continuously to MediaPipe
        if (videoRef.current) {
            const camera = new Camera(videoRef.current, {
                onFrame: async () => {
                    await pose.send({ image: videoRef.current });
                },
                width: 1280,
                height: 720,
            });
            camera.start();
        }

        return () => {
            // Cleanup when navigating away
            if (workerRef.current) workerRef.current.terminate();
        };
    }, [onRepCompleted]);

    return (
        <div className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl bg-gray-900 border-4 border-gray-800 group">

            {/* 👋 Ticket 5.3: First-Time Onboarding Overlay */}
            {showOnboarding && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-6xl mb-4">🦷</div>
                    <h2 className="text-white text-3xl font-black mb-3">Get in Position!</h2>
                    <p className="text-gray-300 text-lg mb-6 max-w-sm">
                        Stand <strong>4–5 feet</strong> from your camera.<br />
                        Face it <strong>directly</strong>, keep your <strong>full body visible</strong>.
                    </p>
                    <div className="text-5xl mb-6">🧘</div>
                    <p className="text-gray-400 text-sm mb-8">Make sure your <strong className="text-white">knees, hips, and shoulders</strong> are all in the frame.</p>
                    <button
                        onClick={() => { localStorage.setItem('kinecoach_onboarded', 'true'); setShowOnboarding(false); }}
                        className="bg-brand-blue hover:bg-blue-500 text-white font-black text-lg px-10 py-4 rounded-2xl transition-all duration-200 shadow-xl shadow-brand-blue/40 hover:-translate-y-1"
                    >
                        👍 Got it, let’s go!
                    </button>
                </div>
            )}

            {/* ⚠️ Ticket 6.3: Form Correction Warning Toast */}
            {warningMsg && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-red-600/90 backdrop-blur-md text-white font-bold px-6 py-3 rounded-2xl shadow-2xl border border-red-400/50 text-sm animate-pulse">
                    {warningMsg}
                </div>
            )}

            {/* Absolute Header Overlay */}
            <div className="absolute top-6 left-6 z-10 bg-black/50 backdrop-blur-md rounded-xl px-6 py-4 border border-white/10">
                <h2 className="text-white text-3xl font-bold tracking-tight mb-1">Live Engine</h2>
                <div className="flex items-center space-x-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <p className="text-green-400 font-medium tracking-wide">AI CV Active</p>
                </div>
            </div>

            {/* Physics Data Overlay */}
            <div className="absolute top-6 right-6 z-10 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 min-w-[200px]">
                <p className="text-gray-300 text-sm font-semibold uppercase tracking-wider mb-2">Current Phase</p>
                <p className="text-white text-2xl font-black">{trackingData.phase}</p>
                <p className="text-gray-300 text-sm font-semibold uppercase tracking-wider mb-2">Hip Angle</p>
                <p className="text-blue-400 text-4xl font-black drop-shadow-md mb-4">
                    {trackingData.hipAngle}°
                </p>
                <div className="h-px bg-white/20 my-4" />
                <p className="text-gray-300 text-sm font-semibold uppercase tracking-wider mb-2">Knee Angle</p>
                <p className="text-yellow-400 text-5xl font-black drop-shadow-md">
                    {trackingData.kneeAngle}°
                </p>
            </div>

            {/* Hidden Video (MediaPipe engine reads from this) */}
            <video ref={videoRef} className="hidden" playsInline autoPlay muted />

            {/* Visible Canvas (Paints the skeleton wires over the webcam) */}
            <canvas
                ref={canvasRef}
                width="1280"
                height="720"
                className="w-full h-auto object-cover transform scale-x-[-1] transition-transform duration-500 ease-out group-hover:scale-105"
            />
        </div>
    );
}
