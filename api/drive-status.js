import * as driveService from '../googleDriveService.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const status = await driveService.getDriveStatus();
    res.status(200).json(status);
  } catch (err) {
    res.status(200).json({
      connected: false,
      status: 'Disconnected',
      accountEmail: null,
      photosAccessible: false,
      videosAccessible: false,
      photosFolderId: '1uGjQkCgdCgiqsE-1Ri_aNC4-X2FSlA43',
      videosFolderId: '1-vhkY7WfIHVwRlFarYooSwooWwnBWf94',
      serviceAccountEmail: 'nunes-drive-sync@nunes-mail-d072f3ce1.iam.gserviceaccount.com',
      message: 'Drive status check ready: ' + err.message
    });
  }
}
