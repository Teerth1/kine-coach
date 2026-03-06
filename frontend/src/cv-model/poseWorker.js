import { calculateAngle, JitterFilter } from './angleMath.js';
import { SquatStateMachine } from './stateMachine.js';
import { PushupStateMachine } from './pushupStateMachine.js';
import { LungeStateMachine } from './lungeStateMachine.js';
import { OverheadPressStateMachine } from './overheadPressStateMachine.js';
import { BicepCurlStateMachine } from './bicepCurlStateMachine.js';
import { ShoulderAbductionStateMachine } from './shoulderAbductionStateMachine.js';

// Initialize all tracking engines
const squatEngine = new SquatStateMachine();
const pushupEngine = new PushupStateMachine();
const lungeEngine = new LungeStateMachine();
const ohpEngine = new OverheadPressStateMachine();
const bicepCurlEngine = new BicepCurlStateMachine();
const shoulderAbdEngine = new ShoulderAbductionStateMachine();

// Initialize the Jitter Smoothing Filters (one per joint angle tracked)
const kneeFilter = new JitterFilter(0.4);
const hipFilter = new JitterFilter(0.4);
const elbowFilter = new JitterFilter(0.4);
const shoulderFilter = new JitterFilter(0.4);
const ankleFilter = new JitterFilter(0.4);

/**
 * Web Worker Message Listener
 * Listens for 33 landmark points sent from the React UI's CameraFeed component.
 */
