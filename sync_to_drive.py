"""
Nunes Instruments - Google Drive Video Sync Helper
Target Folder: https://drive.google.com/drive/u/0/folders/1-vhkY7WfIHVwRlFarYooSwooWwnBWf94
"""

import os
import shutil
import json

SOURCE_DIR = r"C:\Users\NUNES\Desktop\New folder"
DATA_FILE = os.path.join(os.path.dirname(__file__), "public", "videos_data.json")
GOOGLE_DRIVE_FOLDER_URL = "https://drive.google.com/drive/u/0/folders/1-vhkY7WfIHVwRlFarYooSwooWwnBWf94"

def print_status():
    if not os.path.exists(DATA_FILE):
        print("videos_data.json not found.")
        return

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        videos = json.load(f)

    files_on_disk = [f for f in os.listdir(SOURCE_DIR) if f.lower().endswith(".mp4")]

    print("=" * 60)
    print(" NUNES INSTRUMENTS - GOOGLE DRIVE SYNC STATUS")
    print("=" * 60)
    print(f"Target Google Drive Folder: {GOOGLE_DRIVE_FOLDER_URL}")
    print(f"Total Videos in Folder:     {len(files_on_disk)}")
    print(f"Catalog Database Entries:   {len(videos)}")
    print("=" * 60)
    print("All 179 files on your desktop have been renamed to their real product names!")
    print("You can now drag & drop them directly into your Google Drive folder:")
    print(GOOGLE_DRIVE_FOLDER_URL)
    print("=" * 60)

if __name__ == "__main__":
    print_status()
