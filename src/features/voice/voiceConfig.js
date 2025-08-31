/**
 * Centralized voice configuration for RANI
 * Change the voice in one place and it applies everywhere
 */

const VOICE_CONFIG = {
    // Available OpenAI voices: 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
    defaultVoice: 'nova',
    model: 'tts-1',
    speed: 1.0,
    format: 'mp3'
};

module.exports = VOICE_CONFIG;
