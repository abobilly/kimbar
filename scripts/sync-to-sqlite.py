import sqlite3
import json
import glob
import os

DB_PATH = "generated/content.db"
CHAR_GLOB = "generated/characters/*.json"
INDEX_PATH = "generated/asset_index.ndjson"

def init_db(conn):
    c = conn.cursor()
    c.execute("DROP TABLE IF EXISTS characters")
    c.execute("""
        CREATE TABLE characters (
            id TEXT PRIMARY KEY,
            name TEXT,
            description TEXT,
            body TEXT,
            skin TEXT,
            hair TEXT,
            hair_color TEXT,
            json TEXT
        )
    """)
    c.execute("DROP TABLE IF EXISTS assets")
    c.execute("""
        CREATE TABLE assets (
            id TEXT PRIMARY KEY,
            kind TEXT,
            label TEXT,
            path TEXT,
            tags TEXT,
            data TEXT
        )
    """)
    conn.commit()

def sync_characters(conn):
    c = conn.cursor()
    files = glob.glob(CHAR_GLOB)
    print(f"Index: Found {len(files)} character files.")
    
    for fpath in files:
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
                
            ulpc = data.get("ulpcArgs", {})
            c.execute("""
                INSERT OR REPLACE INTO characters 
                (id, name, description, body, skin, hair, hair_color, json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                data.get("id"),
                data.get("name"),
                data.get("description"),
                ulpc.get("body"),
                ulpc.get("skin"),
                ulpc.get("hair"),
                ulpc.get("hairColor"),
                json.dumps(data)
            ))
        except Exception as e:
            print(f"Error processing {fpath}: {e}")
    conn.commit()

def sync_assets(conn):
    if not os.path.exists(INDEX_PATH):
        print(f"Skipping assets: {INDEX_PATH} not found.")
        return

    c = conn.cursor()
    count = 0
    with open(INDEX_PATH, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip(): continue
            try:
                entry = json.loads(line)
                tags = ",".join(entry.get("tags", []))
                c.execute("""
                    INSERT OR REPLACE INTO assets
                    (id, kind, label, path, tags, data)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    entry.get("id"),
                    entry.get("kind"),
                    entry.get("label"),
                    entry.get("file"),
                    tags,
                    line
                ))
                count += 1
            except Exception as e:
                print(f"Error line: {e}")
    print(f"Index: Loaded {count} assets.")
    conn.commit()

def main():
    print(f"Syncing content to {DB_PATH}...")
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    init_db(conn)
    sync_characters(conn)
    sync_assets(conn)
    conn.close()
    print("Done.")

if __name__ == "__main__":
    main()
