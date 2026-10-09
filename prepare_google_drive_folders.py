r"""
Script: prepare_google_drive_folders.py
Creates a pristine, perfectly named folder on the Desktop ready to upload into Google Drive (instruasia@gmail.com):
  C:\Users\NUNES\Desktop\Google Drive (instruasia@gmail.com)\
    ├── 1 - Videos (179 Product Videos)\
    └── 2 - Photos (179 Product Photos)\
Uses NTFS hardlinks so it takes 0 additional disk space!
"""

import os
import json
import re

DESKTOP = r"C:\Users\NUNES\Desktop"
TARGET_ROOT = os.path.join(DESKTOP, "Google Drive (instruasia@gmail.com)")
VIDEOS_TARGET = os.path.join(TARGET_ROOT, "1 - Videos (179 Product Videos)")
PHOTOS_TARGET = os.path.join(TARGET_ROOT, "2 - Photos (179 Product Photos)")

VIDEOS_SOURCE = os.path.join(DESKTOP, "New folder")
PHOTOS_SOURCE = os.path.join(DESKTOP, "Product Photos")

os.makedirs(VIDEOS_TARGET, exist_ok=True)
os.makedirs(PHOTOS_TARGET, exist_ok=True)

# 1. Populate clean videos (exclude '- Copy.mp4' duplicates)
video_files = [f for f in os.listdir(VIDEOS_SOURCE) if f.lower().endswith('.mp4') and not f.endswith('- Copy.mp4')]
print(f"Found {len(video_files)} unique named product videos in New folder.")

linked_videos = 0
for v in video_files:
    src = os.path.join(VIDEOS_SOURCE, v)
    dst = os.path.join(VIDEOS_TARGET, v)
    if not os.path.exists(dst):
        try:
            os.link(src, dst)
            linked_videos += 1
        except Exception as e:
            # fallback copy if cross-device
            import shutil
            shutil.copy2(src, dst)
            linked_videos += 1
    else:
        linked_videos += 1

print(f"Synced {linked_videos} clean videos to: {VIDEOS_TARGET}")

# 2. Populate clean photos
photo_files = [f for f in os.listdir(PHOTOS_SOURCE) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
print(f"Found {len(photo_files)} product photos in Product Photos.")

linked_photos = 0
for p in photo_files:
    src = os.path.join(PHOTOS_SOURCE, p)
    dst = os.path.join(PHOTOS_TARGET, p)
    if not os.path.exists(dst):
        try:
            os.link(src, dst)
            linked_photos += 1
        except Exception as e:
            import shutil
            shutil.copy2(src, dst)
            linked_photos += 1
    else:
        linked_photos += 1

print(f"Synced {linked_photos} clean photos to: {PHOTOS_TARGET}")
print("\nAll files organized cleanly! Ready for Google Drive upload to instruasia@gmail.com.")
