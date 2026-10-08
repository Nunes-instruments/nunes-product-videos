import os
import cv2
import json
import time
from datetime import datetime

SOURCE_FOLDER = r"C:\Users\NUNES\Desktop\New folder"
OUTPUT_DIR = r"C:\Users\NUNES\.gemini\antigravity\scratch\nunes-product-videos"
THUMBNAIL_DIR = os.path.join(OUTPUT_DIR, "public", "thumbnails")
os.makedirs(THUMBNAIL_DIR, exist_ok=True)

files = [f for f in os.listdir(SOURCE_FOLDER) if f.lower().endswith(('.mp4', '.mkv', '.avi', '.mov'))]
files.sort()

print(f"Found {len(files)} video files in {SOURCE_FOLDER}")

video_entries = []

for idx, fname in enumerate(files):
    fpath = os.path.join(SOURCE_FOLDER, fname)
    stat = os.stat(fpath)
    size_mb = round(stat.st_size / (1024 * 1024), 2)
    mtime = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")

    # Generate an ID
    vid_id = f"vid_{idx+1:03d}"
    thumb_filename = f"{vid_id}.jpg"
    thumb_path = os.path.join(THUMBNAIL_DIR, thumb_filename)

    duration = 0
    width = 0
    height = 0

    try:
        cap = cv2.VideoCapture(fpath)
        if cap.isOpened():
            fps = cap.get(cv2.CAP_PROP_FPS) or 25
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = round(total_frames / fps, 1) if fps > 0 else 0
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

            # Pick a frame around 20% or 1 second into the video to avoid black intro
            target_frame = min(int(fps * 1.5), max(0, total_frames // 4))
            cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
            ret, frame = cap.read()
            if not ret or frame is None:
                # fallback to first frame
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = cap.read()

            if ret and frame is not None:
                # Resize thumbnail proportionally max width 640
                h, w = frame.shape[:2]
                if w > 640:
                    scale = 640 / w
                    frame = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
                cv2.imwrite(thumb_path, frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            cap.release()
    except Exception as e:
        print(f"Error processing video {fname}: {e}")

    # Check if file has already a customized product name
    is_raw_default = fname.startswith("VID") or fname.startswith("VID-") or fname.startswith("VID_")
    
    # Clean default title
    if is_raw_default:
        product_name = f"Product Video #{idx+1}"
        is_renamed = False
    else:
        # User might have already named some
        name_no_ext = os.path.splitext(fname)[0].replace("_", " ").replace("-", " ")
        product_name = name_no_ext
        is_renamed = True

    video_entries.append({
        "id": vid_id,
        "originalFilename": fname,
        "currentFilename": fname,
        "productName": product_name,
        "isRenamed": is_renamed,
        "thumbnailUrl": f"/thumbnails/{thumb_filename}",
        "filePath": fpath,
        "sizeMb": size_mb,
        "durationSec": duration,
        "width": width,
        "height": height,
        "category": "Testing Equipment",
        "driveUrl": "",
        "createdAt": mtime
    })

    if (idx + 1) % 25 == 0 or idx == len(files) - 1:
        print(f"Processed {idx + 1}/{len(files)} videos...")

json_path = os.path.join(OUTPUT_DIR, "public", "videos_data.json")
with open(json_path, "w", encoding="utf-8") as f:
    json.dump(video_entries, f, indent=2)

print(f"Done! Saved {len(video_entries)} entries to {json_path}")
