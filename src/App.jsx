import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Play, Edit3, Upload, Film, CheckCircle2, Clock, 
  ExternalLink, HardDrive, Sparkles, X, Filter, FolderUp, 
  ChevronRight, RefreshCw, Eye, Tag
} from 'lucide-react';

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
      // Try local API first, fallback to static public json for static hosting (Vercel)
      let res;
      try {
        res = await fetch('/api/videos');
        if (!res.ok) throw new Error('API not ok');
        const data = await res.json();
        setVideos(data.videos || []);
      } catch (err) {
        // Fallback for static/Vercel
        const fallbackRes = await fetch('/videos_data.json');
        const fallbackData = await fallbackRes.json();
        setVideos(fallbackData || []);
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
      console.error('Error fetching videos:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered list
  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      const matchesSearch = 
        v.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.originalFilename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.category && v.category.toLowerCase().includes(searchTerm.toLowerCase()));

      if (activeTab === 'renamed') return matchesSearch && v.isRenamed;
      if (activeTab === 'pending') return matchesSearch && !v.isRenamed;
      return matchesSearch;
    });
  }, [videos, searchTerm, activeTab]);

  const totalCount = videos.length;
  const renamedCount = videos.filter(v => v.isRenamed).length;
  const pendingCount = totalCount - renamedCount;

  // Open Rename modal
  const openRename = (video, e) => {
    if (e) e.stopPropagation();
    setRenameTarget(video);
    setNewTitle(video.isRenamed ? video.productName : '');
    setRenameModalOpen(true);
  };

  // Submit Rename
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
        // Fallback for Vercel/mock environment
        setVideos(prev => prev.map(v => {
          if (v.id === renameTarget.id) {
            return { ...v, productName: newTitle.trim(), isRenamed: true };
          }
          return v;
        }));
        setRenameModalOpen(false);
      }
    } catch (err) {
      // Local fallback
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

  // Handle Upload
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

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-white tracking-tight">NUNES INSTRUMENTS</h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Video Hub
                </span>
              </div>
              <p className="text-xs text-slate-400">Product Video Catalog & Drive Management</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl mx-auto w-full">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search products by name, model, tag, or filename..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setDriveModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-sm"
              title="Google Drive Sync status & instructions"
            >
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>Drive Sync</span>
            </button>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-600/30 transition transform active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Add New Video</span>
            </button>
          </div>

        </div>
      </header>

      {/* Hero Stats & Filter Bar */}
      <div className="border-b border-slate-800/80 bg-slate-900/40 px-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Quick Counter Pills */}
          <div className="flex items-center flex-wrap gap-2.5">
            <button 
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'all' 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Total Videos:</span>
              <span className="px-1.5 py-0.5 rounded-md bg-black/20 text-xs">{totalCount}</span>
            </button>

            <button 
              onClick={() => setActiveTab('renamed')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'renamed' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Identified & Named:</span>
              <span className="px-1.5 py-0.5 rounded-md bg-black/20 text-xs">{renamedCount}</span>
            </button>

            <button 
              onClick={() => setActiveTab('pending')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'pending' 
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Pending Review:</span>
              <span className="px-1.5 py-0.5 rounded-md bg-black/20 text-xs">{pendingCount}</span>
            </button>
          </div>

          {/* Quick hint & instructions */}
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Click any box to play video or rename product</span>
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 py-6">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm text-slate-400">Loading Nunes Product Videos catalog...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800/80 p-8">
            <Film className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-200">No product videos found</h3>
            <p className="text-sm text-slate-400 mt-1">
              Try searching with another keyword or change your filter tab.
            </p>
            <button
              onClick={() => { setSearchTerm(''); setActiveTab('all'); }}
              className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Product Cards Grid - "oru oru prodcut oru box la visibel la irukanum" */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                onClick={() => setSelectedVideo(video)}
                className="group relative bg-[#131b2e] hover:bg-[#18233a] rounded-2xl border border-slate-800 hover:border-blue-500/50 transition-all duration-200 overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col cursor-pointer transform hover:-translate-y-1"
              >
                {/* Thumbnail / Profile Image - "profiel image video ooda image va irukatum" */}
                <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                  <img
                    src={video.thumbnailUrl}
                    alt={video.productName}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=60";
                    }}
                  />
                  
                  {/* Dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Play icon overlay on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Duration badge */}
                  {video.durationSec > 0 && (
                    <span className="absolute bottom-2.5 right-2.5 text-[10px] font-semibold bg-black/80 text-white px-2 py-0.5 rounded-md backdrop-blur-sm">
                      {Math.floor(video.durationSec / 60)}:
                      {String(Math.floor(video.durationSec % 60)).padStart(2, '0')}
                    </span>
                  )}

                  {/* Renamed status badge */}
                  <div className="absolute top-2.5 left-2.5">
                    {video.isRenamed ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full backdrop-blur-md">
                        <CheckCircle2 className="w-3 h-3" /> Named
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full backdrop-blur-md">
                        <Clock className="w-3 h-3" /> Needs Name
                      </span>
                    )}
                  </div>

                  {/* Size badge */}
                  <span className="absolute top-2.5 right-2.5 text-[10px] bg-slate-900/80 text-slate-300 px-2 py-0.5 rounded-md backdrop-blur-sm border border-slate-700/50">
                    {video.sizeMb} MB
                  </span>
                </div>

                {/* Card Details Body */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Product Name Title */}
                    <h3 
                      className="font-bold text-sm text-slate-100 group-hover:text-blue-400 line-clamp-2 transition-colors"
                      title={video.productName}
                    >
                      {video.productName}
                    </h3>

                    {/* Original Raw Filename */}
                    <p className="text-[11px] text-slate-400 mt-1 font-mono truncate" title={video.originalFilename}>
                      {video.originalFilename}
                    </p>
                  </div>

                  {/* Bottom action row */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <button
                      onClick={(e) => openRename(video, e)}
                      className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2 py-1 rounded-lg transition"
                      title="Rename product video"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Rename</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {video.driveUrl && (
                        <a 
                          href={video.driveUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-emerald-400 hover:text-emerald-300"
                          title="Open in Google Drive"
                        >
                          <HardDrive className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> View
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </main>

      {/* VIDEO PLAYER & INSPECTION MODAL */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#101726] border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white truncate">{selectedVideo.productName}</h2>
                  {selectedVideo.isRenamed ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Named
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Unidentified
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedVideo.originalFilename} • {selectedVideo.sizeMb} MB</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openRename(selectedVideo)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Rename</span>
                </button>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video Player Center */}
            <div className="bg-black flex-1 flex items-center justify-center relative min-h-[360px] max-h-[520px]">
              <video
                controls
                autoPlay
                className="max-h-full max-w-full rounded-lg"
                src={`/api/stream/${selectedVideo.id}`}
                poster={selectedVideo.thumbnailUrl}
              >
                Your browser does not support HTML5 video streaming.
              </video>
            </div>

            {/* Details & Quick rename strip */}
            <div className="p-4 px-6 bg-slate-900/80 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 text-slate-400">
                <span>Duration: <strong className="text-slate-200">{selectedVideo.durationSec}s</strong></span>
                <span>File: <strong className="text-slate-200">{selectedVideo.currentFilename}</strong></span>
                <span>Recorded: <strong className="text-slate-200">{selectedVideo.createdAt}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const nextIdx = (videos.findIndex(v => v.id === selectedVideo.id) + 1) % videos.length;
                    setSelectedVideo(videos[nextIdx]);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 font-medium"
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12192a] border border-slate-700/80 rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Rename Product Video</h3>
                  <p className="text-xs text-slate-400">Identify and assign the correct product name</p>
                </div>
              </div>
              <button 
                onClick={() => setRenameModalOpen(false)} 
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video preview thumbnail */}
            <div className="my-4 flex items-center gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800">
              <img 
                src={renameTarget.thumbnailUrl} 
                alt="preview" 
                className="w-20 h-14 object-cover rounded-lg bg-black" 
              />
              <div className="overflow-hidden">
                <p className="text-xs text-slate-400">Current file:</p>
                <p className="text-xs font-mono text-slate-200 truncate">{renameTarget.currentFilename || renameTarget.originalFilename}</p>
              </div>
            </div>

            {/* Product Name Input */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Enter Official Product Name:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Digital pH Meter Eutech PH700"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {/* Nunes Catalog Suggestions Quick Pick */}
              {catalog.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Quick Pick from Nunes Stock Catalog:
                  </label>
                  <div className="max-h-36 overflow-y-auto space-y-1 p-2 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
                    {catalog
                      .filter(c => !newTitle || c.fullName.toLowerCase().includes(newTitle.toLowerCase()))
                      .slice(0, 6)
                      .map((c, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setNewTitle(c.fullName)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-600/20 hover:text-blue-300 text-slate-300 flex items-center justify-between transition"
                        >
                          <span className="truncate">{c.fullName}</span>
                          <span className="text-[10px] text-slate-400">{c.category}</span>
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
                  className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-500"
                />
                <label htmlFor="renameDisk" className="text-xs text-slate-300 select-none">
                  Also rename the actual <span className="font-mono text-blue-300">.mp4</span> file on disk in <code className="text-slate-400">New folder</code>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRenameModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRename}
                disabled={!newTitle.trim() || isRenaming}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition"
              >
                {isRenaming ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Renaming...</span>
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12192a] border border-slate-700 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                  <FolderUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Add New Product Video</h3>
                  <p className="text-xs text-slate-400">Upload video with custom rename option</p>
                </div>
              </div>
              <button onClick={() => setUploadModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="mt-4 space-y-4">
              {/* File input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
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
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 bg-slate-900 rounded-xl border border-slate-700 p-2"
                />
              </div>

              {/* Product Name (Rename) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Product Name (Rename Option):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ultrasonic Thickness Gauge"
                  value={uploadProductName}
                  onChange={(e) => setUploadProductName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Drive link */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Google Drive Link (Optional):
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={uploadDriveUrl}
                  onChange={(e) => setUploadDriveUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading & Processing...</span>
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

      {/* GOOGLE DRIVE INTEGRATION MODAL */}
      {driveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12192a] border border-slate-700 rounded-3xl w-full max-w-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Google Drive Cloud Storage Sync</h3>
                  <p className="text-xs text-slate-400">Sync all renamed product videos with Google Drive</p>
                </div>
              </div>
              <button onClick={() => setDriveModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-slate-300">
              <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800">
                <p className="font-semibold text-slate-200 mb-1">📁 Local Videos Folder:</p>
                <p className="font-mono text-blue-400 break-all">C:\Users\NUNES\Desktop\New folder</p>
                <p className="text-[11px] text-slate-400 mt-1">Total 179 product videos (4.47 GB)</p>
              </div>

              <div className="p-3.5 bg-emerald-950/30 rounded-xl border border-emerald-500/30">
                <p className="font-semibold text-emerald-300 mb-1">☁️ How to Sync with Google Drive:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                  <li>Google Drive for Desktop install panninaal, unga Drive folder automatic-ah sync aagum.</li>
                  <li>Or Google Drive-la <strong>"Nunes Product Videos"</strong> nu folder create panni direct-ah upload pannalaam.</li>
                  <li>Videos rename pannathukku aprom, Google Drive folder-oda shareable link-ah inga attach pannalaam.</li>
                </ol>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Your Google Drive Shared Folder Link:
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/YOUR_FOLDER_ID"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setDriveModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 px-4 py-4 text-center text-xs text-slate-400">
        <p>Nunes Instruments • Product Video Hub & Management System • Deployed on Vercel</p>
      </footer>
    </div>
  );
}
