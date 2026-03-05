import { calculateAngle } from './angleMath.js';
import { SquatStateMachine } from './stateMachine.js';

console.log("=== KINE-COACH AI/CV ENGINE TEST ===");

// 1. Test the Math Engine directly
console.log("\n--- Testing angleMath.js ---");
const hip = { x: 0.5, y: 0.5, z: 0 };
const knee = { x: 0.5, y: 0.7, z: 0 };
const ankle = { x: 0.5, y: 0.9, z: 0 };
const straightLeg = calculateAngle(hip, knee, ankle);
console.log(`Straight Leg Angle (Expected ~180): ${straightLeg}°`);

const bentKnee = { x: 0.8, y: 0.7, z: 0 }; // Push knee forward
const squatLeg = calculateAngle(hip, bentKnee, ankle);
console.log(`Bent Leg Angle (Expected <100): ${squatLeg}°`);

// 2. Test the Squat State Machine logic
console.log("\n--- Testing stateMachine.js ---");
const engine = new SquatStateMachine();

// Mock a sequence of frames representing a PERFECT squat
const perfectRepSequence = [
    { name: "Standing", knee: 170, hip: 170 },
    { name: "Descending", knee: 120, hip: 130 },
    { name: "Bottom (Deep)", knee: 85, hip: 90 }, // Below 90 threshold
    { name: "Ascending", knee: 130, hip: 140 },
    { name: "Standing Up", knee: 165, hip: 165 }
];

console.log("Simulating a PERFECT rep sequence...");
let repResult = null;
for (const frame of perfectRepSequence) {
    console.log(`[Frame] ${frame.name} - Knee: ${frame.knee}°`);
    const status = engine.update(frame.knee, frame.hip);
    if (status && status.event === 'REP_COMPLETED') {
        repResult = status;
    }
}
console.log(">> Result emitted by State Machine:", repResult);


// Mock a sequence of frames representing a SHALLOW squat
const shallowRepSequence = [
    { name: "Standing", knee: 170, hip: 170 },
    { name: "Descending", knee: 120, hip: 130 },
    { name: "Bottom (Too High)", knee: 110, hip: 120 }, // Never hits 90
    { name: "Ascending", knee: 130, hip: 140 },
    { name: "Standing Up", knee: 165, hip: 165 }
];

console.log("\nSimulating a SHALLOW rep sequence...");
repResult = null;
for (const frame of shallowRepSequence) {
    console.log(`[Frame] ${frame.name} - Knee: ${frame.knee}°`);
    const status = engine.update(frame.knee, frame.hip);
    if (status && status.event === 'REP_COMPLETED') {
        repResult = status;
    }
}
console.log(">> Result emitted by State Machine:", repResult);

console.log("\nFinal Session Stats Tracker:", engine.repCount);
