import os
import re
import shutil
import uuid
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

from database import DB, get_db

logger = logging.getLogger("AudioBooked.Merger")
BASE_DIR = Path(__file__).resolve().parent
AUDIO_OUTPUT_DIR = BASE_DIR / "audio_output"

def extract_sort_num(title: str, fallback_index: int = 0) -> float:
    """
    Extracts a numeric sort key from a chapter title (e.g. 'Chapter 143' -> 143.0, 'Ch. 14.5' -> 14.5).
    """
    clean = (title or "").strip()
    
    # 1. Match "Chapter 143", "Ch. 143", "Episode 143", "Vol. 1 Ch. 143"
    m1 = re.search(r"(?i)(?:chapter|ch\.?|episode|ep\.?|section|sec\.?)\s*([0-9]+(?:\.[0-9]+)?)", clean)
    if m1:
        try:
            return float(m1.group(1))
        except ValueError:
            pass

    # 2. Match leading number: "143. The Battle" or "143 - The Battle"
    m2 = re.match(r"^\s*([0-9]+(?:\.[0-9]+)?)(?:[:.\-–—\s]|$)", clean)
    if m2:
        try:
            return float(m2.group(1))
        except ValueError:
            pass

    # 3. Match any standalone number in the title
    m3 = re.search(r"\b([0-9]+(?:\.[0-9]+)?)\b", clean)
    if m3:
        try:
            return float(m3.group(1))
        except ValueError:
            pass

    return float(fallback_index)

