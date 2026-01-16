import sqlite3
import sys
import json
import os

DB_PATH = "generated/content.db"

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/query-db.py \"SELECT ...\"")
        return

    if not os.path.exists(DB_PATH):
        print(f"Error: Database {DB_PATH} not found. Run 'npm run db:sync' first.")
        return

    query = sys.argv[1]
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.cursor()
        cur.execute(query)
        rows = cur.fetchall()
        # JSON output for easy parsing by agents
        print(json.dumps([dict(ix) for ix in rows], indent=2))
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
