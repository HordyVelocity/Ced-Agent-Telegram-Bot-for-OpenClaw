// patch-two-step.js
// Patches audio and video handlers in index.js to use two-step flow:
// Step 1: Gemini transcribes the media
// Step 2: Transcription passed to routeMessage as text (hits Anthropic with Ced personality)
const fs = require('fs');

let code = fs.readFileSync('index.js', 'utf8');

// === PATCH AUDIO HANDLER ===
// Find the audio routeMessage call and replace the response + reply block
const oldAudio = `    // Route with audio
    const history = await getHistory(chatId);
    const response = await routeMessage(message || 'Please transcribe this audio', {
      history,
      hasAudio: true,
      audioData: audioBuffer.toString('base64'),
      audioMediaType: ctx.message.voice ? 'audio/ogg' : 'audio/mpeg'
    });

    await ctx.reply(response.text || response.error || "No response");`;

const newAudio = `    // Step 1: Gemini transcribes the audio
    const transcription = await routeMessage('Transcribe this audio accurately. Return ONLY the transcription, nothing else.', {
      hasAudio: true,
      audioData: audioBuffer.toString('base64'),
      audioMediaType: ctx.message.voice ? 'audio/ogg' : 'audio/mpeg'
    });

    const transcript = transcription.text || '';
    console.log('Transcription: ' + transcript.substring(0, 100));

    // Step 2: Pass transcription to Ced (Anthropic) for natural response
    const history = await getHistory(chatId);
    const userContext = message
      ? message + ' [Voice message transcription: ' + transcript + ']'
      : '[Voice message from user. They said: ' + transcript + ']';

    const response = await routeMessage(userContext, { history });

    await ctx.reply(response.text || response.error || "No response");`;

if (code.includes(oldAudio)) {
  code = code.replace(oldAudio, newAudio);
  console.log('Audio handler patched');
} else {
  console.log('WARNING: Could not find audio handler to patch. Trying flexible match...');
  // Try a more flexible match
  const audioRegex = /\/\/ Route with audio\n\s+const history = await getHistory\(chatId\);\n\s+const response = await routeMessage\(message \|\| 'Please transcribe this audio'/;
  if (audioRegex.test(code)) {
    console.log('Found audio via regex but exact match failed - check whitespace');
  } else {
    console.log('Audio handler not found at all - manual patch needed');
  }
}

// === PATCH VIDEO HANDLER ===
const oldVideo = `    // Route with video
    const history = await getHistory(chatId);
    const response = await routeMessage(message || 'Please analyze this video', {
      history,
      hasVideo: true,
      videoData: videoBuffer.toString('base64'),
      videoMediaType: 'video/mp4'
    });

    await ctx.reply(response.text || response.error || "No response");`;

const newVideo = `    // Step 1: Gemini analyzes the video (transcription + visual)
    const analysis = await routeMessage('Describe what you see and transcribe any speech in this video. Return the transcription and a brief visual description.', {
      hasVideo: true,
      videoData: videoBuffer.toString('base64'),
      videoMediaType: 'video/mp4'
    });

    const videoSummary = analysis.text || '';
    console.log('Video analysis: ' + videoSummary.substring(0, 100));

    // Step 2: Pass analysis to Ced (Anthropic) for natural response
    const history = await getHistory(chatId);
    const userContext = message
      ? message + ' [Video message analysis: ' + videoSummary + ']'
      : '[User sent a video message. Analysis: ' + videoSummary + ']';

    const response = await routeMessage(userContext, { history });

    await ctx.reply(response.text || response.error || "No response");`;

if (code.includes(oldVideo)) {
  code = code.replace(oldVideo, newVideo);
  console.log('Video handler patched');
} else {
  console.log('WARNING: Could not find video handler to patch');
}

// === PATCH SAVE CALLS ===
// Update the save calls to store the transcription/analysis instead of empty message
// Audio save - update mediaSummary to include transcription
code = code.replace(
  'saveUserMessage(chatId, message, "[User sent a VOICE MESSAGE]")',
  'saveUserMessage(chatId, userContext, "[User sent a VOICE MESSAGE]")'
);
console.log('Audio save updated');

// Video save - update to include analysis
code = code.replace(
  'saveUserMessage(chatId, message, "[User sent a VIDEO]")',
  'saveUserMessage(chatId, userContext, "[User sent a VIDEO]")'
);
console.log('Video save updated');

// Write the patched file
fs.writeFileSync('index.js', code);
console.log('Done - two-step handlers written to index.js');
