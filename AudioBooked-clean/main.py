import os
import shutil
import threading
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import DB, init_db
from tts_engine import TTSEngine
from text_processor import TextProcessor
from audio_packager import AudioPackager
from ingestion import IngestionManager
from ai_condenser import AICondenser, SUPPORTED_PROVIDERS

# Initialize database & clear any interrupted syntheses from prior runs
init_db()
DB.reset_stuck_syntheses()

BASE_DIR = Path(__file__).resolve().parent
AUDIO_OUTPUT_DIR = BASE_DIR / "audio_output"
COVERS_DIR = BASE_DIR / "covers"
UPLOADS_DIR = BASE_DIR / "uploads"
SAMPLES_DIR = BASE_DIR / "models" / "samples"

AUDIO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
COVERS_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
SAMPLES_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="AudioBooked Studio - Kokoro TTS Audiobook Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tts_engine = TTSEngine.get_instance()
audio_packager = AudioPackager()

# Lock for Kokoro TTS inference
inference_lock = threading.Lock()

# ----------------- Background Worker -----------------

def background_generate_project(project_id: str, chapter_ids: Optional[List[str]] = None):
    project = DB.get_project(project_id)
    if not project:
        return

    DB.update_project_settings(project_id, {"status": "processing"})
    glossary = DB.get_glossary_dict(project_id)
    processor = TextProcessor(glossary=glossary)

    narrator_voice = project.get("narrator_voice") or "af_heart"
    dialogue_voice = project.get("dialogue_voice") or "af_bella"
    thought_voice = project.get("thought_voice") or "af_sky"
    speed = float(project.get("speed") or 1.0)
    thought_speed = float(project.get("thought_speed") or 0.92)

    chapters_to_process = project["chapters"]
    if chapter_ids:
        chapters_to_process = [c for c in chapters_to_process if c["id"] in chapter_ids]
    else:
        # Default to processing chapters that are not already completed
        chapters_to_process = [c for c in chapters_to_process if c.get("status") != "completed"]

    proj_audio_dir = AUDIO_OUTPUT_DIR / project_id
    proj_audio_dir.mkdir(parents=True, exist_ok=True)

    for ch in chapters_to_process:
        ch_id = ch["id"]
        ch_idx = ch["chapter_index"]
        DB.update_chapter_status(ch_id, status="synthesizing", progress=0.0)

        # Chunk text with dialogue and thought segmentation
        segments = processor.chunk_text_for_tts(
            ch["content"],
            narrator_voice=narrator_voice,
            dialogue_voice=dialogue_voice,
            thought_voice=thought_voice,
            base_speed=speed,
            thought_speed=thought_speed
        )

        out_wav = proj_audio_dir / f"chapter_{ch_idx:03d}.wav"

        def progress_cb(current, total):
            pct = round((current / total) * 100, 1)
            DB.update_chapter_status(ch_id, status="synthesizing", progress=pct)

        with inference_lock:
            try:
                duration, timings = tts_engine.synthesize_chapter(
                    segments,
                    str(out_wav),
                    default_voice=narrator_voice,
                    default_speed=speed,
                    progress_callback=progress_cb
                )
                import json
                timings_json = json.dumps(timings)
                DB.update_chapter_status(
                    ch_id,
                    status="completed",
                    audio_file=str(out_wav),
                    duration=duration,
                    progress=100.0,
                    timings_json=timings_json
                )
            except Exception as e:
                print(f"[!] Error synthesizing chapter {ch_idx}: {e}")
                DB.update_chapter_status(ch_id, status="failed", progress=0.0)

    # Automatically compile M4B container if all chapters are completed
    updated_project = DB.get_project(project_id)
    all_done = all(c["status"] == "completed" for c in updated_project["chapters"])
    if all_done:
        try:
            m4b_path = proj_audio_dir / f"{Path(project['title']).stem[:40]}.m4b"
            ch_data = [
                {"path": c["audio_file"], "title": c["title"], "duration": c["duration"], "index": c["chapter_index"]}
                for c in updated_project["chapters"] if c.get("audio_file") and os.path.exists(c["audio_file"])
            ]
            audio_packager.create_m4b(
                ch_data,
                str(m4b_path),
                title=project["title"],
                author=project["author"],
                cover_image_path=project.get("cover_image")
            )
            DB.update_project_settings(project_id, {"status": "completed", "output_m4b": str(m4b_path)})
        except Exception as e:
            print(f"[!] Error packaging M4B: {e}")
            DB.update_project_settings(project_id, {"status": "completed"})
    else:
        DB.update_project_settings(project_id, {"status": "partial"})

