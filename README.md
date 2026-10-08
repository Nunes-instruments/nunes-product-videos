# 🎥 Nunes Instruments - Product Video Hub

A centralized, responsive web application for managing, renaming, searching, and streaming Nunes Instruments product videos with Google Drive cloud synchronization.

---

## ✨ Features

- 📦 **Product Video Box Grid**: Every product video is rendered in an individual card with detailed metrics (duration, file size, creation timestamp, renamed status).
- 🖼️ **Profile Thumbnail / Poster Preview**: High-definition video frame extracted from each video and displayed on its card.
- 🔍 **Instant Search Bar**: Real-time filtering by product name, model number, brand, tags, or file name.
- 📊 **Live Video Counters**: Real-time statistics badge showing Total Videos (179+), Identified & Named, and Pending Review.
- ✏️ **In-App Video Renaming**: Click "Rename" on any video to identify it, pick from Nunes stock product catalog suggestions or type a custom name, and optionally rename the `.mp4` file on your local drive automatically!
- 📤 **Add New Video**: Upload new product videos directly with instant thumbnail generation, custom naming, and Google Drive URL attachment.
- ☁️ **Google Drive Sync**: Dedicated sync assistant for backing up and linking videos to Google Drive.
- 🌐 **Vercel & Cloud Ready**: Fully configured for single-click deployment on Vercel.

---

## 🚀 Quick Start (Local Run)

### 1. Launch in 1-Click
Double click `START_APP.bat` or run:
```bash
node server.js
```
Then open your browser at:
```
http://localhost:5050
```

---

## 🐙 Push to GitHub & Deploy to Vercel

### Step 1: Create a GitHub Repository
1. Go to [https://github.com/new](https://github.com/new)
2. Repository name: `nunes-product-videos`
3. Click **Create repository**

### Step 2: Push your code
Open terminal in this directory and run:
```bash
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/nunes-product-videos.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Vercel
1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Import the `nunes-product-videos` repository
3. Framework Preset: **Vite**
4. Click **Deploy** 🚀
5. Your live URL will be ready in seconds!

---

## 📁 Project Structure

```
nunes-product-videos/
├── public/
│   ├── thumbnails/         # Extracted video cover frames (179 items)
│   ├── videos_data.json    # Complete catalog metadata
│   └── catalog.json        # Nunes stock instruments catalog
├── src/
│   ├── App.jsx             # Main interactive application UI
│   ├── main.jsx            # React root
│   └── index.css           # Tailwind styles & dark mode
├── scan_videos.py          # Auto-extracts frames & metadata from local videos
├── sync_to_drive.py        # Helper to sync renamed videos to Google Drive
├── server.js               # Express API (video streaming, rename, upload)
├── START_APP.bat           # 1-Click launcher
└── vercel.json             # Vercel deployment routing config
```
