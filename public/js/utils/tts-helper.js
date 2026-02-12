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
        
        // Notify UI that voices are ready
        window.dispatchEvent(new CustomEvent('ankiflow:voices-changed'));
    };
}

/**
 * Get all available voices supported by the browser
 * @returns {SpeechSynthesisVoice[]} List of voices
 */
export function getAvailableVoices() {
    if (!speechSynth) return [];
    return speechSynth.getVoices();
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
    speechUtterance.rate = currentRate;
    speechUtterance.pitch = currentPitch;

    // Use the selected default voice
    if (defaultVoice) {
        speechUtterance.voice = defaultVoice;
        speechUtterance.lang = defaultVoice.lang;
    }

    // If a specific lang was requested and it differs, try to find a matching voice dynamically
    // (This overrides the user's preferred voice only if necessary)
    if (lang && defaultVoice && lang !== defaultVoice.lang) {
        speechUtterance.lang = lang;
        const voices = speechSynth.getVoices();
        const specificVoice = voices.find(voice => voice.lang === lang);
        if (specificVoice) {
            speechUtterance.voice = specificVoice;
        }
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
 * Sets the current language/voice for speech.
 * @param {string} voiceURI - The voiceURI (or lang code) to set.
 */
export function setSpeechLanguage(voiceURI) {
    // Try to find by exact VoiceURI first (most accurate)
    const voices = speechSynth?.getVoices() || [];
    let foundVoice = voices.find(v => v.voiceURI === voiceURI);
    
    // Fallback: try to find by Lang code
    if (!foundVoice) {
        foundVoice = voices.find(v => v.lang === voiceURI);
    }

    if (foundVoice) {
        defaultVoice = foundVoice;
        currentLang = foundVoice.lang;
    }
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