def merge_projects(
    target_project_id: str,
    source_project_ids: List[str],
    new_title: Optional[str] = None,
    new_author: Optional[str] = None,
    strategy: str = "smart_sort",  # "smart_sort" or "append"
    deduplicate: bool = True,
    delete_sources: bool = True
) -> Dict[str, Any]:
    """
    Merges one or more source projects into a target project.
    Migrates audio files, deduplicates overlapping chapters, re-indexes sequentially,
    merges glossaries, and cleans up redundant source projects.
    """
    target = DB.get_project(target_project_id)
    if not target:
        raise ValueError(f"Target project {target_project_id} not found.")

    # Exclude target from sources if present
    sources_to_merge = [sid for sid in source_project_ids if sid != target_project_id]
    if not sources_to_merge:
        raise ValueError("At least one distinct source project must be selected to merge.")

    source_projects = []
    for sid in sources_to_merge:
        sp = DB.get_project(sid)
        if sp:
            source_projects.append(sp)

    if not source_projects:
        raise ValueError("None of the specified source projects could be found.")

    target_audio_dir = AUDIO_OUTPUT_DIR / target_project_id
    target_audio_dir.mkdir(parents=True, exist_ok=True)

    # 1. Collect all chapters across target and sources
    all_chapters: List[Dict[str, Any]] = []
    for ch in target["chapters"]:
        ch["_origin_project"] = target_project_id
        all_chapters.append(ch)

    for sp in source_projects:
        for ch in sp["chapters"]:
            ch["_origin_project"] = sp["id"]
            all_chapters.append(ch)

    # 2. Deduplicate overlapping chapters if requested
    final_chapters: List[Dict[str, Any]] = []
    discarded_chapter_ids: List[str] = []

    if deduplicate:
        seen_keys: Dict[str, Dict[str, Any]] = {}

        for ch in all_chapters:
            sort_num = extract_sort_num(ch["title"], ch.get("chapter_index", 0))
            # Group key: either by detected number if > 0, or by normalized title
            if sort_num > 0:
                key = f"num_{sort_num}"
            else:
                key = f"title_{re.sub(r'[^a-z0-9]', '', ch['title'].lower())}"

            if key not in seen_keys:
                seen_keys[key] = ch
            else:
                existing = seen_keys[key]
                # Compare: prefer completed status
                existing_done = existing.get("status") == "completed" and existing.get("audio_file") and os.path.exists(existing.get("audio_file", ""))
                current_done = ch.get("status") == "completed" and ch.get("audio_file") and os.path.exists(ch.get("audio_file", ""))

                if current_done and not existing_done:
                    # Current is completed, existing is not -> keep current
                    discarded_chapter_ids.append(existing["id"])
                    seen_keys[key] = ch
                elif existing_done and not current_done:
                    # Existing is completed -> discard current
                    discarded_chapter_ids.append(ch["id"])
                else:
                    # Both completed or both pending -> keep the one with longer content or duration
                    existing_len = len(existing.get("content") or "")
                    current_len = len(ch.get("content") or "")
                    if current_len > existing_len:
                        discarded_chapter_ids.append(existing["id"])
                        seen_keys[key] = ch
                    else:
                        discarded_chapter_ids.append(ch["id"])

        final_chapters = list(seen_keys.values())
    else:
        final_chapters = all_chapters

    # 3. Sort chapters
    if strategy == "smart_sort":
        final_chapters.sort(key=lambda c: (
            extract_sort_num(c["title"], c.get("chapter_index", 0)),
            c.get("chapter_index", 0)
        ))
    else:
        # "append": target chapters first in order, then each source in order
        pass

    # 4. Migrate Audio Files and Re-index in Database
    # Use staging temporary filenames to prevent collision
    conn = get_db()
    cursor = conn.cursor()

    # Delete discarded chapters from DB
    for disc_id in discarded_chapter_ids:
        cursor.execute("DELETE FROM chapters WHERE id = ?", (disc_id,))

    staged_audio: List[Tuple[str, Optional[str], Optional[str]]] = []  # (chapter_id, temp_wav_path, final_wav_path)

    for new_idx, ch in enumerate(final_chapters, start=1):
        ch_id = ch["id"]
        old_audio = ch.get("audio_file")
        temp_path = None
        final_path = str(target_audio_dir / f"chapter_{new_idx:03d}.wav")

        if old_audio and os.path.exists(old_audio):
            # Stage file to a unique temp name inside target directory
            temp_name = f"temp_{uuid.uuid4().hex[:8]}.wav"
            temp_path = str(target_audio_dir / temp_name)
            try:
                shutil.copy2(old_audio, temp_path)
            except Exception as e:
                logger.warning(f"Could not copy audio file {old_audio} -> {temp_path}: {e}")
                temp_path = None

        staged_audio.append((ch_id, temp_path, final_path))

    # Commit chapter updates
    for new_idx, (ch_id, temp_path, final_path) in enumerate(staged_audio, start=1):
        final_audio_str = None
        if temp_path and os.path.exists(temp_path):
            if os.path.exists(final_path):
                try:
                    os.remove(final_path)
                except OSError:
                    pass
            try:
                shutil.move(temp_path, final_path)
                final_audio_str = final_path
            except Exception as e:
                logger.error(f"Error moving temp file {temp_path} to {final_path}: {e}")
                final_audio_str = temp_path

        cursor.execute("""
            UPDATE chapters
            SET project_id = ?, chapter_index = ?, audio_file = COALESCE(?, audio_file)
            WHERE id = ?
        """, (target_project_id, new_idx, final_audio_str, ch_id))

    # 5. Merge Glossaries
    for sp in source_projects:
        cursor.execute("SELECT term, replacement FROM glossary WHERE project_id = ?", (sp["id"],))
        rows = cursor.fetchall()
        for r in rows:
            # Check if term already exists in target
            cursor.execute("SELECT id FROM glossary WHERE (project_id = ? OR project_id IS NULL) AND term = ?", (target_project_id, r["term"]))
            if not cursor.fetchone():
                gid = str(uuid.uuid4())
                cursor.execute("INSERT INTO glossary (id, project_id, term, replacement) VALUES (?, ?, ?, ?)",
                               (gid, target_project_id, r["term"], r["replacement"]))

    # 6. Update Target Project Metadata
    title_to_set = (new_title or "").strip() or target["title"]
    author_to_set = (new_author or "").strip() or target["author"]

    # Calculate new status
    cursor.execute("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as done FROM chapters WHERE project_id = ?", (target_project_id,))
    stats_row = cursor.fetchone()
    total_ch = stats_row["total"] if stats_row else len(final_chapters)
    done_ch = stats_row["done"] if stats_row else 0

    if total_ch > 0 and done_ch == total_ch:
        new_status = "completed"
    elif done_ch > 0:
        new_status = "partial"
    else:
        new_status = "draft"

    cursor.execute("""
        UPDATE projects
        SET title = ?, author = ?, status = ?, output_m4b = NULL
        WHERE id = ?
    """, (title_to_set, author_to_set, new_status, target_project_id))

    # 7. Clean up source projects if requested
    sources_deleted = []
    if delete_sources:
        for sp in source_projects:
            sid = sp["id"]
            cursor.execute("DELETE FROM chapters WHERE project_id = ?", (sid,))
            cursor.execute("DELETE FROM glossary WHERE project_id = ?", (sid,))
            cursor.execute("DELETE FROM projects WHERE id = ?", (sid,))
            sources_deleted.append(sid)

            # Clean directory
            sp_dir = AUDIO_OUTPUT_DIR / sid
            if sp_dir.exists():
                try:
                    shutil.rmtree(sp_dir)
                except Exception as e:
                    logger.warning(f"Could not remove source project directory {sp_dir}: {e}")

    conn.commit()
    conn.close()

    updated_target = DB.get_project(target_project_id)
    return {
        "status": "success",
        "target_project_id": target_project_id,
        "title": title_to_set,
        "total_chapters": len(final_chapters),
        "completed_chapters": done_ch,
        "deduplicated_count": len(discarded_chapter_ids),
        "sources_deleted": sources_deleted,
        "project": updated_target
    }

