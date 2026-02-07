export class VisionCapability {
  static isVisionRequest(message) {
    const visionKeywords = ['image', 'picture', 'photo', 'visual', 'see', 'look at', 'show me', 'analyze', 'what is this', 'describe'];
    const lowerMessage = message.toLowerCase();
    return visionKeywords.some(kw => lowerMessage.includes(kw));
  }

  static createVisionPrompt(basePrompt, imageContext = null) {
    const visionEnhancement = `

VISION ANALYSIS ACTIVE:
You can analyze images, photographs, and visual content with these capabilities:
- Object recognition and identification
- Text extraction (OCR)
- Scene description and context analysis
- Color, composition, and aesthetic evaluation
- Technical image properties

When analyzing images, be specific and detailed.
${imageContext ? `\nCurrent image context: ${imageContext}` : ''}`;

    return basePrompt + visionEnhancement;
  }

  static createVisionLog(message, imageData) {
    return {
      type: 'vision_capture',
      timestamp: new Date().toISOString(),
      message: message,
      hasImage: !!imageData
    };
  }

  static isEnabled(persona) {
    return persona?.capabilities?.vision?.enabled === true;
  }
}
