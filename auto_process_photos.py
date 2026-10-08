r"""
Nunes Instruments - Product Photo Auto Processor & OCR Renamer
Processes photos placed into C:\Users\NUNES\Desktop\Product Photos
Extracts product names via RapidOCR and matches catalog, renames files on disk,
and updates public/photos_data.json and dist/photos_data.json.
"""

import os
import re
import json
import shutil
from rapidocr_onnxruntime import RapidOCR

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PHOTOS_DIR = r"C:\Users\NUNES\Desktop\Product Photos"
PUBLIC_PHOTOS_DIR = os.path.join(BASE_DIR, "public", "photos")
DIST_PHOTOS_DIR = os.path.join(BASE_DIR, "dist", "photos")
DATA_FILE = os.path.join(BASE_DIR, "public", "photos_data.json")
DIST_DATA_FILE = os.path.join(BASE_DIR, "dist", "photos_data.json")
CATALOG_FILE = os.path.join(BASE_DIR, "catalog.json")

ocr = RapidOCR()

# Load catalog
catalog = []
if os.path.exists(CATALOG_FILE):
    with open(CATALOG_FILE, "r", encoding="utf-8") as f:
        catalog = json.load(f)

# Load existing photo database
photos_data = []
if os.path.exists(DATA_FILE):
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            photos_data = json.load(f)
    except:
        photos_data = []

# Known brand/model patterns
patterns = [
    (r"FLUKE\s*(\d+[\+]?)", r"Fluke \1 Digital Multimeter / Clamp Meter", "Electrical"),
    (r"MICRO\s*OHM", "Digital Micro Ohm Meter", "Electrical"),
    (r"SIEVE\s*SHAKER", "Table Top Sieve Shaker Apparatus", "Civil Testing"),
    (r"PH\s*METER|HI\s*8424|HI\s*2211", "Digital Benchtop pH & mV Meter", "Water Testing"),
    (r"CONDUCTIVITY|TDS|EC\s*METER", "Digital Conductivity & TDS Meter", "Water Testing"),
    (r"ANALYTICAL\s*BALANCE|OHAUS|0\.0001G|0\.001G", "High Precision Analytical Balance", "Laboratory"),
    (r"GRAIN\s*MOISTURE|AGRO", "Nunes Digital Grain Moisture Meter AGRO", "Agricultural"),
    (r"WOOD\s*MOISTURE|TIMBER", "Digital Wood & Timber Moisture Meter", "Moisture Testing"),
    (r"COPRA\s*MOISTURE", "Nunes Copra Moisture Meter", "Agricultural"),
    (r"REFLECTANCE|WHITENESS", "Nunes Digital Reflectance Whiteness Meter", "Optical Testing"),
    (r"DYNAMOMETER|EH109", "EH109 Electronic Hand Grip Dynamometer", "Physical Testing"),
    (r"HOT\s*AIR\s*OVEN", "Digital Laboratory Hot Air Oven", "Heating"),
    (r"WATER\s*BATH", "Digital Constant Temperature Water Bath", "Laboratory"),
    (r"CENTRIFUGE|REMI", "Remi Laboratory Centrifuge", "Laboratory"),
    (r"TACHOMETER|PHOTO\s*RPM", "Digital Photo Tachometer (RPM)", "Physical Testing"),
    (r"MANOMETER|PM-6205", "HTC PM-6205 Digital Pressure Manometer", "Pressure Testing"),
    (r"BURSTING\s*STRENGTH", "Automatic Bursting Strength Tester", "Material Testing"),
    (r"THICKNESS\s*GAUGE", "Digital Ultrasonic Thickness Gauge", "Testing Equipment"),
    (r"JAR\s*TEST|FLOC", "Nunes Jar Test Apparatus 4-Spindle Stirrer", "Water Testing"),
    (r"VORTEX\s*MIXER", "Nunes Digital Vortex Mixer", "Laboratory"),
    (r"VERNIER|HEIGHT\s*GAUGE", "Nunes Digital Vernier Height Gauge", "Measurement"),
]

