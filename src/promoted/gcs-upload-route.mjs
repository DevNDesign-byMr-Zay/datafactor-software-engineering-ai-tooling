import { logRouteFailure, parseUploadFile } from '../api/route-safety.js';

const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!bucket) return res.status(500).json({ error: 'Bucket not configured' });

    const parsed = parseUploadFile(req.file);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });

    const { originalname, buffer, mimetype } = parsed.value;
    const timestamp = Date.now();
    const objectName = `uploads/${timestamp}-${originalname}`;
    const file = bucket.file(objectName);
    await file.save(buffer, {
      metadata: { contentType: mimetype },
      resumable: false,
    });
    return res.json({ ok: true, objectName, mimeType: mimetype });
  } catch (error) {
    logRouteFailure({
      event: 'upload.persist_failed',
      message: 'Upload persistence failed',
      error,
    });
    return res.status(500).json({ error: 'Unable to store upload' });
  }
});
