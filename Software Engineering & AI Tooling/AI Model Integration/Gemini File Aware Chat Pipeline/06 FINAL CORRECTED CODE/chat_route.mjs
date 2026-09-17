import { logRouteFailure, parseChatRequestBody } from '../../../../src/api/route-safety.js';

app.post('/chat', async (req, res) => {
  try {
    if (!geminiModel) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

    const parsed = parseChatRequestBody(req.body);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });

    const { sessionId, text, files } = parsed.value;
    if (files.length > 0 && !bucket) {
      return res.status(500).json({ error: 'Bucket not configured for file-aware chat' });
    }

    const fileParts = [];
    for (const fileReference of files) {
      try {
        const [url] = await bucket.file(fileReference.objectName).getSignedUrl({
          action: 'read',
          expires: Date.now() + 45 * 60 * 1000,
        });
        fileParts.push({
          fileData: {
            fileUri: url,
            mimeType: fileReference.mimeType,
          },
        });
      } catch (error) {
        logRouteFailure({
          level: 'warn',
          event: 'chat.file_sign_failed',
          message: 'Chat file signing failed',
          error,
          context: { objectName: fileReference.objectName },
        });
      }
    }

    if (!text && fileParts.length === 0) {
      return res.status(502).json({ error: 'Unable to access chat files' });
    }

    const parts = [...fileParts, ...(text ? [{ text }] : [])];
    const reply = await generateReply(parts);
    return res.json({ reply, sessionId });
  } catch (error) {
    logRouteFailure({
      event: 'chat.failed',
      message: 'Chat request failed',
      error,
    });
    return res.status(500).json({ error: 'Unable to generate reply' });
  }
});
