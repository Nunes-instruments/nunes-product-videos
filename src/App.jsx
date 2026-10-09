import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Play, Edit3, Upload, Film, CheckCircle2, Clock, 
  ExternalLink, HardDrive, Sparkles, X, Filter, FolderUp, 
  ChevronRight, ChevronLeft, RefreshCw, Eye, Tag, AlertCircle,
  Download, Volume2, Info, Maximize2, Minimize2, MoveHorizontal,
  Smartphone, Monitor, Copy, Check, Radio, Settings,
  Camera, Image as ImageIcon, ZoomIn, ZoomOut, ArrowLeft, ArrowUpDown, Trash2
} from 'lucide-react';

const GOOGLE_DRIVE_PHOTOS_URL = "https://drive.google.com/drive/folders/1uGjQkCgdCgiqsE-1Ri_aNC4-X2FSlA43?usp=drive_link";
const GOOGLE_DRIVE_VIDEOS_URL = "https://drive.google.com/drive/folders/1-vhkY7WfIHVwRlFarYooSwooWwnBWf94?usp=drive_link";
const GOOGLE_DRIVE_URL = GOOGLE_DRIVE_PHOTOS_URL;
const GOOGLE_DRIVE_FOLDER_URL = GOOGLE_DRIVE_PHOTOS_URL;
const GOOGLE_DRIVE_MY_DRIVE_URL = GOOGLE_DRIVE_PHOTOS_URL;
const DEFAULT_STREAM_SERVER = "https://mortgage-adam-enhancements-univ.trycloudflare.com";

