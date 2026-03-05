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