def clean_name(text):
    text = re.sub(r'[\\/*?:"<>|]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def process_photos():
    global photos_data
    os.makedirs(PHOTOS_DIR, exist_ok=True)
    os.makedirs(PUBLIC_PHOTOS_DIR, exist_ok=True)
    os.makedirs(DIST_PHOTOS_DIR, exist_ok=True)

    files = [f for f in os.listdir(PHOTOS_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
    print(f"Found {len(files)} photos in {PHOTOS_DIR}")

    existing_ids = {p['id'] for p in photos_data}
    idx = len(photos_data) + 1

    for fname in files:
        fpath = os.path.join(PHOTOS_DIR, fname)
        size_mb = round(os.path.getsize(fpath) / (1024 * 1024), 2)

        # Check if already in data
        existing = next((p for p in photos_data if p.get('originalFilename') == fname or p.get('currentFilename') == fname), None)
        if existing:
            continue

        photo_id = f"photo_{idx:03d}"
        idx += 1

        print(f"Processing {fname} via RapidOCR...")
        detected_text = ""
        try:
            result, _ = ocr(fpath)
            if result:
                detected_text = " ".join([line[1] for line in result])
                print(f"  OCR detected: {detected_text[:120]}")
        except Exception as e:
            print(f"  OCR error: {e}")

        matched_name = ""
        category = "Testing Equipment"

        # 1. Check regex patterns
        for pattern, prod_name, cat in patterns:
            m = re.search(pattern, detected_text, re.IGNORECASE)
            if m:
                matched_name = prod_name
                category = cat
                if r"\1" in matched_name and m.groups():
                    matched_name = matched_name.replace(r"\1", m.group(1))
                break

        # 2. Check catalog
        if not matched_name and catalog:
            for cat_item in catalog:
                title = cat_item.get('title', '')
                if title and len(title) > 4:
                    words = [w for w in title.split() if len(w) > 3]
                    if words and all(w.lower() in detected_text.lower() for w in words[:2]):
                        matched_name = title
                        category = cat_item.get('category', 'Laboratory')
                        break

        # 3. Fallback to clean base name or generic
        if not matched_name:
            base = os.path.splitext(fname)[0]
            if not re.match(r'^(IMG|PHOTO|PXP|DSC|WP)[\-_0-9]+', base, re.IGNORECASE):
                matched_name = base
            else:
                matched_name = f"Nunes Instrument Product Photo {idx-1}"

        matched_name = clean_name(matched_name)
        ext = os.path.splitext(fname)[1].lower()
        new_filename = f"{matched_name}{ext}"
        new_path = os.path.join(PHOTOS_DIR, new_filename)

        # Rename on disk if different
        if fpath != new_path and not os.path.exists(new_path):
            try:
                os.rename(fpath, new_path)
                fpath = new_path
                fname = new_filename
                print(f"  Renamed on disk -> {new_filename}")
            except Exception as e:
                print(f"  Rename error: {e}")

        # Copy to public/photos and dist/photos
        dest_public = os.path.join(PUBLIC_PHOTOS_DIR, f"{photo_id}{ext}")
        shutil.copyfile(fpath, dest_public)
        dest_dist = os.path.join(DIST_PHOTOS_DIR, f"{photo_id}{ext}")
        shutil.copyfile(fpath, dest_dist)

        item = {
            "id": photo_id,
            "originalFilename": fname,
            "currentFilename": new_filename,
            "productName": matched_name,
            "isRenamed": True,
            "imageUrl": f"/photos/{photo_id}{ext}",
            "filePath": fpath,
            "sizeMb": size_mb,
            "category": category,
            "detectedText": detected_text[:200],
            "createdAt": "2026-10-08"
        }
        photos_data.append(item)

    # Save databases
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(photos_data, f, indent=2)
    with open(DIST_DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(photos_data, f, indent=2)

    print(f"Total photos in database: {len(photos_data)}")

if __name__ == "__main__":
    process_photos()
