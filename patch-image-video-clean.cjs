// patch-image-video-clean.cjs
// 1. Two-step image handler (Gemini describes → Ced responds)
// 2. Clean video prompt (just transcribe speech, no visual description dump)
const fs = require('fs');

let code = fs.readFileSync('index.js', 'utf8');

// === 1. PATCH IMAGE HANDLER ===
// Current: sends image to Gemini, Gemini responds directly
// New: Gemini describes image → pass to Anthropic for Ced response

const oldImage = `    // Route with image
    const history = await getHistory(chatId);
    const response = await routeMessage(message || 'Please analyze this image', {
      history,
      hasImage: true,
      imageData: imageBuffer.toString('base64'),
      imageMediaType: 'image/jpeg'
    });

    await ctx.reply(response.text || response.error || "No response");`;

const newImage = `    // Step 1: Gemini describes the image
    const description = await routeMessage('Describe this image in detail. What do you see? If there is text, read it. Be factual and concise.', {
      hasImage: true,
      imageData: imageBuffer.toString('base64'),
      imageMediaType: 'image/jpeg'
    });

    const imageDesc = description.text || '';
    console.log('Image description: ' + imageDesc.substring(0, 100));

    // Step 2: Pass description to Ced (Anthropic) for natural response
    const history = await getHistory(chatId);
    const userContext = message
      ? message + ' [Image description: ' + imageDesc + ']'
      : '[User sent an image. Description: ' + imageDesc + ']';

    const response = await routeMessage(userContext, { history });

    await ctx.reply(response.text || response.error || "No response");`;

if (code.includes(oldImage)) {
  code = code.replace(oldImage, newImage);
  console.log('Image handler patched to two-step');
} else {
  console.log('WARNING: Could not find image handler - checking alternative...');
  // Try without the comment line
  if (code.includes("'Please analyze this image'")) {
    console.log('Found image route but format differs - manual patch needed');
  } else {
    console.log('Image handler not found at all');
  }
}

// Update image save to include context
code = code.replace(
  'saveUserMessage(chatId, message, "[User sent an IMAGE]")',
  'saveUserMessage(chatId, userContext, "[User sent an IMAGE]")'
);
console.log('Image save updated');


// === 2. CLEAN VIDEO PROMPT ===
// Current prompt asks for visual description + transcription (produces long summaries)
// New: focus on speech transcription, brief visual context only

const oldVideoPrompt = 'Describe what you see and transcribe any speech in this video. Return the transcription and a brief visual description.';
const newVideoPrompt = 'Transcribe any speech in this video accurately. If there is no speech, briefly describe what is shown. Return ONLY the transcription or description, nothing else.';

if (code.includes(oldVideoPrompt)) {
  code = code.replace(oldVideoPrompt, newVideoPrompt);
  console.log('Video prompt cleaned up');
} else {
  console.log('WARNING: Could not find video prompt to clean');
  // Check if it still has the old pre-two-step prompt
  if (code.includes('Please analyze this video')) {
    console.log('Video still has original prompt - two-step may not have been applied');
  }
}


// Write the patched file
fs.writeFileSync('index.js', code);
console.log('Done - all patches applied');
