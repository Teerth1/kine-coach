/**
 * State Machine to track a user's squat movement through its phases.
 * Evaluates knee and hip angles frame-by-frame.
 */

// Define discrete phases of the movement
export const STATES = {
    STANDING: 'STANDING',
    DESCENDING: 'DESCENDING',
    BOTTOM: 'BOTTOM',       // The core evaluation phase
    ASCENDING: 'ASCENDING'
};

// Thresholds based on general PT norms
const THRESHOLDS = {
    KNEE_STANDING: 160,
    HIP_STANDING: 160,
    KNEE_SQUAT_PERFECT: 90,   // Knee bent deep enough for a perfect rep
    KNEE_SQUAT_START: 120,   // Lowered from 130 — avoids jitter false-triggers
    KNEE_MIN_DEPTH: 140,   // Anti-phantom gate: discard rep if knee never bent this far
};

export class SquatStateMachine {
    constructor() {
        this.currentState = STATES.STANDING;

        // Track the deepest point of the current rep to grade it
        this.lowestKneeAngle = 180;
        this.repCount = {
            total: 0,
            perfect: 0,
            shallow: 0
        };
    }

    /**
     * Processes a single frame of angles.
     * @param {number} kneeAngle 
     * @param {number} hipAngle 
     * @returns {Object|null} If a rep is finished, returns event details.
     */
    update(kneeAngle, hipAngle) {
        // Only track depth while actively squatting — scoping prevents standing jitter from poisoning rep grade
        if ((this.currentState === STATES.DESCENDING || this.currentState === STATES.BOTTOM) &&
            kneeAngle < this.lowestKneeAngle) {
            this.lowestKneeAngle = kneeAngle;
        }

        switch (this.currentState) {
            case STATES.STANDING:
                if (kneeAngle < THRESHOLDS.KNEE_SQUAT_START) {
                    this.currentState = STATES.DESCENDING;
                    this.lowestKneeAngle = kneeAngle; // Reset on new rep start
                }
                break;

            case STATES.DESCENDING:
                // If they go deep enough, they officially hit the "BOTTOM" state
                if (kneeAngle <= THRESHOLDS.KNEE_SQUAT_PERFECT) {
                    this.currentState = STATES.BOTTOM;
                }
                // If they don't go deep but start coming back up (ascending prematurely)
                // we transition to ASCENDING but they miss out on BOTTOM
                else if (kneeAngle > this.lowestKneeAngle + 10) {
                    this.currentState = STATES.ASCENDING;
                }
                break;

            case STATES.BOTTOM:
                // They are coming back up from the deep squat
                if (kneeAngle > THRESHOLDS.KNEE_SQUAT_PERFECT + 15) {
                    this.currentState = STATES.ASCENDING;
                }
                break;

            case STATES.ASCENDING:
                if (kneeAngle >= THRESHOLDS.KNEE_STANDING && hipAngle >= THRESHOLDS.HIP_STANDING) {
                    // Rep is officially finished. Let's grade it!
                    const result = this._gradeAndResetRep();
                    return result;
                }
                break;
        }

        // Return current status to paint on the UI if no rep finished
        return {
            event: 'TRACKING',
            phase: this.currentState,
            currentKnee: kneeAngle
        };
    }

    /**
     * Private inside function to grade the rep and reset for the next one.
     */
    _gradeAndResetRep() {
        // 🛡️ Anti-phantom gate: if the knee barely bent (pure jitter cycle), silently reset without counting
        if (this.lowestKneeAngle >= THRESHOLDS.KNEE_MIN_DEPTH) {
            this.currentState = STATES.STANDING;
            this.lowestKneeAngle = 180;
            return { event: 'TRACKING', phase: STATES.STANDING, currentKnee: 180 };
        }

        this.repCount.total++;
        let quality = 'SHALLOW';

        // Did they hit the required 90 degree mark during this rep?
        if (this.lowestKneeAngle <= THRESHOLDS.KNEE_SQUAT_PERFECT) {
            quality = 'PERFECT';
            this.repCount.perfect++;
        } else {
            this.repCount.shallow++;
        }

        this.currentState = STATES.STANDING;
        this.lowestKneeAngle = 180; // Reset for next

        return {
            event: 'REP_COMPLETED',
            quality: quality,
            stats: { ...this.repCount }
        };
    }
}
