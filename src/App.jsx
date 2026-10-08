import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Play, Edit3, Upload, Film, CheckCircle2, Clock, 
  ExternalLink, HardDrive, Sparkles, X, Filter, FolderUp, 
  ChevronRight, ChevronLeft, RefreshCw, Eye, Tag, AlertCircle,
  Download, Volume2, Info, Maximize2, Minimize2, MoveHorizontal,
  Smartphone, Monitor, Copy, Check, Radio, Settings,
  Camera, Image as ImageIcon, ZoomIn, ZoomOut
} from 'lucide-react';

const GOOGLE_DRIVE_FOLDER_URL = "https://drive.google.com/drive/u/0/folders/1-vhkY7WfIHVwRlFarYooSwooWwnBWf94";
const GOOGLE_DRIVE_MY_DRIVE_URL = "https://drive.google.com/drive/u/0/my-drive";
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
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProductName, setUploadProductName] = useState('');
  const [uploadDriveUrl, setUploadDriveUrl] = useState('');
  const [uploading, setUploading] = useState(false);

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

      // Fetch photos
      try {
        const photoEndpoint = isLocalHost ? '/api/photos' : `${streamServerUrl}/api/photos`;
        const pRes = await fetch(photoEndpoint);
        if (pRes.ok) {
          const pData = await pRes.json();
          setPhotos(pData.photos || []);
        } else {
          throw new Error('Photo API error');
        }
      } catch {
        const fbRes = await fetch('/photos_data.json');
        if (fbRes.ok) {
          const pData = await fbRes.json();
          setPhotos(pData || []);
        }
      }

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

  // Filtered videos
  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        (v.productName && v.productName.toLowerCase().includes(q)) ||
        (v.currentFilename && v.currentFilename.toLowerCase().includes(q)) ||
        (v.originalFilename && v.originalFilename.toLowerCase().includes(q)) ||
        (v.category && v.category.toLowerCase().includes(q));

      if (activeTab === 'renamed') return matchesSearch && v.isRenamed;
      if (activeTab === 'pending') return matchesSearch && !v.isRenamed;
      return matchesSearch;
    });
  }, [videos, searchTerm, activeTab]);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    return photos.filter(p => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        (p.productName && p.productName.toLowerCase().includes(q)) ||
        (p.currentFilename && p.currentFilename.toLowerCase().includes(q)) ||
        (p.originalFilename && p.originalFilename.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));

      if (activeTab === 'renamed') return matchesSearch && p.isRenamed;
      if (activeTab === 'pending') return matchesSearch && !p.isRenamed;
      return matchesSearch;
    });
  }, [photos, searchTerm, activeTab]);

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

  // Upload handler (works for both video and photo)
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    const formData = new FormData();
    const isPhoto = dashboardMode === 'photos';
    if (isPhoto) {
      formData.append('photo', uploadFile);
    } else {
      formData.append('video', uploadFile);
    }
    formData.append('productName', uploadProductName || uploadFile.name);
    formData.append('driveUrl', uploadDriveUrl);

    try {
      const endpoint = isLocalHost 
        ? (isPhoto ? '/api/upload-photo' : '/api/upload')
        : `${streamServerUrl}${isPhoto ? '/api/upload-photo' : '/api/upload'}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const result = await res.json();
        if (isPhoto) {
          setPhotos(prev => [result.item, ...prev]);
        } else {
          setVideos(prev => [result.item, ...prev]);
        }
        setUploadModalOpen(false);
        setUploadFile(null);
        setUploadProductName('');
        setUploadDriveUrl('');
      } else {
        alert('Server upload error. Make sure local stream server is running.');
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Check if selected video is vertical portrait
  const isSelectedVideoPortrait = selectedVideo && (selectedVideo.height > selectedVideo.width || selectedVideo.height === 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      
      {/* Top Banner Notice for Cloud vs Local Mode */}
      {!isLocalHost && (
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white text-xs px-4 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span><strong>Live Vercel Stream:</strong> {streamConnected ? '🟢 Direct High-Speed Video Stream Active' : '🟡 Stream Tunnel Offline (Click to configure)'}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => { setCustomStreamInput(streamServerUrl); setStreamSettingsOpen(true); }}
              className="bg-white/20 hover:bg-white/30 text-white font-bold px-2.5 py-0.5 rounded-lg text-[11px] transition flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              <span>Stream Settings</span>
            </button>
            <a 
              href="http://localhost:5050" 
              target="_blank" 
              rel="noreferrer" 
              className="bg-white/20 hover:bg-white/30 text-white font-bold px-2.5 py-0.5 rounded-lg text-[11px] transition"
            >
              ⚡ Localhost:5050
            </a>
            <a 
              href={GOOGLE_DRIVE_FOLDER_URL} 
              target="_blank" 
              rel="noreferrer" 
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-2.5 py-0.5 rounded-lg text-[11px] flex items-center gap-1 transition"
            >
              <HardDrive className="w-3 h-3" />
              <span>Drive Folder</span>
            </a>
          </div>
        </div>
      )}

      {/* Top Navigation Bar - Crisp White Theme */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3.5">
          
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

            {/* Google Drive Link Button */}
            <a
              href={dashboardMode === 'videos' ? GOOGLE_DRIVE_FOLDER_URL : GOOGLE_DRIVE_MY_DRIVE_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition shadow-sm"
              title="Open Google Drive Cloud Folder"
            >
              <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">Drive</span>
              <ExternalLink className="w-3 h-3 text-emerald-600" />
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
      <section className="bg-white border-b border-slate-200 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
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

          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span className="flex items-center gap-1.5 bg-blue-50 text-blue-800 px-3 py-1 rounded-lg border border-blue-200">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>{dashboardMode === 'videos' ? 'Click card to play in Full-Fit Screen' : 'Click photo card for HD Lightbox & Zoom'}</span>
            </span>
          </div>

        </div>
      </section>

      {/* Main Content Area - White Product Boxes Grid */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 py-6">
        
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                onClick={() => handlePlayVideo(video)}
                className="group relative bg-white hover:bg-slate-50/50 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col cursor-pointer transform hover:-translate-y-1 shadow-sm"
              >
                {/* Video Profile Thumbnail Poster Image */}
                <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                  <img
                    src={video.thumbnailUrl}
                    alt={video.productName}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=60";
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
                    {/* Category pill */}
                    {video.category && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 inline-block mb-1.5">
                        {video.category}
                      </span>
                    )}

                    {/* Product Title */}
                    <h3 
                      className="font-bold text-sm text-slate-900 group-hover:text-blue-600 line-clamp-2 transition-colors leading-snug"
                      title={video.productName}
                    >
                      {video.productName}
                    </h3>

                    {/* Clean Filename on Disk */}
                    <p className="text-[11px] text-slate-400 mt-1 font-mono truncate" title={video.currentFilename}>
                      {video.currentFilename}
                    </p>
                  </div>

                  {/* Action Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      onClick={(e) => openRename(video, e)}
                      className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 transition"
                      title="Rename this product video"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Rename</span>
                    </button>

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
              <h3 className="text-base font-bold text-slate-800">No product photos found</h3>
              <p className="text-sm text-slate-500 mt-1">Try another search keyword or switch filters.</p>
              <button
                onClick={() => { setSearchTerm(''); setActiveTab('all'); }}
                className="mt-4 px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
              >
                Show All Photos
              </button>
            </div>
          ) : (
            /* PRODUCT PHOTO BOX GRID */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => { setSelectedPhoto(photo); setPhotoZoom(1); }}
                  className="group relative bg-white hover:bg-slate-50/50 rounded-2xl border border-slate-200 hover:border-purple-400 hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col cursor-pointer transform hover:-translate-y-1 shadow-sm"
                >
                  {/* Photo Display Frame */}
                  <div className="relative aspect-video w-full bg-slate-100 overflow-hidden flex items-center justify-center">
                    <img
                      src={photo.imageUrl}
                      alt={photo.productName}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=60";
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
                      {/* Category pill */}
                      {photo.category && (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 inline-block mb-1.5">
                          {photo.category}
                        </span>
                      )}

                      {/* Product Title */}
                      <h3 
                        className="font-bold text-sm text-slate-900 group-hover:text-purple-600 line-clamp-2 transition-colors leading-snug"
                        title={photo.productName}
                      >
                        {photo.productName}
                      </h3>

                      {/* Clean Filename on Disk */}
                      <p className="text-[11px] text-slate-400 mt-1 font-mono truncate" title={photo.currentFilename}>
                        {photo.currentFilename}
                      </p>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <button
                        onClick={(e) => openRename(photo, e)}
                        className="flex items-center gap-1.5 text-purple-600 hover:text-purple-700 font-semibold px-2 py-1 rounded-lg hover:bg-purple-50 transition"
                        title="Rename this product photo"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Rename</span>
                      </button>

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
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div 
            className={`bg-slate-900 border border-slate-800 rounded-3xl w-full flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ${
              isTheaterMode 
                ? 'max-w-[98vw] h-[96vh]' 
                : isSelectedVideoPortrait
                  ? 'max-w-xl h-[92vh]' /* Sleek phone portrait frame so video fits 100% with NO side bars! */
                  : 'max-w-5xl h-[88vh]' /* Standard widescreen frame */
            }`}
          >
            
            {/* Modal Header */}
            <div className="p-3.5 sm:px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/95 text-white">
              <div className="flex-1 pr-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-white truncate">{selectedVideo.productName}</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 whitespace-nowrap">
                    {selectedVideo.category || "Testing Machine"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                  {selectedVideo.currentFilename} • {selectedVideo.sizeMb} MB
                </p>
              </div>

              {/* View Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* True Fullscreen Toggle */}
                <button
                  onClick={toggleFullScreen}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5 transition"
                  title="Full Screen (Entire Screen)"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] hidden sm:inline">Fullscreen</span>
                </button>

                {/* Fit Mode Toggle: Fill 100% vs Fit Aspect */}
                <button
                  onClick={() => setVideoFitMode(prev => prev === 'contain' ? 'cover' : 'contain')}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5 transition"
                  title="Toggle Full Fit (Corner to Corner) vs Aspect Fit"
                >
                  <MoveHorizontal className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px]">{videoFitMode === 'cover' ? 'Full Fill' : 'Fit Screen'}</span>
                </button>

                {/* Theater Mode Toggle */}
                <button
                  onClick={() => setIsTheaterMode(prev => !prev)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  title={isTheaterMode ? "Exit Theater Mode" : "Expand to Full Page Theater Mode"}
                >
                  {isTheaterMode ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Monitor className="w-4 h-4 text-blue-400" />}
                </button>

                {/* Rename Button */}
                <button
                  onClick={() => openRename(selectedVideo)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Rename</span>
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
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
                      href={GOOGLE_DRIVE_FOLDER_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg flex items-center gap-1.5 transition"
                    >
                      <HardDrive className="w-4 h-4" />
                      <span>Watch in Google Drive</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

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

            {/* Modal Bottom Strip with Navigation & Drive Shortcut */}
            <div className="p-3.5 sm:px-6 bg-slate-950/95 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-white">
              <div className="flex items-center gap-4 text-slate-300">
                <span>Duration: <strong className="text-white">{selectedVideo.durationSec}s</strong></span>
                <span>Size: <strong className="text-white">{selectedVideo.sizeMb} MB</strong></span>
                <span className="hidden sm:inline">Recorded: <strong className="text-white">{selectedVideo.createdAt}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                {/* Google Drive Link */}
                <a
                  href={GOOGLE_DRIVE_FOLDER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/40 font-semibold flex items-center gap-1.5 transition"
                >
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Google Drive Folder</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

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
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden shadow-2xl transition-all duration-300">
            
            {/* Modal Header */}
            <div className="p-3.5 sm:px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/95 text-white">
              <div className="flex-1 pr-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-white truncate">{selectedPhoto.productName}</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 whitespace-nowrap">
                    {selectedPhoto.category || "Testing Equipment"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                  {selectedPhoto.currentFilename} • {selectedPhoto.width} × {selectedPhoto.height} • {selectedPhoto.sizeMb} MB
                </p>
              </div>

              {/* View Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Zoom Out */}
                <button
                  onClick={() => setPhotoZoom(z => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4 text-slate-300" />
                </button>

                {/* Zoom Level Reset Badge */}
                <button
                  onClick={() => setPhotoZoom(1)}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-mono font-bold text-slate-300 border border-slate-700 transition"
                  title="Reset Zoom to 100%"
                >
                  {Math.round(photoZoom * 100)}%
                </button>

                {/* Zoom In */}
                <button
                  onClick={() => setPhotoZoom(z => Math.min(3.0, Number((z + 0.25).toFixed(2))))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4 text-purple-400" />
                </button>

                {/* Fit Mode Toggle */}
                <button
                  onClick={() => setPhotoFitMode(prev => prev === 'contain' ? 'cover' : 'contain')}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5 transition"
                  title="Toggle Full Fill vs Aspect Fit"
                >
                  <MoveHorizontal className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px] hidden sm:inline">{photoFitMode === 'cover' ? 'Full Fill' : 'Fit Screen'}</span>
                </button>

                {/* Download */}
                <a
                  href={selectedPhoto.imageUrl}
                  download={selectedPhoto.currentFilename || "product-photo.jpg"}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  title="Download Photo"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                </a>

                {/* Rename Button */}
                <button
                  onClick={() => openRename(selectedPhoto)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Rename</span>
                </button>

                {/* Close Button */}
                <button
                  onClick={() => { setSelectedPhoto(null); setPhotoZoom(1); }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
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
                src={selectedPhoto.imageUrl}
                alt={selectedPhoto.productName}
                style={{ transform: `scale(${photoZoom})` }}
                className={`relative z-10 transition-transform duration-200 select-none shadow-2xl rounded-lg max-h-full max-w-full ${
                  photoFitMode === 'cover' ? 'w-full h-full object-cover' : 'object-contain'
                }`}
                onError={(e) => {
                  e.target.src = "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80";
                }}
              />
            </div>

            {/* Photo Modal Footer */}
            <div className="p-3 sm:px-6 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready in Gallery
                </span>
                <span className="hidden md:inline font-mono text-[11px] text-slate-500 truncate max-w-xs">
                  {selectedPhoto.filePath || "Product Photos"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Google Drive Link */}
                <a
                  href={GOOGLE_DRIVE_MY_DRIVE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700 shadow-sm"
                  title="Open in Google Drive Photos Folder"
                >
                  <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                  <span>Google Drive Photos</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

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

      {/* UPLOAD NEW VIDEO MODAL */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <FolderUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Add New Product {dashboardMode === 'photos' ? 'Photo' : 'Video'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Upload {dashboardMode === 'photos' ? 'photo' : 'video'} with custom rename option
                  </p>
                </div>
              </div>
              <button onClick={() => setUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select {dashboardMode === 'photos' ? 'Photo File (.jpg, .jpeg, .png, .webp):' : 'Video File (.mp4, .mov, .avi):'}
                </label>
                <input
                  type="file"
                  accept={dashboardMode === 'photos' ? "image/*" : "video/*"}
                  required
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setUploadFile(file);
                    if (file && !uploadProductName) {
                      setUploadProductName(file.name.replace(/\.[^/.]+$/, ""));
                    }
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 bg-slate-50 rounded-xl border border-slate-300 p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Product Name (Rename Option):
                </label>
                <input
                  type="text"
                  placeholder="e.g. AE Handheld Multi-Gas Detector"
                  value={uploadProductName}
                  onChange={(e) => setUploadProductName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Google Drive Link (Optional):
                </label>
                <input
                  type="url"
                  placeholder={GOOGLE_DRIVE_FOLDER_URL}
                  value={uploadDriveUrl}
                  onChange={(e) => setUploadDriveUrl(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

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
                  disabled={uploading || !uploadFile}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload & Add</span>
                    </>
                  )}
                </button>
              </div>
            </form>
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
        <p>Nunes Instruments • Product Video Hub • Local Stream: http://localhost:5050 • Google Drive: 1-vhkY7WfIHVwRlFarYooSwooWwnBWf94</p>
      </footer>
    </div>
  );
}
