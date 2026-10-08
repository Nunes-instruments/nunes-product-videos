import json
import os
import shutil
import re

BASE_DIR = r"C:\Users\NUNES\.gemini\antigravity\scratch\nunes-product-videos"
videos_file = os.path.join(BASE_DIR, "public", "videos_data.json")
photos_data_file = os.path.join(BASE_DIR, "public", "photos_data.json")
dist_photos_data_file = os.path.join(BASE_DIR, "dist", "photos_data.json")
dest_photos_dir = r"C:\Users\NUNES\Desktop\Product Photos"
public_photos_dir = os.path.join(BASE_DIR, "public", "photos")
dist_photos_dir = os.path.join(BASE_DIR, "dist", "photos")

os.makedirs(dest_photos_dir, exist_ok=True)
os.makedirs(public_photos_dir, exist_ok=True)
os.makedirs(dist_photos_dir, exist_ok=True)

with open(videos_file, "r", encoding="utf-8") as f:
    videos = json.load(f)

photos = []
for v in videos:
    vid_id = v["id"]
    thumb_path = os.path.join(BASE_DIR, "public", "thumbnails", f"{vid_id}.jpg")
    prod_name = v["productName"]
    # Sanitize invalid Windows filename characters
    safe_name = re.sub(r'[\\/:*?"<>|]', '_', prod_name).strip()
    clean_filename = f"{safe_name}.jpg"

    desktop_dest = os.path.join(dest_photos_dir, clean_filename)
    if os.path.exists(thumb_path):
        shutil.copyfile(thumb_path, desktop_dest)
        pub_dest = os.path.join(public_photos_dir, f"{vid_id}.jpg")
        shutil.copyfile(thumb_path, pub_dest)
        dist_dest = os.path.join(dist_photos_dir, f"{vid_id}.jpg")
        shutil.copyfile(thumb_path, dist_dest)

    photos.append({
        "id": f"photo_{vid_id}",
        "originalFilename": f"{vid_id}.jpg",
        "currentFilename": clean_filename,
        "productName": prod_name,
        "isRenamed": True,
        "imageUrl": f"/photos/{vid_id}.jpg",
        "filePath": desktop_dest,
        "sizeMb": round(os.path.getsize(thumb_path) / (1024 * 1024), 2) if os.path.exists(thumb_path) else 0.05,
        "category": v.get("category", "Testing Equipment"),
        "width": v.get("width", 478),
        "height": v.get("height", 850),
        "driveUrl": "",
        "createdAt": v.get("createdAt", "2026-10-08")
    })

with open(photos_data_file, "w", encoding="utf-8") as f:
    json.dump(photos, f, indent=2)

with open(dist_photos_data_file, "w", encoding="utf-8") as f:
    json.dump(photos, f, indent=2)

print(f"Successfully initialized {len(photos)} product photos in {dest_photos_dir} and database!")
