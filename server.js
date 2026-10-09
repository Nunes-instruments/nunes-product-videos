import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import * as driveService from './googleDriveService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'public', 'videos_data.json');
const PHOTOS_DATA_FILE = path.join(__dirname, 'public', 'photos_data.json');
const CATALOG_FILE = path.join(__dirname, 'catalog.json');
const THUMBNAIL_DIR = path.join(__dirname, 'public', 'thumbnails');
const VIDEOS_DIR = "C:\\Users\\NUNES\\Desktop\\New folder";
const PHOTOS_DIR = fs.existsSync("C:\\Users\\NUNES\\Desktop\\photos") 
  ? "C:\\Users\\NUNES\\Desktop\\photos" 
  : "C:\\Users\\NUNES\\Desktop\\Product Photos";
const PUBLIC_PHOTOS_DIR = path.join(__dirname, 'public', 'photos');

if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_PHOTOS_DIR)) fs.mkdirSync(PUBLIC_PHOTOS_DIR, { recursive: true });

// Serve thumbnails, raw videos, photos, and public static assets
app.use('/thumbnails', express.static(THUMBNAIL_DIR));
app.use('/raw-videos', express.static(VIDEOS_DIR));
app.use('/raw-photos', express.static(PHOTOS_DIR));
app.use('/photos', express.static(PUBLIC_PHOTOS_DIR));
app.use(express.static(path.join(__dirname, 'public')));
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  app.use(express.static(path.join(__dirname, 'dist')));
}

function loadVideos() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading DATA_FILE:', e);
    }
  }
  return [];
}

function saveVideos(videos) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(videos, null, 2), 'utf-8');
  const distVideos = path.join(__dirname, 'dist', 'videos_data.json');
  if (fs.existsSync(path.dirname(distVideos))) {
    try {
      fs.writeFileSync(distVideos, JSON.stringify(videos, null, 2), 'utf-8');
    } catch (e) {
      console.error('Dist save warning:', e);
    }
  }
}

// 1. Get all videos
app.get('/api/videos', (req, res) => {
  const videos = loadVideos();
  res.json({
    total: videos.length,
    renamedCount: videos.filter(v => v.isRenamed).length,
    pendingCount: videos.filter(v => !v.isRenamed).length,
    videos
  });
});

// 2. Get product catalog for auto-complete
app.get('/api/catalog', (req, res) => {
  if (fs.existsSync(CATALOG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'));
      return res.json(data);
    } catch (e) {
      console.error(e);
    }
  }
  res.json([]);
});

// Helper to open Google Drive sync folders on desktop
app.post('/api/open-drive-sync', (req, res) => {
  const scriptPath = path.join(__dirname, 'open_google_drive_sync.ps1');
  exec(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, (err) => {
    if (err) console.error('Error opening drive sync:', err);
  });
  res.json({ success: true, message: 'Opened Google Drive and Clean Media Folder' });
});

// 3. Rename product video
app.post('/api/rename', (req, res) => {
  const { id, newProductName, renameFileOnDisk = true } = req.body;
  if (!id || !newProductName) {
    return res.status(400).json({ error: 'id and newProductName are required' });
  }

  const videos = loadVideos();
  const videoIndex = videos.findIndex(v => v.id === id);
  if (videoIndex === -1) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const item = videos[videoIndex];
  const oldPath = item.filePath;
  const oldExt = path.extname(item.currentFilename || item.originalFilename);

  // Sanitize filename for Windows
  const safeBaseName = newProductName.replace(/[\\/:*?"<>|]/g, '_').trim();
  const newFilename = `${safeBaseName}${oldExt}`;
  const newPath = path.join(path.dirname(oldPath), newFilename);

  if (renameFileOnDisk && fs.existsSync(oldPath)) {
    try {
      if (oldPath !== newPath) {
        fs.renameSync(oldPath, newPath);
        item.filePath = newPath;
        item.currentFilename = newFilename;
      }
    } catch (err) {
      console.error('Disk rename failed:', err);
      return res.status(500).json({ error: `Disk rename error: ${err.message}` });
    }
  }

  item.productName = newProductName;
  item.isRenamed = true;
  item.updatedAt = new Date().toISOString();

  videos[videoIndex] = item;
  saveVideos(videos);

  res.json({ success: true, item });
});

// 4. Stream video with HTTP Range support for seeking
app.get('/api/stream/:id', (req, res) => {
  const videos = loadVideos();
  const item = videos.find(v => v.id === req.params.id);
  if (!item || !fs.existsSync(item.filePath)) {
    return res.status(404).send('Video not found on disk');
  }

  const videoPath = item.filePath;
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const CHUNK_SIZE = 1024 * 1024 * 2; // 2MB chunk for instant start
    const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + CHUNK_SIZE, fileSize - 1);
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
});

// 5. Upload new video with custom name
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, VIDEOS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const prodName = req.body.productName ? req.body.productName.replace(/[\\/:*?"<>|]/g, '_').trim() : path.basename(file.originalname, ext);
    cb(null, `${prodName}${ext}`);
  }
});
const upload = multer({ storage });