self.onmessage = function (e) {
    const { type, landmarks, exerciseType = 'SQUAT' } = e.data;

    if (type !== 'PROCESS_FRAME' || !landmarks) return;

    // MediaPipe Pose Landmark Indices:
    const shoulder = landmarks[12]; // Right Shoulder
    const elbow = landmarks[14];    // Right Elbow
    const wrist = landmarks[16];    // Right Wrist
    const hip = landmarks[24];      // Right Hip
    const knee = landmarks[26];     // Right Knee
    const ankle = landmarks[28];    // Right Ankle

    if (exerciseType === 'SQUAT') {
        if (!hip || !knee || !ankle || hip.visibility < 0.5 || knee.visibility < 0.5) {
            self.postMessage({ type: 'WARNING', message: 'Leg joints obscured' });
            return;
        }

        // Calculate and SMOOTH the angles
        const rawKneeAngle = calculateAngle(hip, knee, ankle);
        const rawHipAngle = calculateAngle(shoulder, hip, knee);

        const kneeAngle = kneeFilter.filter(rawKneeAngle);
        const hipAngle = hipFilter.filter(rawHipAngle);

        const result = squatEngine.update(kneeAngle, hipAngle);

        self.postMessage({
            type: 'TRACKING_UPDATE',
            angles: { knee: kneeAngle, hip: hipAngle },
            phase: squatEngine.currentState
        });

        if (result && result.event === 'REP_COMPLETED') {
            self.postMessage({ type: 'REP_COMPLETED', quality: result.quality, stats: result.stats });
        }
    }
    else if (exerciseType === 'PUSHUP') {
        if (!shoulder || !elbow || !wrist || shoulder.visibility < 0.5 || elbow.visibility < 0.5) {
            self.postMessage({ type: 'WARNING', message: 'Arm joints obscured' });
            return;
        }

        const rawElbowAngle = calculateAngle(shoulder, elbow, wrist);
        const rawShoulderAngle = calculateAngle(hip, shoulder, elbow);

        const elbowAngle = elbowFilter.filter(rawElbowAngle);
        const shoulderAngle = shoulderFilter.filter(rawShoulderAngle);

        const result = pushupEngine.update(elbowAngle, shoulderAngle);

        self.postMessage({
            type: 'TRACKING_UPDATE',
            angles: { elbow: elbowAngle, shoulder: shoulderAngle },
            phase: pushupEngine.currentState
        });

        if (result && result.event === 'REP_COMPLETED') {
            self.postMessage({ type: 'REP_COMPLETED', quality: result.quality, stats: result.stats });
        }
    }
    else if (exerciseType === 'LUNGE') {
        if (!hip || !knee || !ankle || hip.visibility < 0.5 || knee.visibility < 0.5) {
            self.postMessage({ type: 'WARNING', message: 'Leg joints obscured' });
            return;
        }

        const rawKneeAngle = calculateAngle(hip, knee, ankle);
        const kneeAngle = kneeFilter.filter(rawKneeAngle);

        const result = lungeEngine.update(kneeAngle, hip, knee, ankle);

        self.postMessage({
            type: 'TRACKING_UPDATE',
            angles: { knee: kneeAngle },
            phase: lungeEngine.currentState,
            warning: result.warning || null
        });

        if (result && result.event === 'REP_COMPLETED') {
            self.postMessage({ type: 'REP_COMPLETED', quality: result.quality, stats: result.stats });
        }
    }
    else if (exerciseType === 'OVERHEAD_PRESS') {
        if (!shoulder || !elbow || !wrist || shoulder.visibility < 0.5 || elbow.visibility < 0.5) {
            self.postMessage({ type: 'WARNING', message: 'Arm joints obscured' });
            return;
        }

        const rawElbowAngle = calculateAngle(shoulder, elbow, wrist);
        const elbowAngle = elbowFilter.filter(rawElbowAngle);

        const result = ohpEngine.update(elbowAngle);

        self.postMessage({
            type: 'TRACKING_UPDATE',
            angles: { elbow: elbowAngle },
            phase: ohpEngine.currentState
        });

        if (result && result.event === 'REP_COMPLETED') {
            self.postMessage({ type: 'REP_COMPLETED', quality: result.quality, stats: result.stats });
        }
    }
    else if (exerciseType === 'BICEP_CURL') {
        if (!shoulder || !elbow || !wrist || shoulder.visibility < 0.5 || elbow.visibility < 0.5) {
            self.postMessage({ type: 'WARNING', message: 'Arm joints obscured — step back so your full arm is visible' });
            return;
        }

        // The elbow angle (shoulder → elbow → wrist) is the primary signal
        const rawElbowAngle = calculateAngle(shoulder, elbow, wrist);
        const elbowAngle = elbowFilter.filter(rawElbowAngle);

        const result = bicepCurlEngine.update(elbowAngle);

        self.postMessage({
            type: 'TRACKING_UPDATE',
            angles: { elbow: elbowAngle },
            phase: bicepCurlEngine.currentState
        });

        if (result && result.event === 'REP_COMPLETED') {
            self.postMessage({ type: 'REP_COMPLETED', quality: result.quality, stats: result.stats });
        }

        // 🛡️ Ticket 6.3: Back-arch cheat detection
        // If the shoulder is significantly behind the hip horizontally, the patient is leaning back!
        const torsoLeanBack = hip.x - shoulder.x; // Positive = shoulder behind hip = leaning back
        if (torsoLeanBack > 0.06) { // > 6% of frame width = clear lean
            self.postMessage({ type: 'WARNING', message: '⚠️ Keep your back straight! You\'re leaning back.' });
        }
    }
    else if (exerciseType === 'SHOULDER_ABDUCTION') {
        if (!hip || !shoulder || !elbow || shoulder.visibility < 0.5 || elbow.visibility < 0.5) {
            self.postMessage({ type: 'WARNING', message: 'Upper body not visible — step back from the camera' });
            return;
        }

        // Angle at the shoulder: hip → shoulder → elbow
        const rawShoulderAngle = calculateAngle(hip, shoulder, elbow);
        const shoulderAngle = shoulderFilter.filter(rawShoulderAngle);

        const result = shoulderAbdEngine.update(shoulderAngle);

        self.postMessage({
            type: 'TRACKING_UPDATE',
            angles: { shoulder: shoulderAngle },
            phase: shoulderAbdEngine.currentState
        });

        if (result && result.event === 'REP_COMPLETED') {
            self.postMessage({ type: 'REP_COMPLETED', quality: result.quality, stats: result.stats });
        }
    }
};
