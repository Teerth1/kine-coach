/**
 * Shoulder Abduction (Lateral Raise) State Machine
 * Tracks the angle at the shoulder using the hip → shoulder → elbow vector.
 *
 * Biomechanics:
 *  - Arms at rest by the torso: shoulder angle ≈ 5-25°
 *  - Arms raised to shoulder height: shoulder angle ≈ 80-90°
 *
 * Perfect Rep: Elbow reaches ≥ 80° (arm parallel to floor)
 * Shallow Rep: Elbow only reaches 45-79° (half-raise)
 *
 * States: RESTING → RAISING → TOP → LOWERING → RESTING (rep counted)
 */

export const SHOULDER_ABD_STATES = {
    RESTING: 'RESTING',  // Arms by side
    RAISING: 'RAISING',  // Actively going up
    TOP: 'TOP',      // Reached peak height
    LOWERING: 'LOWERING'  // Coming back down
};

const THRESHOLDS = {
    ARM_RESTING: 30,  // Below this = at rest / lowered
    ARM_RAISE_START: 40,  // Intentional lift begins
    ARM_PERFECT: 80,  // Arm is parallel to floor — perfect
    ARM_SHALLOW: 50,  // Minimum acceptable height
};

export class ShoulderAbductionStateMachine {
    constructor() {
        this.currentState = SHOULDER_ABD_STATES.RESTING;
        // Track the highest point reached during the raise
        this.peakAbductionAngle = 0;
        this.repCount = {
            total: 0,
            perfect: 0,
            shallow: 0
        };
    }

    /**
     * Processes a single frame.
     * @param {number} shoulderAngle - Angle at the shoulder (hip → shoulder → elbow)
     * @returns {Object} Tracking event or REP_COMPLETED when a rep finishes.
     */
    update(shoulderAngle) {
        // Track peak (highest arm position) only while actively raising
        if ((this.currentState === SHOULDER_ABD_STATES.RAISING ||
            this.currentState === SHOULDER_ABD_STATES.TOP) &&
            shoulderAngle > this.peakAbductionAngle) {
            this.peakAbductionAngle = shoulderAngle;
        }

        switch (this.currentState) {

            case SHOULDER_ABD_STATES.RESTING:
                // Patient intentionally started lifting their arm
                if (shoulderAngle > THRESHOLDS.ARM_RAISE_START) {
                    this.currentState = SHOULDER_ABD_STATES.RAISING;
                    this.peakAbductionAngle = shoulderAngle; // Reset tracker
                }
                break;

            case SHOULDER_ABD_STATES.RAISING:
                // Reached perfect shoulder height — arm is parallel to floor!
                if (shoulderAngle >= THRESHOLDS.ARM_PERFECT) {
                    this.currentState = SHOULDER_ABD_STATES.TOP;
                }
                // Started lowering before reaching ideal height
                else if (shoulderAngle < this.peakAbductionAngle - 10) {
                    this.currentState = SHOULDER_ABD_STATES.LOWERING;
                }
                break;

            case SHOULDER_ABD_STATES.TOP:
                // Patient is coming back down
                if (shoulderAngle < THRESHOLDS.ARM_PERFECT - 10) {
                    this.currentState = SHOULDER_ABD_STATES.LOWERING;
                }
                break;

            case SHOULDER_ABD_STATES.LOWERING:
                // Both arms fully lowered back to rest
                if (shoulderAngle <= THRESHOLDS.ARM_RESTING) {
                    return this._gradeAndResetRep();
                }
                break;
        }

        return {
            event: 'TRACKING',
            phase: this.currentState,
            currentAngle: shoulderAngle
        };
    }

    _gradeAndResetRep() {
        // Phantom gate: if the arm barely moved, discard silently
        if (this.peakAbductionAngle < THRESHOLDS.ARM_SHALLOW) {
            this.currentState = SHOULDER_ABD_STATES.RESTING;
            this.peakAbductionAngle = 0;
            return { event: 'TRACKING', phase: SHOULDER_ABD_STATES.RESTING, currentAngle: 0 };
        }

        this.repCount.total++;
        const quality = this.peakAbductionAngle >= THRESHOLDS.ARM_PERFECT ? 'PERFECT' : 'SHALLOW';

        if (quality === 'PERFECT') {
            this.repCount.perfect++;
        } else {
            this.repCount.shallow++;
        }

        this.currentState = SHOULDER_ABD_STATES.RESTING;
        this.peakAbductionAngle = 0;

        return {
            event: 'REP_COMPLETED',
            quality: quality,
            stats: { ...this.repCount }
        };
    }
}