app.post('/api/upload', upload.single('video'), (req, res) => {
  const videos = loadVideos();
  const newId = `vid_${String(videos.length + 1).padStart(3, '0')}`;

  // Case A: Cloud-only entry via Google Drive link (0 MB disk space used)
  if (!req.file) {
    if (req.body.productName && req.body.driveUrl) {
      const driveUrl = req.body.driveUrl.trim();
      const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
      const fileId = match ? match[1] : '';
      const thumbUrl = fileId 
        ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w800` 
        : `/thumbnails/vid_001.jpg`;

      const newEntry = {
        id: newId,
        originalFilename: `${req.body.productName}.mp4`,
        currentFilename: `${req.body.productName}.mp4`,
        productName: req.body.productName.trim(),
        isRenamed: true,
        thumbnailUrl: thumbUrl,
        filePath: '',
        sizeMb: 0,
        durationSec: 0,
        width: 0,
        height: 0,
        category: req.body.category || 'Testing Equipment',
        driveUrl: driveUrl,
        createdAt: new Date().toISOString()
      };

      videos.unshift(newEntry);
      saveVideos(videos);
      return res.json({ success: true, item: newEntry });
    }
    return res.status(400).json({ error: 'Please provide either a video file or a Google Drive link' });
  }

  // Case B: Local File upload
  const productName = req.body.productName || req.file.originalname;
  const uploadedPath = req.file.path;
  const sizeMb = Number((req.file.size / (1024 * 1024)).toFixed(2));
  const thumbFilename = `${newId}.jpg`;
  const thumbPath = path.join(THUMBNAIL_DIR, thumbFilename);

  // Run python script to extract thumbnail
  const pyCmd = `python -c "import cv2; cap = cv2.VideoCapture(r'${uploadedPath}'); ret, frame = cap.read(); (cv2.imwrite(r'${thumbPath}', frame) if ret else None); cap.release()"`;
  exec(pyCmd, (err) => {
    if (err) console.error('Thumbnail extraction warning:', err);

    const newEntry = {
      id: newId,
      originalFilename: req.file.originalname,
      currentFilename: req.file.filename,
      productName: productName,
      isRenamed: true,
      thumbnailUrl: `/thumbnails/${thumbFilename}`,
      filePath: uploadedPath,
      sizeMb: sizeMb,
      durationSec: 0,
      width: 0,
      height: 0,
      category: req.body.category || 'Testing Equipment',
      driveUrl: req.body.driveUrl || '',
      createdAt: new Date().toISOString()
    };

    videos.unshift(newEntry);
    saveVideos(videos);

    // Auto-upload to Google Drive Videos folder in background
    driveService.uploadFileToDrive({
      filePath: uploadedPath,
      fileName: `${productName}${path.extname(uploadedPath)}`,
      mimeType: req.file.mimetype || 'video/mp4',
      folderType: 'videos'
    }).then((driveResult) => {
      console.log(`Successfully uploaded video '${productName}' to Google Drive. File ID: ${driveResult.id}`);
      newEntry.driveId = driveResult.id;
      newEntry.driveUrl = driveResult.webViewLink;
      newEntry.isSyncedToDrive = true;
      saveVideos(videos);
    }).catch((err) => {
      console.warn('Google Drive direct video upload note:', err.message);
    });

    res.json({ success: true, item: newEntry });
  });
});


// 6. Update Drive URL for a video or globally
app.post('/api/update-drive-url', (req, res) => {
  const { id, driveUrl } = req.body;
  const videos = loadVideos();
  const item = videos.find(v => v.id === id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  item.driveUrl = driveUrl;
  saveVideos(videos);
  res.json({ success: true, item });
});

// --- PHOTO APIs ---
function loadPhotos() {
  if (fs.existsSync(PHOTOS_DATA_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PHOTOS_DATA_FILE, 'utf-8'));
    } catch (e) {
      console.error('Error reading PHOTOS_DATA_FILE:', e);
    }
  }
  return [];
}

function savePhotos(photos) {
  fs.writeFileSync(PHOTOS_DATA_FILE, JSON.stringify(photos, null, 2), 'utf-8');
  const distPhotos = path.join(__dirname, 'dist', 'photos_data.json');
  if (fs.existsSync(path.dirname(distPhotos))) {
    fs.writeFileSync(distPhotos, JSON.stringify(photos, null, 2), 'utf-8');
  }
}

// 7. Get all photos
app.get('/api/photos', (req, res) => {
  const photos = loadPhotos();
  res.json({
    total: photos.length,
    renamedCount: photos.filter(p => p.isRenamed).length,
    pendingCount: photos.filter(p => !p.isRenamed).length,
    photos
  });
});

// 8. Rename photo
app.post('/api/rename-photo', (req, res) => {
  const { id, newProductName, renameFileOnDisk = true } = req.body;
  if (!id || !newProductName) {
    return res.status(400).json({ error: 'id and newProductName are required' });
  }

  const photos = loadPhotos();
  const index = photos.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Photo not found' });
  }

  const item = photos[index];
  const oldPath = item.filePath;
  const oldExt = path.extname(item.currentFilename || item.originalFilename || '.jpg');
  const safeBaseName = newProductName.replace(/[\\/:*?"<>|]/g, '_').trim();
  const newFilename = `${safeBaseName}${oldExt}`;
  const newPath = path.join(path.dirname(oldPath), newFilename);

  if (renameFileOnDisk && fs.existsSync(oldPath) && oldPath !== newPath) {
    try {
      fs.renameSync(oldPath, newPath);
      item.filePath = newPath;
      item.currentFilename = newFilename;
    } catch (err) {
      console.error('Disk photo rename failed:', err);
    }
  }

  item.productName = newProductName;
  item.isRenamed = true;
  item.updatedAt = new Date().toISOString();
  photos[index] = item;
  savePhotos(photos);
  res.json({ success: true, item });
});

// 9. Photo Upload with multer
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PHOTOS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const prodName = req.body.productName ? req.body.productName.replace(/[\\/:*?"<>|]/g, '_').trim() : path.basename(file.originalname, ext);
    cb(null, `${prodName}${ext}`);
  }
});
const uploadPhoto = multer({ storage: photoStorage });

app.post('/api/upload-photo', uploadPhoto.single('photo'), (req, res) => {
  const photos = loadPhotos();
  const newId = `photo_${String(photos.length + 1).padStart(3, '0')}`;

  // Case A: Cloud-only entry via Google Drive link (0 MB disk space used)
  if (!req.file) {
    if (req.body.productName && req.body.driveUrl) {
      const driveUrl = req.body.driveUrl.trim();
      const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
      const fileId = match ? match[1] : '';
      const imageUrl = fileId 
        ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w800` 
        : `/photos/photo_001.jpg`;

      const newEntry = {
        id: newId,
        originalFilename: `${req.body.productName}.jpg`,
        currentFilename: `${req.body.productName}.jpg`,
        productName: req.body.productName.trim(),
        isRenamed: true,
        imageUrl: imageUrl,
        filePath: '',
        sizeMb: 0,
        category: req.body.category || 'Testing Equipment',
        driveUrl: driveUrl,
        createdAt: new Date().toISOString()
      };

      photos.unshift(newEntry);
      savePhotos(photos);
      return res.json({ success: true, item: newEntry });
    }
    return res.status(400).json({ error: 'Please provide either a photo file or a Google Drive link' });
  }
  const ext = path.extname(req.file.filename);
  const publicDest = path.join(PUBLIC_PHOTOS_DIR, `${newId}${ext}`);
  try {
    fs.copyFileSync(req.file.path, publicDest);
    const distDest = path.join(__dirname, 'dist', 'photos', `${newId}${ext}`);
    if (fs.existsSync(path.dirname(distDest))) {
      fs.copyFileSync(req.file.path, distDest);
    }
  } catch (e) {
    console.error('Photo copy warning:', e);
  }

  const productName = req.body.productName || path.basename(req.file.originalname, ext);
  const newEntry = {
    id: newId,
    originalFilename: req.file.originalname,
    currentFilename: req.file.filename,
    productName: productName,
    isRenamed: true,
    imageUrl: `/photos/${newId}${ext}`,
    filePath: req.file.path,
    sizeMb: Number((req.file.size / (1024 * 1024)).toFixed(2)),
    category: req.body.category || 'Testing Equipment',
    driveUrl: req.body.driveUrl || '',
    createdAt: new Date().toISOString()
  };

  photos.unshift(newEntry);
  savePhotos(photos);

  // Auto-upload to Google Drive photos folder
  driveService.uploadFileToDrive({
    filePath: req.file.path,
    fileName: `${productName}${ext}`,
    mimeType: req.file.mimetype,
    folderType: 'photos'
  }).then((driveResult) => {
    console.log(`Successfully uploaded photo '${productName}' to Google Drive. File ID: ${driveResult.id}`);
    newEntry.driveId = driveResult.id;
    newEntry.driveUrl = driveResult.webViewLink;
    newEntry.isSyncedToDrive = true;
    savePhotos(photos);
  }).catch((err) => {
    console.warn('Google Drive direct upload note:', err.message);
    // Fallback to python helper if configured
    const driveScript = path.join(__dirname, 'upload_to_drive.py');
    exec(`python "${driveScript}" "${req.file.path}" "${productName}${ext}" "photos"`, (pErr, stdout) => {
      if (pErr) console.warn('Drive fallback note:', pErr.message);
      else console.log('Drive fallback result:', stdout);
    });
  });

  res.json({ success: true, item: newEntry });
});


