import * as driveService from '../googleDriveService.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileName, mimeType, fileSize, folderType = 'videos' } = req.body || {};
    if (!fileName || !fileSize) {
      return res.status(400).json({ error: 'fileName and fileSize are required' });
    }

    let origin = req.headers.origin || null;
    if (!origin && req.headers.referer) {
      try {
        origin = new URL(req.headers.referer).origin;
      } catch (e) {}
    }
    if (!origin) {
      origin = 'https://nunes-product-videos.vercel.app';
    }

    const result = await driveService.initiateResumableUpload({
      fileName,
      mimeType,
      fileSize: Number(fileSize),
      folderType,
      origin
    });

    res.status(200).json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
