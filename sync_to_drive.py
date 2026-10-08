"""
Nunes Instruments - Google Drive Video Sync Helper
===================================================
This script syncs all renamed product videos from:
  C:\\Users\\NUNES\\Desktop\\New folder
to your Google Drive folder or generates a manifest with file links.
"""

import os
import shutil
import json

SOURCE_DIR = r"C:\Users\NUNES\Desktop\New folder"
DATA_FILE = os.path.join(os.path.dirname(__file__), "public", "videos_data.json")

def print_status():
    if not os.path.exists(DATA_FILE):
        print("videos_data.json not found. Run scan_videos.py first.")
        return

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        videos = json.load(f)

    renamed = [v for v in videos if v.get("isRenamed")]
    pending = [v for v in videos if not v.get("isRenamed")]

    print(f"Total Videos: {len(videos)}")
    print(f"Renamed & Ready: {len(renamed)}")
    print(f"Pending Review: {len(pending)}")
    print("-" * 50)

def copy_to_gdrive(target_drive_folder):
    if not os.path.exists(target_drive_folder):
        os.makedirs(target_drive_folder, exist_ok=True)

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        videos = json.load(f)

    print(f"Syncing renamed videos to: {target_drive_folder}")
    copied = 0
    for v in videos:
        src = v["filePath"]
        if os.path.exists(src):
            dst = os.path.join(target_drive_folder, os.path.basename(src))
            if not os.path.exists(dst):
                print(f"Copying: {os.path.basename(src)} -> Drive")
                shutil.copy2(src, dst)
                copied += 1
    print(f"Done! Copied {copied} files to Google Drive.")

if __name__ == "__main__":
    import sys
    print_status()
    if len(sys.argv) > 1:
        target = sys.argv[1]
        copy_to_gdrive(target)
    else:
        print("Usage to copy to local Google Drive folder:")
        print('  python sync_to_drive.py "G:\\My Drive\\Nunes Product Videos"')