// 10. Delete video endpoint
app.delete('/api/video/:id', (req, res) => {
  const { id } = req.params;
  let videos = loadVideos();
  const initialLen = videos.length;
  videos = videos.filter(v => v.id !== id);
  if (videos.length === initialLen) {
    return res.status(404).json({ error: 'Video not found' });
  }
  saveVideos(videos);
  res.json({ success: true, message: 'Video deleted' });
});

// 11. Delete photo endpoint
app.delete('/api/photo/:id', (req, res) => {
  const { id } = req.params;
  let photos = loadPhotos();
  const initialLen = photos.length;
  photos = photos.filter(p => p.id !== id);
  if (photos.length === initialLen) {
    return res.status(404).json({ error: 'Photo not found' });
  }
  savePhotos(photos);
  res.json({ success: true, message: 'Photo deleted' });
});

// ==========================================
// GOOGLE DRIVE INTEGRATION ENDPOINTS
// ==========================================

// 12. Google Drive connection status
app.get('/api/drive/status', async (req, res) => {
  try {
    const status = await driveService.getDriveStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message, status: 'Error' });
  }
});

// 13. Get Google Drive OAuth authorization URL
app.get('/api/drive/auth-url', (req, res) => {
  try {
    const redirectUri = req.query.redirectUri || null;
    const authUrl = driveService.getAuthUrl(redirectUri);
    res.json({ authUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Google Drive OAuth Callback
app.get('/api/drive/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) {
    return res.redirect(`/?drive_error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return res.status(400).send('Authorization code missing.');
  }

  try {
    const redirectUri = `${req.protocol}://${req.get('host')}/api/drive/callback`;
    await driveService.exchangeCodeForTokens(code, redirectUri);
    console.log('Google Drive OAuth authorization completed and saved successfully!');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google Drive Connected Successfully</title>
        <meta http-equiv="refresh" content="2;url=https://nunes-product-videos.vercel.app/?drive_connected=true">
        <style>
          body { font-family: system-ui, sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
          .card { background: #1e293b; padding: 48px; border-radius: 24px; border: 1px solid #334155; max-width: 440px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
          h1 { color: #10b981; font-size: 22px; margin-bottom: 8px; }
          p { color: #94a3b8; font-size: 14px; margin-bottom: 24px; }
          a { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
          <h1>Google Drive Connected!</h1>
          <p>instruasia@gmail.com has been successfully authorized with offline refresh. Photos and Videos will now auto-save to Google Drive.</p>
          <a href="https://nunes-product-videos.vercel.app/?drive_connected=true">Go to Dashboard</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('OAuth token exchange error:', err);
    res.status(500).send(`<html><body style="background:#0f172a;color:#ef4444;font-family:sans-serif;text-align:center;padding:50px;"><h2>Authorization Error</h2><p>${err.message}</p><a href="https://nunes-product-videos.vercel.app" style="color:#60a5fa">Return to Dashboard</a></body></html>`);
  }
});

// 15. Admin-only Test Drive Connection
app.post('/api/drive/test-connection', async (req, res) => {
  try {
    const status = await driveService.getDriveStatus();
    res.json({ success: status.connected, details: status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 16. Save custom OAuth Client ID / Secret configuration
app.post('/api/drive/config', (req, res) => {
  const { clientId, clientSecret, redirectUri } = req.body;
  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: 'clientId and clientSecret are required' });
  }
  const updated = driveService.saveOAuthConfig({ clientId, clientSecret, redirectUri });
  res.json({ success: true, config: { clientId: updated.clientId, redirectUri: updated.redirectUri } });
});

// 17. Initiate Resumable Upload Session for Videos or large files
app.post('/api/drive/initiate-video-upload', async (req, res) => {
  const { fileName, mimeType, fileSize, productName, category } = req.body;
  if (!fileName || !fileSize) {
    return res.status(400).json({ error: 'fileName and fileSize are required' });
  }

  try {
    const result = await driveService.initiateResumableUpload({
      fileName: fileName,
      mimeType: mimeType || 'video/mp4',
      fileSize: Number(fileSize),
      folderType: 'videos'
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Initiate resumable upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 18. Complete Resumable Video Upload (register in database)
app.post('/api/drive/complete-video-upload', (req, res) => {
  const { driveFileId, driveUrl, productName, originalFilename, sizeMb, category } = req.body;
  if (!driveFileId || !productName) {
    return res.status(400).json({ error: 'driveFileId and productName are required' });
  }

  const videos = loadVideos();
  const newId = `vid_${String(videos.length + 1).padStart(3, '0')}`;
  const newEntry = {
    id: newId,
    originalFilename: originalFilename || `${productName}.mp4`,
    currentFilename: `${productName}.mp4`,
    productName: productName.trim(),
    isRenamed: true,
    thumbnailUrl: `/thumbnails/vid_001.jpg`, // fallback thumbnail
    filePath: '',
    sizeMb: Number(sizeMb || 0),
    durationSec: 0,
    width: 0,
    height: 0,
    category: category || 'Testing Equipment',
    driveId: driveFileId,
    driveUrl: driveUrl || `https://drive.google.com/file/d/${driveFileId}/view`,
    isSyncedToDrive: true,
    createdAt: new Date().toISOString()
  };

  videos.unshift(newEntry);
  saveVideos(videos);
  res.json({ success: true, item: newEntry });
});

// 19. Two-way Google Drive Library Sync
app.post('/api/drive/sync', async (req, res) => {
  try {
    const syncResult = await driveService.syncDriveFolders();
    const drivePhotos = syncResult.photos;
    const driveVideos = syncResult.videos;

    // Reconcile photos
    const localPhotos = loadPhotos();
    let newPhotosCount = 0;
    drivePhotos.forEach(dp => {
      const exists = localPhotos.some(lp => lp.driveId === dp.id || lp.currentFilename === dp.name || lp.originalFilename === dp.name);
      if (!exists) {
        const ext = path.extname(dp.name);
        const nameWithoutExt = path.basename(dp.name, ext);
        localPhotos.unshift({
          id: `photo_drive_${dp.id.substring(0, 8)}`,
          originalFilename: dp.name,
          currentFilename: dp.name,
          productName: nameWithoutExt,
          isRenamed: true,
          imageUrl: dp.thumbnailLink || `https://drive.google.com/thumbnail?id=${dp.id}&sz=w800`,
          sizeMb: Number(((dp.size || 0) / (1024 * 1024)).toFixed(2)),
          driveId: dp.id,
          driveUrl: dp.webViewLink,
          isSyncedToDrive: true,
          category: 'Testing Equipment',
          createdAt: dp.createdTime || new Date().toISOString()
        });
        newPhotosCount++;
      }
    });
    if (newPhotosCount > 0) savePhotos(localPhotos);

    // Reconcile videos
    const localVideos = loadVideos();
    let newVideosCount = 0;
    driveVideos.forEach(dv => {
      const exists = localVideos.some(lv => lv.driveId === dv.id || lv.currentFilename === dv.name || lv.originalFilename === dv.name);
      if (!exists) {
        const ext = path.extname(dv.name);
        const nameWithoutExt = path.basename(dv.name, ext);
        localVideos.unshift({
          id: `vid_drive_${dv.id.substring(0, 8)}`,
          originalFilename: dv.name,
          currentFilename: dv.name,
          productName: nameWithoutExt,
          isRenamed: true,
          thumbnailUrl: dv.thumbnailLink || '/thumbnails/vid_001.jpg',
          sizeMb: Number(((dv.size || 0) / (1024 * 1024)).toFixed(2)),
          driveId: dv.id,
          driveUrl: dv.webViewLink,
          isSyncedToDrive: true,
          category: 'Testing Equipment',
          createdAt: dv.createdTime || new Date().toISOString()
        });
        newVideosCount++;
      }
    });
    if (newVideosCount > 0) saveVideos(localVideos);

    res.json({
      success: true,
      drivePhotosCount: drivePhotos.length,
      driveVideosCount: driveVideos.length,
      newPhotosAdded: newPhotosCount,
      newVideosAdded: newVideosCount,
      syncedAt: syncResult.syncedAt
    });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 20. Migrate local files to Google Drive
app.post('/api/drive/migrate-media', async (req, res) => {
  try {
    const photosDir = PHOTOS_DIR;
    const files = fs.existsSync(photosDir) ? fs.readdirSync(photosDir).filter(f => f.match(/\.(jpg|jpeg|png)$/i)) : [];
    
    let uploadedCount = 0;
    let failedCount = 0;
    const results = [];

    for (const f of files.slice(0, 10)) { // batch migrate
      const filePath = path.join(photosDir, f);
      try {
        const driveResult = await driveService.uploadFileToDrive({
          filePath,
          fileName: f,
          mimeType: f.endsWith('.png') ? 'image/png' : 'image/jpeg',
          folderType: 'photos'
        });
        results.push({ file: f, driveId: driveResult.id, status: 'SUCCESS' });
        uploadedCount++;
      } catch (e) {
        results.push({ file: f, error: e.message, status: 'FAILED' });
        failedCount++;
      }
    }

    res.json({
      totalFound: files.length,
      batchAttempted: results.length,
      uploadedCount,
      failedCount,
      results
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.send('Nunes Product Videos API Server Running. Start frontend with npm run dev.');
});


app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
