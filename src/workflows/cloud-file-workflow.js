const DEFAULT_UPLOAD_PREFIX = 'uploads/';
const ONE_HOUR_MS = 60 * 60 * 1000;
const FILE_CHAT_SIGN_TTL_MS = 45 * 60 * 1000;

export function registerGcsUploadRoute({
  app,
  multer,
  bucket,
  now = () => Date.now(),
  logger = console,
}) {
  const upload = multer({ storage: multer.memoryStorage() });

  const handler = async (req, res) => {
    try {
      if (!bucket) {
        return res.status(500).json({ error: 'Bucket not configured' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Preserve the authenticated historical route behavior exactly.
      const original = req.file.originalname.replace(/\\s+/g, '_');
      const objectName = `${DEFAULT_UPLOAD_PREFIX}${now()}-${original}`;
      const file = bucket.file(objectName);

      await file.save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype },
        resumable: false,
      });

      return res.json({
        ok: true,
        objectName,
        mimeType: req.file.mimetype,
      });
    } catch (error) {
      logger.error('Upload error:', error);
      return res.status(500).json({ error: error.message });
    }
  };

  app.post('/upload', upload.single('file'), handler);
  return handler;
}

export function registerSignedUrlRoute({ app, bucket, now = () => Date.now(), logger = console }) {
  const handler = async (req, res) => {
    try {
      if (!bucket) {
        return res.status(500).json({ error: 'Bucket not configured' });
      }

      const object = req.query.object;
      if (!object) {
        return res.status(400).json({ error: 'Missing ?object=' });
      }

      const file = bucket.file(object);
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: now() + ONE_HOUR_MS,
      });

      return res.json({ url });
    } catch (error) {
      logger.error('Sign error:', error);
      return res.status(500).json({ error: error.message });
    }
  };

  app.get('/sign', handler);
  return handler;
}

export function registerFileAwareChatRoute({
  app,
  geminiModel,
  bucket,
  generateReply,
  now = () => Date.now(),
  logger = console,
}) {
  const handler = async (req, res) => {
    try {
      if (!geminiModel) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY not configured',
        });
      }

      const sessionId = req.body?.sessionId || 'default';
      const text = (req.body?.text || '').toString();
      const files = Array.isArray(req.body?.files) ? req.body.files : [];
      const fileParts = [];

      for (const fileReference of files) {
        if (!fileReference?.objectName || !bucket) continue;

        try {
          const [url] = await bucket.file(fileReference.objectName).getSignedUrl({
            action: 'read',
            expires: now() + FILE_CHAT_SIGN_TTL_MS,
          });
          fileParts.push({
            fileData: {
              fileUri: url,
              mimeType: fileReference.mimeType || 'application/octet-stream',
            },
          });
        } catch (error) {
          logger.warn('Failed to sign file:', fileReference.objectName, error.message);
        }
      }

      const parts = [...fileParts, ...(text ? [{ text }] : [])];
      const reply = await generateReply(parts);
      return res.json({ reply, sessionId });
    } catch (error) {
      logger.error('Chat error:', error);
      return res.status(500).json({ error: error.message });
    }
  };

  app.post('/chat', handler);
  return handler;
}
