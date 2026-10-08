import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Play, Edit3, Upload, Film, CheckCircle2, Clock, 
  ExternalLink, HardDrive, Sparkles, X, Filter, FolderUp, 
  ChevronRight, ChevronLeft, RefreshCw, Eye, Tag, AlertCircle,
  Download, Volume2, Info, Maximize2, Minimize2, MoveHorizontal,
  Smartphone, Monitor, Copy, Check
} from 'lucide-react';

const GOOGLE_DRIVE_FOLDER_URL = "https://drive.google.com/drive/u/0/folders/1-vhkY7WfIHVwRlFarYooSwooWwnBWf94";

export default function App() {
  const [videos, setVideos] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, renamed, pending
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [driveModalOpen, setDriveModalOpen] = useState(false);

  // Video player modes & controls
  const [videoFitMode, setVideoFitMode] = useState('contain'); // 'contain' or 'cover'
  const [isTheaterMode, setIsTheaterMode] = useState(false); // full page / theater mode
  const [copiedLink, setCopiedLink] = useState(false);
  const videoRef = useRef(null);

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
        const res = await fetch('/api/videos');
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
      console.error('Error fetching videos:', e);
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

  const totalCount = videos.length;
  const renamedCount = videos.filter(v => v.isRenamed).length;
  const pendingCount = totalCount - renamedCount;

  // Open player immediately when card clicked
  const handlePlayVideo = (video) => {
    setSelectedVideo(video);
  };

  // Open rename
  const openRename = (video, e) => {
    if (e) e.stopPropagation();
    setRenameTarget(video);
    setNewTitle(video.productName || '');
    setRenameModalOpen(true);
  };

  // Save Rename
  const handleSaveRename = async () => {
    if (!newTitle.trim() || !renameTarget) return;
    setIsRenaming(true);
    try {
      const res = await fetch('/api/rename', {
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
        setVideos(prev => prev.map(v => v.id === renameTarget.id ? result.item : v));
        if (selectedVideo && selectedVideo.id === renameTarget.id) {
          setSelectedVideo(result.item);
        }
        setRenameModalOpen(false);
      } else {
        setVideos(prev => prev.map(v => {
          if (v.id === renameTarget.id) {
            return { ...v, productName: newTitle.trim(), isRenamed: true };
          }
          return v;
        }));
        setRenameModalOpen(false);
      }
    } catch (err) {
      setVideos(prev => prev.map(v => {
        if (v.id === renameTarget.id) {
          return { ...v, productName: newTitle.trim(), isRenamed: true };
        }
        return v;
      }));
      setRenameModalOpen(false);
    } finally {
      setIsRenaming(false);
    }
  };

  // Upload handler
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('video', uploadFile);
    formData.append('productName', uploadProductName || uploadFile.name);
    formData.append('driveUrl', uploadDriveUrl);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const result = await res.json();
        setVideos(prev => [result.item, ...prev]);
        setUploadModalOpen(false);
        setUploadFile(null);
        setUploadProductName('');
        setUploadDriveUrl('');
      } else {
        alert('Server upload error. Make sure local server is running.');
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const copyDriveLink = () => {
    navigator.clipboard.writeText(GOOGLE_DRIVE_FOLDER_URL);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      
      {/* Top Navigation Bar - Crisp White Theme */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Company Title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25">
              <Film className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg text-slate-900 tracking-tight">NUNES INSTRUMENTS</h1>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                  Video Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Product Video Catalog & Google Drive Manager</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl mx-auto w-full">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search products by instrument name, brand, model, or file..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition shadow-inner"
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
          <div className="flex items-center gap-2.5">
            {/* Google Drive Link Button */}
            <a
              href={GOOGLE_DRIVE_FOLDER_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition shadow-sm"
              title="Open Google Drive Folder"
            >
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span>Google Drive</span>
              <ExternalLink className="w-3 h-3 text-emerald-600 ml-0.5" />
            </a>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 transition transform active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Add New Video</span>
            </button>
          </div>

        </div>
      </header>

      {/* Filter and Metrics Strip - Clean White/Light Accent */}
      <section className="bg-white border-b border-slate-200 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Quick Counter Tabs */}
          <div className="flex items-center flex-wrap gap-2.5">
            <button 
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                activeTab === 'all' 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Total Products:</span>
              <span className={`px-2 py-0.5 rounded-md text-xs font-black ${activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'}`}>
                {totalCount}
              </span>
            </button>

            <button 
              onClick={() => setActiveTab('renamed')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                activeTab === 'renamed' 
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Identified & Named:</span>
              <span className={`px-2 py-0.5 rounded-md text-xs font-black ${activeTab === 'renamed' ? 'bg-white/20 text-white' : 'bg-emerald-200/80 text-emerald-900'}`}>
                {renamedCount}
              </span>
            </button>

            <button 
              onClick={() => setActiveTab('pending')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                activeTab === 'pending' 
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm' 
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Needs Review:</span>
              <span className={`px-2 py-0.5 rounded-md text-xs font-black ${activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-200/80 text-amber-900'}`}>
                {pendingCount}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
            <span className="flex items-center gap-1.5 bg-blue-50 text-blue-800 px-3 py-1 rounded-lg border border-blue-200">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Click any card to play instantly with Full-Fit controls</span>
            </span>
          </div>

        </div>
      </section>

      {/* Main Content Area - White Product Boxes Grid */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 py-6">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-500">Loading Nunes Product Videos...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
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
          /* PRODUCT VIDEO BOX GRID - White Theme */
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
                    {video.isRenamed ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                        <CheckCircle2 className="w-3 h-3" /> Named
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                        <Clock className="w-3 h-3" /> Needs Name
                      </span>
                    )}
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

                    {/* Original File Info */}
                    <p className="text-[11px] text-slate-400 mt-1.5 font-mono truncate" title={video.currentFilename}>
                      {video.currentFilename || video.originalFilename}
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
        )}

      </main>

      {/* FULL-FIT HD VIDEO PLAYER MODAL - Zero Lag & Full Aspect Ratio Support */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div 
            className={`bg-slate-900 border border-slate-800 rounded-3xl w-full flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ${
              isTheaterMode 
                ? 'max-w-[98vw] h-[96vh]' 
                : 'max-w-5xl h-[88vh]'
            }`}
          >
            
            {/* Modal Header */}
            <div className="p-3.5 sm:px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/90 text-white">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-white truncate">{selectedVideo.productName}</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    HD Video
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                  {selectedVideo.currentFilename} • {selectedVideo.sizeMb} MB
                </p>
              </div>

              {/* Top View Controls */}
              <div className="flex items-center gap-2">
                {/* Fit Mode Toggle: Contain vs Cover */}
                <button
                  onClick={() => setVideoFitMode(prev => prev === 'contain' ? 'cover' : 'contain')}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5 transition"
                  title="Toggle Fit to Screen / Full Fill"
                >
                  <MoveHorizontal className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">{videoFitMode === 'contain' ? 'Fit Screen' : 'Fill Screen'}</span>
                </button>

                {/* Theater / Full-Width Toggle */}
                <button
                  onClick={() => setIsTheaterMode(prev => !prev)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  title={isTheaterMode ? "Standard View" : "Theater Full Page Mode"}
                >
                  {isTheaterMode ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Maximize2 className="w-4 h-4 text-emerald-400" />}
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

            {/* VIDEO DISPLAY CONTAINER WITH AMBIENT BACKDROP */}
            <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
              
              {/* Soft Ambient Blurred Poster in Background (Eliminates harsh black bars for portrait phone videos!) */}
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl transform scale-110 pointer-events-none"
                style={{ backgroundImage: `url(${selectedVideo.thumbnailUrl})` }}
              />

              {/* Native HTML5 Video Player with Multiple High-Speed Streams */}
              <video
                key={selectedVideo.id}
                ref={videoRef}
                controls
                autoPlay
                playsInline
                preload="auto"
                className={`relative z-10 w-full h-full transition-all duration-200 ${
                  videoFitMode === 'cover' ? 'object-cover' : 'object-contain'
                }`}
                poster={selectedVideo.thumbnailUrl}
              >
                {/* 1. Ultra-fast local static route */}
                <source 
                  src={`/raw-videos/${encodeURIComponent(selectedVideo.currentFilename || selectedVideo.originalFilename)}`} 
                  type="video/mp4" 
                />
                {/* 2. Direct byte-range stream */}
                <source 
                  src={`/api/stream/${selectedVideo.id}`} 
                  type="video/mp4" 
                />
                Your browser does not support HTML5 video streaming.
              </video>
            </div>

            {/* Modal Bottom Strip with Navigation & Drive Shortcut */}
            <div className="p-3.5 sm:px-6 bg-slate-950/95 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-white">
              <div className="flex items-center gap-4 text-slate-300">
                <span>Duration: <strong className="text-white">{selectedVideo.durationSec}s</strong></span>
                <span>Size: <strong className="text-white">{selectedVideo.sizeMb} MB</strong></span>
                <span>Recorded: <strong className="text-white">{selectedVideo.createdAt}</strong></span>
              </div>

              <div className="flex items-center gap-2.5">
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
                  <h3 className="font-bold text-slate-900 text-base">Rename Product Video</h3>
                  <p className="text-xs text-slate-500">Assign the official product name to this video</p>
                </div>
              </div>
              <button 
                onClick={() => setRenameModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video preview thumbnail */}
            <div className="my-4 flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <img 
                src={renameTarget.thumbnailUrl} 
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
                  placeholder="e.g. Sonit SE-53C Micro Ohm Meter"
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
                  Also rename actual <span className="font-mono text-blue-600 font-semibold">.mp4</span> file on disk in <code className="text-slate-600">New folder</code>
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
                  <h3 className="font-bold text-slate-900 text-base">Add New Product Video</h3>
                  <p className="text-xs text-slate-500">Upload video with custom rename option</p>
                </div>
              </div>
              <button onClick={() => setUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Video File (.mp4, .mov, .avi):
                </label>
                <input
                  type="file"
                  accept="video/*"
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
                  placeholder="e.g. Ultrasonic Thickness Gauge"
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

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-4 py-4 text-center text-xs text-slate-500 font-medium">
        <p>Nunes Instruments • Product Video Hub • Local Stream: http://localhost:5050 • Vercel: nunes-product-videos.vercel.app</p>
      </footer>
    </div>
  );
}
