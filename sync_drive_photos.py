import json
import os
import shutil
import re

DATA_FILE = os.path.join(os.getcwd(), 'public', 'photos_data.json')
DIST_DATA_FILE = os.path.join(os.getcwd(), 'dist', 'photos_data.json')
TARGET = r"C:\Users\NUNES\Desktop\Google Drive (instruasia@gmail.com)\2 - Photos (179 Product Photos)"
PHOTOS_DIR = r"C:\Users\NUNES\Desktop\Product Photos"

os.makedirs(TARGET, exist_ok=True)
os.makedirs(PHOTOS_DIR, exist_ok=True)

with open(DATA_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

counts = {}
for item in data:
    clean_name = re.sub(r'[\\/:*?"<>|]', '_', item['productName']).strip()
    counts[clean_name] = counts.get(clean_name, 0) + 1
    if counts[clean_name] > 1:
        unique_name = f"{clean_name} ({counts[clean_name]}).jpg"
    else:
        unique_name = f"{clean_name}.jpg"
    
    item['currentFilename'] = unique_name
    src = os.path.join(os.getcwd(), 'public', item['imageUrl'].replace('/', os.sep).lstrip(os.sep))
    
    dst_target = os.path.join(TARGET, unique_name)
    dst_desktop = os.path.join(PHOTOS_DIR, unique_name)
    
    if os.path.exists(src):
        if not os.path.exists(dst_target):
            shutil.copy2(src, dst_target)
        if not os.path.exists(dst_desktop):
            shutil.copy2(src, dst_desktop)

with open(DATA_FILE, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

with open(DIST_DATA_FILE, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print(f"Total photos in Google Drive folder now: {len(os.listdir(TARGET))}")
print(f"Total photos in Product Photos folder now: {len(os.listdir(PHOTOS_DIR))}")
