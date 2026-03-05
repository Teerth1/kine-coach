/**
 * Calculates the angle between three points in 2D or 3D space.
 * 
 * @param {Object} a - First point (e.g., Hip) {x, y, z, visibility}
 * @param {Object} b - Middle point (e.g., Knee) {x, y, z, visibility}
 * @param {Object} c - End point (e.g., Ankle) {x, y, z, visibility}
 * @returns {number} The angle in degrees (0-180)
 */
export function calculateAngle(a, b, c) {
    if (!a || !b || !c) return 0;

    // Use atan2 to get the angle in radians between the three coordinates
    // We primarily use x and y for front/side angle detection.
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);

    // Normalize to 180 degrees max since joints don't bend past that usually
    if (angle > 180.0) {
        angle = 360 - angle;
    }

    // Round to 1 decimal place for stable UI painting
    return Math.round(angle * 10) / 10;
}

/**
 * Exponential Moving Average (EMA) Filter
 * Smooths raw skeletal coordinates to prevent the on-screen UI numbers from flickering 3-4 degrees every frame.
 */
export class JitterFilter {
    constructor(alpha = 0.4) {
        this.alpha = alpha; // 0.0 to 1.0 (Lower = more smoothing, less responsive; Higher = more responsive, less smoothing)
        this.previousValue = null;
    }

    /**
     * Filters a new raw angle and returns the smoothed angle.
     */
    filter(currentValue) {
        if (this.previousValue === null) {
            this.previousValue = currentValue;
            return currentValue;
        }

        // EMA Formula: Smoothed = (Alpha * Current) + ((1 - Alpha) * Previous)
        const smoothedValue = (this.alpha * currentValue) + ((1 - this.alpha) * this.previousValue);
        this.previousValue = smoothedValue;

        return Math.round(smoothedValue * 10) / 10;
    }

    // Reset the filter when the patient stops or switches exercises
    reset() {
        this.previousValue = null;
    }
}