from voice_catalog import VOICE_CATALOG, get_voice_info

class CreateCustomVoiceRequest(BaseModel):
    name: str
    base_voice: str
    blend_voice: str
    blend_ratio: float = 0.3
    description: Optional[str] = ""

class PreviewCustomVoiceRequest(BaseModel):
    base_voice: str
    blend_voice: str
    blend_ratio: float = 0.3
    text: Optional[str] = None
    speed: float = 1.0

# ----------------- API Endpoints -----------------

@app.get("/api/voices")
def get_voices():
    """List all Kokoro voices categorized with rich metadata, descriptions, and sample lines."""
    voices = tts_engine.list_voices()
    custom_list = DB.get_custom_voices()
    custom_ids = [c["id"] for c in custom_list]
    return {
        "voices": voices,
        "recommended": {
            "narrator": ["af_heart", "am_adam", "bm_george", "bf_emma"],
            "dialogue": ["af_bella", "am_michael", "af_nicole", "am_echo"],
            "thought": ["af_sky", "af_aoede", "bm_daniel", "am_eric"],
            "custom": custom_ids
        },
        "custom_voices": custom_list,
        "details": {v: get_voice_info(v) for v in voices}
    }

@app.get("/api/custom-voices")
def list_custom_voices():
    """Return all user-saved hybrid custom voices."""
    return DB.get_custom_voices()

@app.post("/api/custom-voices")
def create_custom_voice(req: CreateCustomVoiceRequest):
    """Save a new custom hybrid voice blend."""
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Voice name cannot be empty")

    import re
    import uuid
    slug = re.sub(r'[^a-zA-Z0-9_]+', '_', req.name.strip().lower()).strip('_')
    voice_id = f"cv_{slug}" if slug else f"cv_{uuid.uuid4().hex[:8]}"

    ratio = max(0.0, min(1.0, float(req.blend_ratio)))
    base_w = round(1.0 - ratio, 2)
    blend_w = round(ratio, 2)
    expression = f"{req.base_voice}({base_w:.2f})+{req.blend_voice}({blend_w:.2f})"

    desc = req.description.strip() if req.description else f"Hybrid: {int(base_w*100)}% {req.base_voice} + {int(blend_w*100)}% {req.blend_voice}"

    saved = DB.save_custom_voice(
        id=voice_id,
        name=req.name.strip(),
        base_voice=req.base_voice,
        blend_voice=req.blend_voice,
        blend_ratio=ratio,
        expression=expression,
        description=desc
    )
    return saved

@app.delete("/api/custom-voices/{voice_id}")
def delete_custom_voice(voice_id: str):
    """Delete a custom voice blend."""
    success = DB.delete_custom_voice(voice_id)
    if not success:
        raise HTTPException(status_code=404, detail="Custom voice not found")
    return {"status": "deleted", "id": voice_id}

@app.post("/api/custom-voices/preview")
def preview_custom_voice(req: PreviewCustomVoiceRequest):
    """Generate on-the-fly preview audio for custom voice blender sliders."""
    ratio = max(0.0, min(1.0, float(req.blend_ratio)))
    base_w = round(1.0 - ratio, 2)
    blend_w = round(ratio, 2)
    expression = f"{req.base_voice}({base_w:.2f})+{req.blend_voice}({blend_w:.2f})"
    sample_text = req.text.strip() if req.text and req.text.strip() else "Detto, wait! Did not we hear the members do not even know each other's faces?"

    import hashlib
    text_hash = hashlib.md5(f"{expression}_{sample_text}_{req.speed}".encode()).hexdigest()[:10]
    sample_file = SAMPLES_DIR / f"preview_{text_hash}.wav"

    if not sample_file.exists():
        with inference_lock:
            try:
                samples, sr = tts_engine.synthesize_raw_text(sample_text, voice=expression, speed=req.speed)
                import soundfile as sf
                sf.write(str(sample_file), samples, sr)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to generate preview: {e}")

    return FileResponse(sample_file, media_type="audio/wav")

