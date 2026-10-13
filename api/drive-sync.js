import { syncDriveFolders } from '../googleDriveService.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const data = await syncDriveFolders();
    return res.status(200).json({
      success: true,
      videos: data.videos || [],
      photos: data.photos || [],
      syncedAt: data.syncedAt
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
