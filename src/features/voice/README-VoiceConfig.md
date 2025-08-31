# RANI Voice Configuration

## How to Change the Voice

To change RANI's voice from 'nova' to another OpenAI voice, update the `defaultVoice` in this file:

**File: `/src/features/voice/voiceConfig.js`**
```javascript
const VOICE_CONFIG = {
    defaultVoice: 'nova', // <-- Change this line
    model: 'tts-1',
    speed: 1.0,
    format: 'mp3'
};
```

## Available OpenAI Voices
- `'alloy'` - Neutral, balanced
- `'echo'` - Clear, expressive  
- `'fable'` - Warm, engaging
- `'onyx'` - Deep, authoritative
- `'nova'` - Bright, cheerful
- `'shimmer'` - Natural, conversational

## Files That Use This Configuration
- `src/features/voice/textToSpeech.js` - Main TTS service
- `src/bridge/featureBridge.js` - IPC bridge for TTS calls

## Frontend Files (require manual sync)
Due to ES6 module limitations, these files need to be updated manually to match:
- `src/ui/ask/AskView.js` line 1502 - Update `voice: 'nova'`
- `src/ui/ask/VoiceMode.js` line 343 - Update `voice: 'nova'`

## Quick Change Guide
1. Change `defaultVoice` in `voiceConfig.js`
2. Update the voice in `AskView.js` and `VoiceMode.js` to match
3. Restart the application

That's it! All voice output will now use your selected voice.
