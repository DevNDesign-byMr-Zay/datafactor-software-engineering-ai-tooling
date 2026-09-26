import { logRouteFailure, parseStorageObjectName } from '../../../../src/api/route-safety.js';

app.get('/sign', async (req, res) => {
  try {
    if (!bucket) return res.status(500).json({ error: 'Bucket not configured' });

    const parsed = parseStorageObjectName(req.query?.object);
    if (!parsed.ok) return res.status(400).json({ error: 'Invalid ?object=' });

    const { objectName } = parsed.value;
    const file = bucket.file(objectName);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000,
    });
    return res.json({ url });
  } catch (error) {
    logRouteFailure({
      event: 'sign.failed',
      message: 'Signed URL generation failed',
      error,
    });
    return res.status(500).json({ error: 'Unable to create signed URL' });
  }
});
