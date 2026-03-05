import React, { useRef, useEffect, useState } from 'react';
import { Camera } from '@mediapipe/camera_utils';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

export default function CameraFeed({ onRepCompleted }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const workerRef = useRef(null);
    const [trackingData, setTrackingData] = useState({ kneeAngle: 0, hipAngle: 0, phase: 'STANDING' });

    useEffect(() => {
        // 1. Initialize the AI Web Worker instance
        workerRef.current = new Worker(new URL('../cv-model/poseWorker.js', import.meta.url), { type: 'module' });

        workerRef.current.onmessage = (e) => {
            const data = e.data;
            if (data.type === 'TRACKING_UPDATE') {
                // Update local React state with the latest knee and hip angles from the physics engine
                setTrackingData({ kneeAngle: Math.round(data.angles.knee), hipAngle: Math.round(data.angles.hip), phase: data.phase });
            } else if (data.type === 'REP_COMPLETED') {
                // Fire event up to parent Dashboard with stats (Perfect vs Shallow)
                if (onRepCompleted) onRepCompleted(data);
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

                // B. Send the raw 3D coordinates to our Web Worker (poseWorker.js) so the math math doesn't lag the UI!
                workerRef.current.postMessage({
                    type: 'PROCESS_FRAME',
                    landmarks: results.poseLandmarks
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
