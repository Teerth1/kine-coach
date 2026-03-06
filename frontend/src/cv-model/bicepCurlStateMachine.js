/**
 * Bicep Curl State Machine
 * Tracks elbow flexion/extension using shoulder → elbow → wrist angle.
 *
 * Perfect Rep:  Elbow curls down to ≤ 60° (full contraction) AND
 *               returns to ≥ 155° (full extension at the bottom).
 * Shallow Rep:  Elbow only reaches 60°–90° without full contraction.
 *
 * States: EXTENDED → CURLING → PEAK → LOWERING → EXTENDED (rep counted)
 */

export const BICEP_CURL_STATES = {
    EXTENDED: 'EXTENDED',       // Arm hanging down, fully straight
    CURLING: 'CURLING',        // Arm bending upward toward peak
    PEAK: 'PEAK',           // Maximum contraction reached
    LOWERING: 'LOWERING'        // Arm returning to full extension
};

const THRESHOLDS = {
    ELBOW_EXTENDED: 145,   // Arm counted as "down" — lower threshold = more forgiving
    ELBOW_CURL_START: 130,   // Intentional bend starts here (avoids false triggers from natural arm bend)
    ELBOW_CURL_PERFECT: 55,   // Full contraction — a proper curl
    ELBOW_CURL_SHALLOW: 80,   // Minimum acceptable depth
};

export class BicepCurlStateMachine {
    constructor() {
        this.currentState = BICEP_CURL_STATES.EXTENDED;

        // Track the minimum (most flexed) angle reached in the current rep
        this.peakElbowAngle = 180;

        this.repCount = {
            total: 0,
            perfect: 0,
            shallow: 0
        };
    }

    /**
     * Processes a single frame of elbow angle.
     * @param {number} elbowAngle - The angle at the elbow joint (shoulder→elbow→wrist)
     * @returns {Object} Tracking data, or REP_COMPLETED event when a rep finishes.
     */
    update(elbowAngle) {
        // Only track the most contracted point while actively curling — not while resting
        if ((this.currentState === BICEP_CURL_STATES.CURLING ||
            this.currentState === BICEP_CURL_STATES.PEAK) &&
            elbowAngle < this.peakElbowAngle) {
            this.peakElbowAngle = elbowAngle;
        }

        switch (this.currentState) {

            case BICEP_CURL_STATES.EXTENDED:
                // Patient started lifting — arm began bending
                if (elbowAngle < THRESHOLDS.ELBOW_CURL_START) {
                    this.currentState = BICEP_CURL_STATES.CURLING;
                    this.peakElbowAngle = elbowAngle; // Reset tracker for this rep
                }
                break;

            case BICEP_CURL_STATES.CURLING:
                // ✅ Patient curled deep enough — perfect contraction!
                if (elbowAngle <= THRESHOLDS.ELBOW_CURL_PERFECT) {
                    this.currentState = BICEP_CURL_STATES.PEAK;
                }
                // Patient peaked early and started lowering without full contraction
                else if (elbowAngle > this.peakElbowAngle + 12) {
                    this.currentState = BICEP_CURL_STATES.LOWERING;
                }
                break;

            case BICEP_CURL_STATES.PEAK:
                // Patient has started lowering their arm from the top
                if (elbowAngle > THRESHOLDS.ELBOW_CURL_PERFECT + 15) {
                    this.currentState = BICEP_CURL_STATES.LOWERING;
                }
                break;

            case BICEP_CURL_STATES.LOWERING:
                // Arm is fully lowered back to start → rep is complete!
                if (elbowAngle >= THRESHOLDS.ELBOW_EXTENDED) {
                    return this._gradeAndResetRep();
                }
                break;
        }

        return {
            event: 'TRACKING',
            phase: this.currentState,
            currentAngle: elbowAngle
        };
    }

    _gradeAndResetRep() {
        this.repCount.total++;

        // Grade: perfect requires reaching full 60° contraction at peak
        const quality = this.peakElbowAngle <= THRESHOLDS.ELBOW_CURL_PERFECT
            ? 'PERFECT'
            : 'SHALLOW';

        if (quality === 'PERFECT') {
            this.repCount.perfect++;
        } else {
            this.repCount.shallow++;
        }

        // Reset for the next repetition
        this.currentState = BICEP_CURL_STATES.EXTENDED;
        this.peakElbowAngle = 180;

        return {
            event: 'REP_COMPLETED',
            quality: quality,
            stats: { ...this.repCount }
        };
    }
}
