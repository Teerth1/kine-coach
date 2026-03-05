/**
 * Voice Feedback System
 * Uses the Web Speech API to provide real-time auditory coaching 
 * so the patient doesn't need to stare at the screen.
 */
export const voiceFeedback = {
    speak: (text) => {
        if (!window.speechSynthesis) {
            console.warn("Speech Synthesis API not supported in this browser.");
            return;
        }

        // Stop any currently playing audio so we don't overlap coaching cues
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Make the voice sound energetic and coaching-like
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to find a good English voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith('en-US')) || voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;

        window.speechSynthesis.speak(utterance);
    },

    coachRepCompleted: (quality) => {
        if (quality === 'PERFECT') {
            const positiveCues = ["Perfect!", "Great depth!", "Excellent work!"];
            const cue = positiveCues[Math.floor(Math.random() * positiveCues.length)];
            voiceFeedback.speak(cue);
        } else if (quality === 'SHALLOW') {
            const correctiveCues = ["Too shallow, go deeper.", "Bend your knees more.", "Get lower on this next one!"];
            const cue = correctiveCues[Math.floor(Math.random() * correctiveCues.length)];
            voiceFeedback.speak(cue);
        }
    }
};
