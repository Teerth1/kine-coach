/**
 * State Machine to track a user's lunge movement.
 * Evaluates knee angle for depth, and X-coordinates for knee buckling (Valgus).
 */

export const LUNGE_STATES = {
    STANDING: 'STANDING',
    DESCENDING: 'DESCENDING',
    BOTTOM: 'BOTTOM',
    ASCENDING: 'ASCENDING'
};



export class LungeStateMachine {
    constructor() {
        this.currentState = LUNGE_STATES.STANDING;
        this.lowestKneeAngle = 180;
        this.valgusWarnings = 0;

        this.repCount = {
            total: 0,
            perfect: 0,
            shallow: 0,
            valgusViolations: 0
        };
        this.THRESHOLDS = {
            KNEE_STANDING: 160,
            KNEE_LUNGE_PERFECT: 90,
            KNEE_LUNGE_START: 130,
            VALGUS_WARNING_RATIO: 0.15
        };
    }

    /**
     * @param {number} kneeAngle - Smoothed angle
     * @param {Object} hip - Raw landmark {x,y}
     * @param {Object} knee - Raw landmark {x,y}
     * @param {Object} ankle - Raw landmark {x,y}
     */
    update(kneeAngle, hip, knee, ankle) {
        if (kneeAngle < this.lowestKneeAngle) {
            this.lowestKneeAngle = kneeAngle;
        }

        // Live Valgus Check: Is the knee buckling inward relative to the hip and ankle?
        // We calculate the horizontal distance from the knee to the vertical line connecting Hip to Ankle.
        let isBuckling = false;
        if (this.currentState === LUNGE_STATES.DESCENDING || this.currentState === LUNGE_STATES.BOTTOM) {
            const ankleToHipX = Math.abs(hip.x - ankle.x);
            const kneeOffset = Math.abs(knee.x - ((hip.x + ankle.x) / 2));
            if (kneeOffset > this.THRESHOLDS.VALGUS_WARNING_RATIO) {
                isBuckling = true;
                this.valgusWarnings++;
            }
        }

        switch (this.currentState) {
            case LUNGE_STATES.STANDING:
                if (kneeAngle < this.THRESHOLDS.KNEE_LUNGE_START) {
                    this.currentState = LUNGE_STATES.DESCENDING;
                    this.lowestKneeAngle = kneeAngle;
                    this.valgusWarnings = 0;
                }
                break;

            case LUNGE_STATES.DESCENDING:
                if (kneeAngle <= this.THRESHOLDS.KNEE_LUNGE_PERFECT) {
                    this.currentState = LUNGE_STATES.BOTTOM;
                }
                else if (kneeAngle > this.lowestKneeAngle + 10) {
                    this.currentState = LUNGE_STATES.ASCENDING;
                }
                break;

            case LUNGE_STATES.BOTTOM:
                if (kneeAngle > this.THRESHOLDS.KNEE_LUNGE_PERFECT + 15) {
                    this.currentState = LUNGE_STATES.ASCENDING;
                }
                break;

            case LUNGE_STATES.ASCENDING:
                if (kneeAngle >= this.THRESHOLDS.KNEE_STANDING) {
                    return this._gradeAndResetRep();
                }
                break;
        }

        return {
            event: 'TRACKING',
            phase: this.currentState,
            currentAngle: kneeAngle,
            warning: isBuckling ? 'KNEE_BUCKLING' : null
        };
    }

    _gradeAndResetRep() {
        this.repCount.total++;
        let quality = 'SHALLOW';

        if (this.lowestKneeAngle <= this.THRESHOLDS.KNEE_LUNGE_PERFECT) {
            quality = 'PERFECT';
            this.repCount.perfect++;
        } else {
            this.repCount.shallow++;
        }

        if (this.valgusWarnings > 5) { // Needs to buckle for a few frames
            this.repCount.valgusViolations++;
        }

        this.currentState = LUNGE_STATES.STANDING;
        this.lowestKneeAngle = 180;
        this.valgusWarnings = 0;

        return {
            event: 'REP_COMPLETED',
            quality: quality,
            stats: { ...this.repCount }
        };
    }
}
