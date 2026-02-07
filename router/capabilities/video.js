export class VideoCapability {
  static isVideoRequest(message) {
    if (!message) return false;
    const videoKeywords = ['video', 'clip', 'footage', 'watch', 'playback', 'recording', 'screen recording', 'demo', 'tutorial'];
    const lowerMessage = message.toLowerCase();
    return videoKeywords.some(kw => lowerMessage.includes(kw));
  }

  static createVideoPrompt(basePrompt, videoContext = null) {
    const videoEnhancement = `

VIDEO ANALYSIS ACTIVE:
You can analyze video content with these capabilities:
- Frame-by-frame visual analysis
- Motion and action detection
- Scene changes and transitions
- Text and object recognition in video
- Audio track analysis (if present)
- Content summarization

When analyzing video, describe key scenes, actions, and any important visual or audio elements.
${videoContext ? `\nCurrent video context: ${videoContext}` : ''}`;

    return basePrompt + videoEnhancement;
  }

  static createVideoLog(message, videoData) {
    return {
      type: 'video_analysis',
      timestamp: new Date().toISOString(),
      message: message,
      hasVideo: !!videoData,
      duration: videoData?.duration || null,
      resolution: videoData?.resolution || null
    };
  }

  static isEnabled(persona) {
    return persona?.capabilities?.video?.enabled === true;
  }
}
