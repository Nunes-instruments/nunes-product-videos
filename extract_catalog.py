import sqlite3
import json
import os

db_path = r"C:\Users\NUNES\Desktop\stock_app\stock.db"
catalog = []

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT product_name, category, brand, model FROM products WHERE product_name IS NOT NULL")
    rows = cur.fetchall()
    for r in rows:
        name = r[0].strip() if r[0] else ""
        category = r[1].strip() if r[1] else "General"
        brand = r[2].strip() if r[2] else ""
        model = r[3].strip() if r[3] else ""
        if name:
            catalog.append({
                "name": name,
                "category": category,
                "brand": brand,
                "model": model,
                "fullName": f"{name} {brand} {model}".strip()
            })
    conn.close()

print(f"Total catalog items loaded: {len(catalog)}")
with open(r"C:\Users\NUNES\.gemini\antigravity\scratch\nunes-product-videos\catalog.json", "w", encoding="utf-8") as f:
    json.dump(catalog, f, indent=2)
print("Saved catalog.json successfully.")
