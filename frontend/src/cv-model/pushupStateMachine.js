/**
 * State Machine to track a user's pushup movement through its phases.
 * Evaluates elbow and shoulder angles frame-by-frame.
 */

export const PUSHUP_STATES = {
    PLANK: 'PLANK',
    DESCENDING: 'DESCENDING',
    BOTTOM: 'BOTTOM',       // The core evaluation phase
    ASCENDING: 'ASCENDING'
};



export class PushupStateMachine {
    constructor() {
        this.currentState = PUSHUP_STATES.PLANK;

        // Track the deepest point of the current rep to grade it
        this.lowestElbowAngle = 180;
        this.repCount = {
            total: 0,
            perfect: 0,
            shallow: 0
        };
        this.THRESHOLDS = {
            ELBOW_PLANK: 160,
            SHOULDER_PLANK: 60,
            ELBOW_PUSHUP_PERFECT: 90,
            ELBOW_PUSHUP_START: 140
        };
    }

    /**
     * Processes a single frame of angles.
     * @param {number} elbowAngle 
     * @param {number} shoulderAngle 
     * @returns {Object|null} If a rep is finished, returns event details.
     */
    update(elbowAngle, shoulderAngle) {
        if (elbowAngle < this.lowestElbowAngle) {
            this.lowestElbowAngle = elbowAngle;
        }

        switch (this.currentState) {
            case PUSHUP_STATES.PLANK:
                if (elbowAngle < this.THRESHOLDS.ELBOW_PUSHUP_START) {
                    this.currentState = PUSHUP_STATES.DESCENDING;
                    this.lowestElbowAngle = elbowAngle; // Reset on new rep start
                }
                break;

            case PUSHUP_STATES.DESCENDING:
                // If they go deep enough, they officially hit the "BOTTOM" state
                if (elbowAngle <= this.THRESHOLDS.ELBOW_PUSHUP_PERFECT) {
                    this.currentState = PUSHUP_STATES.BOTTOM;
                }
                // If they don't go deep but start coming back up (ascending prematurely)
                else if (elbowAngle > this.lowestElbowAngle + 10) {
                    this.currentState = PUSHUP_STATES.ASCENDING;
                }
                break;

            case PUSHUP_STATES.BOTTOM:
                // Coming back up from the deep pushup
                if (elbowAngle > this.THRESHOLDS.ELBOW_PUSHUP_PERFECT + 15) {
                    this.currentState = PUSHUP_STATES.ASCENDING;
                }
                break;

            case PUSHUP_STATES.ASCENDING:
                // Pushed all the way back up to plank
                if (elbowAngle >= this.THRESHOLDS.ELBOW_PLANK) {
                    // Rep is officially finished.
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
        let quality = 'SHALLOW';

        // 90 degrees or less elbow bend is a perfect pushup
        if (this.lowestElbowAngle <= this.THRESHOLDS.ELBOW_PUSHUP_PERFECT) {
            quality = 'PERFECT';
            this.repCount.perfect++;
        } else {
            this.repCount.shallow++;
        }

        this.currentState = PUSHUP_STATES.PLANK;
        this.lowestElbowAngle = 180;

        return {
            event: 'REP_COMPLETED',
            quality: quality,
            stats: { ...this.repCount }
        };
    }
}