@app.get("/api/voices/{voice_name}/audition")
def audition_voice(voice_name: str, text: Optional[str] = None, speed: float = 1.0):
    """Generate and return a quick high-quality audio sample for any voice."""
    info = get_voice_info(voice_name)
    sample_text = text.strip() if text and text.strip() else info.get("sample_quote", f"Hello! This is a preview of the {voice_name.replace('_', ' ')} voice.")

    import hashlib
    if text and text.strip():
        text_hash = hashlib.md5(f"{voice_name}_{sample_text}_{speed}".encode()).hexdigest()[:10]
        sample_file = SAMPLES_DIR / f"{voice_name}_custom_{text_hash}.wav"
    else:
        sample_file = SAMPLES_DIR / f"{voice_name}.wav"

    if not sample_file.exists():
        with inference_lock:
            try:
                samples, sr = tts_engine.synthesize_raw_text(sample_text, voice=voice_name, speed=speed)
                import soundfile as sf
                sf.write(str(sample_file), samples, sr)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to generate voice sample: {e}")
    return FileResponse(sample_file, media_type="audio/wav")

@app.get("/api/hardware")
def get_hardware():
    """Return GPU/CPU acceleration information."""
    return tts_engine.get_hardware_info()

def _open_in_explorer(target_path: Path):
    abs_path = str(target_path.resolve())
    os.makedirs(abs_path, exist_ok=True)
    try:
        os.startfile(abs_path)
    except Exception:
        import subprocess
        subprocess.Popen(f'explorer "{abs_path}"', shell=True)

@app.post("/api/open-root-folder")
def open_root_folder():
    _open_in_explorer(AUDIO_OUTPUT_DIR)
    return {"status": "success", "path": str(AUDIO_OUTPUT_DIR.resolve())}

@app.get("/api/projects")
def list_projects():
    return DB.list_projects()

@app.get("/api/library/stats")
def get_library_stats():
    return DB.get_library_stats()

