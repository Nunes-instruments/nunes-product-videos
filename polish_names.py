import os
import json
import re

DATA_PATH = r"C:\Users\NUNES\.gemini\antigravity\scratch\nunes-product-videos\public\videos_data.json"

with open(DATA_PATH, "r", encoding="utf-8") as f:
    videos = json.load(f)

for v in videos:
    name = v.get("productName", "")
    
    # Specific known cleanups
    if "SE-53C" in name:
        v["productName"] = "Sonit SE-53C Micro Ohm Meter"
        v["category"] = "Electrical Testing"
    elif "HI 8424" in name or "HI8424" in name:
        v["productName"] = "Hanna HI 8424 Microcomputer pH Meter"
        v["category"] = "Water & Chemical Testing"
    elif "Sieve Shaker" in name:
        v["productName"] = "Table Top Sieve Shaker Apparatus"
        v["category"] = "Soil & Aggregate Testing"
    elif "ThermoPro" in name:
        v["productName"] = "ThermoPro Digital Temperature Sensor"
    elif "Mac110g" in name:
        v["productName"] = "Mac 110g Halogen Moisture Analyzer Balance"
        v["category"] = "Laboratory Balance"
    elif "RC-5" in name:
        v["productName"] = "Elitech RC-5 USB Temperature Data Logger"
    elif "DIGITALROTAROD" in name:
        v["productName"] = "Nunes Digital Rota Rod Apparatus"
    elif "DHPG" in name:
        v["productName"] = "Digital High Pressure Gauge MODEL-DHPG"
    elif "TDS MONITOR" in name:
        v["productName"] = "Online Digital TDS Monitor"
    elif "AXIALFLOWCOMPRESSOR" in name:
        v["productName"] = "Axial Flow Compressor Test Rig"
    elif "ShoreADuromeler" in name:
        v["productName"] = "Shore A Digital Durometer Hardness Tester"
    elif "BALL MILL" in name or "BALLMILL" in name:
        v["productName"] = "Laboratory Ball Mill Grinding Machine"
    elif "Muffle Furnace" in name:
        v["productName"] = "High Temperature Muffle Furnace"
    elif "FG-6020SD" in name:
        v["productName"] = "Lutron FG-6020SD Digital Force Gauge"
    elif "CM-230" in name:
        v["productName"] = "Digital Online Conductivity Meter CM-230"
    elif "PHOTO-RPM" in name:
        v["productName"] = "Digital Non-Contact Photo Tachometer (RPM)"
    elif "RISHCl" in name:
        v["productName"] = "Rishabh Digital Clamp Meter 400A AC"
    elif "BULKDENSITY" in name:
        v["productName"] = "Digital Bulk Density Apparatus (Tap Density)"
    elif "Colony Counter" in name:
        v["productName"] = "Digital Bacterial Colony Counter"
    elif "REMI" in name:
        v["productName"] = "Remi Laboratory Centrifuge R-4C"
    elif "3D-Taster" in name or "3D-T" in name:
        v["productName"] = "Haimer 3D-Sensor Taster Alignment Gauge"
    elif "PROXIMI" in name:
        v["productName"] = "Inductive & Capacitive Proximity Sensor Kit"
    elif "Mitutoyo" in name:
        v["productName"] = "Mitutoyo Digital Precision Micrometer"
    elif "Hot Air Oven" in name:
        v["productName"] = "Digital Laboratory Hot Air Oven"
    elif "Hot Plate" in name:
        v["productName"] = "Digital Laboratory Heating Hot Plate"
    elif "PH meter" in name:
        v["productName"] = "Digital Benchtop pH & mV Meter"
        v["category"] = "Water & Chemical Testing"

with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(videos, f, indent=2)

print("Names polished successfully.")
