import os
import re
import json

BASE_DIR = r"C:\Users\NUNES\.gemini\antigravity\scratch\nunes-product-videos"
DATA_PATH = os.path.join(BASE_DIR, "public", "videos_data.json")
FOLDER_DIR = r"C:\Users\NUNES\Desktop\New folder"

with open(DATA_PATH, "r", encoding="utf-8") as f:
    videos = json.load(f)

# Explicit mappings for all identified instruments
EXACT_FIXES = {
    "vid_002": ("AE Handheld Multi-Gas & Oxygen Detector", "Gas Detection"),
    "vid_005": ("Digital Ultrasonic Thickness Gauge", "Thickness Gauging"),
    "vid_011": ("Automatic Servo Voltage Stabilizer 10kVA", "Electrical"),
    "vid_014": ("Digital Load Cell Calibrator & Indicator", "Calibration"),
    "vid_015": ("Digital Temperature Controller Meter", "Thermal"),
    "vid_016": ("Magnetic Stirrer with Hot Plate MS-72", "Heating & Stirring"),
    "vid_023": ("Laboratory Heating Mantle Controller", "Heating"),
    "vid_024": ("Digital Weighbridge Indicator Scale", "Weighing"),
    "vid_028": ("Digital Analytical Meter Console", "Analytical"),
    "vid_029": ("Digital Ultrasonic Flaw Detector", "Non-Destructive Testing"),
    "vid_034": ("Digital Precision Counting Balance", "Weighing"),
    "vid_043": ("AT6000 Digital Alcohol Gas Breathalyzer", "Gas Detection"),
    "vid_044": ("Bosch Professional Digital Laser Measurer", "Metrology"),
    "vid_048": ("Nunes High Precision Testing Apparatus", "Testing"),
    "vid_049": ("Honeywell Industrial Process Controller & Sensor", "Automation"),
    "vid_050": ("Automatic Testing & Calibration Machine", "Calibration"),
    "vid_052": ("Paper & Board Bursting Strength Tester", "Paper Testing"),
    "vid_053": ("Digital Portable Multi-Parameter Tester", "Testing"),
    "vid_056": ("Digital Insulation Resistance Tester SR-2012", "Electrical"),
    "vid_057": ("Soxhlet Extraction Heating Apparatus 220V", "Chemical Testing"),
    "vid_058": ("Laboratory Heating Mantle 220V", "Heating"),
    "vid_059": ("Gyratory Sieve Shaker Speed Controller", "Civil Testing"),
    "vid_060": ("High Power Laboratory Heating Element 1100W", "Heating"),
    "vid_061": ("Digital Wattmeter & Energy Analyzer", "Electrical"),
    "vid_063": ("Microprocessor Laboratory Controller", "Automation"),
    "vid_064": ("Cleveland Open Cup Flash & Fire Point Tester", "Petroleum Testing"),
    "vid_065": ("Digital Dial Thickness Indicator 0-12.7mm", "Thickness Gauging"),
    "vid_069": ("Digital Laboratory Weighing Indicator", "Weighing"),
    "vid_070": ("Laboratory Fermentation & Aging Incubator", "Biological"),
    "vid_071": ("Nunes Precision Laboratory Testing Rig", "Testing"),
    "vid_073": ("Automatic Bursting Strength Tester BST-S2", "Paper Testing"),
    "vid_074": ("Laboratory Multi-Parameter Water Quality Tester", "Water Testing"),
    "vid_075": ("Digital Digital Multimeter & Voltage Tester", "Electrical"),
    "vid_076": ("Automatic Materials Testing Apparatus", "Materials Testing"),
    "vid_077": ("MHT-1202 Micro Hardness Tester", "Hardness Testing"),
    "vid_078": ("Delta Industrial Temperature Controller", "Thermal"),
    "vid_080": ("Nunes Precision Material Testing Machine", "Testing"),
    "vid_081": ("Digital Compression & Load Testing Machine", "Force & Load"),
    "vid_084": ("High Voltage Insulation Resistance Tester 250V", "Electrical"),
    "vid_085": ("Digital Batch Counter & Timer", "Automation"),
    "vid_087": ("Hydraulic Pressure Gauge Tester 0-14 kg/cm²", "Pressure Testing"),
    "vid_089": ("Nunes Laboratory Test Apparatus Console", "Testing"),
    "vid_090": ("Laboratory Heating Hot Plate & Magnetic Stirrer", "Heating"),
    "vid_091": ("Digital Industrial Sensor Controller", "Automation"),
    "vid_092": ("Nunes Instruments Testing Console", "Testing"),
    "vid_093": ("Digital Multi-Zone Temperature Controller", "Thermal"),
    "vid_095": ("Precision Digital Measurement Device", "Testing"),
    "vid_097": ("Digital Thermo-Hygrometer Temperature Humidity", "Environmental"),
    "vid_098": ("High Speed Laboratory Centrifuge 4000 RPM", "Centrifuges"),
    "vid_102": ("Radax Digital Process Indicator & Controller", "Automation"),
    "vid_103": ("Nunes Universal Testing Console", "Testing"),
    "vid_104": ("Bosch Digital Laser Rangefinder Meter", "Metrology"),
    "vid_105": ("Digital Constant Temperature Water Bath", "Heating"),
    "vid_106": ("Laboratory Water Circulator Bath", "Heating"),
    "vid_107": ("Laboratory Chemical Stirring Apparatus", "Mixing"),
    "vid_108": ("Digital Portable Measuring Instrument", "Testing"),
    "vid_114": ("Nunes Electronic Precision Instrument", "Testing"),
    "vid_115": ("Internal Armature Short Tester (Growler)", "Electrical Testing"),
    "vid_116": ("Digital Torque Tester & Calibrator", "Torque Testing"),
    "vid_117": ("Nunes Material Testing Apparatus", "Materials Testing"),
    "vid_118": ("Rishabh Digital Power Quality Analyzer", "Electrical"),
    "vid_119": ("Digital Dissolved Oxygen (DO) Meter", "Water Testing"),
    "vid_120": ("SuperScan Digital Metal Detector", "Security & Detection"),
    "vid_121": ("Multi-Function Electronic Calibration Rig", "Calibration"),
    "vid_123": ("Digital Inspection Measurement System", "Inspection"),
    "vid_124": ("Certified Calibration Standard Test Unit", "Calibration"),
    "vid_125": ("AE-409 Digital Clinical Flame Photometer", "Analytical"),
    "vid_127": ("Laboratory Mashing Bath & Heating Unit", "Heating"),
    "vid_128": ("Digital Portable Testing Gauge", "Testing"),
    "vid_130": ("Digital Retail Pricing & Weighing Scale", "Weighing"),
    "vid_131": ("Commercial Platform Weighing Scale", "Weighing"),
    "vid_134": ("Digital Platform Scale Weight Indicator", "Weighing"),
    "vid_135": ("Digital Heavy Duty Weighing Indicator", "Weighing"),
    "vid_136": ("Electronic Precision Weighing Scale", "Weighing"),
    "vid_138": ("Electric Motor Armature Growler Tester", "Electrical Testing"),
    "vid_141": ("Digital Laboratory Interval Timer", "Automation"),
    "vid_143": ("Digital Decade Resistance Box 3012", "Electrical"),
    "vid_145": ("Digital Crane Scale 10 Ton Capacity", "Weighing"),
    "vid_146": ("High Voltage Breakdown Tester", "Electrical"),
    "vid_147": ("Multi-Channel Data Acquisition System", "Data Logging"),
    "vid_148": ("Computerized Testing System Software Interface", "Software & DAQ"),
    "vid_152": ("Digital Environmental Air Sampler", "Environmental"),
    "vid_153": ("Carbon Dioxide & Water Quality Analyzer", "Environmental"),
    "vid_155": ("Nunes Digital 3-Digit Process Indicator", "Automation"),
    "vid_156": ("Dual Display Digital Temperature & PID Controller", "Thermal"),
    "vid_159": ("Brass Wire Mesh Standard Test Sieve 200mm", "Civil Testing"),
    "vid_163": ("Laboratory Precision Glassware Testing Rig", "Laboratory"),
    "vid_164": ("Inductive Proximity Sensor Switch GJIGO", "Sensors"),
    "vid_165": ("Photoelectric Sensor Switch SIBASS SE-E3F", "Sensors"),
    "vid_170": ("Nunes Precision Mechanical Testing Apparatus", "Mechanical"),
    "vid_172": ("Digital Stroke & Revolution Counter", "Counters"),
    "vid_175": ("Pensky Martens Flash Point Tester for Oil", "Petroleum Testing"),
    "vid_176": ("Multi-Function Portable Instrument", "Testing"),
    "vid_177": ("TFT Color Screen Digital Measurement Device", "Testing")
}

for v in videos:
    vid_id = v["id"]
    if vid_id in EXACT_FIXES:
        new_name, new_cat = EXACT_FIXES[vid_id]
        v["productName"] = new_name
        v["category"] = new_cat
        v["isRenamed"] = True

with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(videos, f, indent=2)

print("Updated all rough names in videos_data.json successfully.")
