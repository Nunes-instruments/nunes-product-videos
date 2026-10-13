import * as driveService from '../googleDriveService.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileId, driveId } = req.body || {};
    const targetId = fileId || driveId;
    if (!targetId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

    const result = await driveService.deleteDriveFile(targetId);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error('drive-delete error:', err);
    res.status(500).json({ error: err.message });
  }
}
