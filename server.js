import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

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
const PHOTOS_DIR = "C:\\Users\\NUNES\\Desktop\\Product Photos";
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
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' });
  }

  const productName = req.body.productName || req.file.originalname;
  const videos = loadVideos();
  const newId = `vid_${String(videos.length + 1).padStart(3, '0')}`;
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
  if (!req.file) {
    return res.status(400).json({ error: 'No photo provided' });
  }

  const photos = loadPhotos();
  const newId = `photo_${String(photos.length + 1).padStart(3, '0')}`;
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
  res.json({ success: true, item: newEntry });
});

// Catch-all for SPA
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