@app.get("/api/projects/{project_id}")
def get_project(project_id: str):
    p = DB.get_project(project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    cover_image: Optional[str] = None
    narrator_voice: Optional[str] = None
    dialogue_voice: Optional[str] = None
    thought_voice: Optional[str] = None
    speed: Optional[float] = None
    thought_speed: Optional[float] = None

@app.patch("/api/projects/{project_id}")
def update_project_metadata(project_id: str, updates: ProjectUpdate):
    p = DB.get_project(project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    DB.update_project(project_id, updates.model_dump(exclude_unset=True))
    return {"status": "success", "project": DB.get_project(project_id)}

@app.delete("/api/projects/{project_id}")
def delete_project(project_id: str, delete_files: bool = True):
    p = DB.get_project(project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    DB.delete_project(project_id)
    if delete_files:
        proj_dir = AUDIO_OUTPUT_DIR / project_id
        if proj_dir.exists():
            import shutil
            try:
                shutil.rmtree(proj_dir)
            except Exception as e:
                logger.error(f"Error removing {proj_dir}: {e}")
    return {"status": "success", "id": project_id}

class BatchDeleteRequest(BaseModel):
    project_ids: List[str]
    delete_files: bool = True

@app.post("/api/projects/batch-delete")
def batch_delete_projects(req: BatchDeleteRequest):
    import shutil
    deleted = []
    for pid in req.project_ids:
        p = DB.get_project(pid)
        if p:
            DB.delete_project(pid)
            if req.delete_files:
                proj_dir = AUDIO_OUTPUT_DIR / pid
                if proj_dir.exists():
                    try:
                        shutil.rmtree(proj_dir)
                    except Exception:
                        pass
            deleted.append(pid)
    return {"status": "success", "deleted": deleted}

@app.post("/api/projects/{project_id}/cover")
async def upload_cover(project_id: str, file: UploadFile = File(...)):
    p = DB.get_project(project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    
    ext = Path(file.filename).suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".avif"]:
        raise HTTPException(status_code=400, detail="Invalid image file format (PNG, JPG, WebP supported)")
    
    cover_filename = f"{project_id}_cover{ext}"
    cover_path = COVERS_DIR / cover_filename
    with open(cover_path, "wb") as buffer:
        buffer.write(await file.read())
    
    DB.update_project(project_id, {"cover_image": cover_filename})
    return {"status": "success", "cover_image": cover_filename}

class MergeProjectsRequest(BaseModel):
    target_project_id: str
    source_project_ids: List[str]
    new_title: Optional[str] = None
    new_author: Optional[str] = None
    strategy: Optional[str] = "smart_sort"
    deduplicate: Optional[bool] = True
    delete_sources: Optional[bool] = True

@app.post("/api/projects/merge")
def api_merge_projects(req: MergeProjectsRequest):
    from book_merger import merge_projects
    try:
        res = merge_projects(
            target_project_id=req.target_project_id,
            source_project_ids=req.source_project_ids,
            new_title=req.new_title,
            new_author=req.new_author,
            strategy=req.strategy or "smart_sort",
            deduplicate=req.deduplicate if req.deduplicate is not None else True,
            delete_sources=req.delete_sources if req.delete_sources is not None else True
        )
        return res
    except Exception as e:
        logger.error(f"Merge error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

class SettingsUpdate(BaseModel):
    narrator_voice: Optional[str] = None
    dialogue_voice: Optional[str] = None
    thought_voice: Optional[str] = None
    speed: Optional[float] = None
    thought_speed: Optional[float] = None

@app.patch("/api/projects/{project_id}/settings")
def update_project_settings(project_id: str, settings: SettingsUpdate):
    DB.update_project_settings(project_id, settings.model_dump(exclude_unset=True))
    return {"status": "success"}

class GenerateRequest(BaseModel):
    chapter_ids: Optional[List[str]] = None

@app.post("/api/projects/{project_id}/generate")
def start_generation(project_id: str, background_tasks: BackgroundTasks, req: Optional[GenerateRequest] = None):
    p = DB.get_project(project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    
    chapter_ids = req.chapter_ids if req else None
    background_tasks.add_task(background_generate_project, project_id, chapter_ids)
    return {"status": "started", "project_id": project_id}

@app.post("/api/projects/{project_id}/reset-stuck")
def reset_stuck_chapters(project_id: str):
    from database import get_db
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE chapters SET status = 'pending', progress = 0.0 WHERE project_id = ? AND status = 'synthesizing'", (project_id,))
    cursor.execute("UPDATE projects SET status = 'partial' WHERE id = ? AND status = 'processing'", (project_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Reset all stuck syntheses to pending"}

@app.post("/api/projects/{project_id}/export/m4b")
def export_m4b(project_id: str):
    project = DB.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ch_data = [
        {"path": c["audio_file"], "title": c["title"], "duration": c["duration"], "index": c["chapter_index"]}
        for c in project["chapters"] if c.get("audio_file") and os.path.exists(c["audio_file"])
    ]
    if not ch_data:
        raise HTTPException(status_code=400, detail="No synthesized chapters available to compile M4B.")

    proj_audio_dir = AUDIO_OUTPUT_DIR / project_id
    m4b_path = proj_audio_dir / f"{Path(project['title']).stem[:40]}.m4b"

    audio_packager.create_m4b(
        ch_data,
        str(m4b_path),
        title=project["title"],
        author=project["author"],
        cover_image_path=project.get("cover_image")
    )
    DB.update_project_settings(project_id, {"output_m4b": str(m4b_path)})
    return {"status": "success", "m4b_path": str(m4b_path)}

# Ingestion: Batch Links
class BatchLinksIngest(BaseModel):
    urls: List[str]
    title: Optional[str] = None
    author: Optional[str] = None

class SequencePreviewRequest(BaseModel):
    url: str
    start: Optional[int] = None
    end: Optional[int] = None
    count: Optional[int] = 10

class AppendChaptersRequest(BaseModel):
    urls: List[str]

@app.post("/api/ingest/sequence-preview")
def preview_url_sequence(req: SequencePreviewRequest):
    from chapter_detector import parse_url_chapter_pattern, generate_url_sequence
    parsed = parse_url_chapter_pattern(req.url)
    if not parsed:
        return {
            "status": "warning",
            "detected_chapter": None,
            "urls": [req.url] if req.url else [],
            "count": 1 if req.url else 0
        }
    
    urls = generate_url_sequence(req.url, start=req.start, end=req.end, count=req.count)
    s = req.start or parsed["num"]
    return {
        "status": "success",
        "detected_chapter": parsed["num"],
        "start": s,
        "end": s + len(urls) - 1,
        "count": len(urls),
        "urls": urls
    }

@app.post("/api/ingest/batch-links")
def ingest_batch_links(req: BatchLinksIngest):
    clean_urls = [u.strip() for u in req.urls if u.strip().startswith("http")]
    if not clean_urls:
        raise HTTPException(status_code=400, detail="No valid URLs provided. Make sure links start with http:// or https://")

    series_title = None
    first_title = None
    first_author = None
    extracted_chapters = []

    for i, url in enumerate(clean_urls):
        try:
            ch_data = IngestionManager.ingest_webnovel_chapter(url)
            ch_content = ch_data.get("content", "").strip()
            ch_title = ch_data.get("title", "").strip()
            ch_index = ch_data.get("chapter_index") or (i + 1)
            
            if not series_title and ch_data.get("novel_title"):
                series_title = ch_data.get("novel_title")

            if not ch_content or len(ch_content.split()) < 20:
                art_data = IngestionManager.ingest_article(url)
                if art_data.get("chapters"):
                    ch_content = art_data["chapters"][0]["content"]
                    from chapter_detector import detect_chapter_metadata
                    meta = detect_chapter_metadata(ch_content, url=url, html_title=art_data["chapters"][0]["title"], fallback_index=i + 1)
                    ch_title = meta["title"]
                    ch_index = meta["index"]
                if not first_author:
                    first_author = art_data.get("author")

            if not first_title and ch_title:
                first_title = ch_title

            if ch_content:
                extracted_chapters.append({
                    "index": ch_index,
                    "title": ch_title or f"Chapter {ch_index}",
                    "content": ch_content,
                    "url": url
                })
        except Exception as e:
            print(f"[!] Error fetching {url}: {e}")

    if not extracted_chapters:
        raise HTTPException(status_code=400, detail="Could not extract text content from any of the provided URLs.")

    proj_title = req.title or series_title or first_title or f"Web Anthology ({len(extracted_chapters)} chapters)"
    proj_author = req.author or first_author or "Online Author"

    project_id = DB.create_project(
        title=proj_title,
        author=proj_author,
        source_type="links",
        source_url=clean_urls[0]
    )

    for ch in extracted_chapters:
        DB.add_chapter(project_id, ch["index"], ch["title"], ch["content"])

    return {
        "status": "success",
        "project_id": project_id,
        "title": proj_title,
        "chapters_count": len(extracted_chapters)
    }

@app.post("/api/projects/{project_id}/reindex-chapters")
def reindex_chapters(project_id: str):
    """
    Scans all chapters in a project, detects chapter names & numbers from
    content and URLs, and updates their titles and indices in the database.
    """
    project = DB.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    from chapter_detector import detect_chapter_metadata
    updated = []

    for i, ch in enumerate(project["chapters"]):
        meta = detect_chapter_metadata(
            ch["content"],
            url=ch.get("url", ""),
            fallback_index=i + 1
        )
        new_title = meta["title"]
        new_index = meta["index"]
        DB.update_chapter_title_and_index(ch["id"], new_title, new_index)
        updated.append({
            "id": ch["id"],
            "old_title": ch["title"],
            "new_title": new_title,
            "new_index": new_index
        })

    return {
        "status": "success",
        "project_id": project_id,
        "updated_chapters": updated
    }

@app.post("/api/projects/{project_id}/append-chapters")
def append_chapters_to_project(project_id: str, req: AppendChaptersRequest):
    """
    Sequentially scrapes and appends a series of chapter URLs to an existing project.
    Prevents duplication and preserves book continuity.
    """
    project = DB.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    clean_urls = [u.strip() for u in req.urls if u.strip().startswith("http")]
    if not clean_urls:
        raise HTTPException(status_code=400, detail="No valid URLs provided")

    existing_chapters = project.get("chapters") or []
    existing_indices = {ch["chapter_index"] for ch in existing_chapters}
    existing_titles = {ch["title"].strip().lower() for ch in existing_chapters}
    max_index = max(existing_indices) if existing_indices else 0

    extracted_chapters = []
    for i, url in enumerate(clean_urls):
        try:
            ch_data = IngestionManager.ingest_webnovel_chapter(url)
            ch_content = ch_data.get("content", "").strip()
            ch_title = ch_data.get("title", "").strip()
            ch_index = ch_data.get("chapter_index")

            if not ch_content or len(ch_content.split()) < 20:
                art_data = IngestionManager.ingest_article(url)
                if art_data.get("chapters"):
                    ch_content = art_data["chapters"][0]["content"]
                    from chapter_detector import detect_chapter_metadata
                    meta = detect_chapter_metadata(ch_content, url=url, html_title=art_data["chapters"][0]["title"], fallback_index=max_index + i + 1)
                    ch_title = meta["title"]
                    ch_index = meta["index"]

            if ch_content:
                # Check for duplicate by title
                if ch_title and ch_title.strip().lower() in existing_titles:
                    print(f"[*] Skipping duplicate chapter: {ch_title}")
                    continue

                if not ch_index or ch_index in existing_indices:
                    ch_index = max_index + len(extracted_chapters) + 1

                extracted_chapters.append({
                    "index": ch_index,
                    "title": ch_title or f"Chapter {ch_index}",
                    "content": ch_content,
                    "url": url
                })
        except Exception as e:
            print(f"[!] Error appending {url}: {e}")

    if not extracted_chapters:
        raise HTTPException(status_code=400, detail="Could not extract any new chapters from the provided URLs.")

    added_count = 0
    for ch in extracted_chapters:
        DB.add_chapter(project_id, ch["index"], ch["title"], ch["content"])
        existing_indices.add(ch["index"])
        added_count += 1

    return {
        "status": "success",
        "project_id": project_id,
        "added_count": added_count,
        "total_chapters": len(existing_chapters) + added_count
    }

# Ingestion: Article
class ArticleIngest(BaseModel):
    url: str

@app.post("/api/ingest/article")
def ingest_article(req: ArticleIngest):
    try:
        data = IngestionManager.ingest_article(req.url)
        project_id = DB.create_project(
            title=data["title"],
            author=data["author"],
            source_type="article",
            source_url=req.url
        )
        for ch in data["chapters"]:
            DB.add_chapter(project_id, ch["index"], ch["title"], ch["content"])
        return {"status": "success", "project_id": project_id, "title": data["title"]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Ingestion: Web Novel Chapter
class WebNovelIngest(BaseModel):
    url: str
    series_title: Optional[str] = None
    author: Optional[str] = None

@app.post("/api/ingest/webnovel")
def ingest_webnovel(req: WebNovelIngest):
    try:
        ch_data = IngestionManager.ingest_webnovel_chapter(req.url)
        title = req.series_title or ch_data["title"]
        author = req.author or "Web Novel Author"
        
        project_id = DB.create_project(
            title=title,
            author=author,
            source_type="webnovel",
            source_url=req.url
        )
        DB.add_chapter(project_id, 1, ch_data["title"], ch_data["content"])
        return {"status": "success", "project_id": project_id, "title": title}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Ingestion: File Upload (EPUB, PDF, TXT)
@app.post("/api/ingest/upload")
async def ingest_upload(file: UploadFile = File(...), title: Optional[str] = Form(None), author: Optional[str] = Form(None)):
    suffix = Path(file.filename).suffix.lower()
    temp_path = UPLOADS_DIR / file.filename
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        if suffix == ".epub":
            data = IngestionManager.ingest_epub(str(temp_path), str(COVERS_DIR))
        elif suffix == ".pdf":
            data = IngestionManager.ingest_pdf(str(temp_path))
        elif suffix in [".txt", ".md"]:
            content = temp_path.read_text(encoding="utf-8", errors="ignore")
            data = IngestionManager.ingest_text(content, default_title=Path(file.filename).stem)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload EPUB, PDF, or TXT.")

        proj_title = title or data.get("title") or Path(file.filename).stem
        proj_author = author or data.get("author") or "Unknown Author"

        project_id = DB.create_project(
            title=proj_title,
            author=proj_author,
            source_type=data.get("source_type", suffix[1:]),
            cover_image=data.get("cover_image")
        )

        for ch in data.get("chapters", []):
            DB.add_chapter(project_id, ch["index"], ch["title"], ch["content"])

        return {"status": "success", "project_id": project_id, "chapters_count": len(data.get("chapters", []))}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Glossary API
class GlossaryItem(BaseModel):
    term: str
    replacement: str
    project_id: Optional[str] = None

@app.post("/api/glossary")
def add_glossary_rule(rule: GlossaryItem):
    gid = DB.add_glossary_rule(rule.term, rule.replacement, rule.project_id)
    return {"status": "success", "id": gid}

@app.delete("/api/glossary/{rule_id}")
def delete_glossary_rule(rule_id: str):
    DB.delete_glossary_rule(rule_id)
    return {"status": "success"}

# Serve Media Files by Clean IDs (Zero URL/Path escaping issues)
@app.get("/api/chapters/{chapter_id}/audio")
def get_chapter_audio(chapter_id: str):
    ch = DB.get_chapter(chapter_id)
    if not ch or not ch.get("audio_file"):
        raise HTTPException(status_code=404, detail="Chapter audio not generated yet")
    audio_path = Path(ch["audio_file"])
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail=f"Audio file missing on disk: {audio_path}")
    return FileResponse(audio_path, media_type="audio/wav")

@app.get("/api/chapters/{chapter_id}/timings")
def get_chapter_timings(chapter_id: str):
    ch = DB.get_chapter(chapter_id)
    if not ch:
        raise HTTPException(status_code=404, detail="Chapter not found")
    if ch.get("timings_json"):
        import json
        return json.loads(ch["timings_json"])
    
    # If timings not stored yet, calculate segment breakdown with estimated timestamps
    project = DB.get_project(ch["project_id"])
    glossary = DB.get_glossary_dict(ch["project_id"])
    processor = TextProcessor(glossary=glossary)
    segments = processor.chunk_text_for_tts(
        ch["content"],
        narrator_voice=project.get("narrator_voice") or "af_heart",
        dialogue_voice=project.get("dialogue_voice") or "af_bella",
        thought_voice=project.get("thought_voice") or "af_sky",
        base_speed=float(project.get("speed") or 1.0),
        thought_speed=float(project.get("thought_speed") or 0.92)
    )
    total_dur = ch.get("duration") or 0.0
    total_chars = sum(len(s.text) for s in segments) or 1
    est_timings = []
    cur_t = 0.0
    for i, s in enumerate(segments):
        char_ratio = len(s.text) / total_chars
        seg_dur = char_ratio * total_dur if total_dur > 0 else 3.5
        start_t = round(cur_t, 3)
        end_t = round(cur_t + seg_dur, 3)
        est_timings.append({
            "id": i,
            "start": start_t,
            "end": end_t,
            "text": s.text,
            "type": s.segment_type,
            "voice": s.voice_override
        })
        cur_t = end_t + (s.pause_after_ms / 1000.0)
    return est_timings

@app.get("/api/projects/{project_id}/m4b")
def get_project_m4b(project_id: str):
    p = DB.get_project(project_id)
    if not p or not p.get("output_m4b"):
        raise HTTPException(status_code=404, detail="M4B audiobook not compiled yet")
    m4b_path = Path(p["output_m4b"])
    if not m4b_path.exists():
        raise HTTPException(status_code=404, detail="M4B file missing on disk")
    return FileResponse(m4b_path, media_type="audio/mp4", filename=m4b_path.name)

@app.post("/api/projects/{project_id}/open-folder")
def open_project_folder(project_id: str):
    proj_dir = AUDIO_OUTPUT_DIR / project_id
    _open_in_explorer(proj_dir)
    return {"status": "success", "path": str(proj_dir.resolve())}

class AISettingsUpdate(BaseModel):
    provider: str = "gemini"
    api_key: Optional[str] = None
    model: Optional[str] = None
    base_url: Optional[str] = None
    focus_mode: Optional[str] = "romcom"
    detail_level: Optional[str] = "standard"

class AICondenseRequest(BaseModel):
    project_id: str
    start_index: int
    end_index: int
    focus_mode: str = "romcom"
    detail_level: str = "standard"
    custom_instructions: Optional[str] = None
    provider: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None
    base_url: Optional[str] = None
    save_key: bool = True
    output_action: str = "create_chapter" # 'create_chapter', 'preview_only', 'new_book'

@app.get("/api/ai/providers")
def get_ai_providers():
    saved_provider = DB.get_setting("ai_provider", "gemini")
    saved_model = DB.get_setting("ai_model", "")
    saved_focus = DB.get_setting("ai_focus_mode", "romcom")
    saved_detail = DB.get_setting("ai_detail_level", "standard")

    provider_statuses = {}
    for p_id, p_info in SUPPORTED_PROVIDERS.items():
        key = DB.get_setting(f"ai_key_{p_id}", "")
        saved_burl = DB.get_setting(f"ai_base_url_{p_id}", "")
        masked = f"{key[:4]}...{key[-4:]}" if len(key) >= 8 else ("***" if key else "")
        provider_statuses[p_id] = {
            **p_info,
            "has_key": bool(key) or (p_id == "ollama"),
            "masked_key": masked,
            "saved_base_url": saved_burl
        }

    return {
        "providers": provider_statuses,
        "current_provider": saved_provider,
        "current_model": saved_model,
        "current_focus_mode": saved_focus,
        "current_detail_level": saved_detail
    }

@app.post("/api/ai/settings")
def update_ai_settings(req: AISettingsUpdate):
    if req.provider:
        DB.set_setting("ai_provider", req.provider.lower())
    if req.model:
        DB.set_setting("ai_model", req.model)
    if req.base_url:
        p = (req.provider or "gemini").lower()
        DB.set_setting(f"ai_base_url_{p}", req.base_url.strip())
    if req.focus_mode:
        DB.set_setting("ai_focus_mode", req.focus_mode)
    if req.detail_level:
        DB.set_setting("ai_detail_level", req.detail_level)
    if req.api_key and req.api_key.strip():
        p = (req.provider or "gemini").lower()
        DB.set_setting(f"ai_key_{p}", req.api_key.strip())
    return {"status": "success", "message": "AI settings saved."}

@app.post("/api/ai/condense")
def condense_chapters(req: AICondenseRequest):
    project = DB.get_project(req.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    provider = (req.provider or DB.get_setting("ai_provider", "gemini")).lower()
    model = req.model or DB.get_setting("ai_model", None)
    base_url = req.base_url or DB.get_setting(f"ai_base_url_{provider}", None)

    api_key = req.api_key.strip() if (req.api_key and req.api_key.strip()) else ""
    if not api_key:
        api_key = DB.get_setting(f"ai_key_{provider}", "")

    if not api_key and provider not in ("ollama",):
        raise HTTPException(
            status_code=400,
            detail=f"API Key for {provider.capitalize()} is missing. Please provide your API key to condense chapters."
        )

    if req.save_key:
        if req.api_key and req.api_key.strip():
            DB.set_setting(f"ai_key_{provider}", req.api_key.strip())
        if req.base_url and req.base_url.strip():
            DB.set_setting(f"ai_base_url_{provider}", req.base_url.strip())
        DB.set_setting("ai_provider", provider)
        if req.model:
            DB.set_setting("ai_model", req.model)

    all_chapters = sorted(project.get("chapters", []), key=lambda c: c["chapter_index"])
    selected_chapters = [
        c for c in all_chapters 
        if req.start_index <= c["chapter_index"] <= req.end_index
    ]
    if not selected_chapters:
        raise HTTPException(
            status_code=400,
            detail=f"No chapters found in the range {req.start_index} to {req.end_index}."
        )

    try:
        result = AICondenser.condense(
            chapters=selected_chapters,
            provider=provider,
            api_key=api_key,
            model=model,
            base_url=base_url,
            focus_mode=req.focus_mode,
            detail_level=req.detail_level,
            custom_instructions=req.custom_instructions
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Condensation Failed: {str(e)}")

    created_chapter_id = None
    new_project_id = None

    if req.output_action == "create_chapter":
        max_idx = max([c["chapter_index"] for c in all_chapters]) if all_chapters else 0
        new_idx = max_idx + 1
        new_title = result["title"]
        created_chapter_id = DB.add_chapter(req.project_id, new_idx, new_title, result["content"])
        result["created_chapter_id"] = created_chapter_id
        result["chapter_index"] = new_idx

    elif req.output_action == "new_book":
        new_title = f"{project['title']} (Digest Arc)"
        new_project_id = DB.create_project(new_title, project["author"], "article", cover_image=project.get("cover_image"))
        DB.add_chapter(new_project_id, 1, result["title"], result["content"])
        result["new_project_id"] = new_project_id

    return {"status": "success", **result}

@app.get("/api/storage-info")
def get_storage_info():
    return {
        "audio_output": str(AUDIO_OUTPUT_DIR.resolve()),
        "uploads": str(UPLOADS_DIR.resolve()),
        "covers": str(COVERS_DIR.resolve()),
        "database": str((BASE_DIR / "audiobooked.db").resolve()),
        "models": str((BASE_DIR / "models").resolve())
    }

@app.get("/audio/{filename:path}")
def serve_audio(filename: str):
    full_path = AUDIO_OUTPUT_DIR / filename
    if not full_path.exists():
        # Check absolute path fallback
        full_path = Path(filename)
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    media_type = "audio/wav"
    if full_path.suffix == ".m4b":
        media_type = "audio/mp4"
    elif full_path.suffix == ".mp3":
        media_type = "audio/mpeg"
    return FileResponse(full_path, media_type=media_type)

@app.get("/cover/{filename:path}")
def serve_cover(filename: str):
    full_path = COVERS_DIR / filename
    if not full_path.exists():
        full_path = Path(filename)
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Cover not found")
    return FileResponse(full_path)

# Serve Webapp Static UI
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

@app.get("/")
def index():
    return FileResponse(str(BASE_DIR / "static" / "index.html"))

