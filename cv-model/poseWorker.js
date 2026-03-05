import { calculateAngle } from './angleMath.js';
import { SquatStateMachine } from './stateMachine.js';

// Initialize the tracking engine
const squatEngine = new SquatStateMachine();

/**
 * Web Worker Message Listener
 * Listens for 33 landmark points sent from the React UI's CameraFeed component.
 */
self.onmessage = function (e) {
    const { type, landmarks } = e.data;

    // We only care about processing actual frame data
    if (type !== 'PROCESS_FRAME' || !landmarks) {
        return;
    }

    // MediaPipe Pose Landmark Indices:
    // 24: Right Hip, 26: Right Knee, 28: Right Ankle
    const hip = landmarks[24];
    const knee = landmarks[26];
    const ankle = landmarks[28];

    // Shoulder (12) used to calculate full hip bend if needed
    const shoulder = landmarks[12];

    // Ensure the required joints are visible in frame before doing math
    if (!hip || !knee || !ankle || hip.visibility < 0.5 || knee.visibility < 0.5) {
        self.postMessage({ type: 'WARNING', message: 'Joints obscured' });
        return;
    }

    // 1. Calculate Angles using our Math Module
    const kneeAngle = calculateAngle(hip, knee, ankle);
    const hipAngle = calculateAngle(shoulder, hip, knee);

    // 2. Feed angles into the State Machine
    const result = squatEngine.update(kneeAngle, hipAngle);

    // 3. Emit real-time tracking data so the Patient UI can draw "120°" over their knee
    self.postMessage({
        type: 'TRACKING_UPDATE',
        angles: {
            knee: kneeAngle,
            hip: hipAngle
        },
        phase: squatEngine.currentState
    });

    // 4. Emit special events if a rep was officially completed
    if (result && result.event === 'REP_COMPLETED') {
        self.postMessage({
            type: 'REP_COMPLETED',
            quality: result.quality,      // 'PERFECT' or 'SHALLOW'
            stats: result.stats
        });
    }
};
