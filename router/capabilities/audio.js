export class AudioCapability {
  static isAudioRequest(message) {
    if (!message) return false;
    const audioKeywords = ['audio', 'voice', 'sound', 'listen', 'hear', 'recording', 'speech', 'transcribe', 'speak', 'talk'];
    const lowerMessage = message.toLowerCase();
    return audioKeywords.some(kw => lowerMessage.includes(kw));
  }

  static createAudioPrompt(basePrompt, audioContext = null) {
    const audioEnhancement = `

AUDIO ANALYSIS ACTIVE:
You can process audio files and voice messages with these capabilities:
- Speech transcription and voice recognition
- Voice pattern and tone analysis
- Audio quality assessment
- Background sound identification
- Language detection

When processing audio, provide clear transcription and analysis.
${audioContext ? `\nCurrent audio context: ${audioContext}` : ''}`;

    return basePrompt + audioEnhancement;
  }

  static createAudioLog(message, audioData) {
    return {
      type: 'audio_process',
      timestamp: new Date().toISOString(),
      message: message,
      hasAudio: !!audioData,
      duration: audioData?.duration || null
    };
  }

  static isEnabled(persona) {
    return persona?.capabilities?.audio?.enabled === true;
  }
}
