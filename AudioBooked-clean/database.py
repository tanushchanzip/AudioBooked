import sqlite3
import json
import os
import uuid
from pathlib import Path
from typing import List, Dict, Any, Optional

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = str(BASE_DIR / "audiobooked.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT DEFAULT 'Unknown Author',
        source_type TEXT NOT NULL,
        source_url TEXT,
        cover_image TEXT,
        narrator_voice TEXT DEFAULT 'af_heart',
        dialogue_voice TEXT DEFAULT 'af_bella',
        thought_voice TEXT DEFAULT 'af_sky',
        speed REAL DEFAULT 1.0,
        thought_speed REAL DEFAULT 0.92,
        status TEXT DEFAULT 'draft',
        output_m4b TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chapters (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        chapter_index INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        audio_file TEXT,
        duration REAL DEFAULT 0.0,
        status TEXT DEFAULT 'pending',
        progress REAL DEFAULT 0.0,
        timings_json TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
    """)

    try:
        cursor.execute("ALTER TABLE chapters ADD COLUMN timings_json TEXT")
    except Exception:
        pass

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS glossary (
        id TEXT PRIMARY KEY,
        project_id TEXT, -- NULL for global rules
        term TEXT NOT NULL,
        replacement TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS custom_voices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        base_voice TEXT NOT NULL,
        blend_voice TEXT NOT NULL,
        blend_ratio REAL DEFAULT 0.3,
        expression TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    conn.commit()
    conn.close()

# Helper DB Operations
class DB:
    @staticmethod
    def get_setting(key: str, default: Optional[str] = None) -> Optional[str]:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else default

    @staticmethod
    def set_setting(key: str, value: str):
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO settings (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        """, (key, value))
        conn.commit()
        conn.close()

    @staticmethod
    def reset_stuck_syntheses():
        """Recovers from unexpected server restarts by resetting stuck synthesizing states to pending."""
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("UPDATE chapters SET status = 'pending', progress = 0.0 WHERE status = 'synthesizing'")
        cursor.execute("UPDATE projects SET status = 'partial' WHERE status = 'processing'")
        conn.commit()
        conn.close()

    @staticmethod
    def create_project(title: str, author: str, source_type: str, source_url: str = None, cover_image: str = None) -> str:
        project_id = str(uuid.uuid4())
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO projects (id, title, author, source_type, source_url, cover_image)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (project_id, title, author, source_type, source_url, cover_image))
        conn.commit()
        conn.close()
        return project_id

    @staticmethod
    def add_chapter(project_id: str, index: int, title: str, content: str) -> str:
        ch_id = str(uuid.uuid4())
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO chapters (id, project_id, chapter_index, title, content)
            VALUES (?, ?, ?, ?, ?)
        """, (ch_id, project_id, index, title, content))
        conn.commit()
        conn.close()
        return ch_id

    @staticmethod
    def list_projects() -> List[Dict[str, Any]]:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.*, COUNT(c.id) as chapter_count,
                   SUM(CASE WHEN c.status = 'completed' THEN 1 ELSE 0 END) as completed_chapters,
                   SUM(c.duration) as total_duration
            FROM projects p
            LEFT JOIN chapters c ON p.id = c.project_id
            GROUP BY p.id
            ORDER BY p.created_at DESC
        """)
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()
        for r in rows:
            r["chapters"] = []
        return rows

    @staticmethod
    def get_project(project_id: str) -> Optional[Dict[str, Any]]:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        p = cursor.fetchone()
        if not p:
            conn.close()
            return None
        project = dict(p)

        cursor.execute("SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_index ASC", (project_id,))
        project["chapters"] = [dict(row) for row in cursor.fetchall()]

        cursor.execute("SELECT * FROM glossary WHERE project_id = ? OR project_id IS NULL", (project_id,))
        project["glossary"] = [dict(row) for row in cursor.fetchall()]

        conn.close()
        return project

    @staticmethod
    def get_chapter(chapter_id: str) -> Optional[Dict[str, Any]]:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM chapters WHERE id = ?", (chapter_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    @staticmethod
    def update_project_settings(project_id: str, settings: Dict[str, Any]):
        conn = get_db()
        cursor = conn.cursor()
        fields = []
        values = []
        for k in ["title", "author", "cover_image", "narrator_voice", "dialogue_voice", "thought_voice", "speed", "thought_speed", "status", "output_m4b"]:
            if k in settings:
                fields.append(f"{k} = ?")
                values.append(settings[k])
        if fields:
            values.append(project_id)
            cursor.execute(f"UPDATE projects SET {', '.join(fields)} WHERE id = ?", values)
            conn.commit()
        conn.close()

    @staticmethod
    def update_project(project_id: str, updates: Dict[str, Any]):
        return DB.update_project_settings(project_id, updates)

    @staticmethod
    def delete_project(project_id: str):
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM chapters WHERE project_id = ?", (project_id,))
        cursor.execute("DELETE FROM glossary WHERE project_id = ?", (project_id,))
        cursor.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        conn.commit()
        conn.close()

    @staticmethod
    def get_library_stats() -> Dict[str, Any]:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT p.id) as total_books,
                COUNT(c.id) as total_chapters,
                SUM(CASE WHEN c.status = 'completed' THEN 1 ELSE 0 END) as completed_chapters,
                COALESCE(SUM(c.duration), 0.0) as total_duration_seconds
            FROM projects p
            LEFT JOIN chapters c ON p.id = c.project_id
        """)
        row = cursor.fetchone()
        conn.close()

        total_disk_bytes = 0
        audio_dir = BASE_DIR / "audio_output"
        if audio_dir.exists():
            for root, dirs, files in os.walk(audio_dir):
                for f in files:
                    try:
                        total_disk_bytes += os.path.getsize(os.path.join(root, f))
                    except OSError:
                        pass

        total_secs = float(row["total_duration_seconds"] if row and row["total_duration_seconds"] is not None else 0.0)
        hours = int(total_secs // 3600)
        mins = int((total_secs % 3600) // 60)

        mb = total_disk_bytes / (1024 * 1024)
        if mb >= 1024:
            disk_str = f"{mb / 1024:.2f} GB"
        else:
            disk_str = f"{mb:.1f} MB"

        return {
            "total_books": int(row["total_books"]) if row and row["total_books"] else 0,
            "total_chapters": int(row["total_chapters"]) if row and row["total_chapters"] else 0,
            "completed_chapters": int(row["completed_chapters"]) if row and row["completed_chapters"] else 0,
            "total_duration_seconds": total_secs,
            "formatted_duration": f"{hours}h {mins}m" if hours > 0 else f"{mins}m",
            "disk_bytes": total_disk_bytes,
            "formatted_disk_size": disk_str
        }

    @staticmethod
    def update_chapter_status(chapter_id: str, status: str, audio_file: str = None, duration: float = 0.0, progress: float = 0.0, timings_json: str = None):
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE chapters
            SET status = ?, audio_file = COALESCE(?, audio_file), duration = COALESCE(?, duration), progress = ?, timings_json = COALESCE(?, timings_json)
            WHERE id = ?
        """, (status, audio_file, duration, progress, timings_json, chapter_id))
        conn.commit()
        conn.close()

    @staticmethod
    def update_chapter_title_and_index(chapter_id: str, title: str, chapter_index: int):
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("UPDATE chapters SET title = ?, chapter_index = ? WHERE id = ?", (title, chapter_index, chapter_id))
        conn.commit()
        conn.close()

    @staticmethod
    def add_glossary_rule(term: str, replacement: str, project_id: str = None) -> str:
        gid = str(uuid.uuid4())
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO glossary (id, project_id, term, replacement) VALUES (?, ?, ?, ?)",
                       (gid, project_id, term, replacement))
        conn.commit()
        conn.close()
        return gid

    @staticmethod
    def delete_glossary_rule(rule_id: str):
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM glossary WHERE id = ?", (rule_id,))
        conn.commit()
        conn.close()

    @staticmethod
    def get_glossary_dict(project_id: str = None) -> Dict[str, str]:
        conn = get_db()
        cursor = conn.cursor()
        if project_id:
            cursor.execute("SELECT term, replacement FROM glossary WHERE project_id = ? OR project_id IS NULL", (project_id,))
        else:
            cursor.execute("SELECT term, replacement FROM glossary WHERE project_id IS NULL")
        rows = cursor.fetchall()
        conn.close()
        return {r["term"]: r["replacement"] for r in rows}

    @staticmethod
    def get_custom_voices() -> List[Dict[str, Any]]:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM custom_voices ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    @staticmethod
    def get_custom_voice(voice_id: str) -> Optional[Dict[str, Any]]:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM custom_voices WHERE id = ?", (voice_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    @staticmethod
    def save_custom_voice(id: str, name: str, base_voice: str, blend_voice: str, blend_ratio: float, expression: str, description: str = "") -> Dict[str, Any]:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO custom_voices (id, name, base_voice, blend_voice, blend_ratio, expression, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                base_voice = excluded.base_voice,
                blend_voice = excluded.blend_voice,
                blend_ratio = excluded.blend_ratio,
                expression = excluded.expression,
                description = excluded.description
        """, (id, name, base_voice, blend_voice, blend_ratio, expression, description))
        conn.commit()
        conn.close()
        return {
            "id": id,
            "name": name,
            "base_voice": base_voice,
            "blend_voice": blend_voice,
            "blend_ratio": blend_ratio,
            "expression": expression,
            "description": description
        }

    @staticmethod
    def delete_custom_voice(voice_id: str) -> bool:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM custom_voices WHERE id = ?", (voice_id,))
        affected = cursor.rowcount
        conn.commit()
        conn.close()
        return affected > 0

init_db()

