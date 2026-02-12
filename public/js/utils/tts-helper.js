/**
 * TTS Helper Module
 * Provides text-to-speech functionality using the Web Speech API
 */

let speechUtterance = null;
let speechSynth = null;
let defaultVoice = null;
let currentLang = 'en-US'; // Default language
let currentRate = 1; // Default rate
let currentPitch = 1; // Default pitch

// Initialize speech synthesis
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    speechSynth = window.speechSynthesis;

    // Wait for voices to be loaded
    speechSynth.onvoiceschanged = () => {
        const voices = speechSynth.getVoices();
        // Try to find an English voice first, then fallback to any voice
        defaultVoice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
    };
}

/**
 * Speaks the given text.
 * @param {string} text - The text to speak.
 * @param {string} lang - Optional. The language to use (e.g., 'en-US').
 */
export function speak(text, lang = currentLang) {
    if (!speechSynth || !text) {
        console.warn('Speech synthesis not available or no text provided.');
        return;
    }

    // Stop any ongoing speech
    stopSpeaking();

    speechUtterance = new SpeechSynthesisUtterance(text);
    speechUtterance.lang = lang;
    speechUtterance.rate = currentRate; // Use global rate
    speechUtterance.pitch = currentPitch; // Use global pitch

    // Set voice if available
    const voices = speechSynth.getVoices();
    const voiceToUse = voices.find(voice => voice.lang === lang) || defaultVoice;
    if (voiceToUse) {
        speechUtterance.voice = voiceToUse;
    }

    speechSynth.speak(speechUtterance);
}

/**
 * Stops any currently speaking text.
 */
export function stopSpeaking() {
    if (speechSynth && speechSynth.speaking) {
        speechSynth.cancel();
    }
}

/**
 * Sets the current language for speech.
 * @param {string} lang - The language to set (e.g., 'en-US', 'es-ES').
 */
export function setSpeechLanguage(lang) {
    currentLang = lang;
    // Update default voice based on new language
    const voices = speechSynth?.getVoices() || [];
    defaultVoice = voices.find(voice => voice.lang.startsWith(lang.substring(0, 2))) || voices[0];
}

/**
 * Sets the speech rate.
 * @param {number} rate - The rate (0.5 to 2.0).
 */
export function setSpeechRate(rate) {
    currentRate = rate;
}

/**
 * Sets the speech pitch.
 * @param {number} pitch - The pitch (0 to 2).
 */
export function setSpeechPitch(pitch) {
    currentPitch = pitch;
}
