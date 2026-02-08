bot.on('message', async (ctx) => {
    const userId = String(ctx.from.id);
    
    // ========================================
    // NEW: Media handling (images/audio/video)
    // ========================================
    if (!ctx.message.text) {
        let userMessage = '';
        let options = {};
        
        if (ctx.message.photo) {
            // Image message - download and encode
            userMessage = ctx.message.caption || 'Analyze this image';
            
            try {
                // Get the largest photo size
                const photo = ctx.message.photo[ctx.message.photo.length - 1];
                const file = await ctx.api.getFile(photo.file_id);
                
                // Download the image
                const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}`;
                const imageResponse = await fetch(fileUrl);
                const imageBuffer = await imageResponse.arrayBuffer();
                const base64Image = Buffer.from(imageBuffer).toString('base64');
                
                options = {
                    hasImage: true,
                    imageContext: 'Telegram image',
                    imageData: base64Image,
                    imageMediaType: 'image/jpeg'
                };
                
                console.log('📸 Image downloaded and encoded');
            } catch (error) {
                console.error('❌ Image download error:', error.message);
                await ctx.reply('Sorry, I had trouble downloading the image. Please try again.');
                return;
            }
            
        } else if (ctx.message.voice || ctx.message.audio) {
            userMessage = ctx.message.caption || 'Transcribe this audio';
            options = { hasAudio: true, audioContext: 'Telegram audio' };
            console.log('🎤 Audio received (transcription not yet implemented)');
        } else if (ctx.message.video) {
            userMessage = ctx.message.caption || 'Analyze this video';
            options = { hasVideo: true, videoContext: 'Telegram video' };
            console.log('🎥 Video received (analysis not yet implemented)');
        } else {
            await ctx.reply('I can handle text, images, audio, and video.');
            return;
        }
        
        try {
            const result = await routeMessage(userMessage, options);
            if (!result || !result.text) throw new Error('Empty response');
            await ctx.reply(result.text);
            await saveMessage(userId, userMessage, result.text, result.provider || 'unknown', result.model || 'unknown');
            return;
        } catch (error) {
            console.error('❌ Media error:', error.message);
            await ctx.reply('Sorry, error processing media. Please try again.');
            return;
        }
    }
    
    // ========================================
    // EXISTING: Text handling (UNCHANGED)
    // ========================================
    const userMessage = ctx.message.text;

    try {
        console.log('📨 Incoming:', userMessage);
        
        const result = await routeMessage(userMessage);
        
        if (!result || !result.text) {
            throw new Error('Empty response from router');
        }

        await ctx.reply(result.text);
        console.log('✅ Response sent to Telegram');

        await saveMessage(
            userId,
            userMessage,
            result.text,
            result.provider || 'unknown',
            result.model || 'unknown'
        );

    } catch (error) {
        console.error('❌ Error processing message:', error.message);
        
        try {
            await ctx.reply('Sorry, I encountered an error processing your message. Please try again.');
        } catch (replyError) {
            console.error('❌ Failed to send error message:', replyError.message);
        }
    }
});