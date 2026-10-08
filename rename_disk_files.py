import os
import re
import json

BASE_DIR = r"C:\Users\NUNES\.gemini\antigravity\scratch\nunes-product-videos"
DATA_PATH = os.path.join(BASE_DIR, "public", "videos_data.json")
FOLDER_DIR = r"C:\Users\NUNES\Desktop\New folder"

with open(DATA_PATH, "r", encoding="utf-8") as f:
    videos = json.load(f)

used_names = {}
renamed_count = 0
failed_count = 0

for v in videos:
    prod_name = v.get("productName", "").strip()
    if not prod_name:
        prod_name = f"Nunes_Product_{v['id']}"

    # Clean filename
    clean_name = re.sub(r'[\\/:*?"<>|]+', ' ', prod_name).strip()
    clean_name = re.sub(r'\s+', ' ', clean_name)

    ext = os.path.splitext(v.get("originalFilename", ".mp4"))[1] or ".mp4"

    # Track duplicates
    lower_base = clean_name.lower()
    if lower_base in used_names:
        used_names[lower_base] += 1
        final_filename = f"{clean_name} ({used_names[lower_base]}){ext}"
    else:
        used_names[lower_base] = 1
        final_filename = f"{clean_name}{ext}"

    current_path = v.get("filePath")
    if not current_path or not os.path.exists(current_path):
        # Try finding by original filename or currentFilename in FOLDER_DIR
        cand1 = os.path.join(FOLDER_DIR, v.get("currentFilename", ""))
        cand2 = os.path.join(FOLDER_DIR, v.get("originalFilename", ""))
        if os.path.exists(cand1):
            current_path = cand1
        elif os.path.exists(cand2):
            current_path = cand2

    target_path = os.path.join(FOLDER_DIR, final_filename)

    if current_path and os.path.exists(current_path):
        if os.path.abspath(current_path).lower() != os.path.abspath(target_path).lower():
            try:
                os.rename(current_path, target_path)
                renamed_count += 1
                v["filePath"] = target_path
                v["currentFilename"] = final_filename
                print(f"Renamed: {os.path.basename(current_path)} -> {final_filename}")
            except Exception as e:
                print(f"Error renaming {current_path} to {target_path}: {e}")
                failed_count += 1
        else:
            v["filePath"] = target_path
            v["currentFilename"] = final_filename
    else:
        print(f"File not found on disk: {current_path}")
        failed_count += 1

with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(videos, f, indent=2)

dist_data = os.path.join(BASE_DIR, "dist", "videos_data.json")
if os.path.exists(os.path.dirname(dist_data)):
    with open(dist_data, "w", encoding="utf-8") as f:
        json.dump(videos, f, indent=2)

print(f"\nDone! Renamed on disk: {renamed_count}, Kept/Updated: {len(videos) - failed_count}, Errors: {failed_count}")
