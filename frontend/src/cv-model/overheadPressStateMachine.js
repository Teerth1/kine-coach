/**
 * State Machine to track an Overhead Press (OHP) movement.
 * Evaluates elbow angle from a bent "rack" position up to a full lockout overhead.
 *
 * MediaPipe Landmarks used:
 *   Hip(24), Shoulder(12), Elbow(14), Wrist(16)
 */

export const OHP_STATES = {
    RACK: 'RACK',           // Arms bent, bar at shoulder level
    PRESSING: 'PRESSING',   // Bar moving upward
    LOCKOUT: 'LOCKOUT',     // Arms fully extended overhead
    DESCENDING: 'DESCENDING'
};



export class OverheadPressStateMachine {
    constructor() {
        this.currentState = OHP_STATES.RACK;
        this.highestElbowAngle = 0;
        this.repCount = {
            total: 0,
            perfect: 0,   // Full lockout ≥ 160°
            partial: 0    // Did not achieve full lockout
        };
        this.THRESHOLDS = {
            ELBOW_RACK_MAX: 80,
            ELBOW_LOCKOUT: 160,
            ELBOW_PRESS_START: 100
        };
    }

    /**
     * @param {number} elbowAngle - Smoothed elbow angle
     * @returns {Object} Tracking event or rep completion
     */
    update(elbowAngle) {
        if (elbowAngle > this.highestElbowAngle) {
            this.highestElbowAngle = elbowAngle;
        }

        switch (this.currentState) {
            case OHP_STATES.RACK:
                // They start pressing when elbow goes past the rack threshold
                if (elbowAngle > this.THRESHOLDS.ELBOW_PRESS_START) {
                    this.currentState = OHP_STATES.PRESSING;
                    this.highestElbowAngle = elbowAngle;
                }
                break;

            case OHP_STATES.PRESSING:
                if (elbowAngle >= this.THRESHOLDS.ELBOW_LOCKOUT) {
                    this.currentState = OHP_STATES.LOCKOUT;
                }
                // They gave up before lockout - start descending
                else if (elbowAngle < this.highestElbowAngle - 10) {
                    this.currentState = OHP_STATES.DESCENDING;
                }
                break;

            case OHP_STATES.LOCKOUT:
                // Any angle drop means they are coming back down
                if (elbowAngle < this.THRESHOLDS.ELBOW_LOCKOUT - 10) {
                    this.currentState = OHP_STATES.DESCENDING;
                }
                break;

            case OHP_STATES.DESCENDING:
                // Rep complete when elbows return to rack position
                if (elbowAngle <= this.THRESHOLDS.ELBOW_RACK_MAX) {
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
        let quality;

        if (this.highestElbowAngle >= this.THRESHOLDS.ELBOW_LOCKOUT) {
            quality = 'PERFECT';
            this.repCount.perfect++;
        } else {
            quality = 'PARTIAL';
            this.repCount.partial++;
        }

        this.currentState = OHP_STATES.RACK;
        this.highestElbowAngle = 0;

        return {
            event: 'REP_COMPLETED',
            quality: quality,
            stats: { ...this.repCount }
        };
    }
}