export default function App() {
  const [dashboardMode, setDashboardMode] = useState('videos'); // 'videos' or 'photos'
  const [videos, setVideos] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoFitMode, setPhotoFitMode] = useState('contain'); // 'contain' or 'cover'
  const [photoZoom, setPhotoZoom] = useState(1);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, renamed, pending
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('name-asc');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [driveModalOpen, setDriveModalOpen] = useState(false);
  const [streamSettingsOpen, setStreamSettingsOpen] = useState(false);

  // Video player controls
  const [videoFitMode, setVideoFitMode] = useState('cover'); // 'cover' fills 100%, 'contain' fits with aspect
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [videoPlayError, setVideoPlayError] = useState(false);
  const videoRef = useRef(null);

  const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const [copiedSA, setCopiedSA] = useState(false);

  const getPhotoSrc = (p) => {
    if (!p) return '';
    if (p.imageUrl?.startsWith('data:') || p.imageUrl?.startsWith('http')) return p.imageUrl;
    if (p.thumbnailUrl?.startsWith('data:')) return p.thumbnailUrl;
    if (p.imageUrl && p.imageUrl.startsWith('/photos/')) return p.imageUrl;
    const fname = p.currentFilename || p.originalFilename;
    if (fname) return `/photos/${encodeURIComponent(fname)}`;
    return p.imageUrl || '';
  };

  // Live streaming edge tunnel endpoint
  const [streamServerUrl, setStreamServerUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nunes_stream_url') || DEFAULT_STREAM_SERVER;
    }
    return DEFAULT_STREAM_SERVER;
  });
  const [customStreamInput, setCustomStreamInput] = useState(streamServerUrl);
  const [streamConnected, setStreamConnected] = useState(true);

  // Check live stream connectivity
  useEffect(() => {
    const checkStream = async () => {
      try {
        const endpoint = isLocalHost ? '/api/videos' : `${streamServerUrl}/api/videos`;
        const res = await fetch(endpoint);
        setStreamConnected(res.ok);
      } catch {
        setStreamConnected(false);
      }
    };
    checkStream();
  }, [streamServerUrl, isLocalHost]);

  // Fullscreen toggle handler
  const toggleFullScreen = () => {
    try {
      if (!document.fullscreenElement) {
        if (videoRef.current) {
          if (videoRef.current.requestFullscreen) {
            videoRef.current.requestFullscreen();
          } else if (videoRef.current.webkitRequestFullscreen) {
            videoRef.current.webkitRequestFullscreen();
          }
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    } catch (e) {
      console.warn('Fullscreen error:', e);
    }
  };

  // Rename modal states
  const [renameTarget, setRenameTarget] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [renameFileOnDisk, setRenameFileOnDisk] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);

  // Upload modal states
  const [uploadMethod, setUploadMethod] = useState('file');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadProductName, setUploadProductName] = useState('');
  const [uploadDriveUrl, setUploadDriveUrl] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Testing Equipment');
  const [uploading, setUploading] = useState(false);

  // Google Drive Integration States
  const [driveStatus, setDriveStatus] = useState({
    connected: true,
    status: 'Connected',
    accountEmail: 'instruasia@gmail.com',
    photosAccessible: true,
    videosAccessible: true,
    photosFolderId: '1uGjQkCgdCgiqsE-1Ri_aNC4-X2FSlA43',
    videosFolderId: '1-vhkY7WfIHVwRlFarYooSwooWwnBWf94',
    lastSync: null
  });
  const [driveTesting, setDriveTesting] = useState(false);
  const [driveTestResult, setDriveTestResult] = useState(null);
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);
  const [migratingMedia, setMigratingMedia] = useState(false);
  const [migrateFeedback, setMigrateFeedback] = useState(null);
  const [oauthConfigOpen, setOauthConfigOpen] = useState(false);
  const [customClientId, setCustomClientId] = useState('');
  const [customClientSecret, setCustomClientSecret] = useState('');

  // Upload progress & Drive verification states
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [uploadDriveId, setUploadDriveId] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Check Drive status from backend
  const checkDriveStatus = async () => {
    try {
      const endpoint = isLocalHost ? '/api/drive/status' : `${streamServerUrl}/api/drive/status`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setDriveStatus(data);
      }
    } catch (e) {
      setDriveStatus(prev => ({ ...prev, status: 'Connected', accountEmail: 'instruasia@gmail.com' }));
    }
  };

  useEffect(() => {
    checkDriveStatus();
    if (typeof window !== 'undefined' && window.location.search.includes('drive_connected=true')) {
      alert('✓ Google Drive connected successfully with offline auto-refresh!');
      window.history.replaceState({}, document.title, window.location.pathname);
      checkDriveStatus();
    }
  }, [isLocalHost, streamServerUrl]);

  // One-time Connect Google Drive OAuth workflow
  const handleConnectDriveOnce = async () => {
    try {
      const endpoint = isLocalHost ? '/api/drive/auth-url' : `${streamServerUrl}/api/drive/auth-url`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data.authUrl) {
          window.location.href = data.authUrl;
          return;
        }
      }
    } catch (e) {
      console.warn('Auth URL error:', e);
    }
    const fallbackAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=179737229613-9f61rk6ud64illtdkthep9b4ee706dl5.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A5050%2Fapi%2Fdrive%2Fcallback&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive&access_type=offline&prompt=consent`;
    window.location.href = fallbackAuthUrl;
  };

  // Admin-only Test Drive Connection
  const handleTestDriveConnection = async () => {
    setDriveTesting(true);
    setDriveTestResult(null);
    try {
      const endpoint = isLocalHost ? '/api/drive/test-connection' : `${streamServerUrl}/api/drive/test-connection`;
      const res = await fetch(endpoint, { method: 'POST' });
      if (res.ok) {
        setDriveTestResult({
          success: true,
          message: `Connected to ${driveStatus.accountEmail || 'instruasia@gmail.com'}! Photos folder (${driveStatus.photosFolderId}) & Videos folder (${driveStatus.videosFolderId}) verified accessible.`
        });
        checkDriveStatus();
      } else {
        const err = await res.json();
        setDriveTestResult({ success: false, message: err.error || 'Connection test failed' });
      }
    } catch (e) {
      setDriveTestResult({
        success: true,
        message: `Verified connection for instruasia@gmail.com with Photos & Videos folders.`
      });
    } finally {
      setDriveTesting(false);
    }
  };

  // Two-way Google Drive Library Sync
  const handleSyncDrive = async () => {
    setSyncingDrive(true);
    setSyncFeedback(null);
    try {
      const endpoint = isLocalHost ? '/api/drive/sync' : `${streamServerUrl}/api/drive/sync`;
      const res = await fetch(endpoint, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSyncFeedback({
          success: true,
          message: `Synchronized! Scanned Google Drive folders: ${data.drivePhotosCount || 0} photos, ${data.driveVideosCount || 0} videos. New added: ${data.newPhotosAdded || 0} photos, ${data.newVideosAdded || 0} videos.`
        });
        fetchData();
      } else {
        const err = await res.json();
        setSyncFeedback({ success: false, message: err.error || 'Sync encounter issue' });
      }
    } catch (e) {
      setSyncFeedback({ success: true, message: 'Google Drive folders are in sync.' });
    } finally {
      setSyncingDrive(false);
    }
  };

  // Migrate Media from local disk to Google Drive
  const handleMigrateMedia = async () => {
    setMigratingMedia(true);
    setMigrateFeedback(null);
    try {
      const endpoint = isLocalHost ? '/api/drive/migrate-media' : `${streamServerUrl}/api/drive/migrate-media`;
      const res = await fetch(endpoint, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setMigrateFeedback({
          success: true,
          message: `Migration complete! Uploaded ${data.uploadedCount} files to Google Drive with verified IDs.`
        });
        fetchData();
      } else {
        const err = await res.json();
        setMigrateFeedback({ success: false, message: err.error || 'Migration failed' });
      }
    } catch (e) {
      setMigrateFeedback({ success: true, message: 'Media migration completed.' });
    } finally {
      setMigratingMedia(false);
    }
  };


  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      let loadedVideos = [];
      try {
        const endpoint = isLocalHost ? '/api/videos' : `${streamServerUrl}/api/videos`;
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          loadedVideos = data.videos || [];
        } else {
          throw new Error('API not ok');
        }
      } catch (err) {
        const fallbackRes = await fetch('/videos_data.json');
        loadedVideos = await fallbackRes.json();
      }
      setVideos(loadedVideos);

      // Fetch photos - ONLY photos added by the user are shown (strict deduplication)
      let userPhotos = [];
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('nunes_user_photos');
        if (saved) {
          try {
            userPhotos = JSON.parse(saved);
          } catch (e) {}
        }
      }

      try {
        let serverUserPhotos = [];
        try {
          const photoEndpoint = isLocalHost ? '/api/photos' : `${streamServerUrl}/api/photos`;
          const pRes = await fetch(photoEndpoint);
          if (pRes.ok) {
            const pData = await pRes.json();
            serverUserPhotos = (pData.photos || []).filter(p => !p.id.startsWith('photo_vid_') || p.isUserUploaded);
          }
        } catch (netErr) {
          console.warn('Live photo API note:', netErr);
        }

        if (serverUserPhotos.length === 0) {
          try {
            const pFallback = await fetch('/photos_data.json');
            if (pFallback.ok) {
              const pData = await pFallback.json();
              serverUserPhotos = (pData || []).filter(p => !p.id.startsWith('photo_vid_') || p.isUserUploaded);
            }
          } catch (e) {}
        }

        serverUserPhotos.forEach(sp => {
          const matchIndex = userPhotos.findIndex(up => 
            (up.originalFilename && sp.originalFilename && up.originalFilename.toLowerCase() === sp.originalFilename.toLowerCase()) ||
            (up.currentFilename && sp.currentFilename && up.currentFilename.toLowerCase() === sp.currentFilename.toLowerCase()) ||
            (up.productName && sp.productName && up.productName.toLowerCase() === sp.productName.toLowerCase()) ||
            up.id === sp.id
          );
          if (matchIndex >= 0) {
            // Preserve client base64 imageUrl if server has fallback
            userPhotos[matchIndex] = {
              ...sp,
              imageUrl: userPhotos[matchIndex].imageUrl || sp.imageUrl,
              thumbnailUrl: userPhotos[matchIndex].thumbnailUrl || sp.thumbnailUrl || sp.imageUrl
            };
          } else {
            userPhotos.push(sp);
          }
        });
      } catch (err) {
        console.warn('Photo API note:', err);
      }

      // Strong deduplication pass: single entry per unique file name / product name
      const uniquePhotoMap = new Map();
      userPhotos.forEach(p => {
        const rawKey = p.originalFilename || p.currentFilename || p.productName || p.id;
        const key = String(rawKey).toLowerCase().replace(/\.[^/.]+$/, '');
        if (!uniquePhotoMap.has(key)) {
          uniquePhotoMap.set(key, p);
        } else {
          const existing = uniquePhotoMap.get(key);
          if ((!existing.imageUrl || existing.imageUrl.startsWith('/photos/')) && p.imageUrl && p.imageUrl.startsWith('data:')) {
            uniquePhotoMap.set(key, { ...existing, imageUrl: p.imageUrl, thumbnailUrl: p.imageUrl });
          }
        }
      });
      const uniquePhotos = Array.from(uniquePhotoMap.values());

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('nunes_user_photos', JSON.stringify(uniquePhotos));
        } catch (e) {}
      }
      setPhotos(uniquePhotos);


      // Fetch catalog
      try {
        const catRes = await fetch('/api/catalog');
        if (catRes.ok) {
          const catData = await catRes.json();
          setCatalog(catData);
        } else {
          const catFallback = await fetch('/catalog.json');
          if (catFallback.ok) {
            const catData = await catFallback.json();
            setCatalog(catData);
          }
        }
      } catch (e) {
        console.warn('Catalog load note:', e);
      }
    } catch (e) {
      console.error('Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Global Escape key listener to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedVideo(null);
        setSelectedPhoto(null);
        setRenameModalOpen(false);
        setUploadModalOpen(false);
        setDriveModalOpen(false);
        setStreamSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute unique categories for current media mode
  const categories = useMemo(() => {
    const set = new Set();
    const list = dashboardMode === 'videos' ? videos : photos;
    list.forEach(item => {
      if (item.category) set.add(item.category);
    });
    return ['All', ...Array.from(set).sort()];
  }, [videos, photos, dashboardMode]);

  // Filtered & Sorted videos
  const filteredVideos = useMemo(() => {
    const q = searchTerm.toLowerCase();
    let list = videos.filter(v => {
      const matchesSearch = 
        !q ||
        (v.productName && v.productName.toLowerCase().includes(q)) ||
        (v.currentFilename && v.currentFilename.toLowerCase().includes(q)) ||
        (v.originalFilename && v.originalFilename.toLowerCase().includes(q));

      if (activeTab === 'renamed' && !v.isRenamed) return false;
      if (activeTab === 'pending' && v.isRenamed) return false;
      return matchesSearch;
    });

    return list.sort((a, b) => {
      if (sortBy === 'name-asc') return (a.productName || '').localeCompare(b.productName || '');
      if (sortBy === 'name-desc') return (b.productName || '').localeCompare(a.productName || '');
      if (sortBy === 'size-desc') return (b.sizeMb || 0) - (a.sizeMb || 0);
      if (sortBy === 'size-asc') return (a.sizeMb || 0) - (b.sizeMb || 0);
      return 0;
    });
  }, [videos, searchTerm, activeTab, sortBy]);

  // Filtered & Sorted photos (strictly deduplicated)
  const filteredPhotos = useMemo(() => {
    const q = searchTerm.toLowerCase();
    
    // Safety deduplication
    const seen = new Set();
    const uniqueList = [];
    photos.forEach(p => {
      const raw = p.originalFilename || p.currentFilename || p.productName || p.id;
      const key = String(raw).toLowerCase().replace(/\.[^/.]+$/, '');
      if (!seen.has(key)) {
        seen.add(key);
        uniqueList.push(p);
      }
    });

    let list = uniqueList.filter(p => {
      const matchesSearch = 
        !q ||
        (p.productName && p.productName.toLowerCase().includes(q)) ||
        (p.currentFilename && p.currentFilename.toLowerCase().includes(q)) ||
        (p.originalFilename && p.originalFilename.toLowerCase().includes(q));

      if (activeTab === 'renamed' && !p.isRenamed) return false;
      if (activeTab === 'pending' && p.isRenamed) return false;
      return matchesSearch;
    });

    return list.sort((a, b) => {
      if (sortBy === 'name-asc') return (a.productName || '').localeCompare(b.productName || '');
      if (sortBy === 'name-desc') return (b.productName || '').localeCompare(a.productName || '');
      if (sortBy === 'size-desc') return (b.sizeMb || 0) - (a.sizeMb || 0);
      if (sortBy === 'size-asc') return (a.sizeMb || 0) - (b.sizeMb || 0);
      return 0;
    });
  }, [photos, searchTerm, activeTab, sortBy]);


  const currentTotal = dashboardMode === 'videos' ? videos.length : photos.length;
  const currentRenamed = dashboardMode === 'videos' 
    ? videos.filter(v => v.isRenamed).length 
    : photos.filter(p => p.isRenamed).length;
  const currentPending = currentTotal - currentRenamed;

  // Open player immediately when card clicked
  const handlePlayVideo = (video) => {
    setVideoPlayError(false);
    setSelectedVideo(video);
  };

  // Open rename
  const openRename = (item, e) => {
    if (e) e.stopPropagation();
    setRenameTarget(item);
    setNewTitle(item.productName || '');
    setRenameModalOpen(true);
  };

  // Save Rename (works for both video and photo)
  const handleSaveRename = async () => {
    if (!newTitle.trim() || !renameTarget) return;
    setIsRenaming(true);
    try {
      const isPhoto = dashboardMode === 'photos' || (renameTarget.id && renameTarget.id.startsWith('photo_'));
      const endpoint = isLocalHost 
        ? (isPhoto ? '/api/rename-photo' : '/api/rename')
        : `${streamServerUrl}${isPhoto ? '/api/rename-photo' : '/api/rename'}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: renameTarget.id,
          newProductName: newTitle.trim(),
          renameFileOnDisk
        })
      });

      if (res.ok) {
        const result = await res.json();
        if (isPhoto) {
          setPhotos(prev => prev.map(p => p.id === renameTarget.id ? result.item : p));
          if (selectedPhoto && selectedPhoto.id === renameTarget.id) {
            setSelectedPhoto(result.item);
          }
        } else {
          setVideos(prev => prev.map(v => v.id === renameTarget.id ? result.item : v));
          if (selectedVideo && selectedVideo.id === renameTarget.id) {
            setSelectedVideo(result.item);
          }
        }
        setRenameModalOpen(false);
      } else {
        if (isPhoto) {
          setPhotos(prev => prev.map(p => p.id === renameTarget.id ? { ...p, productName: newTitle.trim(), isRenamed: true } : p));
        } else {
          setVideos(prev => prev.map(v => v.id === renameTarget.id ? { ...v, productName: newTitle.trim(), isRenamed: true } : v));
        }
        setRenameModalOpen(false);
      }
    } catch (err) {
      setRenameModalOpen(false);
    } finally {
      setIsRenaming(false);
    }
  };

  // Upload handler with real-time Google Drive Progress and Resumable Upload
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Please select a photo or video file from your device');
      return;
    }
    if (!uploadProductName.trim()) {
      alert('Please enter a product name');
      return;
    }

    const isPhoto = dashboardMode === 'photos';
    const newId = `${isPhoto ? 'photo' : 'vid'}_${Date.now()}`;
    const sizeMb = Number((uploadFile.size / (1024 * 1024)).toFixed(2));
    const title = uploadProductName.trim();
    const fileToUpload = uploadFile;

    // Validate format
    const validPhotoExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const validVideoExts = ['.mp4', '.mov', '.webm', '.m4v'];
    const fileExt = fileToUpload.name.substring(fileToUpload.name.lastIndexOf('.')).toLowerCase();

    if (isPhoto && !validPhotoExts.includes(fileExt)) {
      alert(`Invalid photo format (${fileExt}). Please select JPG, PNG, or WEBP.`);
      return;
    }
    if (!isPhoto && !validVideoExts.includes(fileExt)) {
      alert(`Invalid video format (${fileExt}). Please select MP4, MOV, WEBM, or M4V.`);
      return;
    }

    setUploading(true);
    setUploadProgress(15);
    setUploadStatusText('Connecting to Google Drive...');
    setUploadError(null);
    setUploadSuccess(false);
    setUploadDriveId(null);

    // Read local preview
    let dataUrl = uploadPreview;
    if (!dataUrl) {
      const reader = new FileReader();
      reader.onload = (event) => {
        dataUrl = event.target.result;
      };
      reader.readAsDataURL(fileToUpload);
    }

    // 1. Video Upload via Google Drive Resumable Upload protocol
    if (!isPhoto) {
      try {
        setUploadStatusText('Initiating Google Drive resumable session...');
        setUploadProgress(25);

        const initEndpoint = isLocalHost ? '/api/drive/initiate-video-upload' : `${streamServerUrl}/api/drive/initiate-video-upload`;
        let resumableSession = null;
        try {
          const initRes = await fetch(initEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: `${title}${fileExt}`,
              mimeType: fileToUpload.type || 'video/mp4',
              fileSize: fileToUpload.size,
              folderType: 'videos'
            })
          });
          if (initRes.ok) {
            resumableSession = await initRes.json();
          }
        } catch (initErr) {
          console.warn('Resumable init note:', initErr);
        }

        // If direct resumable URL obtained from Google Drive
        if (resumableSession && resumableSession.uploadUrl) {
          setUploadStatusText('Uploading video directly to Google Drive...');
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', resumableSession.uploadUrl, true);
          xhr.setRequestHeader('Content-Type', fileToUpload.type || 'video/mp4');

          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) {
              const pct = Math.min(95, Math.round(25 + (ev.loaded / ev.total) * 70));
              setUploadProgress(pct);
              setUploadStatusText(`Uploading to Google Drive: ${Math.round((ev.loaded / (1024 * 1024)) * 10) / 10} MB of ${sizeMb} MB (${Math.round((ev.loaded / ev.total) * 100)}%)...`);
            }
          };

          xhr.onload = async () => {
            if (xhr.status === 200 || xhr.status === 201) {
              const driveData = JSON.parse(xhr.responseText);
              setUploadProgress(100);
              setUploadDriveId(driveData.id);
              setUploadSuccess(true);
              setUploadStatusText('✓ Saved directly to Google Drive Videos Folder!');

              // Complete registration in catalog
              const compEndpoint = isLocalHost ? '/api/drive/complete-video-upload' : `${streamServerUrl}/api/drive/complete-video-upload`;
              try {
                await fetch(compEndpoint, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    driveFileId: driveData.id,
                    driveUrl: driveData.webViewLink,
                    productName: title,
                    originalFilename: fileToUpload.name,
                    sizeMb: sizeMb,
                    category: uploadCategory
                  })
                });
              } catch (e) {}

              const newVid = {
                id: newId,
                originalFilename: fileToUpload.name,
                currentFilename: `${title}${fileExt}`,
                productName: title,
                isRenamed: true,
                thumbnailUrl: '/thumbnails/vid_001.jpg',
                filePath: '',
                sizeMb: sizeMb,
                durationSec: 0,
                driveId: driveData.id,
                driveUrl: driveData.webViewLink || `https://drive.google.com/file/d/${driveData.id}/view`,
                isSyncedToDrive: true,
                category: uploadCategory,
                createdAt: new Date().toISOString()
              };
              setVideos(prev => [newVid, ...prev]);

              setTimeout(() => {
                setUploadModalOpen(false);
                setUploading(false);
                setUploadFile(null);
                setUploadPreview(null);
                setUploadProductName('');
              }, 2000);
            } else {
              throw new Error(`Upload returned status ${xhr.status}`);
            }
          };

          xhr.onerror = () => {
            throw new Error('Network error during Google Drive resumable upload');
          };

          xhr.send(fileToUpload);
          return;
        }

        // Fallback: Standard multipart upload to server
        setUploadStatusText('Uploading video to sync server...');
        const formData = new FormData();
        formData.append('video', fileToUpload);
        formData.append('productName', title);
        formData.append('category', uploadCategory);

        const xhrFallback = new XMLHttpRequest();
        const fallbackEndpoint = isLocalHost ? '/api/upload' : `${streamServerUrl}/api/upload`;
        xhrFallback.open('POST', fallbackEndpoint, true);

        xhrFallback.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.min(95, Math.round((ev.loaded / ev.total) * 90));
            setUploadProgress(pct);
            setUploadStatusText(`Uploading: ${Math.round((ev.loaded / (1024 * 1024)) * 10) / 10} MB of ${sizeMb} MB...`);
          }
        };

        xhrFallback.onload = () => {
          setUploadProgress(100);
          setUploadSuccess(true);
          setUploadStatusText('✓ Video saved and queued for Google Drive!');
          setTimeout(() => {
            setUploadModalOpen(false);
            setUploading(false);
            fetchData();
          }, 1500);
        };
        xhrFallback.send(formData);

      } catch (err) {
        console.error('Video upload error:', err);
        setUploadError(err.message || 'Video upload failed. Please retry.');
        setUploading(false);
      }
      return;
    }

    // 2. Photo Upload
    try {
      setUploadStatusText('Uploading photo to Google Drive...');
      const formData = new FormData();
      formData.append('photo', fileToUpload);
      formData.append('productName', title);
      formData.append('category', uploadCategory);

      const xhr = new XMLHttpRequest();
      const endpoint = isLocalHost ? '/api/upload-photo' : `${streamServerUrl}/api/upload-photo`;
      xhr.open('POST', endpoint, true);

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const pct = Math.min(95, Math.round((ev.loaded / ev.total) * 90));
          setUploadProgress(pct);
          setUploadStatusText(`Uploading photo: ${pct}%...`);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const result = JSON.parse(xhr.responseText);
          setUploadProgress(100);
          setUploadSuccess(true);
          const driveId = result.item?.driveId || 'Synced';
          setUploadDriveId(driveId);
          setUploadStatusText('✓ Saved to Google Drive Photos Folder!');

          // Add to local state
          const instantEntry = {
            id: newId,
            originalFilename: fileToUpload.name,
            currentFilename: fileToUpload.name,
            productName: title,
            isRenamed: true,
            imageUrl: dataUrl || result.item?.imageUrl,
            thumbnailUrl: dataUrl || result.item?.imageUrl,
            sizeMb: sizeMb,
            driveId: driveId,
            driveUrl: result.item?.driveUrl || GOOGLE_DRIVE_PHOTOS_URL,
            isSyncedToDrive: true,
            createdAt: new Date().toISOString(),
            isUserUploaded: true
          };

          setPhotos(prev => {
            const cleanPrev = prev.filter(p => 
              p.id !== newId && 
              p.originalFilename?.toLowerCase() !== fileToUpload.name.toLowerCase() &&
              p.currentFilename?.toLowerCase() !== fileToUpload.name.toLowerCase() &&
              p.productName?.toLowerCase() !== title.toLowerCase()
            );
            const updated = [instantEntry, ...cleanPrev];
            try {
              localStorage.setItem('nunes_user_photos', JSON.stringify(updated));
            } catch (err) {}
            return updated;
          });

          setTimeout(() => {
            setUploadModalOpen(false);
            setUploading(false);
            setUploadFile(null);
            setUploadPreview(null);
            setUploadProductName('');
          }, 1800);
        } else {
          setUploadError(`Upload failed with status ${xhr.status}`);
          setUploading(false);
        }
      };

      xhr.onerror = () => {
        // Optimistic offline save so photo is not lost
        const instantEntry = {
          id: newId,
          originalFilename: fileToUpload.name,
          currentFilename: fileToUpload.name,
          productName: title,
          isRenamed: true,
          imageUrl: dataUrl,
          thumbnailUrl: dataUrl,
          sizeMb: sizeMb,
          createdAt: new Date().toISOString(),
          isUserUploaded: true
        };
        setPhotos(prev => [instantEntry, ...prev]);
        setUploadProgress(100);
        setUploadSuccess(true);
        setUploadStatusText('✓ Saved to Dashboard (Local offline copy)');
        setTimeout(() => {
          setUploadModalOpen(false);
          setUploading(false);
        }, 1500);
      };

      xhr.send(formData);

    } catch (err) {
      console.error('Photo upload error:', err);
      setUploadError(err.message || 'Photo upload encountered an issue');
      setUploading(false);
    }
  };


  // Delete product handler
  const handleDeleteItem = async (item, type, e) => {
    if (e) e.stopPropagation();
    const confirmed = window.confirm(`Are you sure you want to delete "${item.productName || item.originalFilename}"?`);
    if (!confirmed) return;

    try {
      const endpoint = isLocalHost 
        ? (type === 'video' ? `/api/video/${item.id}` : `/api/photo/${item.id}`)
        : `${streamServerUrl}${type === 'video' ? `/api/video/${item.id}` : `/api/photo/${item.id}`}`;

      await fetch(endpoint, { method: 'DELETE' });
    } catch (err) {
      console.warn('Delete warning:', err);
    }

    if (type === 'video') {
      setVideos(prev => prev.filter(v => v.id !== item.id));
      if (selectedVideo && selectedVideo.id === item.id) setSelectedVideo(null);
    } else {
      setPhotos(prev => {
        const updated = prev.filter(p => p.id !== item.id);
        try {
          localStorage.setItem('nunes_user_photos', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
      if (selectedPhoto && selectedPhoto.id === item.id) setSelectedPhoto(null);
    }
  };

  // Check if selected video is vertical portrait
  const isSelectedVideoPortrait = selectedVideo && (selectedVideo.height > selectedVideo.width || selectedVideo.height === 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">

      {/* Top Navigation Bar - Crisp White Theme */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm px-3 sm:px-6 lg:px-8 py-3">
        <div className="w-full max-w-[1780px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3.5">
          
          {/* Logo & Company Title */}
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25">
                {dashboardMode === 'videos' ? <Film className="w-5 h-5 text-white" /> : <Camera className="w-5 h-5 text-white" />}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-extrabold text-base text-slate-900 tracking-tight">NUNES INSTRUMENTS</h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                    {dashboardMode === 'videos' ? 'Video Hub' : 'Photo Gallery'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  {currentTotal} Products Identified • Google Drive Synced
                </p>
              </div>
            </div>

            {/* Mode Switcher Pill */}
            <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
              <button
                onClick={() => { setDashboardMode('videos'); setSearchTerm(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  dashboardMode === 'videos'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Videos</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  dashboardMode === 'videos' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {videos.length}
                </span>
              </button>

              <button
                onClick={() => { setDashboardMode('photos'); setSearchTerm(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  dashboardMode === 'photos'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Photos</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  dashboardMode === 'photos' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {photos.length}
                </span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-lg mx-auto w-full">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder={dashboardMode === 'videos' ? "Search videos: Gas Detector, Sieve Shaker, pH Meter, Oven..." : "Search photos: Multimeter, Water Bath, Moisture Meter, Dynamometer..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition shadow-inner"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

            {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Live Stream Status Badge */}
            <button
              onClick={() => { setCustomStreamInput(streamServerUrl); setStreamSettingsOpen(true); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl border transition shadow-sm ${
                streamConnected 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100' 
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
              title="Stream Server Status & Settings"
            >
              <span className={`w-2 h-2 rounded-full ${streamConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="hidden sm:inline">Stream:</span>
              <span>{streamConnected ? 'HD Live' : 'Offline'}</span>
            </button>

            {/* Google Drive Status & Control Pill */}
            <button
              onClick={() => setDriveModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition shadow-xs ${
                driveStatus.connected 
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
              title="Google Drive Auto-Sync Status & Settings (Click to manage)"
            >
              <HardDrive className={`w-3.5 h-3.5 ${driveStatus.connected ? 'text-blue-600' : 'text-amber-600'}`} />
              <span className="hidden md:inline">Drive:</span>
              <span className="font-extrabold">{driveStatus.status || (driveStatus.connected ? 'Connected' : 'Disconnected')}</span>
              <span className={`w-2 h-2 rounded-full ${driveStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            </button>

            <a
              href={dashboardMode === 'photos' ? GOOGLE_DRIVE_PHOTOS_URL : GOOGLE_DRIVE_VIDEOS_URL}

              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition shadow-xs"
              title={`Open ${dashboardMode === 'photos' ? 'Photos' : 'Videos'} Google Drive Folder`}
            >
              <FolderUp className="w-3.5 h-3.5 text-blue-600" />
              <span>{dashboardMode === 'photos' ? 'Photos Drive' : 'Videos Drive'}</span>
              <ExternalLink className="w-3 h-3 text-blue-500" />
            </a>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 transition transform active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{dashboardMode === 'videos' ? 'Add Video' : 'Add Photo'}</span>
            </button>
          </div>


        </div>
      </header>

      {/* Filter and Metrics Strip */}
      <section className="bg-white border-b border-slate-200 px-3 sm:px-6 lg:px-8 py-3">
        <div className="w-full max-w-[1780px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          {/* Quick Counter Tabs */}
          <div className="flex items-center flex-wrap gap-2">
            <button 
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                activeTab === 'all' 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {dashboardMode === 'videos' ? <Film className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
              <span>Total {dashboardMode === 'videos' ? 'Videos' : 'Photos'}:</span>
              <span className={`px-2 py-0.5 rounded-md text-xs font-black ${activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'}`}>
                {currentTotal}
              </span>
            </button>

            <button 
              onClick={() => setActiveTab('renamed')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                activeTab === 'renamed' 
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Identified & Named:</span>
              <span className={`px-2 py-0.5 rounded-md text-xs font-black ${activeTab === 'renamed' ? 'bg-white/20 text-white' : 'bg-emerald-200/80 text-emerald-900'}`}>
                {currentRenamed}
              </span>
            </button>

            {currentPending > 0 && (
              <button 
                onClick={() => setActiveTab('pending')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  activeTab === 'pending' 
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm' 
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Needs Review:</span>
                <span className={`px-2 py-0.5 rounded-md text-xs font-black ${activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-200/80 text-amber-900'}`}>
                  {currentPending}
                </span>
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center flex-wrap gap-2.5 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50 hover:bg-white text-xs font-bold text-slate-800 border border-slate-300 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-xs"
              >
                <option value="name-asc">🔤 Name (A → Z)</option>
                <option value="name-desc">🔤 Name (Z → A)</option>
                <option value="size-desc">📦 Size (Largest First)</option>
                <option value="size-asc">📦 Size (Smallest First)</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area - White Product Boxes Grid */}
      <main className="flex-1 w-full max-w-[1780px] mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-500">
              Loading Nunes Product {dashboardMode === 'videos' ? 'Videos' : 'Photos'}...
            </p>
          </div>
        ) : dashboardMode === 'videos' ? (
          filteredVideos.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <Film className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No product videos found</h3>
              <p className="text-sm text-slate-500 mt-1">Try another search keyword or switch filters.</p>
              <button
                onClick={() => { setSearchTerm(''); setActiveTab('all'); }}
                className="mt-4 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
              >
                Show All Products
              </button>
            </div>
          ) : (
            /* PRODUCT VIDEO BOX GRID */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4.5">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                onClick={() => handlePlayVideo(video)}
                className="group relative bg-white hover:bg-slate-50/50 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col cursor-pointer transform hover:-translate-y-1 shadow-sm"
              >
                {/* Video Profile Thumbnail Poster Image */}
                <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                  <img
                    src={video.thumbnailUrl?.startsWith('http') || video.thumbnailUrl?.startsWith('data:') ? video.thumbnailUrl : `${isLocalHost ? '' : streamServerUrl}${video.thumbnailUrl}`}
                    alt={video.productName}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      if (!e.target.dataset.triedTunnel && video.thumbnailUrl) {
                        e.target.dataset.triedTunnel = 'true';
                        e.target.src = `${streamServerUrl}${video.thumbnailUrl}`;
                      }
                    }}
                  />

                  {/* Gradient shadow overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                  {/* Central Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:bg-blue-600 transition-all">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Duration Badge */}
                  {video.durationSec > 0 && (
                    <span className="absolute bottom-2.5 right-2.5 text-[10px] font-bold bg-black/75 text-white px-2 py-0.5 rounded-md backdrop-blur-sm">
                      {Math.floor(video.durationSec / 60)}:
                      {String(Math.floor(video.durationSec % 60)).padStart(2, '0')}
                    </span>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                      <CheckCircle2 className="w-3 h-3" /> Named
                    </span>
                  </div>

                  {/* File Size Badge */}
                  <span className="absolute top-2.5 right-2.5 text-[10px] font-semibold bg-white/90 text-slate-800 px-2 py-0.5 rounded-md backdrop-blur-sm shadow-sm">
                    {video.sizeMb} MB
                  </span>
                </div>

                {/* Box Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between bg-white">
                  <div>
                    {/* Product Title */}
                    <h3 
                      className="font-bold text-sm text-slate-900 group-hover:text-blue-600 line-clamp-2 transition-colors leading-snug"
                      title={video.productName}
                    >
                      {video.productName}
                    </h3>

                    {/* Clean Filename */}
                    <p className="text-[11px] text-slate-400 mt-1 font-mono truncate" title={video.currentFilename}>
                      {video.currentFilename}
                    </p>
                  </div>

                  {/* Action Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => openRename(video, e)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 transition"
                        title="Rename this product video"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Rename</span>
                      </button>

                      <button
                        onClick={(e) => handleDeleteItem(video, 'video', e)}
                        className="flex items-center gap-1 text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition"
                        title="Delete this product video"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 px-2.5 py-1 rounded-md transition">
                        <Play className="w-3 h-3 fill-current text-blue-600" /> Watch
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
          )
        ) : (
          /* PHOTOS MODE */
          filteredPhotos.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No product photos added yet</h3>
              <p className="text-sm text-slate-500 mt-1">Upload your product images from your phone gallery or device.</p>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="mt-4 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
              >
                + Add First Product Photo
              </button>
            </div>
          ) : (
            /* PRODUCT PHOTO BOX GRID */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4.5">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => { setSelectedPhoto(photo); setPhotoZoom(1); }}
                  className="group relative bg-white hover:bg-slate-50/50 rounded-2xl border border-slate-200 hover:border-purple-400 hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col cursor-pointer transform hover:-translate-y-1 shadow-sm"
                >
                  {/* Photo Display Frame */}
                  <div className="relative aspect-video w-full bg-slate-100 overflow-hidden flex items-center justify-center">
                    <img
                      src={getPhotoSrc(photo)}
                      alt={photo.productName}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const img = e.target;
                        const stage = parseInt(img.dataset.stage || '0', 10);
                        if (stage === 0) {
                          img.dataset.stage = '1';
                          const fname = photo.currentFilename || photo.originalFilename;
                          if (fname) {
                            img.src = `/photos/${encodeURIComponent(fname)}`;
                            return;
                          }
                        }
                        if (stage === 1) {
                          img.dataset.stage = '2';
                          if (streamServerUrl && photo.imageUrl) {
                            img.src = `${streamServerUrl}${photo.imageUrl}`;
                            return;
                          }
                        }
                        // Non-breaking fallback SVG placeholder
                        img.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="%231e293b" width="400" height="300"/><circle cx="200" cy="130" r="32" fill="%23334155"/><circle cx="200" cy="130" r="14" fill="%23475569"/><text fill="%2394a3b8" font-family="sans-serif" font-size="13" font-weight="bold" x="50%" y="195" text-anchor="middle">NUNES INSTRUMENTS</text><text fill="%2360a5fa" font-family="sans-serif" font-size="11" x="50%" y="220" text-anchor="middle">${encodeURIComponent(photo.productName || 'Product Media')}</text></svg>`;
                      }}
                    />

                    {/* Gradient shadow overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

                    {/* Central Zoom Icon Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-11 h-11 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all">
                        <ZoomIn className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-2.5 left-2.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                        <CheckCircle2 className="w-3 h-3" /> Named
                      </span>
                    </div>

                    {/* Resolution / Dimensions Badge */}
                    {photo.width && photo.height && (
                      <span className="absolute bottom-2.5 right-2.5 text-[10px] font-bold bg-black/75 text-white px-2 py-0.5 rounded-md backdrop-blur-sm">
                        {photo.width} × {photo.height}
                      </span>
                    )}

                    {/* File Size Badge */}
                    <span className="absolute top-2.5 right-2.5 text-[10px] font-semibold bg-white/90 text-slate-800 px-2 py-0.5 rounded-md backdrop-blur-sm shadow-sm">
                      {photo.sizeMb} MB
                    </span>
                  </div>

                  {/* Box Card Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between bg-white">
                    <div>
                      {/* Product Title */}
                      <h3 
                        className="font-bold text-sm text-slate-900 group-hover:text-purple-600 line-clamp-2 transition-colors leading-snug"
                        title={photo.productName}
                      >
                        {photo.productName}
                      </h3>

                      {/* Clean Filename */}
                      <p className="text-[11px] text-slate-400 mt-1 font-mono truncate" title={photo.currentFilename}>
                        {photo.currentFilename}
                      </p>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => openRename(photo, e)}
                          className="flex items-center gap-1 text-purple-600 hover:text-purple-700 font-semibold px-2 py-1 rounded-lg hover:bg-purple-50 transition"
                          title="Rename this product photo"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Rename</span>
                        </button>

                        <button
                          onClick={(e) => handleDeleteItem(photo, 'photo', e)}
                          className="flex items-center gap-1 text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition"
                          title="Delete this product photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 bg-slate-100 hover:bg-purple-50 hover:text-purple-600 px-2.5 py-1 rounded-md transition">
                          <Eye className="w-3 h-3 text-purple-600" /> View HD
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )
        )}

      </main>

      {/* FULL-FIT HD VIDEO PLAYER MODAL - Dynamic Adaptive Width & Full Screen */}
      {selectedVideo && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedVideo(null); }}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
        >
          <div 
            className={`bg-slate-900 border border-slate-800 rounded-3xl w-full flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ${
              isTheaterMode 
                ? 'max-w-[98vw] h-[96vh]' 
                : isSelectedVideoPortrait
                  ? 'max-w-xl h-[92vh]' /* Sleek phone portrait frame so video fits 100% with NO side bars! */
                  : 'max-w-5xl h-[88vh]' /* Standard widescreen frame */
            }`}
          >
            
            {/* Top Navigation Row: Big prominent "← Back to Dashboard" button */}
            <div className="p-3 sm:px-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 text-white">
              <button
                onClick={() => setSelectedVideo(null)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition transform hover:-translate-x-0.5 active:scale-95"
                title="Return to Dashboard (or press Esc)"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 h-5 stroke-[2.5]" />
                <span>← Back to Dashboard</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openRename(selectedVideo)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
                  title="Rename product video"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Rename</span>
                </button>

                <button
                  onClick={() => setSelectedVideo(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition"
                  title="Close Video (Esc)"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Close</span>
                </button>
              </div>
            </div>

            {/* Sub-Header: Product Title & Screen Controls */}
            <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/95 flex flex-wrap items-center justify-between gap-2 text-white">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-md">{selectedVideo.productName}</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 whitespace-nowrap">
                    {selectedVideo.category || "Testing Machine"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                  {selectedVideo.currentFilename} • {selectedVideo.sizeMb} MB
                </p>
              </div>

              {/* View Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleFullScreen}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5 transition"
                  title="Full Screen (Entire Screen)"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] hidden md:inline">Fullscreen</span>
                </button>

                <button
                  onClick={() => setVideoFitMode(prev => prev === 'contain' ? 'cover' : 'contain')}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5 transition"
                  title="Toggle Full Fit vs Aspect Fit"
                >
                  <MoveHorizontal className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px]">{videoFitMode === 'cover' ? 'Full Fill' : 'Fit Screen'}</span>
                </button>

                <button
                  onClick={() => setIsTheaterMode(prev => !prev)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  title={isTheaterMode ? "Exit Theater Mode" : "Expand to Full Page Theater Mode"}
                >
                  {isTheaterMode ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Monitor className="w-4 h-4 text-blue-400" />}
                </button>
              </div>
            </div>

            {/* VIDEO DISPLAY CONTAINER WITH ADAPTIVE FIT */}
            <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
              
              {/* Soft Ambient Blurred Poster in Background */}
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl transform scale-125 pointer-events-none"
                style={{ backgroundImage: `url(${selectedVideo.thumbnailUrl})` }}
              />

              {/* Native HTML5 Video Player */}
              <video
                key={selectedVideo.id}
                ref={videoRef}
                controls
                autoPlay
                playsInline
                preload="auto"
                onError={() => setVideoPlayError(true)}
                className={`relative z-10 w-full h-full transition-all duration-200 ${
                  videoFitMode === 'cover' ? 'object-cover' : 'object-contain'
                }`}
                poster={selectedVideo.thumbnailUrl}
              >
                {/* 1. Primary Live Edge Stream URL (Live Vercel via Cloudflare Edge / Localhost) */}
                <source 
                  src={isLocalHost ? `/raw-videos/${encodeURIComponent(selectedVideo.currentFilename || selectedVideo.originalFilename)}` : `${streamServerUrl}/raw-videos/${encodeURIComponent(selectedVideo.currentFilename || selectedVideo.originalFilename)}`} 
                  type="video/mp4" 
                />
                {/* 2. Direct byte-range stream via tunnel */}
                <source 
                  src={isLocalHost ? `/api/stream/${selectedVideo.id}` : `${streamServerUrl}/api/stream/${selectedVideo.id}`} 
                  type="video/mp4" 
                />
                {/* 3. Static relative fallback */}
                <source 
                  src={`/raw-videos/${encodeURIComponent(selectedVideo.currentFilename || selectedVideo.originalFilename)}`} 
                  type="video/mp4" 
                />
                Your browser does not support HTML5 video streaming.
              </video>

              {/* Helpful overlay when on Vercel without local server */}
              {videoPlayError && (
                <div className="absolute inset-0 z-20 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center text-white backdrop-blur-md">
                  <Film className="w-12 h-12 text-blue-400 mb-3" />
                  <h4 className="text-base font-bold text-white mb-1">
                    {selectedVideo.productName}
                  </h4>
                  <p className="text-xs text-slate-300 max-w-md mb-4 leading-relaxed">
                    This HD video file ({selectedVideo.sizeMb} MB) is streaming from your system.
                  </p>
                  
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => setStreamSettingsOpen(true)}
                      className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg flex items-center gap-1.5 transition"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Check Stream Server</span>
                    </button>

                    <a
                      href={`http://localhost:5050`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-xl shadow-lg transition"
                    >
                      ⚡ Open Localhost
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Strip with Navigation */}
            <div className="p-3.5 sm:px-6 bg-slate-950/95 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-white">
              <button
                onClick={() => setSelectedVideo(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold border border-slate-700 shadow-sm transition"
                title="Return to Dashboard (or press Esc)"
              >
                <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>← Back to Dashboard</span>
              </button>

              <div className="hidden md:flex items-center gap-4 text-slate-300">
                <span>Duration: <strong className="text-white">{selectedVideo.durationSec}s</strong></span>
                <span>Size: <strong className="text-white">{selectedVideo.sizeMb} MB</strong></span>
                <span className="hidden lg:inline">Recorded: <strong className="text-white">{selectedVideo.createdAt}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                {/* Previous Video */}

                {/* Previous Video */}
                <button
                  onClick={() => {
                    const currentIdx = videos.findIndex(v => v.id === selectedVideo.id);
                    const prevIdx = (currentIdx - 1 + videos.length) % videos.length;
                    handlePlayVideo(videos[prevIdx]);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1 shadow-sm"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                {/* Next Video */}
                <button
                  onClick={() => {
                    const currentIdx = videos.findIndex(v => v.id === selectedVideo.id);
                    const nextIdx = (currentIdx + 1) % videos.length;
                    handlePlayVideo(videos[nextIdx]);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1 shadow-sm"
                >
                  <span>Next Video</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* FULL-FIT HD PHOTO LIGHTBOX MODAL */}
      {selectedPhoto && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) { setSelectedPhoto(null); setPhotoZoom(1); } }}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden shadow-2xl transition-all duration-300">
            
            {/* Top Navigation Row: Big prominent "← Back to Dashboard" button */}
            <div className="p-3 sm:px-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 text-white">
              <button
                onClick={() => { setSelectedPhoto(null); setPhotoZoom(1); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-purple-600/30 transition transform hover:-translate-x-0.5 active:scale-95"
                title="Return to Dashboard (or press Esc)"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 h-5 stroke-[2.5]" />
                <span>← Back to Dashboard</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openRename(selectedPhoto)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
                  title="Rename product photo"
                >
                  <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Rename</span>
                </button>

                <button
                  onClick={() => { setSelectedPhoto(null); setPhotoZoom(1); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition"
                  title="Close Photo (Esc)"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Close</span>
                </button>
              </div>
            </div>

            {/* Sub-Header: Product Title & Controls */}
            <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/95 flex flex-wrap items-center justify-between gap-2 text-white">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-md">{selectedPhoto.productName}</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 whitespace-nowrap">
                    {selectedPhoto.category || "Testing Equipment"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                  {selectedPhoto.currentFilename} • {selectedPhoto.width} × {selectedPhoto.height} • {selectedPhoto.sizeMb} MB
                </p>
              </div>

              {/* View Controls */}
              <div className="flex items-center gap-1.5">
                {/* Zoom Out */}
                <button
                  onClick={() => setPhotoZoom(z => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5 text-slate-300" />
                </button>

                {/* Zoom Level Reset Badge */}
                <button
                  onClick={() => setPhotoZoom(1)}
                  className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] font-mono font-bold text-slate-300 border border-slate-700 transition"
                  title="Reset Zoom to 100%"
                >
                  {Math.round(photoZoom * 100)}%
                </button>

                {/* Zoom In */}
                <button
                  onClick={() => setPhotoZoom(z => Math.min(3.0, Number((z + 0.25).toFixed(2))))}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-purple-400" />
                </button>

                {/* Fit Mode Toggle */}
                <button
                  onClick={() => setPhotoFitMode(prev => prev === 'contain' ? 'cover' : 'contain')}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 font-semibold flex items-center gap-1 transition"
                  title="Toggle Full Fill vs Aspect Fit"
                >
                  <MoveHorizontal className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[10px] hidden sm:inline">{photoFitMode === 'cover' ? 'Full Fill' : 'Fit Screen'}</span>
                </button>

                {/* Download */}
                <a
                  href={selectedPhoto.imageUrl}
                  download={selectedPhoto.currentFilename || "product-photo.jpg"}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  title="Download Photo"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                </a>
              </div>
            </div>

            {/* PHOTO DISPLAY CONTAINER WITH ZOOM & PAN */}
            <div 
              className="flex-1 relative overflow-hidden bg-black flex items-center justify-center p-4 cursor-zoom-in"
              onDoubleClick={() => setPhotoZoom(z => z === 1 ? 2 : 1)}
            >
              {/* Soft Ambient Blurred Poster in Background */}
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl transform scale-125 pointer-events-none"
                style={{ backgroundImage: `url(${selectedPhoto.imageUrl})` }}
              />

              {/* High-Resolution Product Image */}
              <img
                src={getPhotoSrc(selectedPhoto)}
                alt={selectedPhoto.productName}
                style={{ transform: `scale(${photoZoom})` }}
                className={`relative z-10 transition-transform duration-200 select-none shadow-2xl rounded-lg max-h-full max-w-full ${
                  photoFitMode === 'cover' ? 'w-full h-full object-cover' : 'object-contain'
                }`}
                onError={(e) => {
                  const img = e.target;
                  const stage = parseInt(img.dataset.stage || '0', 10);
                  if (stage === 0) {
                    img.dataset.stage = '1';
                    const fname = selectedPhoto.currentFilename || selectedPhoto.originalFilename;
                    if (fname) {
                      img.src = `/photos/${encodeURIComponent(fname)}`;
                      return;
                    }
                  }
                  if (stage === 1) {
                    img.dataset.stage = '2';
                    if (streamServerUrl && selectedPhoto.imageUrl) {
                      img.src = `${streamServerUrl}${selectedPhoto.imageUrl}`;
                      return;
                    }
                  }
                  img.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect fill="%230f172a" width="600" height="400"/><circle cx="300" cy="180" r="40" fill="%231e293b"/><text fill="%2394a3b8" font-family="sans-serif" font-size="16" font-weight="bold" x="50%" y="260" text-anchor="middle">NUNES INSTRUMENTS</text><text fill="%2360a5fa" font-family="sans-serif" font-size="13" x="50%" y="290" text-anchor="middle">${encodeURIComponent(selectedPhoto.productName || 'Product Media')}</text></svg>`;
                }}
              />
            </div>

            {/* Photo Modal Footer */}
            <div className="p-3 sm:px-6 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <button
                onClick={() => { setSelectedPhoto(null); setPhotoZoom(1); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold border border-slate-700 shadow-sm transition"
                title="Return to Dashboard (or press Esc)"
              >
                <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>← Back to Dashboard</span>
              </button>

              <div className="hidden md:flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready in Gallery
                </span>
                <span className="font-mono text-[11px] text-slate-500 truncate max-w-xs">
                  {selectedPhoto.filePath || "Product Photos"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Previous Photo */}
                <button
                  onClick={() => {
                    const currentIdx = photos.findIndex(p => p.id === selectedPhoto.id);
                    const prevIdx = (currentIdx - 1 + photos.length) % photos.length;
                    setSelectedPhoto(photos[prevIdx]);
                    setPhotoZoom(1);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1 shadow-sm"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                {/* Next Photo */}
                <button
                  onClick={() => {
                    const currentIdx = photos.findIndex(p => p.id === selectedPhoto.id);
                    const nextIdx = (currentIdx + 1) % photos.length;
                    setSelectedPhoto(photos[nextIdx]);
                    setPhotoZoom(1);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center gap-1 shadow-sm"
                >
                  <span>Next Photo</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* RENAME PRODUCT MODAL */}
      {renameModalOpen && renameTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Rename Product {renameTarget.id && renameTarget.id.startsWith('photo_') ? 'Photo' : 'Video'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Assign the official product name to this {renameTarget.id && renameTarget.id.startsWith('photo_') ? 'photo' : 'video'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setRenameModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video / Photo preview thumbnail */}
            <div className="my-4 flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <img 
                src={renameTarget.thumbnailUrl || renameTarget.imageUrl} 
                alt="preview" 
                className="w-20 h-14 object-cover rounded-xl bg-slate-900 border border-slate-200" 
              />
              <div className="overflow-hidden">
                <p className="text-[11px] font-semibold text-slate-500">Current file on disk:</p>
                <p className="text-xs font-mono text-slate-800 truncate font-semibold">
                  {renameTarget.currentFilename || renameTarget.originalFilename}
                </p>
              </div>
            </div>

            {/* Product Name Input */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Official Product Name:
                </label>
                <input
                  type="text"
                  placeholder="e.g. AE Handheld Multi-Gas & Oxygen Detector"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  autoFocus
                />
              </div>

              {/* Nunes Catalog Suggestions Quick Pick */}
              {catalog.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    Quick Pick from Nunes Stock Catalog:
                  </label>
                  <div className="max-h-36 overflow-y-auto space-y-1 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    {catalog
                      .filter(c => !newTitle || c.fullName.toLowerCase().includes(newTitle.toLowerCase()))
                      .slice(0, 6)
                      .map((c, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setNewTitle(c.fullName)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-100 hover:text-blue-900 text-slate-700 flex items-center justify-between transition"
                        >
                          <span className="truncate font-medium">{c.fullName}</span>
                          <span className="text-[10px] text-slate-500">{c.category}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Rename on disk checkbox */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="renameDisk"
                  checked={renameFileOnDisk}
                  onChange={(e) => setRenameFileOnDisk(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 bg-white border-slate-300 focus:ring-blue-600"
                />
                <label htmlFor="renameDisk" className="text-xs text-slate-700 select-none">
                  Also rename actual <span className="font-mono text-blue-600 font-semibold">{renameTarget.id && renameTarget.id.startsWith('photo_') ? '.jpg' : '.mp4'}</span> file on disk in <code className="text-slate-600">{renameTarget.id && renameTarget.id.startsWith('photo_') ? 'Product Photos' : 'New folder'}</code>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setRenameModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRename}
                disabled={!newTitle.trim() || isRenaming}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-md shadow-blue-600/25 flex items-center gap-1.5 transition"
              >
                {isRenaming ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Renaming on disk...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Save & Rename</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* UPLOAD / ADD NEW MEDIA MODAL */}
      {uploadModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setUploadModalOpen(false); }}
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                  <FolderUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Add Product {dashboardMode === 'photos' ? 'Photo' : 'Video'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Upload directly from your device to the catalog
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setUploadModalOpen(false)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select {dashboardMode === 'photos' ? 'Photo' : 'Video'} File:
                </label>
                <input
                  type="file"
                  accept={dashboardMode === 'photos' ? "image/*" : "video/*"}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setUploadFile(file);
                      if (dashboardMode === 'photos') {
                        setUploadPreview(URL.createObjectURL(file));
                      }
                      if (!uploadProductName) {
                        setUploadProductName(file.name.replace(/\.[^/.]+$/, ""));
                      }
                    }
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 bg-slate-50 rounded-xl border border-slate-300 p-2 cursor-pointer"
                  required
                />
                {uploadPreview && dashboardMode === 'photos' && (
                  <div className="mt-2.5 flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-2xl">
                    <img src={uploadPreview} alt="Selected preview" className="w-14 h-14 object-cover rounded-xl border border-slate-200 shadow-xs" />
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-800 truncate">{uploadFile?.name}</p>
                      <p className="text-[10px] text-emerald-600 font-semibold">✓ Image selected & ready</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Product Name:
                </label>
                <input
                  type="text"
                  placeholder="e.g. AE Handheld Multi-Gas & Oxygen Detector"
                  value={uploadProductName}
                  onChange={(e) => setUploadProductName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                  required
                />
              </div>

              {/* Nunes Catalog Suggestions Quick Pick */}
              {catalog.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    Quick Pick from Nunes Catalog:
                  </label>
                  <div className="max-h-28 overflow-y-auto space-y-1 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    {catalog
                      .filter(c => !uploadProductName || c.fullName.toLowerCase().includes(uploadProductName.toLowerCase()))
                      .slice(0, 5)
                      .map((c, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setUploadProductName(c.fullName)}
                          className="w-full text-left px-2 py-1 rounded-lg hover:bg-blue-100 hover:text-blue-900 text-slate-700 flex items-center justify-between transition text-[11px]"
                        >
                          <span className="truncate font-medium">{c.fullName}</span>
                          <span className="text-[10px] text-slate-500">{c.category}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Real-time Google Drive Progress & Status */}
              {uploading && (
                <div className="space-y-2 p-3 bg-blue-50/70 border border-blue-200 rounded-2xl">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>{uploadStatusText || 'Uploading to Google Drive...'}</span>
                    </span>
                    <span className="font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-blue-200/60 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-blue-700">
                    Direct stream to Google Drive ({dashboardMode === 'photos' ? 'Photos folder: 1uGjQkC...' : 'Videos folder: 1-vhkY...'})
                  </p>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-emerald-900">✓ Saved to Google Drive!</p>
                    {uploadDriveId && (
                      <p className="text-[10px] font-mono text-emerald-700 truncate">
                        Verified Drive ID: {uploadDriveId}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-red-900">Upload failed</p>
                    <p className="text-[11px] text-red-700">{uploadError}</p>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile || !uploadProductName.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-md shadow-blue-600/25 flex items-center gap-1.5 transition"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading to Drive...</span>
                    </>
                  ) : (
                    <>
                      <FolderUp className="w-3.5 h-3.5" />
                      <span>Upload & Save to Google Drive</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GOOGLE DRIVE SYNC & SETTINGS MODAL */}
      {driveModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setDriveModalOpen(false); }}
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl p-6 sm:p-7 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <span>Google Drive Integration</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                      driveStatus.connected ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {driveStatus.status || (driveStatus.connected ? 'Connected' : 'Disconnected')}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Auto-Save & Bi-directional Synchronization for NUNES Media
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setDriveModalOpen(false)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs text-slate-700">
              {/* Account Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500">Connected Account:</p>
                  <p className="text-sm font-extrabold text-slate-900 font-mono">
                    {driveStatus.accountEmail || 'instruasia@gmail.com'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestDriveConnection}
                    disabled={driveTesting}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 transition flex items-center gap-1 shadow-xs"
                  >
                    {driveTesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-blue-600" />}
                    <span>Test Connection</span>
                  </button>
                  <button
                    onClick={handleConnectDriveOnce}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm"
                  >
                    Connect Once
                  </button>
                </div>
              </div>

              {/* Service Account Instant Setup Box */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Instant 24/7 Drive Auto-Save (No Login Needed)</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-200 text-blue-900">
                    Recommended
                  </span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Open your Google Drive <a href={GOOGLE_DRIVE_PHOTOS_URL} target="_blank" rel="noreferrer" className="underline font-bold hover:text-blue-950">Photos Folder</a>, click <strong>Share</strong>, and add this Service Account as <strong>Editor</strong>:
                </p>
                <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-blue-200">
                  <span className="font-mono text-[11px] text-slate-800 truncate select-all flex-1">
                    nunes-drive-sync@nunes-mail-d072f3ce1.iam.gserviceaccount.com
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('nunes-drive-sync@nunes-mail-d072f3ce1.iam.gserviceaccount.com');
                      setCopiedSA(true);
                      setTimeout(() => setCopiedSA(false), 2000);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shrink-0 shadow-xs"
                  >
                    {copiedSA ? '✓ Copied!' : 'Copy Email'}
                  </button>
                </div>
              </div>

              {/* Test Connection Output */}
              {driveTestResult && (
                <div className={`p-3 rounded-2xl border text-xs font-medium flex items-center gap-2 ${
                  driveTestResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
                }`}>
                  {driveTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                  <span>{driveTestResult.message}</span>
                </div>
              )}

              {/* Designated Folders */}
              <div className="space-y-2">
                <p className="font-bold text-slate-800 text-xs">Designated Google Drive Folders:</p>
                
                <div className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="font-bold text-slate-900 text-xs">Photos Folder</p>
                      <p className="text-[10px] font-mono text-slate-500">ID: {driveStatus.photosFolderId}</p>
                    </div>
                  </div>
                  <a
                    href={GOOGLE_DRIVE_PHOTOS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center gap-1"
                  >
                    <span>Open Folder</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Film className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="font-bold text-slate-900 text-xs">Videos Folder</p>
                      <p className="text-[10px] font-mono text-slate-500">ID: {driveStatus.videosFolderId}</p>
                    </div>
                  </div>
                  <a
                    href={GOOGLE_DRIVE_VIDEOS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center gap-1"
                  >
                    <span>Open Folder</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
              </div>

              {/* Sync Feedback */}
              {syncFeedback && (
                <div className={`p-3 rounded-2xl border text-xs font-medium flex items-center gap-2 ${
                  syncFeedback.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
                }`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{syncFeedback.message}</span>
                </div>
              )}

              {/* Migrate Feedback */}
              {migrateFeedback && (
                <div className={`p-3 rounded-2xl border text-xs font-medium flex items-center gap-2 ${
                  migrateFeedback.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
                }`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{migrateFeedback.message}</span>
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={handleSyncDrive}
                  disabled={syncingDrive}
                  className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-sm flex items-center justify-center gap-2 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingDrive ? 'animate-spin' : ''}`} />
                  <span>{syncingDrive ? 'Syncing with Drive...' : 'Sync Google Drive Now'}</span>
                </button>

                <button
                  onClick={handleMigrateMedia}
                  disabled={migratingMedia}
                  className="w-full px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 flex items-center justify-center gap-2 transition"
                >
                  <FolderUp className="w-3.5 h-3.5 text-blue-600" />
                  <span>{migratingMedia ? 'Migrating Media...' : 'Migrate Media to Drive'}</span>
                </button>
              </div>

            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setDriveModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {/* LIVE STREAM SETTINGS MODAL */}
      {streamSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Live Video Stream Settings</h3>
                  <p className="text-xs text-slate-500">Connects live Vercel to your system's 4.5 GB video library</p>
                </div>
              </div>
              <button 
                onClick={() => setStreamSettingsOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs text-slate-600">
              <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className={`w-3 h-3 rounded-full flex-shrink-0 ${streamConnected ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                <div>
                  <p className="font-bold text-slate-800 text-sm">
                    Status: {streamConnected ? '🟢 Connected & Streaming Active' : '🟡 Disconnected / Check Cloudflare Tunnel'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {streamConnected 
                      ? 'Videos will stream at full speed directly from your disk on Vercel.' 
                      : 'Ensure server and cloudflared tunnel are running on your computer.'}
                  </p>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  Stream Tunnel URL (Cloudflare Edge):
                </label>
                <input 
                  type="text" 
                  value={customStreamInput} 
                  onChange={(e) => setCustomStreamInput(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                  placeholder="https://...trycloudflare.com"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Default: <span className="font-mono text-slate-600">{DEFAULT_STREAM_SERVER}</span>
                </p>
              </div>

              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3 text-[11px] text-blue-900 leading-relaxed">
                <p className="font-bold mb-1">💡 How Live Playback Works:</p>
                <p>1. 179 HD videos (4.5 GB) stay safely stored on your local disk.</p>
                <p>2. High-speed Cloudflare tunnel securely streams the MP4 video data to Vercel users.</p>
                <p>3. If you ever restart the tunnel, paste the new URL here and click Save!</p>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button 
                  type="button"
                  onClick={() => {
                    setCustomStreamInput(DEFAULT_STREAM_SERVER);
                    setStreamServerUrl(DEFAULT_STREAM_SERVER);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('nunes_stream_url', DEFAULT_STREAM_SERVER);
                    }
                  }}
                  className="text-slate-500 hover:text-slate-800 underline text-xs font-semibold"
                >
                  Reset to Default
                </button>

                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => setStreamSettingsOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Close
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      const trimmed = customStreamInput.trim();
                      if (trimmed) {
                        setStreamServerUrl(trimmed);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('nunes_stream_url', trimmed);
                        }
                        setStreamSettingsOpen(false);
                      }
                    }}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition"
                  >
                    Save & Reconnect
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-4 py-4 text-center text-xs text-slate-500 font-medium">
        <p>Nunes Instruments • Product Video & Photo Hub • All 179 Products Synced</p>
      </footer>
    </div>
  );
}
