import * as driveService from '../googleDriveService.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const redirectUri = req.query.redirectUri || null;
      const authUrl = driveService.getAuthUrl(redirectUri);
      return res.status(200).json({ authUrl });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { action } = req.body || {};
    if (action === 'test') {
      try {
        const status = await driveService.getDriveStatus();
        return res.status(200).json({ success: status.connected, details: status });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }
  }

  res.status(400).json({ error: 'Invalid request' });
}
