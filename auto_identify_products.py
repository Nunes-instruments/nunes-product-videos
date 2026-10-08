import os
import re
import json
import cv2
from rapidocr_onnxruntime import RapidOCR

BASE_DIR = r"C:\Users\NUNES\.gemini\antigravity\scratch\nunes-product-videos"
DATA_PATH = os.path.join(BASE_DIR, "public", "videos_data.json")
CATALOG_PATH = os.path.join(BASE_DIR, "public", "catalog.json")
THUMB_DIR = os.path.join(BASE_DIR, "public", "thumbnails")

ocr = RapidOCR()

with open(DATA_PATH, "r", encoding="utf-8") as f:
    videos = json.load(f)

# Load catalog keywords
catalog = []
if os.path.exists(CATALOG_PATH):
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        catalog = json.load(f)

# Common instruments list for Nunes Instruments
KNOWN_PATTERNS = [
    (r"MICRO\s*OHM\s*METER", "Micro Ohm Meter"),
    (r"SIEVE\s*SHAKER", "Table Top Sieve Shaker"),
    (r"PH\s*METER|HI\s*8424", "Hanna HI 8424 pH Meter"),
    (r"ANALYTICAL\s*BALANCE", "Analytical Balance"),
    (r"HOT\s*PLATE", "Laboratory Hot Plate"),
    (r"TURBIDITY\s*METER", "Turbidity Meter"),
    (r"SOIL\s*COMPACTION", "Soil Compaction Apparatus"),
    (r"ABRASION\s*TESTING", "Los Angeles Abrasion Testing Machine"),
    (r"IMPACT\s*TESTING", "Aggregate Impact Testing Machine"),
    (r"HARDNESS\s*TESTER", "Hardness Tester"),
    (r"REFRACTOMETER", "Digital Refractometer"),
    (r"VISCOMETER", "Rotational Viscometer"),
    (r"MOISTURE\s*ANALYZER", "Moisture Analyzer"),
    (r"ULTRASONIC\s*THICKNESS", "Ultrasonic Thickness Gauge"),
    (r"TACHOMETER", "Digital Tachometer"),
    (r"LUX\s*METER", "Digital Lux Meter"),
    (r"SOUND\s*LEVEL", "Sound Level Meter"),
    (r"INCUBATOR", "Laboratory Incubator"),
    (r"AUTOCLAVE", "Laboratory Autoclave"),
    (r"WATER\s*BATH", "Constant Temperature Water Bath"),
    (r"CALIPER|VERNIER", "Digital Vernier Caliper"),
    (r"MICROMETER", "Digital Outside Micrometer"),
    (r"GAUGE", "Digital Measurement Gauge"),
    (r"THERMOMETER", "Digital Thermometer"),
    (r"CONDUCTIVITY", "Conductivity Meter"),
    (r"CENTRIFUGE", "Laboratory Centrifuge"),
    (r"SPECTROPHOTOMETER", "UV-Vis Spectrophotometer"),
    (r"DENSITY\s*METER", "Density Meter"),
    (r"PRESSURE\s*GAUGE", "Digital Pressure Gauge"),
    (r"STIRRER", "Magnetic Stirrer"),
    (r"OVEN", "Laboratory Hot Air Oven"),
    (r"FURNACE", "Muffle Furnace"),
    (r"TENSILE\s*TESTER", "Tensile Testing Machine"),
    (r"FLOW\s*METER", "Digital Flow Meter"),
    (r"COATING\s*THICKNESS", "Coating Thickness Gauge"),
]

identified_count = 0

for idx, item in enumerate(videos):
    vid_id = item["id"]
    thumb_path = os.path.join(THUMB_DIR, f"{vid_id}.jpg")
    fpath = item.get("filePath")

    all_ocr_texts = []
    
    # 1. OCR on existing thumbnail
    if os.path.exists(thumb_path):
        res, _ = ocr(thumb_path)
        if res:
            all_ocr_texts.extend([line[1] for line in res])

    # 2. If thumbnail had very little text, sample a couple more frames from the video
    if len(all_ocr_texts) < 2 and fpath and os.path.exists(fpath):
        try:
            cap = cv2.VideoCapture(fpath)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            for frame_no in [int(total_frames * 0.3), int(total_frames * 0.6)]:
                if frame_no < total_frames:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
                    ret, fr = cap.read()
                    if ret and fr is not None:
                        res, _ = ocr(fr)
                        if res:
                            all_ocr_texts.extend([line[1] for line in res])
            cap.release()
        except Exception:
            pass

    combined_text = " ".join(all_ocr_texts).upper()

    detected_name = None

    # Check known instruments
    for pattern, label in KNOWN_PATTERNS:
        if re.search(pattern, combined_text):
            # Check if brand or model is also found
            model_match = re.search(r"([A-Z0-9]{2,8}-[A-Z0-9]{2,8}|HI\s*\d{3,4}|SE-\d{2,4}[A-Z]?)", combined_text)
            brand_match = re.search(r"(HANNA|EUTECH|SONIT|REMI|AIMIL|OHAUS|TEMPO|MITUTOYO|TESTO|NUNES)", combined_text)
            
            extra = []
            if brand_match:
                extra.append(brand_match.group(1).title())
            extra.append(label)
            if model_match:
                extra.append(model_match.group(1))

            detected_name = " ".join(extra)
            break

    # If no specific pattern, check Nunes catalog items
    if not detected_name:
        for cat in catalog:
            cat_name = cat.get("name", "").upper()
            cat_brand = cat.get("brand", "").upper()
            if (len(cat_name) > 4 and cat_name in combined_text) or (len(cat_brand) > 4 and cat_brand in combined_text):
                detected_name = cat.get("fullName") or cat.get("name")
                break

    # If still not detected, extract meaningful clean text lines if present
    if not detected_name and all_ocr_texts:
        meaningful = [
            t for t in all_ocr_texts 
            if len(t) > 3 and not re.search(r"realme|android|battery|am|pm|date|\d{1,2}:\d{2}", t, re.I)
        ]
        if meaningful:
            detected_name = f"Nunes Instrument - {' '.join(meaningful[:2])}"

    if detected_name:
        # Clean title
        clean_name = re.sub(r"\s+", " ", detected_name).strip()
        item["productName"] = clean_name
        item["isRenamed"] = True
        identified_count += 1
        print(f"[{vid_id}] -> Identified: {clean_name}")
    else:
        # Keep clean product label
        item["productName"] = f"Nunes Testing Product #{idx+1}"

with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(videos, f, indent=2)

# Copy to dist for instant sync
dist_data = os.path.join(BASE_DIR, "dist", "videos_data.json")
if os.path.exists(os.path.dirname(dist_data)):
    with open(dist_data, "w", encoding="utf-8") as f:
        json.dump(videos, f, indent=2)

print(f"\nAuto-identification complete! {identified_count}/{len(videos)} products identified.")
