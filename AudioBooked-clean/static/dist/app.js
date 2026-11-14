// src/api.ts
class ApiClient {
  static async getProjects() {
    const res = await fetch("/api/projects");
    if (!res.ok)
      throw new Error("Failed to load projects");
    return res.json();
  }
  static async getProject(id) {
    const res = await fetch(`/api/projects/${id}`);
    if (!res.ok)
      throw new Error("Project not found");
    return res.json();
  }
  static async getHardwareInfo() {
    const res = await fetch("/api/hardware");
    if (!res.ok)
      throw new Error("Failed to fetch hardware status");
    return res.json();
  }
  static async getVoices() {
    const res = await fetch("/api/voices");
    if (!res.ok)
      throw new Error("Failed to load voices");
    return res.json();
  }
  static async getCustomVoices() {
    const res = await fetch("/api/custom-voices");
    if (!res.ok)
      throw new Error("Failed to load custom voices");
    return res.json();
  }
  static async createCustomVoice(payload) {
    const res = await fetch("/api/custom-voices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to create custom voice" }));
      throw new Error(err.detail || "Failed to create custom voice");
    }
    return res.json();
  }
  static async deleteCustomVoice(voiceId) {
    const res = await fetch(`/api/custom-voices/${encodeURIComponent(voiceId)}`, {
      method: "DELETE"
    });
    if (!res.ok)
      throw new Error("Failed to delete custom voice");
  }
  static async previewCustomVoice(payload) {
    const res = await fetch("/api/custom-voices/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok)
      throw new Error("Failed to generate preview audio");
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }
  static async updateSettings(id, settings) {
    const res = await fetch(`/api/projects/${id}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
    if (!res.ok)
      throw new Error("Failed to save settings");
  }
  static async generate(id, chapterIds) {
    const res = await fetch(`/api/projects/${id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapter_ids: chapterIds || null })
    });
    if (!res.ok)
      throw new Error("Failed to start synthesis");
  }
  static async exportM4b(id) {
    const res = await fetch(`/api/projects/${id}/export/m4b`, { method: "POST" });
    if (!res.ok)
      throw new Error("Failed to package M4B container");
    return res.json();
  }
  static async reindexChapters(id) {
    const res = await fetch(`/api/projects/${id}/reindex-chapters`, { method: "POST" });
    if (!res.ok)
      throw new Error("Failed to reindex chapters");
    return res.json();
  }
  static async getChapterTimings(chapterId) {
    const res = await fetch(`/api/chapters/${chapterId}/timings`);
    if (!res.ok)
      return [];
    return res.json();
  }
  static async ingestBatchLinks(urls, title, author) {
    const res = await fetch("/api/ingest/batch-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls, title: title || undefined, author: author || undefined })
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.detail || "Batch link ingestion failed");
    return data;
  }
  static async previewUrlSequence(url, start, end, count) {
    const res = await fetch("/api/ingest/sequence-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, start, end, count })
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.detail || "URL sequence preview failed");
    return data;
  }
  static async appendChaptersToProject(projectId, urls) {
    const res = await fetch(`/api/projects/${projectId}/append-chapters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls })
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.detail || "Failed to append chapters");
    return data;
  }
  static async ingestArticle(url) {
    const res = await fetch("/api/ingest/article", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.detail || "Article ingestion failed");
    return data;
  }
  static async uploadFile(formData) {
    const res = await fetch("/api/ingest/upload", {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.detail || "File upload failed");
    return data;
  }
  static async openRootFolder() {
    await fetch("/api/open-root-folder", { method: "POST" });
  }
  static async addGlossaryRule(projectId, term, replacement) {
    const res = await fetch(`/api/projects/${projectId}/glossary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term, replacement })
    });
    if (!res.ok)
      throw new Error("Failed to add glossary rule");
  }
  static async deleteGlossaryRule(ruleId) {
    const res = await fetch(`/api/glossary/${ruleId}`, { method: "DELETE" });
    if (!res.ok)
      throw new Error("Failed to delete glossary rule");
  }
  static async getLibraryStats() {
    const res = await fetch("/api/library/stats");
    if (!res.ok)
      throw new Error("Failed to fetch library stats");
    return res.json();
  }
  static async updateProject(id, updates) {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    if (!res.ok)
      throw new Error("Failed to update project metadata");
    return res.json();
  }
  static async deleteProject(id, deleteFiles = true) {
    const res = await fetch(`/api/projects/${id}?delete_files=${deleteFiles}`, {
      method: "DELETE"
    });
    if (!res.ok)
      throw new Error("Failed to delete project");
  }
  static async batchDeleteProjects(ids, deleteFiles = true) {
    const res = await fetch("/api/projects/batch-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_ids: ids, delete_files: deleteFiles })
    });
    if (!res.ok)
      throw new Error("Failed to delete selected projects");
  }
  static async openProjectFolder(id) {
    const res = await fetch(`/api/projects/${id}/open-folder`, { method: "POST" });
    if (!res.ok)
      throw new Error("Failed to open project folder");
  }
  static async uploadCover(id, file) {
    const formData = new FormData;
    formData.append("file", file);
    const res = await fetch(`/api/projects/${id}/cover`, {
      method: "POST",
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to upload cover" }));
      throw new Error(err.detail || "Failed to upload cover");
    }
    return res.json();
  }
  static async mergeProjects(params) {
    const res = await fetch("/api/projects/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.detail || "Failed to merge projects");
    return data;
  }
  static async getAIProviders() {
    const res = await fetch("/api/ai/providers");
    if (!res.ok)
      throw new Error("Failed to fetch AI providers");
    return res.json();
  }
  static async saveAISettings(settings) {
    const res = await fetch("/api/ai/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to save AI settings");
    }
  }
  static async condenseChapters(req) {
    const res = await fetch("/api/ai/condense", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req)
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.detail || "AI Condensation failed");
    return data;
  }
}

// src/icons.ts
var createSvg = (content, size = 18, className = "") => `
  <svg class="h-icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    ${content}
  </svg>
`.trim();
var Icons = {
  book: (s = 18) => createSvg(`<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/>`, s),
  headphones: (s = 18) => createSvg(`<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>`, s),
  play: (s = 18) => createSvg(`<polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none"/>`, s),
  pause: (s = 18) => createSvg(`<rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none"/>`, s),
  backward15: (s = 18) => createSvg(`<path d="M11 17l-5-5 5-5"/><path d="M18 17l-5-5 5-5"/><path d="M6 12h14"/>`, s),
  forward15: (s = 18) => createSvg(`<path d="M13 17l5-5-5-5"/><path d="M6 17l5-5-5-5"/><path d="M4 12h14"/>`, s),
  folder: (s = 18) => createSvg(`<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>`, s),
  download: (s = 18) => createSvg(`<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`, s),
  plus: (s = 18) => createSvg(`<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`, s),
  feather: (s = 18) => createSvg(`<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/>`, s),
  read: (s = 18) => createSvg(`<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>`, s),
  edit: (s = 18) => createSvg(`<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>`, s),
  sparkles: (s = 18) => createSvg(`<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>`, s),
  cpu: (s = 18) => createSvg(`<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3"/><path d="M15 1v3"/><path d="M9 20v3"/><path d="M15 20v3"/><path d="M20 9h3"/><path d="M20 14h3"/><path d="M1 9h3"/><path d="M1 14h3"/>`, s),
  link: (s = 18) => createSvg(`<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`, s),
  volume: (s = 18) => createSvg(`<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>`, s),
  sliders: (s = 18) => createSvg(`<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>`, s),
  check: (s = 18) => createSvg(`<polyline points="20 6 9 17 4 12"/>`, s),
  trash: (s = 18) => createSvg(`<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>`, s),
  refresh: (s = 18) => createSvg(`<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>`, s),
  clock: (s = 18) => createSvg(`<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`, s),
  arrowRight: (s = 18) => createSvg(`<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>`, s),
  search: (s = 18) => createSvg(`<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`, s),
  grid: (s = 18) => createSvg(`<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>`, s),
  list: (s = 18) => createSvg(`<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>`, s),
  sort: (s = 18) => createSvg(`<path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/>`, s),
  filter: (s = 18) => createSvg(`<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>`, s),
  x: (s = 18) => createSvg(`<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`, s),
  archive: (s = 18) => createSvg(`<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>`, s),
  hardDrive: (s = 18) => createSvg(`<line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/>`, s),
  image: (s = 18) => createSvg(`<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>`, s),
  square: (s = 18) => createSvg(`<rect width="18" height="18" x="3" y="3" rx="2"/>`, s),
  checkSquare: (s = 18) => createSvg(`<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>`, s),
  merge: (s = 18) => createSvg(`<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/>`, s),
  layers: (s = 18) => createSvg(`<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>`, s),
  more: (s = 18) => createSvg(`<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>`, s),
  mic: (s = 18) => createSvg(`<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>`, s),
  soundwave: (s = 18) => createSvg(`<path d="M2 10v4"/><path d="M6 7v10"/><path d="M10 4v16"/><path d="M14 6v12"/><path d="M18 8v8"/><path d="M22 11v2"/>`, s),
  zap: (s = 18) => createSvg(`<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`, s),
  heart: (s = 18) => createSvg(`<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>`, s)
};

// src/player.ts
class AudioPlayer {
  audio;
  currentChapterId = null;
  onTimeUpdateCb;
  onChapterEndCb;
  constructor() {
    this.audio = new Audio;
    this.initListeners();
    this.initSpeedFromStorage();
  }
  initListeners() {
    this.audio.addEventListener("timeupdate", () => {
      this.updateProgressUI();
      if (this.onTimeUpdateCb) {
        this.onTimeUpdateCb(this.audio.currentTime);
      }
    });
    this.audio.addEventListener("play", () => this.updatePlayState(true));
    this.audio.addEventListener("pause", () => this.updatePlayState(false));
    this.audio.addEventListener("ended", () => {
      this.updatePlayState(false);
      if (this.onChapterEndCb)
        this.onChapterEndCb();
    });
    this.audio.addEventListener("error", (e) => {
      console.error("Audio playback error:", e, this.audio.error);
      this.updatePlayState(false);
      const timeDisplay = document.getElementById("dock-time-current");
      if (timeDisplay)
        timeDisplay.textContent = "Error loading audio";
    });
  }
  initSpeedFromStorage() {
    const saved = localStorage.getItem("audiobooked_speed");
    const speed = saved ? parseFloat(saved) : 1;
    this.setSpeed(speed);
  }
  setTimeUpdateListener(cb) {
    this.onTimeUpdateCb = cb;
  }
  setChapterEndListener(cb) {
    this.onChapterEndCb = cb;
  }
  loadChapter(chapterId, title, bookTitle, coverUrl) {
    this.currentChapterId = chapterId;
    this.audio.src = `/api/chapters/${chapterId}/audio`;
    this.audio.load();
    const titleEl = document.getElementById("dock-book-title");
    const chEl = document.getElementById("dock-chapter-title");
    const coverEl = document.getElementById("dock-cover-art");
    if (titleEl)
      titleEl.textContent = bookTitle;
    if (chEl)
      chEl.textContent = title;
    if (coverEl) {
      if (coverUrl) {
        coverEl.src = `/cover/${encodeURIComponent(coverUrl)}`;
        coverEl.style.display = "block";
      } else {
        coverEl.style.display = "none";
      }
    }
    const dock = document.getElementById("audio-dock");
    if (dock)
      dock.classList.add("visible");
    this.play();
  }
  async play() {
    if (!this.audio.src)
      return;
    try {
      await this.audio.play();
    } catch (err) {
      console.warn("Autoplay prevented:", err);
      this.updatePlayState(false);
    }
  }
  pause() {
    this.audio.pause();
  }
  toggle() {
    if (this.audio.paused) {
      this.play();
    } else {
      this.pause();
    }
  }
  seek(seconds) {
    if (!isNaN(this.audio.duration)) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration));
    }
  }
  skip(delta) {
    this.seek(this.audio.currentTime + delta);
  }
  setSpeed(speed) {
    const clamped = Math.max(0.25, Math.min(5, Math.round(speed * 20) / 20));
    this.audio.playbackRate = clamped;
    localStorage.setItem("audiobooked_speed", clamped.toFixed(2));
    const slider = document.getElementById("dock-speed-slider");
    const label = document.getElementById("dock-speed-val");
    if (slider)
      slider.value = clamped.toString();
    if (label)
      label.textContent = `${clamped.toFixed(2)}×`;
    document.querySelectorAll(".speed-pill").forEach((btn) => {
      const bSpeed = parseFloat(btn.getAttribute("data-speed") || "0");
      if (Math.abs(bSpeed - clamped) < 0.01) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }
  getCurrentTime() {
    return this.audio.currentTime;
  }
  getCurrentChapterId() {
    return this.currentChapterId;
  }
  updatePlayState(isPlaying) {
    const playBtn = document.getElementById("dock-btn-play");
    if (playBtn) {
      playBtn.innerHTML = isPlaying ? Icons.pause(20) : Icons.play(20);
      playBtn.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
    }
  }
  updateProgressUI() {
    const cur = this.audio.currentTime;
    const dur = this.audio.duration || 0;
    const curEl = document.getElementById("dock-time-current");
    const totalEl = document.getElementById("dock-time-total");
    const bar = document.getElementById("dock-progress-fill");
    const scrub = document.getElementById("dock-scrub");
    if (curEl)
      curEl.textContent = this.formatTime(cur);
    if (totalEl)
      totalEl.textContent = dur ? this.formatTime(dur) : "--:--";
    const pct = dur > 0 ? cur / dur * 100 : 0;
    if (bar)
      bar.style.width = `${pct}%`;
    if (scrub && !scrub.matches(":active")) {
      scrub.value = pct.toString();
    }
  }
  formatTime(secs) {
    const s = Math.floor(secs);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const remM = m % 60;
    const remS = s % 60;
    if (h > 0) {
      return `${h}:${remM.toString().padStart(2, "0")}:${remS.toString().padStart(2, "0")}`;
    }
    return `${remM}:${remS.toString().padStart(2, "0")}`;
  }
}

// src/readalong.ts
function appendInlineMarkdown(container, text) {
  const tokenRegex = /(\*\*[^*\n]+?\*\*|__[^_\n]+?__|\*[^*\n]+?\*|_[^_\n]+?_|`[^`\n]+?`|~~[^~\n]+?~~)/g;
  let lastIdx = 0;
  let match;
  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      container.appendChild(document.createTextNode(text.substring(lastIdx, match.index)));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**") || token.startsWith("__") && token.endsWith("__")) {
      const strong = document.createElement("strong");
      strong.textContent = token.slice(2, -2);
      container.appendChild(strong);
    } else if (token.startsWith("*") && token.endsWith("*") || token.startsWith("_") && token.endsWith("_")) {
      const em = document.createElement("em");
      em.className = "reader-thought-inline";
      em.textContent = token.slice(1, -1);
      container.appendChild(em);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      const code = document.createElement("code");
      code.className = "reader-code-inline";
      code.textContent = token.slice(1, -1);
      container.appendChild(code);
    } else if (token.startsWith("~~") && token.endsWith("~~")) {
      const del = document.createElement("del");
      del.textContent = token.slice(2, -2);
      container.appendChild(del);
    }
    lastIdx = tokenRegex.lastIndex;
  }
  if (lastIdx < text.length) {
    container.appendChild(document.createTextNode(text.substring(lastIdx)));
  }
}
function isChapterHeading(text, title) {
  const clean = text.replace(/^#{1,6}\s+/, "").trim();
  if (title && clean.toLowerCase() === title.replace(/^#{1,6}\s+/, "").trim().toLowerCase())
    return true;
  if (clean.length > 80 || clean.split(/\s+/).length > 12)
    return false;
  return /^(?:chapter|ch\.?|episode|ep\.?|prologue|epilogue|interlude|act|part|scene)\b/i.test(clean);
}
function isSceneBreak(text) {
  return /^[\*\-–—_#\s]{3,}$/.test(text.trim());
}

class ReadAlongManager {
  timings = [];
  activeIndex = -1;
  container;
  userIsScrolling = false;
  scrollTimeout = null;
  onSeekRequest;
  chapterTitle;
  rawContent;
  constructor(containerId) {
    const el = document.getElementById(containerId);
    if (!el)
      throw new Error(`Container #${containerId} not found`);
    this.container = el;
    this.container.addEventListener("wheel", () => {
      this.userIsScrolling = true;
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(() => {
        this.userIsScrolling = false;
      }, 4000);
    }, { passive: true });
  }
  setSeekListener(cb) {
    this.onSeekRequest = cb;
  }
  setTimings(timings, chapterTitle, rawContent) {
    this.timings = timings;
    this.chapterTitle = chapterTitle;
    this.rawContent = rawContent;
    this.activeIndex = -1;
    this.render();
  }
  renderFallbackText(rawText, chapterTitle) {
    this.timings = [];
    this.activeIndex = -1;
    this.chapterTitle = chapterTitle;
    this.rawContent = rawText;
    this.container.innerHTML = "";
    this.container.scrollTop = 0;
    const article = document.createElement("article");
    article.className = "reader-prose";
    let text = rawText.replace(/\r\n|\r/g, `
`);
    const singleCount = (text.match(/(?<!\n)\n(?!\n)/g) || []).length;
    const doubleCount = (text.match(/\n\n/g) || []).length;
    if (singleCount > 0 && doubleCount < Math.max(1, Math.floor(singleCount / 4))) {
      text = text.replace(/(?<!\n)\n(?!\n)/g, `

`);
    }
    const lines = text.split(/\n\n+/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      this.container.innerHTML = '<div class="reader-empty">No text content available for this chapter.</div>';
      return;
    }
    let startLine = 0;
    const firstLine = lines[0] || "";
    const headingMatch = firstLine.match(/^(?:Chapter|Episode|Prologue|Epilogue|Act|Part)\s+\d+[:\s-]*(.*)$/i);
    const isHeading = isChapterHeading(firstLine, chapterTitle) || headingMatch && firstLine.length < 80;
    let bannerTitle = isHeading ? firstLine : chapterTitle || "";
    bannerTitle = bannerTitle.replace(/^#{1,6}\s+/, "").trim();
    if (bannerTitle) {
      const banner = document.createElement("header");
      banner.className = "reader-chapter-banner";
      const pretitle = document.createElement("span");
      pretitle.className = "reader-chapter-pretitle";
      pretitle.textContent = "Chapter Reading";
      banner.appendChild(pretitle);
      const h1 = document.createElement("h1");
      h1.className = "reader-chapter-heading";
      appendInlineMarkdown(h1, bannerTitle);
      banner.appendChild(h1);
      const ornament = document.createElement("div");
      ornament.className = "reader-ornament-line";
      banner.appendChild(ornament);
      article.appendChild(banner);
      if (isHeading)
        startLine = 1;
    }
    for (let i = startLine;i < lines.length; i++) {
      const line = lines[i];
      if (!line)
        continue;
      if (isSceneBreak(line)) {
        const divider = document.createElement("div");
        divider.className = "reader-scene-break";
        divider.setAttribute("aria-hidden", "true");
        const mark = document.createElement("span");
        mark.className = "scene-break-mark";
        mark.textContent = "❦";
        divider.appendChild(mark);
        article.appendChild(divider);
        continue;
      }
      const hMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (hMatch) {
        const level = hMatch[1].length;
        const hText = hMatch[2].trim();
        const headingEl = document.createElement(level <= 2 ? "h2" : "h3");
        headingEl.className = level <= 2 ? "reader-section-heading" : "reader-subheading";
        appendInlineMarkdown(headingEl, hText);
        article.appendChild(headingEl);
        continue;
      }
      const sysMatch = line.match(/^(\*\*|)?\[(.*?)\](\*\*|)?$/);
      if (sysMatch && sysMatch[2].trim().length > 15) {
        const sysBox = document.createElement("div");
        sysBox.className = "reader-system-notice";
        appendInlineMarkdown(sysBox, sysMatch[2].trim());
        article.appendChild(sysBox);
        continue;
      }
      const p = document.createElement("p");
      let pClass = "reader-paragraph";
      if (/^["“'「『]/.test(line)) {
        pClass += " paragraph-dialogue";
      } else if (/^\*.*\*$/.test(line) || /^<[ie][m]?>.*<\/[ie][m]?>$/.test(line)) {
        pClass += " paragraph-thought";
      }
      p.className = pClass;
      appendInlineMarkdown(p, line);
      article.appendChild(p);
    }
    this.container.appendChild(article);
  }
  render() {
    this.container.innerHTML = "";
    this.container.scrollTop = 0;
    if (!this.timings || this.timings.length === 0) {
      this.container.innerHTML = '<div class="reader-empty">Select or synthesize a chapter to start synchronized reading.</div>';
      return;
    }
    const article = document.createElement("article");
    article.className = "reader-prose";
    let startIdx = 0;
    const firstSeg = this.timings[0];
    let bannerTitle = this.chapterTitle || "";
    let firstSegRemainder = "";
    if (firstSeg) {
      const segText = firstSeg.text.trim();
      const firstLine = segText.split(`
`)[0]?.trim() || "";
      if (isChapterHeading(firstLine, this.chapterTitle) || isChapterHeading(segText, this.chapterTitle)) {
        bannerTitle = isChapterHeading(firstLine, this.chapterTitle) ? firstLine : segText;
        if (segText.includes(`
`)) {
          firstSegRemainder = segText.split(`
`).slice(1).join(" ").trim();
        }
        startIdx = 1;
      }
    }
    if (bannerTitle) {
      const banner = document.createElement("header");
      banner.className = "reader-chapter-banner";
      const pretitle = document.createElement("span");
      pretitle.className = "reader-chapter-pretitle";
      pretitle.textContent = "Web Novel Chapter";
      banner.appendChild(pretitle);
      const h1 = document.createElement("h1");
      h1.className = "reader-chapter-heading";
      if (firstSeg && startIdx === 1) {
        const headingSpan = document.createElement("span");
        headingSpan.id = `read-seg-${firstSeg.id ?? 0}`;
        headingSpan.className = `reader-segment seg-heading read-seg-${firstSeg.id ?? 0}`;
        headingSpan.setAttribute("data-seg-id", `${firstSeg.id ?? 0}`);
        headingSpan.setAttribute("data-start", firstSeg.start.toString());
        headingSpan.setAttribute("title", `${firstSeg.voice} (${firstSeg.start.toFixed(1)}s - ${firstSeg.end.toFixed(1)}s)`);
        const cleanBanner = bannerTitle.replace(/^#{1,6}\s+/, "").trim();
        appendInlineMarkdown(headingSpan, cleanBanner);
        headingSpan.onclick = () => {
          if (this.onSeekRequest)
            this.onSeekRequest(firstSeg.start);
        };
        h1.appendChild(headingSpan);
      } else {
        const cleanBanner = bannerTitle.replace(/^#{1,6}\s+/, "").trim();
        appendInlineMarkdown(h1, cleanBanner);
      }
      banner.appendChild(h1);
      const ornament = document.createElement("div");
      ornament.className = "reader-ornament-line";
      banner.appendChild(ornament);
      article.appendChild(banner);
    }
    let currentParagraphSpans = [];
    let currentParaType = "narration";
    let currentParaHasDialogue = false;
    let currentParaHasThought = false;
    const flushParagraph = () => {
      if (currentParagraphSpans.length === 0)
        return;
      const p = document.createElement("p");
      let pClass = "reader-paragraph";
      if (currentParaType === "dialogue" || currentParaHasDialogue && !currentParaHasThought && currentParagraphSpans.length <= 2) {
        pClass += " paragraph-dialogue";
      } else if (currentParaType === "thought" || currentParaHasThought) {
        pClass += " paragraph-thought";
      }
      p.className = pClass;
      currentParagraphSpans.forEach((span) => p.appendChild(span));
      article.appendChild(p);
      currentParagraphSpans = [];
      currentParaType = "narration";
      currentParaHasDialogue = false;
      currentParaHasThought = false;
    };
    if (firstSegRemainder) {
      const span = document.createElement("span");
      span.className = `reader-segment seg-narration read-seg-0`;
      span.setAttribute("data-seg-id", `0`);
      span.setAttribute("data-start", (firstSeg?.start || 0).toString());
      appendInlineMarkdown(span, firstSegRemainder);
      span.appendChild(document.createTextNode(" "));
      span.onclick = () => {
        if (this.onSeekRequest && firstSeg)
          this.onSeekRequest(firstSeg.start);
      };
      currentParagraphSpans.push(span);
    }
    for (let i = startIdx;i < this.timings.length; i++) {
      const seg = this.timings[i];
      const segIdx = seg.id !== undefined ? seg.id : i;
      const lines = seg.text.split(`
`);
      for (let lIdx = 0;lIdx < lines.length; lIdx++) {
        const rawLine = lines[lIdx];
        const trimmed = rawLine.trim();
        if (lIdx > 0 && currentParagraphSpans.length > 0) {
          flushParagraph();
        }
        if (!trimmed) {
          if (currentParagraphSpans.length > 0) {
            flushParagraph();
          }
          continue;
        }
        if (isSceneBreak(trimmed)) {
          flushParagraph();
          const divider = document.createElement("div");
          divider.className = "reader-scene-break";
          divider.setAttribute("aria-hidden", "true");
          const mark = document.createElement("span");
          mark.className = "scene-break-mark";
          mark.textContent = "❦";
          divider.appendChild(mark);
          article.appendChild(divider);
          continue;
        }
        const isDialogueStart = /^["“'「『]/.test(trimmed);
        if (isDialogueStart && currentParagraphSpans.length > 0) {
          flushParagraph();
        }
        if (seg.type === "dialogue" || isDialogueStart) {
          currentParaHasDialogue = true;
          if (currentParagraphSpans.length === 0)
            currentParaType = "dialogue";
        } else if (seg.type === "thought") {
          currentParaHasThought = true;
          if (currentParagraphSpans.length === 0)
            currentParaType = "thought";
        }
        const span = document.createElement("span");
        span.className = `reader-segment seg-${seg.type} read-seg-${segIdx}`;
        span.setAttribute("data-seg-id", `${segIdx}`);
        span.setAttribute("data-start", seg.start.toString());
        span.setAttribute("title", `${seg.type.toUpperCase()} • ${seg.voice} (${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s)`);
        appendInlineMarkdown(span, trimmed);
        span.appendChild(document.createTextNode(" "));
        span.onclick = () => {
          if (this.onSeekRequest) {
            this.onSeekRequest(seg.start);
          }
        };
        currentParagraphSpans.push(span);
      }
    }
    flushParagraph();
    this.container.appendChild(article);
  }
  updateTime(currentTime) {
    if (!this.timings || this.timings.length === 0)
      return;
    let newIndex = -1;
    for (let i = 0;i < this.timings.length; i++) {
      const seg = this.timings[i];
      if (currentTime >= seg.start && currentTime < seg.end) {
        newIndex = seg.id !== undefined ? seg.id : i;
        break;
      }
    }
    if (newIndex === -1 && currentTime > 0) {
      for (let i = this.timings.length - 1;i >= 0; i--) {
        if (currentTime >= this.timings[i].start) {
          newIndex = this.timings[i].id !== undefined ? this.timings[i].id : i;
          break;
        }
      }
    }
    if (newIndex !== this.activeIndex) {
      if (this.activeIndex >= 0) {
        const prevSpans = this.container.querySelectorAll(`.read-seg-${this.activeIndex}`);
        prevSpans.forEach((el) => el.classList.remove("active"));
      }
      this.activeIndex = newIndex;
      if (this.activeIndex >= 0) {
        const currSpans = this.container.querySelectorAll(`.read-seg-${this.activeIndex}`);
        currSpans.forEach((el) => el.classList.add("active"));
        const firstEl = currSpans[0];
        if (firstEl && !this.userIsScrolling) {
          firstEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  }
}

// src/studio.ts
class StudioManager {
  currentProject = null;
  activeChapter = null;
  voicesData = null;
  reader;
  player;
  pollTimer = null;
  mode = "read";
  constructor(reader, player) {
    this.reader = reader;
    this.player = player;
    this.initModeToggles();
  }
  setVoices(voices) {
    this.voicesData = voices;
    this.populateVoiceSelects();
  }
  async open(projectId) {
    try {
      this.currentProject = await ApiClient.getProject(projectId);
      this.renderProjectHeader();
      this.renderVoiceSettings();
      this.renderGlossary();
      this.renderChapterList();
      const chapters = this.currentProject.chapters || [];
      if (chapters.length > 0) {
        const first = chapters[0];
        await this.selectChapter(first.id);
      }
      this.startPollingIfNeeded();
    } catch (err) {
      console.error("Failed to load project into studio:", err);
      alert("Could not open Studio: " + err.message);
    }
  }
  getCurrentProject() {
    return this.currentProject;
  }
  getActiveChapter() {
    return this.activeChapter;
  }
  initModeToggles() {
    const btnRead = document.getElementById("btn-mode-read");
    const btnEdit = document.getElementById("btn-mode-edit");
    if (btnRead && btnEdit) {
      btnRead.onclick = () => this.setMode("read");
      btnEdit.onclick = () => this.setMode("edit");
    }
  }
  setMode(mode) {
    this.mode = mode;
    const btnRead = document.getElementById("btn-mode-read");
    const btnEdit = document.getElementById("btn-mode-edit");
    const readView = document.getElementById("reader-container");
    const editView = document.getElementById("chapter-editor-view");
    if (btnRead && btnEdit && readView && editView) {
      if (mode === "read") {
        btnRead.classList.add("active");
        btnEdit.classList.remove("active");
        readView.style.display = "block";
        editView.style.display = "none";
        if (this.activeChapter) {
          this.loadActiveChapterReader();
        }
      } else {
        btnRead.classList.remove("active");
        btnEdit.classList.add("active");
        readView.style.display = "none";
        editView.style.display = "block";
      }
    }
  }
  async selectChapter(chapterId) {
    if (!this.currentProject)
      return;
    const chapters = this.currentProject.chapters || [];
    const ch = chapters.find((c) => c.id === chapterId);
    if (!ch)
      return;
    this.activeChapter = ch;
    document.querySelectorAll(".chapter-nav-item").forEach((el) => el.classList.remove("active"));
    const item = document.getElementById(`nav-ch-${ch.id}`);
    if (item)
      item.classList.add("active");
    const titleEl = document.getElementById("studio-chapter-title");
    if (titleEl) {
      const isHeading = /^(?:chapter|ch\.?|episode|ep\.?|prologue|epilogue|interlude)\b/i.test(ch.title.trim());
      titleEl.textContent = isHeading ? ch.title : `${ch.chapter_index}. ${ch.title}`;
    }
    const editor = document.getElementById("chapter-textarea");
    if (editor)
      editor.value = ch.content;
    await this.loadActiveChapterReader();
  }
  async loadActiveChapterReader() {
    if (!this.activeChapter)
      return;
    if (this.activeChapter.status === "completed") {
      const timings = await ApiClient.getChapterTimings(this.activeChapter.id);
      if (timings && timings.length > 0) {
        this.reader.setTimings(timings, this.activeChapter.title, this.activeChapter.content);
        return;
      }
    }
    this.reader.renderFallbackText(this.activeChapter.content, this.activeChapter.title);
  }
  renderProjectHeader() {
    if (!this.currentProject)
      return;
    const titleEl = document.getElementById("studio-project-title");
    const metaEl = document.getElementById("studio-project-meta");
    const countBadge = document.getElementById("studio-chapter-count");
    const chapters = this.currentProject.chapters || [];
    if (titleEl)
      titleEl.textContent = this.currentProject.title;
    if (metaEl) {
      const chCount = chapters.length;
      metaEl.textContent = `${this.currentProject.author} • ${this.currentProject.source_type.toUpperCase()} • ${chCount} ${chCount === 1 ? "Chapter" : "Chapters"}`;
    }
    if (countBadge)
      countBadge.textContent = `${chapters.length} Ch`;
  }
  renderChapterList() {
    if (!this.currentProject)
      return;
    const container = document.getElementById("studio-chapters-nav");
    if (!container)
      return;
    container.innerHTML = "";
    const chapters = this.currentProject.chapters || [];
    chapters.forEach((ch) => {
      const el = document.createElement("div");
      el.id = `nav-ch-${ch.id}`;
      el.className = `chapter-nav-item ${this.activeChapter?.id === ch.id ? "active" : ""}`;
      el.onclick = () => this.selectChapter(ch.id);
      const isHeading = /^(?:chapter|ch\.?|episode|ep\.?|prologue|epilogue|interlude)\b/i.test(ch.title.trim());
      const displayTitle = isHeading ? ch.title : `${ch.chapter_index}. ${ch.title}`;
      const isDone = ch.status === "completed";
      const isSynth = ch.status === "synthesizing";
      let statusLabel = "Pending";
      let statusClass = "status-pending";
      if (isDone) {
        statusLabel = ch.duration ? `${Math.round(ch.duration)}s` : "Done";
        statusClass = "status-done";
      } else if (isSynth) {
        statusLabel = `${Math.round(ch.progress)}%`;
        statusClass = "status-active";
      }
      el.innerHTML = `
        <div class="ch-nav-header">
          <span class="ch-nav-title">${displayTitle}</span>
          ${isDone ? `
            <button class="btn-icon-subtle btn-play-chapter" title="Listen to chapter" onclick="event.stopPropagation(); window.__audiobooked.playChapter('${ch.id}')">
              ${Icons.play(13)}
            </button>` : ""}
        </div>
        <div class="ch-nav-meta">
          <span class="status-dot ${statusClass}"></span>
          <span class="ch-nav-status">${isSynth ? `Synthesizing ${statusLabel}` : statusLabel}</span>
        </div>
      `;
      container.appendChild(el);
    });
  }
  populateVoiceSelects() {
    if (!this.voicesData)
      return;
    const details = this.voicesData.details || {};
    const populate = (id, def) => {
      const sel = document.getElementById(id);
      if (!sel)
        return;
      sel.innerHTML = "";
      const customVoices = this.voicesData.voices.filter((v) => v.startsWith("cv_") || details[v]?.is_custom);
      const standardVoices = this.voicesData.voices.filter((v) => !v.startsWith("cv_") && !details[v]?.is_custom);
      if (customVoices.length > 0) {
        const customGroup = document.createElement("optgroup");
        customGroup.label = "✨ Custom Hybrid Blends";
        customVoices.forEach((v) => {
          const opt = document.createElement("option");
          opt.value = v;
          const info = details[v];
          opt.textContent = info ? `✨ ${info.name}` : `✨ ${v}`;
          if (v === def)
            opt.selected = true;
          customGroup.appendChild(opt);
        });
        sel.appendChild(customGroup);
      }
      const standardGroup = document.createElement("optgroup");
      standardGroup.label = "Kokoro Neural Voices";
      standardVoices.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v;
        const info = details[v];
        opt.textContent = info ? `${info.name} (${v})` : v.replace("_", " ");
        if (v === def)
          opt.selected = true;
        standardGroup.appendChild(opt);
      });
      sel.appendChild(standardGroup);
    };
    const p = this.currentProject;
    populate("select-narrator-voice", p?.narrator_voice || "af_heart");
    populate("select-dialogue-voice", p?.dialogue_voice || "af_bella");
    populate("select-thought-voice", p?.thought_voice || "af_sky");
  }
  renderVoiceSettings() {
    if (!this.currentProject)
      return;
    this.populateVoiceSelects();
    const speedSlider = document.getElementById("slider-narrator-speed");
    const speedVal = document.getElementById("val-narrator-speed");
    const thoughtSlider = document.getElementById("slider-thought-speed");
    const thoughtVal = document.getElementById("val-thought-speed");
    const spd = this.currentProject.speed || 1;
    const thtSpd = this.currentProject.thought_speed || 0.9;
    if (speedSlider)
      speedSlider.value = spd.toString();
    if (speedVal)
      speedVal.textContent = `${spd.toFixed(2)}×`;
    if (thoughtSlider)
      thoughtSlider.value = thtSpd.toString();
    if (thoughtVal)
      thoughtVal.textContent = `${thtSpd.toFixed(2)}×`;
  }
  async saveSettings() {
    if (!this.currentProject)
      return;
    const nVoice = document.getElementById("select-narrator-voice")?.value || "af_heart";
    const dVoice = document.getElementById("select-dialogue-voice")?.value || "af_bella";
    const tVoice = document.getElementById("select-thought-voice")?.value || "af_sky";
    const spd = parseFloat(document.getElementById("slider-narrator-speed")?.value || "1.0");
    const thtSpd = parseFloat(document.getElementById("slider-thought-speed")?.value || "0.9");
    const payload = {
      narrator_voice: nVoice,
      dialogue_voice: dVoice,
      thought_voice: tVoice,
      speed: spd,
      thought_speed: thtSpd
    };
    await ApiClient.updateSettings(this.currentProject.id, payload);
    Object.assign(this.currentProject, payload);
  }
  renderGlossary() {
    if (!this.currentProject)
      return;
    const container = document.getElementById("studio-glossary-tags");
    if (!container)
      return;
    container.innerHTML = "";
    const list = this.currentProject.glossary || [];
    if (list.length === 0) {
      container.innerHTML = '<span class="glossary-empty">No rules added.</span>';
      return;
    }
    list.forEach((g) => {
      const chip = document.createElement("span");
      chip.className = "glossary-chip";
      chip.innerHTML = `
        <strong>${g.term}</strong> &rarr; <em>${g.replacement}</em>
        <button class="chip-delete" onclick="window.__audiobooked.deleteGlossary('${g.id}')">
          ${Icons.trash(12)}
        </button>
      `;
      container.appendChild(chip);
    });
  }
  async reindex() {
    if (!this.currentProject)
      return;
    try {
      const res = await ApiClient.reindexChapters(this.currentProject.id);
      await this.open(this.currentProject.id);
      alert(`Re-indexed ${res.updated_chapters.length} chapters.`);
    } catch (err) {
      alert("Re-index failed: " + err.message);
    }
  }
  async synthesizeCurrent() {
    if (!this.currentProject || !this.activeChapter)
      return;
    await this.saveSettings();
    await ApiClient.generate(this.currentProject.id, [this.activeChapter.id]);
    this.startPollingIfNeeded();
  }
  async synthesizeAll() {
    if (!this.currentProject)
      return;
    await this.saveSettings();
    await ApiClient.generate(this.currentProject.id);
    this.startPollingIfNeeded();
  }
  async exportM4b() {
    if (!this.currentProject)
      return;
    try {
      const res = await ApiClient.exportM4b(this.currentProject.id);
      alert(`Audiobook packaged successfully!`);
      await this.open(this.currentProject.id);
    } catch (err) {
      alert("Export failed: " + err.message);
    }
  }
  startPollingIfNeeded() {
    clearInterval(this.pollTimer);
    this.pollTimer = setInterval(async () => {
      if (!this.currentProject) {
        clearInterval(this.pollTimer);
        return;
      }
      try {
        const updated = await ApiClient.getProject(this.currentProject.id);
        const updatedChs = updated.chapters || [];
        const hasProcessing = updatedChs.some((c) => c.status === "synthesizing");
        this.currentProject = updated;
        this.renderChapterList();
        if (this.activeChapter) {
          const freshActive = updatedChs.find((c) => c.id === this.activeChapter.id);
          if (freshActive && freshActive.status !== this.activeChapter.status) {
            this.activeChapter = freshActive;
            await this.loadActiveChapterReader();
          }
        }
        if (!hasProcessing && updated.status !== "processing") {
          clearInterval(this.pollTimer);
        }
      } catch (e) {
        console.warn("Poll error:", e);
      }
    }, 2000);
  }
}

// src/shelf.ts
class BookshelfManager {
  projects = [];
  filteredProjects = [];
  stats = null;
  voicesData = null;
  searchQuery = "";
  currentFilter = "all";
  currentSort = "recent";
  viewMode = "grid";
  selectedIds = new Set;
  editingProjectId = null;
  selectedClothColor = "burgundy";
  selectedCoverFile = null;
  deletingProjectId = null;
  mergeCandidateIds = new Set;
  onOpenStudioCb;
  onPlayProjectCb;
  constructor() {
    this.initUI();
  }
  setCallbacks(onOpenStudio, onPlayProject) {
    this.onOpenStudioCb = onOpenStudio;
    this.onPlayProjectCb = onPlayProject;
  }
  setVoices(voices) {
    this.voicesData = voices;
  }
  initUI() {
    const searchInput = document.getElementById("library-search-input");
    const searchClear = document.getElementById("library-search-clear");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        this.searchQuery = searchInput.value.trim().toLowerCase();
        if (searchClear)
          searchClear.style.display = this.searchQuery ? "flex" : "none";
        this.applyFiltersAndRender();
      });
    }
    if (searchClear && searchInput) {
      searchClear.onclick = () => {
        searchInput.value = "";
        this.searchQuery = "";
        searchClear.style.display = "none";
        searchInput.focus();
        this.applyFiltersAndRender();
      };
    }
    const btnRefresh = document.getElementById("btn-refresh-library");
    if (btnRefresh) {
      btnRefresh.onclick = () => this.load();
    }
    const btnStatDisk = document.getElementById("btn-stat-disk");
    if (btnStatDisk) {
      btnStatDisk.onclick = () => ApiClient.openRootFolder();
    }
    const pillContainer = document.getElementById("library-filter-pills");
    if (pillContainer) {
      pillContainer.addEventListener("click", (e) => {
        const target = e.target.closest(".filter-pill");
        if (!target)
          return;
        const filter = target.dataset.filter || "all";
        this.setFilter(filter);
      });
    }
    const sortSelect = document.getElementById("library-sort-select");
    if (sortSelect) {
      sortSelect.addEventListener("change", () => {
        this.currentSort = sortSelect.value;
        this.applyFiltersAndRender();
      });
    }
    const btnGrid = document.getElementById("btn-view-grid");
    const btnTable = document.getElementById("btn-view-table");
    if (btnGrid) {
      btnGrid.onclick = () => this.setViewMode("grid");
    }
    if (btnTable) {
      btnTable.onclick = () => this.setViewMode("table");
    }
    const btnBatchDeselect = document.getElementById("btn-batch-deselect");
    if (btnBatchDeselect) {
      btnBatchDeselect.onclick = () => this.clearSelection();
    }
    const btnBatchDelete = document.getElementById("btn-batch-delete");
    if (btnBatchDelete) {
      btnBatchDelete.onclick = () => this.performBatchDelete();
    }
    const btnBatchExport = document.getElementById("btn-batch-export");
    if (btnBatchExport) {
      btnBatchExport.onclick = () => this.performBatchExport();
    }
    const btnBatchSynth = document.getElementById("btn-batch-synthesize");
    if (btnBatchSynth) {
      btnBatchSynth.onclick = () => this.performBatchSynthesize();
    }
    const btnBatchMerge = document.getElementById("btn-batch-merge");
    if (btnBatchMerge) {
      btnBatchMerge.onclick = () => this.openMergeModal(Array.from(this.selectedIds));
    }
    this.initEditModal();
    this.initDeleteModal();
    this.initMergeModal();
  }
  initEditModal() {
    const modal = document.getElementById("modal-edit-book");
    const btnClose = document.getElementById("btn-close-edit-modal");
    const btnCancel = document.getElementById("btn-cancel-edit");
    const form = document.getElementById("form-edit-book");
    const closeFn = () => this.closeEditModal();
    if (btnClose)
      btnClose.onclick = closeFn;
    if (btnCancel)
      btnCancel.onclick = closeFn;
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal)
          closeFn();
      };
    }
    document.querySelectorAll(".colorway-btn").forEach((btn) => {
      btn.onclick = () => {
        document.querySelectorAll(".colorway-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.selectedClothColor = btn.dataset.cloth || "burgundy";
        this.selectedCoverFile = null;
        const nameLabel = document.getElementById("edit-cover-filename");
        if (nameLabel)
          nameLabel.textContent = `Cloth preset: ${this.selectedClothColor}`;
      };
    });
    const fileInput = document.getElementById("edit-cover-file");
    if (fileInput) {
      fileInput.onchange = () => {
        if (fileInput.files && fileInput.files[0]) {
          this.selectedCoverFile = fileInput.files[0];
          const nameLabel = document.getElementById("edit-cover-filename");
          if (nameLabel)
            nameLabel.textContent = this.selectedCoverFile.name;
          document.querySelectorAll(".colorway-btn").forEach((b) => b.classList.remove("active"));
        }
      };
    }
    const speedSlider = document.getElementById("edit-speed-input");
    const speedVal = document.getElementById("edit-speed-val");
    if (speedSlider && speedVal) {
      speedSlider.oninput = () => {
        speedVal.textContent = `${parseFloat(speedSlider.value).toFixed(2)}×`;
      };
    }
    const thoughtSpeedSlider = document.getElementById("edit-thought-speed-input");
    const thoughtSpeedVal = document.getElementById("edit-thought-speed-val");
    if (thoughtSpeedSlider && thoughtSpeedVal) {
      thoughtSpeedSlider.oninput = () => {
        thoughtSpeedVal.textContent = `${parseFloat(thoughtSpeedSlider.value).toFixed(2)}×`;
      };
    }
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        await this.saveEditModal();
      };
    }
  }
  initDeleteModal() {
    const modal = document.getElementById("modal-delete-book");
    const btnClose = document.getElementById("btn-close-delete-modal");
    const btnCancel = document.getElementById("btn-cancel-delete");
    const btnConfirm = document.getElementById("btn-confirm-delete");
    const closeFn = () => this.closeDeleteModal();
    if (btnClose)
      btnClose.onclick = closeFn;
    if (btnCancel)
      btnCancel.onclick = closeFn;
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal)
          closeFn();
      };
    }
    if (btnConfirm) {
      btnConfirm.onclick = async () => {
        await this.confirmDelete();
      };
    }
  }
  async load() {
    try {
      const [projects, stats] = await Promise.all([
        ApiClient.getProjects(),
        ApiClient.getLibraryStats().catch(() => null)
      ]);
      this.projects = Array.isArray(projects) ? projects : [];
      this.stats = stats;
      this.updateStatsUI();
      this.applyFiltersAndRender();
    } catch (err) {
      const grid = document.getElementById("bookshelf-grid");
      if (grid)
        grid.innerHTML = `<div class="shelf-error">Could not load library: ${err.message}</div>`;
    }
  }
  updateStatsUI() {
    const elBooks = document.getElementById("lib-stat-books");
    const elDuration = document.getElementById("lib-stat-duration");
    const elChapters = document.getElementById("lib-stat-chapters");
    const elDisk = document.getElementById("lib-stat-disk");
    if (this.stats) {
      if (elBooks)
        elBooks.textContent = `${this.stats.total_books}`;
      if (elDuration)
        elDuration.textContent = this.stats.formatted_duration || "0m";
      if (elChapters)
        elChapters.textContent = `${this.stats.completed_chapters} / ${this.stats.total_chapters}`;
      if (elDisk)
        elDisk.textContent = this.stats.formatted_disk_size || "0 MB";
    } else {
      const totalCount = this.projects.length;
      let completedChs = 0;
      let totalChs = 0;
      let totalSecs = 0;
      this.projects.forEach((p) => {
        completedChs += p.completed_chapters ?? 0;
        totalChs += p.chapter_count ?? 0;
        totalSecs += p.total_duration ?? 0;
      });
      const hours = Math.floor(totalSecs / 3600);
      const mins = Math.floor(totalSecs % 3600 / 60);
      const durStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      if (elBooks)
        elBooks.textContent = `${totalCount}`;
      if (elDuration)
        elDuration.textContent = durStr;
      if (elChapters)
        elChapters.textContent = `${completedChs} / ${totalChs}`;
    }
  }
  setFilter(filter) {
    this.currentFilter = filter;
    document.querySelectorAll(".filter-pill").forEach((pill) => {
      if (pill.dataset.filter === filter) {
        pill.classList.add("active");
      } else {
        pill.classList.remove("active");
      }
    });
    this.applyFiltersAndRender();
  }
  setViewMode(mode) {
    this.viewMode = mode;
    const btnGrid = document.getElementById("btn-view-grid");
    const btnTable = document.getElementById("btn-view-table");
    if (btnGrid && btnTable) {
      if (mode === "grid") {
        btnGrid.classList.add("active");
        btnTable.classList.remove("active");
      } else {
        btnGrid.classList.remove("active");
        btnTable.classList.add("active");
      }
    }
    this.render();
  }
  applyFiltersAndRender() {
    this.filteredProjects = this.projects.filter((p) => {
      if (this.searchQuery) {
        const titleMatch = (p.title || "").toLowerCase().includes(this.searchQuery);
        const authorMatch = (p.author || "").toLowerCase().includes(this.searchQuery);
        const urlMatch = (p.source_url || "").toLowerCase().includes(this.searchQuery);
        if (!titleMatch && !authorMatch && !urlMatch)
          return false;
      }
      const totalCh = p.chapter_count ?? 0;
      const doneCh = p.completed_chapters ?? 0;
      const isDone = totalCh > 0 && doneCh === totalCh;
      const isSynth = p.status === "processing";
      switch (this.currentFilter) {
        case "ready":
          return isDone;
        case "synthesizing":
          return isSynth;
        case "pending":
          return !isDone && !isSynth;
        case "links":
          return p.source_type === "links";
        case "article":
          return p.source_type === "article";
        case "file":
          return ["epub", "pdf", "txt", "file"].includes(p.source_type);
        case "all":
        default:
          return true;
      }
    });
    this.filteredProjects.sort((a, b) => {
      switch (this.currentSort) {
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "title-desc":
          return b.title.localeCompare(a.title);
        case "author-asc":
          return a.author.localeCompare(b.author);
        case "duration-desc":
          return (b.total_duration ?? 0) - (a.total_duration ?? 0);
        case "chapters-desc":
          return (b.chapter_count ?? 0) - (a.chapter_count ?? 0);
        case "recent":
        default:
          return (b.created_at || "").localeCompare(a.created_at || "");
      }
    });
    this.updateFilterCounts();
    this.render();
  }
  updateFilterCounts() {
    const counts = {
      all: this.projects.length,
      ready: 0,
      synth: 0,
      draft: 0,
      novels: 0,
      articles: 0,
      books: 0
    };
    this.projects.forEach((p) => {
      const totalCh = p.chapter_count ?? 0;
      const doneCh = p.completed_chapters ?? 0;
      const isDone = totalCh > 0 && doneCh === totalCh;
      const isSynth = p.status === "processing";
      if (isDone)
        counts.ready++;
      if (isSynth)
        counts.synth++;
      if (!isDone && !isSynth)
        counts.draft++;
      if (p.source_type === "links")
        counts.novels++;
      else if (p.source_type === "article")
        counts.articles++;
      else if (["epub", "pdf", "txt", "file"].includes(p.source_type))
        counts.books++;
    });
    const setBadge = (id, val) => {
      const el = document.getElementById(id);
      if (el)
        el.textContent = `${val}`;
    };
    setBadge("count-all", counts.all);
    setBadge("count-ready", counts.ready);
    setBadge("count-synth", counts.synth);
    setBadge("count-draft", counts.draft);
    setBadge("count-novels", counts.novels);
    setBadge("count-articles", counts.articles);
    setBadge("count-books", counts.books);
  }
  render() {
    const grid = document.getElementById("bookshelf-grid");
    const ledger = document.getElementById("bookshelf-ledger");
    const batchBar = document.getElementById("library-batch-bar");
    if (batchBar) {
      if (this.selectedIds.size > 0) {
        batchBar.style.display = "flex";
        const countEl = document.getElementById("batch-selected-count");
        if (countEl)
          countEl.textContent = `${this.selectedIds.size} selected`;
        const btnMerge = document.getElementById("btn-batch-merge");
        if (btnMerge) {
          btnMerge.style.display = this.selectedIds.size >= 2 ? "inline-flex" : "none";
        }
      } else {
        batchBar.style.display = "none";
      }
    }
    if (this.viewMode === "grid") {
      if (grid)
        grid.style.display = "grid";
      if (ledger)
        ledger.style.display = "none";
      this.renderGrid();
    } else {
      if (grid)
        grid.style.display = "none";
      if (ledger)
        ledger.style.display = "block";
      this.renderLedger();
    }
  }
  getClothClass(project) {
    if (project.cover_image && project.cover_image.startsWith("color:")) {
      const col = project.cover_image.replace("color:", "");
      return `cloth-${col}`;
    }
    const colors = ["burgundy", "navy", "forest", "charcoal", "terracotta"];
    let hash = 0;
    for (let i = 0;i < project.title.length; i++) {
      hash = (hash << 5) - hash + project.title.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % colors.length;
    return `cloth-${colors[idx]}`;
  }
  renderGrid() {
    const grid = document.getElementById("bookshelf-grid");
    if (!grid)
      return;
    grid.innerHTML = "";
    if (this.filteredProjects.length === 0) {
      grid.innerHTML = `
        <div class="shelf-empty">
          <div class="empty-icon">${Icons.book(36)}</div>
          <h3>${this.projects.length === 0 ? "Your Library is Empty" : "No Works Match Filter"}</h3>
          <p>${this.projects.length === 0 ? "Begin by importing a web novel, an article, or an EPUB / PDF book." : "Try changing your search terms or filter selection."}</p>
          ${this.projects.length === 0 ? `
            <button class="btn-primary" onclick="window.__audiobooked.switchView('import')">
              ${Icons.plus(16)} Ingest First Book
            </button>` : `
            <button class="btn-secondary" onclick="window.__audiobooked.clearLibraryFilters()">
              ${Icons.refresh(14)} Reset All Filters
            </button>`}
        </div>
      `;
      return;
    }
    this.filteredProjects.forEach((project) => {
      const card = document.createElement("article");
      card.className = "book-card";
      card.onclick = () => {
        if (this.onOpenStudioCb)
          this.onOpenStudioCb(project.id);
      };
      const completedCount = project.completed_chapters ?? 0;
      const totalCount = project.chapter_count ?? 0;
      const totalSecs = project.total_duration ?? 0;
      const mins = Math.round(totalSecs / 60);
      const isAllDone = totalCount > 0 && completedCount === totalCount;
      const isProcessing = project.status === "processing";
      const pct = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;
      let badgeHtml = "";
      if (isAllDone) {
        badgeHtml = `<span class="book-badge badge-done">${Icons.check(12)} Complete</span>`;
      } else if (isProcessing) {
        badgeHtml = `<span class="book-badge badge-active">${Icons.refresh(12)} Synthesizing</span>`;
      } else {
        badgeHtml = `<span class="book-badge badge-draft">${completedCount}/${totalCount} Ch</span>`;
      }
      const clothClass = this.getClothClass(project);
      const hasCustomCover = project.cover_image && !project.cover_image.startsWith("color:");
      card.innerHTML = `
        <div class="book-jacket ${clothClass}">
          <div class="jacket-spine"></div>
          <div class="jacket-content">
            <div class="jacket-header">
              <span class="source-tag">${project.source_type.toUpperCase()}</span>
              ${badgeHtml}
            </div>

            <div class="book-body-preview">
              ${hasCustomCover ? `
                <img class="book-cover-thumb" src="/cover/${encodeURIComponent(project.cover_image)}" alt="Cover" loading="lazy">
              ` : ""}
              <div class="book-titles-col">
                <h3 class="book-title" title="${project.title}">${project.title}</h3>
                <p class="book-author">${project.author}</p>
              </div>
            </div>

            <div class="book-stats">
              <span>${totalCount} ${totalCount === 1 ? "Chapter" : "Chapters"}</span>
              ${mins > 0 ? `<span>• ${mins} min</span>` : ""}
              <span>• ${project.narrator_voice.replace("_", " ")}</span>
            </div>
          </div>

          <div class="jacket-progress-track">
            <div class="jacket-progress-fill ${isAllDone ? "done" : ""}" style="width: ${pct}%"></div>
          </div>
        </div>

        <div class="book-card-actions">
          ${completedCount > 0 ? `
            <button class="btn-card-action btn-card-primary" title="Listen to audiobook" onclick="event.stopPropagation(); window.__audiobooked.playProject('${project.id}')">
              ${Icons.play(13)} Listen
            </button>` : `
            <button class="btn-card-action btn-card-primary" title="Open Studio" onclick="event.stopPropagation(); window.__audiobooked.openStudio('${project.id}')">
              ${Icons.feather(13)} Studio
            </button>`}

          <button class="btn-card-action btn-card-icon-only" title="Merge with another work / volume..." onclick="event.stopPropagation(); window.__audiobooked.openMergeModal('${project.id}')">
            ${Icons.merge(14)}
          </button>

          <button class="btn-card-action btn-card-icon-only" title="Edit Metadata & Binding" onclick="event.stopPropagation(); window.__audiobooked.openEditModal('${project.id}')">
            ${Icons.edit(14)}
          </button>

          <button class="btn-card-action btn-card-icon-only" title="Open Output Folder in File Explorer" onclick="event.stopPropagation(); window.__audiobooked.openFolder('${project.id}')">
            ${Icons.folder(14)}
          </button>

          ${project.output_m4b ? `
            <a class="btn-card-action btn-card-icon-only" title="Download .M4B Container" href="/api/projects/${project.id}/m4b" download onclick="event.stopPropagation()">
              ${Icons.download(14)}
            </a>` : ""}

          <button class="btn-card-action btn-card-icon-only btn-card-danger" title="Remove from Library" onclick="event.stopPropagation(); window.__audiobooked.openDeleteModal('${project.id}')">
            ${Icons.trash(14)}
          </button>
        </div>
      `;
      grid.appendChild(card);
    });
  }
  renderLedger() {
    const ledger = document.getElementById("bookshelf-ledger");
    if (!ledger)
      return;
    if (this.filteredProjects.length === 0) {
      ledger.innerHTML = `
        <div class="shelf-empty">
          <div class="empty-icon">${Icons.book(36)}</div>
          <h3>${this.projects.length === 0 ? "Your Library is Empty" : "No Works Match Filter"}</h3>
          <p>${this.projects.length === 0 ? "Begin by importing a web novel, an article, or an EPUB / PDF book." : "Try changing your search terms or filter selection."}</p>
        </div>
      `;
      return;
    }
    const allSelected = this.filteredProjects.length > 0 && this.filteredProjects.every((p) => this.selectedIds.has(p.id));
    let rowsHtml = "";
    this.filteredProjects.forEach((project) => {
      const isSelected = this.selectedIds.has(project.id);
      const totalCh = project.chapter_count ?? 0;
      const doneCh = project.completed_chapters ?? 0;
      const pct = totalCh > 0 ? Math.round(doneCh / totalCh * 100) : 0;
      const isAllDone = totalCh > 0 && doneCh === totalCh;
      const totalSecs = project.total_duration ?? 0;
      const hours = Math.floor(totalSecs / 3600);
      const mins = Math.floor(totalSecs % 3600 / 60);
      const durStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      const clothClass = this.getClothClass(project);
      rowsHtml += `
        <tr class="ledger-row ${isSelected ? "selected" : ""}">
          <td class="ledger-col-check">
            <input type="checkbox" class="ledger-checkbox" data-id="${project.id}" ${isSelected ? "checked" : ""} onclick="event.stopPropagation(); window.__audiobooked.toggleProjectSelect('${project.id}')">
          </td>
          <td>
            <div class="ledger-work-cell">
              <div class="ledger-spine-swatch ${clothClass}"></div>
              <div>
                <div class="ledger-title" onclick="window.__audiobooked.openStudio('${project.id}')">${project.title}</div>
                <div class="ledger-author">${project.author}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="source-tag">${project.source_type.toUpperCase()}</span>
          </td>
          <td>
            <div style="font-size: 0.8rem; color: var(--text-ink);">${project.narrator_voice.replace("_", " ")}</div>
            <div style="font-size: 0.72rem; color: var(--text-faint);">${project.speed}× pace</div>
          </td>
          <td class="ledger-progress-cell">
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
              <span>${doneCh} / ${totalCh} ch</span>
              <span>${pct}%</span>
            </div>
            <div class="ledger-progress-bar">
              <div class="ledger-progress-fill ${isAllDone ? "done" : ""}" style="width: ${pct}%"></div>
            </div>
          </td>
          <td>
            <span style="font-family: var(--font-mono); font-size: 0.8rem;">${durStr}</span>
          </td>
          <td>
            <div class="ledger-actions">
              ${doneCh > 0 ? `
                <button class="btn-card-action btn-card-primary" title="Listen" onclick="event.stopPropagation(); window.__audiobooked.playProject('${project.id}')">
                  ${Icons.play(13)}
                </button>` : ""}
              <button class="btn-card-action" title="Open Studio" onclick="event.stopPropagation(); window.__audiobooked.openStudio('${project.id}')">
                ${Icons.feather(13)}
              </button>
              <button class="btn-card-action" title="Merge with another work..." onclick="event.stopPropagation(); window.__audiobooked.openMergeModal('${project.id}')">
                ${Icons.merge(13)}
              </button>
              <button class="btn-card-action" title="Edit Metadata" onclick="event.stopPropagation(); window.__audiobooked.openEditModal('${project.id}')">
                ${Icons.edit(13)}
              </button>
              <button class="btn-card-action" title="Open Folder" onclick="event.stopPropagation(); window.__audiobooked.openFolder('${project.id}')">
                ${Icons.folder(13)}
              </button>
              ${project.output_m4b ? `
                <a class="btn-card-action" title="Download M4B" href="/api/projects/${project.id}/m4b" download onclick="event.stopPropagation()">
                  ${Icons.download(13)}
                </a>` : ""}
              <button class="btn-card-action btn-card-danger" title="Delete" onclick="event.stopPropagation(); window.__audiobooked.openDeleteModal('${project.id}')">
                ${Icons.trash(13)}
              </button>
            </div>
          </td>
        </tr>
      `;
    });
    ledger.innerHTML = `
      <table class="ledger-table">
        <thead>
          <tr>
            <th class="ledger-col-check">
              <input type="checkbox" id="ledger-check-all" ${allSelected ? "checked" : ""} onclick="window.__audiobooked.toggleSelectAll()">
            </th>
            <th>Work & Author</th>
            <th>Format</th>
            <th>Voice Cast</th>
            <th>Chapter Progress</th>
            <th>Duration</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }
  toggleProjectSelect(id) {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.render();
  }
  toggleSelectAll() {
    const allSelected = this.filteredProjects.length > 0 && this.filteredProjects.every((p) => this.selectedIds.has(p.id));
    if (allSelected) {
      this.selectedIds.clear();
    } else {
      this.filteredProjects.forEach((p) => this.selectedIds.add(p.id));
    }
    this.render();
  }
  clearSelection() {
    this.selectedIds.clear();
    this.render();
  }
  openEditModal(projectId) {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project)
      return;
    this.editingProjectId = projectId;
    this.selectedCoverFile = null;
    const idInput = document.getElementById("edit-book-id");
    const titleInput = document.getElementById("edit-book-title");
    const authorInput = document.getElementById("edit-book-author");
    const speedInput = document.getElementById("edit-speed-input");
    const speedVal = document.getElementById("edit-speed-val");
    const thoughtSpeedInput = document.getElementById("edit-thought-speed-input");
    const thoughtSpeedVal = document.getElementById("edit-thought-speed-val");
    const coverName = document.getElementById("edit-cover-filename");
    if (idInput)
      idInput.value = project.id;
    if (titleInput)
      titleInput.value = project.title;
    if (authorInput)
      authorInput.value = project.author;
    if (speedInput)
      speedInput.value = `${project.speed || 1}`;
    if (speedVal)
      speedVal.textContent = `${(project.speed || 1).toFixed(2)}×`;
    if (thoughtSpeedInput)
      thoughtSpeedInput.value = `${project.thought_speed || 0.9}`;
    if (thoughtSpeedVal)
      thoughtSpeedVal.textContent = `${(project.thought_speed || 0.9).toFixed(2)}×`;
    if (coverName) {
      if (project.cover_image && !project.cover_image.startsWith("color:")) {
        coverName.textContent = `Custom artwork: ${project.cover_image}`;
      } else {
        coverName.textContent = "Using cloth preset (upload to replace)";
      }
    }
    this.populateEditVoiceDropdowns(project);
    let currentCloth = "burgundy";
    if (project.cover_image && project.cover_image.startsWith("color:")) {
      currentCloth = project.cover_image.replace("color:", "");
    }
    this.selectedClothColor = currentCloth;
    document.querySelectorAll(".colorway-btn").forEach((b) => {
      if (b.dataset.cloth === currentCloth) {
        b.classList.add("active");
      } else {
        b.classList.remove("active");
      }
    });
    const modal = document.getElementById("modal-edit-book");
    if (modal)
      modal.style.display = "flex";
  }
  populateEditVoiceDropdowns(project) {
    if (!this.voicesData)
      return;
    const populate = (id, selected) => {
      const sel = document.getElementById(id);
      if (!sel)
        return;
      sel.innerHTML = "";
      this.voicesData.voices.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v.replace("_", " ");
        if (v === selected)
          opt.selected = true;
        sel.appendChild(opt);
      });
    };
    populate("edit-narrator-voice", project.narrator_voice);
    populate("edit-dialogue-voice", project.dialogue_voice);
    populate("edit-thought-voice", project.thought_voice);
  }
  closeEditModal() {
    const modal = document.getElementById("modal-edit-book");
    if (modal)
      modal.style.display = "none";
    this.editingProjectId = null;
    this.selectedCoverFile = null;
  }
  async saveEditModal() {
    if (!this.editingProjectId)
      return;
    const titleInput = document.getElementById("edit-book-title");
    const authorInput = document.getElementById("edit-book-author");
    const narratorSel = document.getElementById("edit-narrator-voice");
    const dialogueSel = document.getElementById("edit-dialogue-voice");
    const thoughtSel = document.getElementById("edit-thought-voice");
    const speedInput = document.getElementById("edit-speed-input");
    const thoughtSpeedInput = document.getElementById("edit-thought-speed-input");
    const updates = {
      title: titleInput ? titleInput.value.trim() : undefined,
      author: authorInput ? authorInput.value.trim() : undefined,
      narrator_voice: narratorSel ? narratorSel.value : undefined,
      dialogue_voice: dialogueSel ? dialogueSel.value : undefined,
      thought_voice: thoughtSel ? thoughtSel.value : undefined,
      speed: speedInput ? parseFloat(speedInput.value) : undefined,
      thought_speed: thoughtSpeedInput ? parseFloat(thoughtSpeedInput.value) : undefined
    };
    if (!this.selectedCoverFile && this.selectedClothColor) {
      updates.cover_image = `color:${this.selectedClothColor}`;
    }
    try {
      if (this.selectedCoverFile) {
        await ApiClient.uploadCover(this.editingProjectId, this.selectedCoverFile);
      }
      await ApiClient.updateProject(this.editingProjectId, updates);
      this.closeEditModal();
      await this.load();
    } catch (err) {
      alert("Failed to save changes: " + err.message);
    }
  }
  openDeleteModal(projectId) {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project)
      return;
    this.deletingProjectId = projectId;
    const titleEl = document.getElementById("delete-book-title");
    if (titleEl)
      titleEl.textContent = `"${project.title}"`;
    const modal = document.getElementById("modal-delete-book");
    if (modal)
      modal.style.display = "flex";
  }
  closeDeleteModal() {
    const modal = document.getElementById("modal-delete-book");
    if (modal)
      modal.style.display = "none";
    this.deletingProjectId = null;
  }
  async confirmDelete() {
    if (!this.deletingProjectId)
      return;
    const chk = document.getElementById("delete-remove-files");
    const deleteFiles = chk ? chk.checked : true;
    try {
      await ApiClient.deleteProject(this.deletingProjectId, deleteFiles);
      this.selectedIds.delete(this.deletingProjectId);
      this.closeDeleteModal();
      await this.load();
    } catch (err) {
      alert("Failed to delete work: " + err.message);
    }
  }
  async performBatchDelete() {
    if (this.selectedIds.size === 0)
      return;
    const count = this.selectedIds.size;
    if (!confirm(`Are you sure you want to delete ${count} selected work(s) from your library?`)) {
      return;
    }
    try {
      await ApiClient.batchDeleteProjects(Array.from(this.selectedIds), true);
      this.selectedIds.clear();
      await this.load();
    } catch (err) {
      alert("Batch delete failed: " + err.message);
    }
  }
  async performBatchExport() {
    if (this.selectedIds.size === 0)
      return;
    const ids = Array.from(this.selectedIds);
    let success = 0;
    for (const id of ids) {
      try {
        await ApiClient.exportM4b(id);
        success++;
      } catch (err) {
        console.warn(`Could not export project ${id}:`, err);
      }
    }
    alert(`Export complete: ${success} of ${ids.length} M4B containers packaged.`);
    await this.load();
  }
  async performBatchSynthesize() {
    if (this.selectedIds.size === 0)
      return;
    const ids = Array.from(this.selectedIds);
    for (const id of ids) {
      try {
        await ApiClient.generate(id);
      } catch (err) {
        console.warn(`Could not start synthesis for ${id}:`, err);
      }
    }
    alert(`Synthesis initiated for ${ids.length} work(s).`);
    await this.load();
  }
  initMergeModal() {
    const modal = document.getElementById("modal-merge-books");
    const btnClose = document.getElementById("btn-close-merge-modal");
    const btnCancel = document.getElementById("btn-cancel-merge");
    const form = document.getElementById("form-merge-books");
    const addSelect = document.getElementById("merge-add-project-select");
    const targetSelect = document.getElementById("merge-target-select");
    const closeFn = () => this.closeMergeModal();
    if (btnClose)
      btnClose.onclick = closeFn;
    if (btnCancel)
      btnCancel.onclick = closeFn;
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal)
          closeFn();
      };
    }
    if (addSelect) {
      addSelect.addEventListener("change", () => {
        const id = addSelect.value;
        if (id) {
          this.mergeCandidateIds.add(id);
          this.updateMergeModalUI();
        }
      });
    }
    if (targetSelect) {
      targetSelect.addEventListener("change", () => {
        const targetId = targetSelect.value;
        const targetProj = this.projects.find((p) => p.id === targetId);
        if (targetProj) {
          const titleInput = document.getElementById("merge-new-title");
          const authorInput = document.getElementById("merge-new-author");
          if (titleInput && !titleInput.value)
            titleInput.value = targetProj.title;
          if (authorInput && !authorInput.value)
            authorInput.value = targetProj.author;
        }
      });
    }
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        await this.submitMerge();
      };
    }
  }
  openMergeModal(initialIds) {
    this.mergeCandidateIds.clear();
    const ids = Array.isArray(initialIds) ? initialIds : [initialIds];
    ids.forEach((id) => this.mergeCandidateIds.add(id));
    if (this.mergeCandidateIds.size === 1) {
      const firstId = ids[0];
      const firstProj = this.projects.find((p) => p.id === firstId);
      if (firstProj) {
        const matches = this.projects.filter((p) => p.id !== firstId && p.title.toLowerCase().trim() === firstProj.title.toLowerCase().trim());
        matches.forEach((m) => this.mergeCandidateIds.add(m.id));
      }
    }
    this.updateMergeModalUI();
    const modal = document.getElementById("modal-merge-books");
    if (modal)
      modal.style.display = "flex";
  }
  closeMergeModal() {
    const modal = document.getElementById("modal-merge-books");
    if (modal)
      modal.style.display = "none";
    this.mergeCandidateIds.clear();
  }
  updateMergeModalUI() {
    const listEl = document.getElementById("merge-works-list");
    const addSelect = document.getElementById("merge-add-project-select");
    const targetSelect = document.getElementById("merge-target-select");
    const titleInput = document.getElementById("merge-new-title");
    const authorInput = document.getElementById("merge-new-author");
    const candidateProjects = this.projects.filter((p) => this.mergeCandidateIds.has(p.id));
    if (listEl) {
      if (candidateProjects.length === 0) {
        listEl.innerHTML = `<div class="shelf-empty" style="padding: 1rem;">Please select at least 2 works to merge.</div>`;
      } else {
        listEl.innerHTML = candidateProjects.map((p) => {
          const cloth = this.getClothClass(p);
          const totalCh = p.chapter_count ?? 0;
          const doneCh = p.completed_chapters ?? 0;
          return `
              <div class="merge-work-item">
                <div class="merge-work-left">
                  <div class="merge-work-spine ${cloth}"></div>
                  <div>
                    <div class="merge-work-title">${p.title}</div>
                    <div class="merge-work-meta">${p.author} • ${p.source_type.toUpperCase()}</div>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.65rem;">
                  <span class="merge-work-badge">${doneCh}/${totalCh} Ch</span>
                  <button type="button" class="btn-remove-merge" title="Remove from merge list" onclick="window.__audiobooked.removeMergeCandidate('${p.id}')">
                    ${Icons.x(14)}
                  </button>
                </div>
              </div>
            `;
        }).join("");
      }
    }
    if (addSelect) {
      addSelect.innerHTML = '<option value="">-- Choose work to add to merge list --</option>';
      const available = this.projects.filter((p) => !this.mergeCandidateIds.has(p.id));
      available.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = `${p.title} (${p.chapter_count ?? 0} ch, ${p.author})`;
        addSelect.appendChild(opt);
      });
      addSelect.value = "";
    }
    if (targetSelect) {
      const prevTarget = targetSelect.value;
      targetSelect.innerHTML = "";
      candidateProjects.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = `${p.title} (${p.chapter_count ?? 0} ch) — Master`;
        targetSelect.appendChild(opt);
      });
      if (prevTarget && this.mergeCandidateIds.has(prevTarget)) {
        targetSelect.value = prevTarget;
      } else if (candidateProjects.length > 0) {
        const best = [...candidateProjects].sort((a, b) => (b.chapter_count ?? 0) - (a.chapter_count ?? 0))[0];
        targetSelect.value = best.id;
      }
    }
    if (candidateProjects.length > 0) {
      const primary = this.projects.find((p) => p.id === targetSelect.value) || candidateProjects[0];
      if (titleInput && (!titleInput.value || !this.editingProjectId)) {
        titleInput.value = primary.title;
      }
      if (authorInput && (!authorInput.value || !this.editingProjectId)) {
        authorInput.value = primary.author;
      }
    }
  }
  removeMergeCandidate(id) {
    this.mergeCandidateIds.delete(id);
    this.updateMergeModalUI();
  }
  async submitMerge() {
    if (this.mergeCandidateIds.size < 2) {
      alert("Please select at least 2 works to merge.");
      return;
    }
    const targetSelect = document.getElementById("merge-target-select");
    const titleInput = document.getElementById("merge-new-title");
    const authorInput = document.getElementById("merge-new-author");
    const strategyRadios = document.getElementsByName("merge-strategy");
    const chkDeduplicate = document.getElementById("merge-deduplicate");
    const chkCleanup = document.getElementById("merge-cleanup-sources");
    const submitBtn = document.getElementById("btn-submit-merge");
    const targetId = targetSelect.value;
    if (!targetId) {
      alert("Please select a primary destination book.");
      return;
    }
    let strategy = "smart_sort";
    strategyRadios.forEach((r) => {
      if (r.checked)
        strategy = r.value;
    });
    const sources = Array.from(this.mergeCandidateIds).filter((id) => id !== targetId);
    if (sources.length === 0) {
      alert("Please select at least one other work to merge into the primary book.");
      return;
    }
    const origBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.textContent = "Consolidating Volumes...";
    try {
      const res = await ApiClient.mergeProjects({
        target_project_id: targetId,
        source_project_ids: sources,
        new_title: titleInput ? titleInput.value.trim() : undefined,
        new_author: authorInput ? authorInput.value.trim() : undefined,
        strategy,
        deduplicate: chkDeduplicate ? chkDeduplicate.checked : true,
        delete_sources: chkCleanup ? chkCleanup.checked : true
      });
      this.closeMergeModal();
      this.selectedIds.clear();
      await this.load();
      alert(`Merge Complete!

Consolidated into: "${res.title}"
Total Chapters: ${res.total_chapters}
Completed Audio: ${res.completed_chapters}
Duplicates Removed: ${res.deduplicated_count}`);
    } catch (err) {
      alert("Failed to merge works: " + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origBtnText;
    }
  }
}

// src/voices.ts
class VoiceGalleryManager {
  voicesData = null;
  audio;
  currentPlayingId = null;
  isPlaying = false;
  currentFilter = "all";
  currentRoleFilter = "all";
  searchQuery = "";
  customText = "";
  customSpeed = 1;
  onSelectRoleCallback;
  onOpenBlenderCallback;
  onDeleteCustomVoiceCallback;
  constructor() {
    this.audio = new Audio;
    this.initAudioListeners();
    this.initControls();
  }
  setRoleSelectCallback(cb) {
    this.onSelectRoleCallback = cb;
  }
  setOpenBlenderCallback(cb) {
    this.onOpenBlenderCallback = cb;
  }
  setDeleteCustomVoiceCallback(cb) {
    this.onDeleteCustomVoiceCallback = cb;
  }
  setVoices(data) {
    this.voicesData = data;
    this.render();
  }
  initAudioListeners() {
    this.audio.addEventListener("play", () => {
      this.isPlaying = true;
      this.updatePlayingUI();
    });
    this.audio.addEventListener("pause", () => {
      this.isPlaying = false;
      this.updatePlayingUI();
    });
    this.audio.addEventListener("ended", () => {
      this.isPlaying = false;
      this.currentPlayingId = null;
      this.updatePlayingUI();
    });
    this.audio.addEventListener("error", (e) => {
      console.error("Audition playback failed:", e);
      this.isPlaying = false;
      this.currentPlayingId = null;
      this.updatePlayingUI();
      this.showToast("Could not play voice preview. Check engine status.");
    });
  }
  initControls() {
    const btnOpenBlender = document.getElementById("btn-open-voice-blender");
    if (btnOpenBlender) {
      btnOpenBlender.onclick = () => {
        if (this.onOpenBlenderCallback) {
          this.onOpenBlenderCallback();
        }
      };
    }
    const searchInput = document.getElementById("voices-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        this.searchQuery = searchInput.value.trim().toLowerCase();
        this.render();
      });
    }
    const pillContainer = document.getElementById("voices-filter-pills");
    if (pillContainer) {
      pillContainer.addEventListener("click", (e) => {
        const target = e.target.closest(".filter-pill");
        if (!target)
          return;
        const filter = target.dataset.filter || "all";
        this.currentFilter = filter;
        pillContainer.querySelectorAll(".filter-pill").forEach((p) => p.classList.remove("active"));
        target.classList.add("active");
        this.render();
      });
    }
    const roleContainer = document.getElementById("voices-role-pills");
    if (roleContainer) {
      roleContainer.addEventListener("click", (e) => {
        const target = e.target.closest(".filter-pill");
        if (!target)
          return;
        const role = target.dataset.role || "all";
        this.currentRoleFilter = role;
        roleContainer.querySelectorAll(".filter-pill").forEach((p) => p.classList.remove("active"));
        target.classList.add("active");
        this.render();
      });
    }
    const testerInput = document.getElementById("voices-tester-text");
    if (testerInput) {
      testerInput.addEventListener("input", () => {
        this.customText = testerInput.value.trim();
      });
    }
    const speedSlider = document.getElementById("voices-tester-speed");
    const speedValue = document.getElementById("voices-tester-speed-val");
    if (speedSlider) {
      speedSlider.addEventListener("input", () => {
        this.customSpeed = parseFloat(speedSlider.value);
        if (speedValue)
          speedValue.textContent = `${this.customSpeed.toFixed(2)}×`;
      });
    }
    const presetBtns = document.querySelectorAll(".tester-preset-btn");
    presetBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const phrase = btn.dataset.phrase || "";
        if (testerInput && phrase) {
          testerInput.value = phrase;
          this.customText = phrase;
        }
      });
    });
    const btnStop = document.getElementById("btn-stop-audition");
    if (btnStop) {
      btnStop.onclick = () => this.stopAudition();
    }
  }
  async playAudition(voiceId, customPhrase) {
    if (this.currentPlayingId === voiceId && this.isPlaying) {
      this.audio.pause();
      return;
    }
    this.currentPlayingId = voiceId;
    this.updatePlayingUI();
    const textToSynthesize = customPhrase || this.customText;
    let url = `/api/voices/${encodeURIComponent(voiceId)}/audition`;
    if (textToSynthesize) {
      url += `?text=${encodeURIComponent(textToSynthesize)}&speed=${this.customSpeed}`;
    }
    try {
      this.audio.src = url;
      await this.audio.play();
    } catch (err) {
      console.warn("Playback request error:", err);
      this.isPlaying = false;
      this.currentPlayingId = null;
      this.updatePlayingUI();
    }
  }
  stopAudition() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying = false;
    this.currentPlayingId = null;
    this.updatePlayingUI();
  }
  updatePlayingUI() {
    document.querySelectorAll(".voice-card").forEach((card) => {
      const vId = card.dataset.voiceId;
      const isCardActive = vId === this.currentPlayingId && this.isPlaying;
      card.classList.toggle("playing", isCardActive);
      const playBtn = card.querySelector(".btn-voice-audition");
      if (playBtn) {
        if (isCardActive) {
          playBtn.innerHTML = `${Icons.pause(16)} <span>Pause</span>`;
          playBtn.classList.add("btn-playing");
        } else {
          playBtn.innerHTML = `${Icons.play(16)} <span>Audition</span>`;
          playBtn.classList.remove("btn-playing");
        }
      }
    });
    const stopBtn = document.getElementById("btn-stop-audition");
    if (stopBtn) {
      stopBtn.style.display = this.isPlaying ? "inline-flex" : "none";
    }
  }
  render() {
    const grid = document.getElementById("voice-cards-grid");
    if (!grid)
      return;
    if (!this.voicesData || !this.voicesData.voices) {
      grid.innerHTML = `<div class="voices-loading">Loading Kokoro neural voice catalog...</div>`;
      return;
    }
    const details = this.voicesData.details || {};
    const recommended = this.voicesData.recommended || { narrator: [], dialogue: [], thought: [] };
    const allRecSet = new Set([...recommended.narrator, ...recommended.dialogue, ...recommended.thought]);
    const filtered = this.voicesData.voices.filter((vId) => {
      const info = details[vId] || this.fallbackInfo(vId);
      if (this.currentFilter === "custom" && !info.is_custom && !vId.startsWith("cv_"))
        return false;
      if (this.currentFilter === "rec" && !allRecSet.has(vId))
        return false;
      if (this.currentFilter === "us" && info.accent !== "American")
        return false;
      if (this.currentFilter === "uk" && info.accent !== "British")
        return false;
      if (this.currentFilter === "female" && info.gender !== "female")
        return false;
      if (this.currentFilter === "male" && info.gender !== "male")
        return false;
      if (this.currentFilter === "intl" && (info.accent === "American" || info.accent === "British" || info.accent === "Hybrid"))
        return false;
      if (this.currentRoleFilter !== "all") {
        const isRecForRole = recommended[this.currentRoleFilter]?.includes(vId);
        const matchesRole = info.role === this.currentRoleFilter || isRecForRole;
        if (!matchesRole)
          return false;
      }
      if (this.searchQuery) {
        const haystack = `${info.name} ${info.id} ${info.accent} ${info.gender} ${info.description} ${info.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(this.searchQuery))
          return false;
      }
      return true;
    });
    this.updateFilterCounts();
    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="voices-empty-state">
          <h3>No Voices Match Filter</h3>
          <p>Try resetting the search terms or choosing another accent category.</p>
          <button class="btn-secondary" onclick="window.__audiobooked.resetVoiceFilters()">
            ${Icons.refresh(14)} Reset Filters
          </button>
        </div>
      `;
      return;
    }
    grid.innerHTML = "";
    filtered.forEach((vId) => {
      const info = details[vId] || this.fallbackInfo(vId);
      const isCustom = info.is_custom || vId.startsWith("cv_");
      const isNarratorRec = recommended.narrator?.includes(vId);
      const isDialogueRec = recommended.dialogue?.includes(vId);
      const isThoughtRec = recommended.thought?.includes(vId);
      const card = document.createElement("article");
      card.className = `voice-card ${isCustom ? "is-custom" : ""} ${this.currentPlayingId === vId && this.isPlaying ? "playing" : ""}`;
      card.dataset.voiceId = vId;
      let rolePill = "";
      if (isCustom) {
        rolePill = `<span class="voice-badge badge-custom">✨ Neural Blend</span>`;
      } else if (isNarratorRec) {
        rolePill = `<span class="voice-badge badge-narrator">Recommended Narrator</span>`;
      } else if (isDialogueRec) {
        rolePill = `<span class="voice-badge badge-dialogue">Recommended Dialogue</span>`;
      } else if (isThoughtRec) {
        rolePill = `<span class="voice-badge badge-thought">Recommended Thought</span>`;
      }
      let deleteBtn = "";
      if (isCustom) {
        deleteBtn = `
          <button class="btn-delete-custom-voice" title="Delete custom blend" onclick="event.stopPropagation(); window.__audiobooked.deleteCustomVoice('${vId}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        `;
      }
      const initial = info.name.charAt(0).toUpperCase();
      card.innerHTML = `
        <header class="voice-card-header">
          <div class="voice-avatar ${info.gender}">
            <span>${initial}</span>
          </div>
          <div class="voice-title-group" style="flex:1;">
            <div class="voice-name-row" style="display:flex;justify-content:space-between;align-items:center;">
              <div style="display:flex;align-items:center;gap:0.4rem;">
                <h3 class="voice-display-name">${info.name}</h3>
                <code class="voice-code">${info.id}</code>
              </div>
              ${deleteBtn}
            </div>
            <div class="voice-meta-pills">
              <span class="meta-pill accent-pill">${info.accent}</span>
              <span class="meta-pill gender-pill">${info.gender === "female" ? "Female" : info.gender === "male" ? "Male" : "Blend"}</span>
              ${rolePill}
            </div>
          </div>
        </header>

        <p class="voice-desc">${info.description}</p>

        <div class="voice-quote-box" title="Click to audition with this excerpt" onclick="window.__audiobooked.auditionVoice('${vId}')">
          <div class="quote-header">
            <span class="quote-label">Sample Excerpt</span>
            <div class="soundwave-bars" aria-hidden="true">
              <span></span><span></span><span></span><span></span>
            </div>
          </div>
          <p class="quote-text">${info.sample_quote}</p>
        </div>

        <div class="voice-tag-chips">
          ${info.tags.map((t) => `<span class="tag-chip">${t}</span>`).join("")}
        </div>

        <footer class="voice-card-footer">
          <button class="btn-voice-audition ${this.currentPlayingId === vId && this.isPlaying ? "btn-playing" : ""}" onclick="window.__audiobooked.auditionVoice('${vId}')">
            ${this.currentPlayingId === vId && this.isPlaying ? Icons.pause(16) : Icons.play(16)}
            <span>${this.currentPlayingId === vId && this.isPlaying ? "Pause" : "Audition"}</span>
          </button>

          <div class="voice-assign-group">
            <button class="btn-voice-assign" title="Use as Narrator Voice" onclick="window.__audiobooked.assignVoiceRole('narrator', '${vId}')">
              Narrator
            </button>
            <button class="btn-voice-assign" title="Use as Dialogue Voice" onclick="window.__audiobooked.assignVoiceRole('dialogue', '${vId}')">
              Dialogue
            </button>
            <button class="btn-voice-assign" title="Use as Monologue Voice" onclick="window.__audiobooked.assignVoiceRole('thought', '${vId}')">
              Thought
            </button>
          </div>
        </footer>
      `;
      grid.appendChild(card);
    });
  }
  updateFilterCounts() {
    if (!this.voicesData || !this.voicesData.voices)
      return;
    const details = this.voicesData.details || {};
    const voices = this.voicesData.voices;
    const counts = {
      all: voices.length,
      custom: 0,
      rec: 0,
      us: 0,
      uk: 0,
      female: 0,
      male: 0,
      intl: 0
    };
    const recSet = new Set([
      ...this.voicesData.recommended?.narrator || [],
      ...this.voicesData.recommended?.dialogue || [],
      ...this.voicesData.recommended?.thought || []
    ]);
    counts.rec = recSet.size;
    voices.forEach((vId) => {
      const info = details[vId] || this.fallbackInfo(vId);
      if (info.is_custom || vId.startsWith("cv_")) {
        counts.custom++;
      }
      if (info.accent === "American")
        counts.us++;
      else if (info.accent === "British")
        counts.uk++;
      else if (info.accent !== "Hybrid")
        counts.intl++;
      if (info.gender === "female")
        counts.female++;
      else if (info.gender === "male")
        counts.male++;
    });
    const pillCustom = document.getElementById("pill-custom-count");
    if (pillCustom)
      pillCustom.textContent = `${counts.custom}`;
    document.querySelectorAll("#voices-filter-pills .filter-pill").forEach((pill) => {
      const f = pill.dataset.filter;
      if (f && counts[f] !== undefined) {
        const badge = pill.querySelector(".pill-count");
        if (badge)
          badge.textContent = `${counts[f]}`;
      }
    });
  }
  fallbackInfo(voiceId) {
    const isFemale = voiceId.includes("f_");
    const isUs = voiceId.startsWith("a");
    const isUk = voiceId.startsWith("b");
    const accent = isUs ? "American" : isUk ? "British" : "International";
    const name = voiceId.replace(/^[a-z]{2}_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      id: voiceId,
      name,
      gender: isFemale ? "female" : "male",
      accent,
      language: "en",
      role: "character",
      tags: [accent, isFemale ? "Female" : "Male"],
      description: `Neural voice for literary voicing and dialogue.`,
      sample_quote: `This is a synthesized preview of the ${name} voice.`
    };
  }
  resetFilters() {
    this.currentFilter = "all";
    this.currentRoleFilter = "all";
    this.searchQuery = "";
    const searchInput = document.getElementById("voices-search-input");
    if (searchInput)
      searchInput.value = "";
    document.querySelectorAll("#voices-filter-pills .filter-pill").forEach((p, idx) => {
      p.classList.toggle("active", idx === 0);
    });
    document.querySelectorAll("#voices-role-pills .filter-pill").forEach((p, idx) => {
      p.classList.toggle("active", idx === 0);
    });
    this.render();
  }
  assignRole(role, voiceId) {
    if (this.onSelectRoleCallback) {
      this.onSelectRoleCallback(role, voiceId);
    }
    const roleLabels = {
      narrator: "Narrator (Prose)",
      dialogue: "Dialogue (Quotation)",
      thought: "Internal Monologue (Thoughts)"
    };
    this.showToast(`Set ${voiceId} as default ${roleLabels[role]}`);
  }
  showToast(msg) {
    const toast = document.createElement("div");
    toast.className = "voices-toast";
    toast.innerHTML = `${Icons.check(16)} <span>${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("show");
    }, 10);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }
}

// src/voice_blender.ts
class VoiceBlenderManager {
  modal = null;
  audio;
  isAuditioning = false;
  currentPreviewUrl = null;
  voicesData = null;
  onVoiceSavedCallback;
  constructor(onVoiceSaved) {
    this.onVoiceSavedCallback = onVoiceSaved;
    this.audio = new Audio;
    this.initAudioListeners();
    this.initElements();
  }
  setVoicesData(data) {
    this.voicesData = data;
    this.populateSelects();
  }
  initAudioListeners() {
    this.audio.addEventListener("ended", () => {
      this.isAuditioning = false;
      this.updateAuditionButton(false);
    });
    this.audio.addEventListener("error", () => {
      this.isAuditioning = false;
      this.updateAuditionButton(false);
      this.showStatus("Audio preview playback error", true);
    });
  }
  initElements() {
    this.modal = document.getElementById("modal-voice-blender");
    if (!this.modal)
      return;
    const btnClose = document.getElementById("btn-close-vb-modal");
    if (btnClose)
      btnClose.onclick = () => this.close();
    const btnCancel = document.getElementById("btn-vb-cancel");
    if (btnCancel)
      btnCancel.onclick = () => this.close();
    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal)
        this.close();
    });
    const slider = document.getElementById("vb-blend-slider");
    if (slider) {
      slider.addEventListener("input", () => {
        const ratio = parseFloat(slider.value);
        this.updateSliderUI(ratio);
      });
    }
    document.querySelectorAll(".vb-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const ratio = parseFloat(chip.dataset.ratio || "0.30");
        if (slider) {
          slider.value = ratio.toString();
          this.updateSliderUI(ratio);
        }
        document.querySelectorAll(".vb-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
      });
    });
    const speedSlider = document.getElementById("vb-speed-slider");
    const speedVal = document.getElementById("vb-speed-val");
    if (speedSlider) {
      speedSlider.addEventListener("input", () => {
        if (speedVal)
          speedVal.textContent = `${parseFloat(speedSlider.value).toFixed(2)}×`;
      });
    }
    document.querySelectorAll(".vb-phrase-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const phrase = btn.dataset.phrase;
        const phraseInput = document.getElementById("vb-test-phrase");
        if (phrase && phraseInput)
          phraseInput.value = phrase;
      });
    });
    const btnAudition = document.getElementById("btn-vb-audition");
    if (btnAudition) {
      btnAudition.onclick = () => this.audition();
    }
    const btnSave = document.getElementById("btn-vb-save");
    if (btnSave) {
      btnSave.onclick = () => this.save();
    }
    const baseSel = document.getElementById("vb-base-voice");
    const blendSel = document.getElementById("vb-blend-voice");
    if (baseSel)
      baseSel.addEventListener("change", () => this.updateSliderFromCurrent());
    if (blendSel)
      blendSel.addEventListener("change", () => this.updateSliderFromCurrent());
  }
  open() {
    if (!this.modal)
      return;
    this.populateSelects();
    const baseSel = document.getElementById("vb-base-voice");
    const blendSel = document.getElementById("vb-blend-voice");
    if (baseSel && Array.from(baseSel.options).some((o) => o.value === "jf_alpha")) {
      baseSel.value = "jf_alpha";
    }
    if (blendSel && Array.from(blendSel.options).some((o) => o.value === "af_bella")) {
      blendSel.value = "af_bella";
    }
    const nameInput = document.getElementById("vb-voice-name");
    if (nameInput)
      nameInput.value = "Charlotte (Sweet Anime)";
    const descInput = document.getElementById("vb-voice-desc");
    if (descInput)
      descInput.value = "Sweet anime heroine timbre with natural English prosody";
    const slider = document.getElementById("vb-blend-slider");
    if (slider)
      slider.value = "0.30";
    this.updateSliderUI(0.3);
    const errBanner = document.getElementById("vb-error-banner");
    if (errBanner)
      errBanner.style.display = "none";
    this.modal.style.display = "flex";
  }
  close() {
    if (this.modal)
      this.modal.style.display = "none";
    this.stopAudio();
  }
  stopAudio() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isAuditioning = false;
    this.updateAuditionButton(false);
  }
  populateSelects() {
    if (!this.voicesData || !this.voicesData.voices)
      return;
    const baseSel = document.getElementById("vb-base-voice");
    const blendSel = document.getElementById("vb-blend-voice");
    if (!baseSel || !blendSel)
      return;
    const details = this.voicesData.details || {};
    const baseList = this.voicesData.voices.filter((v) => !v.startsWith("cv_"));
    const renderOpts = (sel, selectedVal) => {
      const currentVal = sel.value || selectedVal;
      sel.innerHTML = "";
      const jpGroup = document.createElement("optgroup");
      jpGroup.label = "\uD83C\uDF38 Japanese Anime Voices (Cross-Lingual)";
      const usGroup = document.createElement("optgroup");
      usGroup.label = "\uD83C\uDDFA\uD83C\uDDF8 American English (Natural Prosody)";
      const ukGroup = document.createElement("optgroup");
      ukGroup.label = "\uD83C\uDDEC\uD83C\uDDE7 British English";
      const intlGroup = document.createElement("optgroup");
      intlGroup.label = "\uD83C\uDF0D International Voices";
      baseList.forEach((vId) => {
        const info = details[vId];
        const opt = document.createElement("option");
        opt.value = vId;
        const displayName = info ? `${info.name} (${vId})` : vId;
        opt.textContent = displayName;
        if (vId.startsWith("j")) {
          jpGroup.appendChild(opt);
        } else if (vId.startsWith("a")) {
          usGroup.appendChild(opt);
        } else if (vId.startsWith("b")) {
          ukGroup.appendChild(opt);
        } else {
          intlGroup.appendChild(opt);
        }
      });
      if (jpGroup.children.length > 0)
        sel.appendChild(jpGroup);
      if (usGroup.children.length > 0)
        sel.appendChild(usGroup);
      if (ukGroup.children.length > 0)
        sel.appendChild(ukGroup);
      if (intlGroup.children.length > 0)
        sel.appendChild(intlGroup);
      sel.value = currentVal;
    };
    renderOpts(baseSel, "jf_alpha");
    renderOpts(blendSel, "af_bella");
  }
  updateSliderFromCurrent() {
    const slider = document.getElementById("vb-blend-slider");
    const ratio = slider ? parseFloat(slider.value) : 0.3;
    this.updateSliderUI(ratio);
  }
  updateSliderUI(ratio) {
    const baseSel = document.getElementById("vb-base-voice");
    const blendSel = document.getElementById("vb-blend-voice");
    const baseName = baseSel?.value ? baseSel.value.replace(/^[a-z]{2}_/, "").replace(/_/g, " ") : "Primary";
    const blendName = blendSel?.value ? blendSel.value.replace(/^[a-z]{2}_/, "").replace(/_/g, " ") : "Blend";
    const basePct = Math.round((1 - ratio) * 100);
    const blendPct = Math.round(ratio * 100);
    const label = document.getElementById("vb-blend-ratio-label");
    if (label) {
      label.textContent = `${basePct}% ${baseName} • ${blendPct}% ${blendName}`;
    }
    const barLeft = document.getElementById("vb-bar-left");
    const barRight = document.getElementById("vb-bar-right");
    if (barLeft)
      barLeft.style.width = `${basePct}%`;
    if (barRight)
      barRight.style.width = `${blendPct}%`;
  }
  async audition() {
    if (this.isAuditioning) {
      this.stopAudio();
      return;
    }
    const baseSel = document.getElementById("vb-base-voice");
    const blendSel = document.getElementById("vb-blend-voice");
    const slider = document.getElementById("vb-blend-slider");
    const phraseInput = document.getElementById("vb-test-phrase");
    const speedSlider = document.getElementById("vb-speed-slider");
    const baseVoice = baseSel?.value || "jf_alpha";
    const blendVoice = blendSel?.value || "af_bella";
    const blendRatio = slider ? parseFloat(slider.value) : 0.3;
    const phrase = phraseInput?.value.trim() || "Detto, wait! Did not we hear the members do not even know each other?";
    const speed = speedSlider ? parseFloat(speedSlider.value) : 1;
    this.showStatus("Synthesizing neural blend preview on GPU...", false);
    this.updateAuditionButton(true, true);
    try {
      const audioUrl = await ApiClient.previewCustomVoice({
        base_voice: baseVoice,
        blend_voice: blendVoice,
        blend_ratio: blendRatio,
        text: phrase,
        speed
      });
      if (this.currentPreviewUrl) {
        URL.revokeObjectURL(this.currentPreviewUrl);
      }
      this.currentPreviewUrl = audioUrl;
      this.audio.src = audioUrl;
      this.isAuditioning = true;
      this.updateAuditionButton(true, false);
      this.showStatus("Playing preview", false);
      await this.audio.play();
    } catch (err) {
      console.error("Audition failed:", err);
      this.isAuditioning = false;
      this.updateAuditionButton(false);
      this.showStatus("Preview failed: " + (err.message || "Error"), true);
    }
  }
  async save() {
    const nameInput = document.getElementById("vb-voice-name");
    const baseSel = document.getElementById("vb-base-voice");
    const blendSel = document.getElementById("vb-blend-voice");
    const slider = document.getElementById("vb-blend-slider");
    const descInput = document.getElementById("vb-voice-desc");
    const name = nameInput?.value.trim() || "";
    if (!name) {
      this.showError("Please give your new voice a name (e.g. Charlotte Sweet Anime).");
      return;
    }
    const baseVoice = baseSel?.value || "jf_alpha";
    const blendVoice = blendSel?.value || "af_bella";
    const blendRatio = slider ? parseFloat(slider.value) : 0.3;
    const desc = descInput?.value.trim() || "";
    const btnSave = document.getElementById("btn-vb-save");
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = "Saving Neural Voice...";
    }
    try {
      await ApiClient.createCustomVoice({
        name,
        base_voice: baseVoice,
        blend_voice: blendVoice,
        blend_ratio: blendRatio,
        description: desc
      });
      this.close();
      await this.onVoiceSavedCallback();
    } catch (err) {
      console.error("Failed to save custom voice:", err);
      this.showError(err.message || "Failed to save voice");
    } finally {
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          <span>Save & Add Voice to Studio</span>
        `;
      }
    }
  }
  updateAuditionButton(isActive, isLoading = false) {
    const btn = document.getElementById("btn-vb-audition");
    if (!btn)
      return;
    if (isLoading) {
      btn.innerHTML = `<div class="humanist-spinner" style="width:14px;height:14px;border-width:2px;"></div> <span>Synthesizing...</span>`;
    } else if (isActive) {
      btn.innerHTML = `${Icons.pause(15)} <span>Stop Audition</span>`;
    } else {
      btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> <span>Audition Voice</span>`;
    }
  }
  showStatus(msg, isError) {
    const statusEl = document.getElementById("vb-audition-status");
    if (!statusEl)
      return;
    statusEl.textContent = msg;
    statusEl.style.color = isError ? "#ef4444" : "var(--text-prose-muted)";
  }
  showError(msg) {
    const banner = document.getElementById("vb-error-banner");
    if (!banner)
      return;
    banner.textContent = msg;
    banner.style.display = "block";
  }
}

// src/condenser.ts
class AICondenserManager {
  currentProject = null;
  currentChapterIndex = 1;
  providersData = null;
  isProcessing = false;
  lastResult = null;
  onChapterCreated;
  constructor(onChapterCreated) {
    this.onChapterCreated = onChapterCreated;
    this.initUI();
  }
  setProject(project, currentChapterIndex) {
    this.currentProject = project;
    if (currentChapterIndex !== undefined) {
      this.currentChapterIndex = currentChapterIndex;
    }
  }
  initUI() {
    const modal = document.getElementById("modal-ai-condenser");
    if (!modal)
      return;
    const btnClose = document.getElementById("btn-close-ai-modal");
    if (btnClose) {
      btnClose.onclick = () => this.close();
    }
    modal.onclick = (e) => {
      if (e.target === modal)
        this.close();
    };
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.style.display === "flex") {
        this.close();
      }
    });
    const providerSelect = document.getElementById("ai-provider-select");
    if (providerSelect) {
      providerSelect.onchange = () => this.handleProviderChange();
    }
    const btnAdd5 = document.getElementById("btn-ai-range-add5");
    const btnAdd10 = document.getElementById("btn-ai-range-add10");
    const btnAdd20 = document.getElementById("btn-ai-range-add20");
    if (btnAdd5)
      btnAdd5.onclick = () => this.extendRange(5);
    if (btnAdd10)
      btnAdd10.onclick = () => this.extendRange(10);
    if (btnAdd20)
      btnAdd20.onclick = () => this.extendRange(20);
    const inputStart = document.getElementById("ai-start-chapter");
    const inputEnd = document.getElementById("ai-end-chapter");
    if (inputStart)
      inputStart.oninput = () => this.updateSelectionSummary();
    if (inputEnd)
      inputEnd.oninput = () => this.updateSelectionSummary();
    const focusPills = document.querySelectorAll(".ai-focus-pill");
    focusPills.forEach((pill) => {
      pill.addEventListener("click", () => {
        focusPills.forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
      });
    });
    const detailPills = document.querySelectorAll(".ai-detail-pill");
    detailPills.forEach((pill) => {
      pill.addEventListener("click", () => {
        detailPills.forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
      });
    });
    const btnRun = document.getElementById("btn-run-ai-condense");
    if (btnRun) {
      btnRun.onclick = () => this.runCondensation();
    }
    const btnSaveChapter = document.getElementById("btn-ai-save-chapter");
    if (btnSaveChapter) {
      btnSaveChapter.onclick = () => this.saveToCurrentBook();
    }
    const btnNewBook = document.getElementById("btn-ai-new-book");
    if (btnNewBook) {
      btnNewBook.onclick = () => this.exportAsNewBook();
    }
    const btnDiscard = document.getElementById("btn-ai-discard-review");
    if (btnDiscard) {
      btnDiscard.onclick = () => this.resetToConfigView();
    }
  }
  async open(project, currentChapterIndex) {
    this.currentProject = project;
    if (currentChapterIndex !== undefined) {
      this.currentChapterIndex = currentChapterIndex;
    }
    const modal = document.getElementById("modal-ai-condenser");
    if (!modal)
      return;
    this.resetToConfigView();
    modal.style.display = "flex";
    if (!this.currentProject.chapters || this.currentProject.chapters.length === 0) {
      try {
        const fullProj = await ApiClient.getProject(this.currentProject.id);
        this.currentProject = fullProj;
      } catch (err) {
        console.warn("Could not fetch project chapters:", err);
      }
    }
    const chapters = (this.currentProject.chapters || []).slice().sort((a, b) => a.chapter_index - b.chapter_index);
    let startIdx = this.currentChapterIndex;
    let minIdx = 1;
    let maxIdx = 9999;
    if (chapters.length > 0) {
      minIdx = chapters[0].chapter_index;
      maxIdx = chapters[chapters.length - 1].chapter_index;
      if (!chapters.some((c) => c.chapter_index === startIdx)) {
        startIdx = minIdx;
      }
    }
    const inputStart = document.getElementById("ai-start-chapter");
    const inputEnd = document.getElementById("ai-end-chapter");
    if (inputStart) {
      inputStart.min = minIdx.toString();
      inputStart.max = maxIdx.toString();
      inputStart.value = startIdx.toString();
    }
    if (inputEnd) {
      inputEnd.min = minIdx.toString();
      inputEnd.max = maxIdx.toString();
      const defaultEnd = chapters.length > 0 ? Math.min(startIdx + 4, maxIdx) : startIdx + 4;
      inputEnd.value = defaultEnd.toString();
    }
    this.updateSelectionSummary();
    try {
      this.providersData = await ApiClient.getAIProviders();
      this.renderProviders();
    } catch (e) {
      console.warn("Could not load AI providers:", e);
    }
  }
  close() {
    const modal = document.getElementById("modal-ai-condenser");
    if (modal)
      modal.style.display = "none";
  }
  renderProviders() {
    if (!this.providersData)
      return;
    const providerSelect = document.getElementById("ai-provider-select");
    if (!providerSelect)
      return;
    providerSelect.innerHTML = "";
    const providers = this.providersData.providers;
    for (const [id, info] of Object.entries(providers)) {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = info.name + (info.has_key ? " (Key Saved)" : "");
      if (id === this.providersData.current_provider) {
        opt.selected = true;
      }
      providerSelect.appendChild(opt);
    }
    this.handleProviderChange();
  }
  handleProviderChange() {
    if (!this.providersData)
      return;
    const providerSelect = document.getElementById("ai-provider-select");
    const modelSelect = document.getElementById("ai-model-select");
    const keyInput = document.getElementById("ai-api-key");
    const keyHint = document.getElementById("ai-key-hint");
    const keyLink = document.getElementById("ai-key-link");
    const providerId = providerSelect?.value || "gemini";
    const info = this.providersData.providers[providerId];
    if (!info)
      return;
    if (modelSelect) {
      modelSelect.innerHTML = "";
      info.models.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = m;
        if (m === info.default_model)
          opt.selected = true;
        modelSelect.appendChild(opt);
      });
    }
    if (keyInput) {
      if (providerId === "ollama") {
        keyInput.placeholder = "No key needed for local Ollama";
        keyInput.disabled = true;
        keyInput.value = "";
      } else {
        keyInput.disabled = false;
        keyInput.placeholder = info.has_key ? `Saved: ${info.masked_key}` : "Enter your API key here...";
        keyInput.value = "";
      }
    }
    if (keyHint && keyLink) {
      if (providerId === "ollama") {
        keyHint.textContent = "Ensure Ollama is running locally on http://localhost:11434";
        keyLink.style.display = "none";
      } else if (providerId === "custom") {
        keyHint.textContent = "Enter your custom Hydrogen / OpenAI-compatible endpoint below.";
        keyLink.style.display = "none";
      } else {
        keyHint.textContent = "Free or low-cost API keys available at: ";
        keyLink.href = info.key_url;
        keyLink.textContent = info.name.split(" ")[0] + " Console";
        keyLink.style.display = "inline";
      }
    }
    const customUrlContainer = document.getElementById("ai-custom-url-container");
    const customUrlInput = document.getElementById("ai-base-url");
    if (customUrlContainer && customUrlInput) {
      if (providerId === "custom") {
        customUrlContainer.style.display = "block";
        customUrlInput.value = info.saved_base_url || "";
      } else {
        customUrlContainer.style.display = "none";
      }
    }
  }
  extendRange(count) {
    const inputStart = document.getElementById("ai-start-chapter");
    const inputEnd = document.getElementById("ai-end-chapter");
    if (!inputStart || !inputEnd || !this.currentProject)
      return;
    const chapters = (this.currentProject.chapters || []).slice().sort((a, b) => a.chapter_index - b.chapter_index);
    const maxIdx = chapters.length > 0 ? chapters[chapters.length - 1].chapter_index : 9999;
    const start = parseInt(inputStart.value || "1", 10);
    inputEnd.value = Math.min(start + count - 1, maxIdx).toString();
    this.updateSelectionSummary();
  }
  updateSelectionSummary() {
    if (!this.currentProject)
      return;
    const inputStart = document.getElementById("ai-start-chapter");
    const inputEnd = document.getElementById("ai-end-chapter");
    const summaryBadge = document.getElementById("ai-selected-count");
    if (!inputStart || !inputEnd || !summaryBadge)
      return;
    const start = parseInt(inputStart.value || "1", 10);
    const end = parseInt(inputEnd.value || "1", 10);
    const allChapters = (this.currentProject.chapters || []).slice().sort((a, b) => a.chapter_index - b.chapter_index);
    const inRange = allChapters.filter((c) => c.chapter_index >= start && c.chapter_index <= end);
    let totalChars = 0;
    let validCount = 0;
    for (const c of inRange) {
      const len = (c.content || "").length;
      if (len > 300) {
        totalChars += len;
        validCount++;
      }
    }
    const estimatedWords = Math.round(totalChars / 5.5);
    if (inRange.length === 0) {
      const minIdx = allChapters.length > 0 ? allChapters[0].chapter_index : 1;
      const maxIdx = allChapters.length > 0 ? allChapters[allChapters.length - 1].chapter_index : 1;
      summaryBadge.textContent = `0 chapters selected (Available: Ch ${minIdx}–${maxIdx})`;
      summaryBadge.style.color = "#ef4444";
    } else {
      summaryBadge.textContent = `${inRange.length} chapters selected (${validCount} valid manuscript chapters, ~${estimatedWords.toLocaleString()} words)`;
      summaryBadge.style.color = "var(--accent-terracotta)";
    }
  }
  resetToConfigView() {
    const deckConfig = document.getElementById("ai-deck-config");
    const deckLoading = document.getElementById("ai-deck-loading");
    const deckReview = document.getElementById("ai-deck-review");
    const errorBanner = document.getElementById("ai-error-banner");
    if (deckConfig)
      deckConfig.style.display = "block";
    if (deckLoading)
      deckLoading.style.display = "none";
    if (deckReview)
      deckReview.style.display = "none";
    if (errorBanner) {
      errorBanner.style.display = "none";
      errorBanner.textContent = "";
    }
  }
  async runCondensation() {
    if (!this.currentProject || this.isProcessing)
      return;
    const inputStart = document.getElementById("ai-start-chapter");
    const inputEnd = document.getElementById("ai-end-chapter");
    const providerSelect = document.getElementById("ai-provider-select");
    const modelSelect = document.getElementById("ai-model-select");
    const keyInput = document.getElementById("ai-api-key");
    const errorBanner = document.getElementById("ai-error-banner");
    const start = parseInt(inputStart?.value || "1", 10);
    const end = parseInt(inputEnd?.value || "1", 10);
    if (isNaN(start) || isNaN(end) || start > end) {
      alert("Please enter a valid starting and ending chapter index.");
      return;
    }
    const activeFocusPill = document.querySelector(".ai-focus-pill.active");
    const focusMode = activeFocusPill?.dataset.mode || "romcom";
    const activeDetailPill = document.querySelector(".ai-detail-pill.active");
    const detailLevel = activeDetailPill?.dataset.detail || "standard";
    const provider = providerSelect?.value || "gemini";
    const model = modelSelect?.value || undefined;
    const apiKey = keyInput?.value?.trim() || undefined;
    const customInput = document.getElementById("ai-custom-instructions");
    const customInstructions = customInput?.value?.trim() || undefined;
    const customUrlInput = document.getElementById("ai-base-url");
    const baseUrl = customUrlInput?.value?.trim() || undefined;
    const deckConfig = document.getElementById("ai-deck-config");
    const deckLoading = document.getElementById("ai-deck-loading");
    const loadingStatus = document.getElementById("ai-loading-status");
    if (deckConfig)
      deckConfig.style.display = "none";
    if (deckLoading)
      deckLoading.style.display = "block";
    if (errorBanner)
      errorBanner.style.display = "none";
    if (loadingStatus) {
      loadingStatus.textContent = `Consulting ${provider.toUpperCase()} (${model || "default"}) to condense Chapters ${start} to ${end} (${focusMode} cut)...`;
    }
    this.isProcessing = true;
    try {
      const res = await ApiClient.condenseChapters({
        project_id: this.currentProject.id,
        start_index: start,
        end_index: end,
        focus_mode: focusMode,
        detail_level: detailLevel,
        custom_instructions: customInstructions,
        provider,
        model,
        base_url: baseUrl,
        api_key: apiKey,
        save_key: true,
        output_action: "preview_only"
      });
      this.lastResult = res;
      this.showReview(res);
    } catch (err) {
      console.error("Condensation error:", err);
      if (deckConfig)
        deckConfig.style.display = "block";
      if (deckLoading)
        deckLoading.style.display = "none";
      if (errorBanner) {
        errorBanner.textContent = err.message || "An error occurred while condensing chapters.";
        errorBanner.style.display = "block";
      }
    } finally {
      this.isProcessing = false;
    }
  }
  showReview(res) {
    const deckLoading = document.getElementById("ai-deck-loading");
    const deckReview = document.getElementById("ai-deck-review");
    const titleInput = document.getElementById("ai-review-title");
    const contentText = document.getElementById("ai-review-content");
    const statsBadge = document.getElementById("ai-review-stats");
    if (deckLoading)
      deckLoading.style.display = "none";
    if (deckReview)
      deckReview.style.display = "block";
    if (titleInput)
      titleInput.value = res.title || "Arc Digest";
    if (contentText)
      contentText.value = res.content || "";
    if (statsBadge) {
      const origWords = Math.round(res.original_chars / 5.5);
      const condWords = Math.round(res.condensed_chars / 5.5);
      statsBadge.textContent = `${res.compression_ratio_pct}% fluff trimmed • Reduced from ~${origWords.toLocaleString()} to ~${condWords.toLocaleString()} words (${res.focus_mode.toUpperCase()} focus)`;
    }
  }
  async saveToCurrentBook() {
    if (!this.currentProject || !this.lastResult)
      return;
    const titleInput = document.getElementById("ai-review-title");
    const contentText = document.getElementById("ai-review-content");
    const title = titleInput?.value.trim() || this.lastResult.title;
    const content = contentText?.value.trim() || this.lastResult.content;
    if (!content) {
      alert("Content cannot be empty.");
      return;
    }
    try {
      const inputStart = document.getElementById("ai-start-chapter");
      const inputEnd = document.getElementById("ai-end-chapter");
      const start = parseInt(inputStart?.value || "1", 10);
      const end = parseInt(inputEnd?.value || "1", 10);
      const res = await ApiClient.condenseChapters({
        project_id: this.currentProject.id,
        start_index: start,
        end_index: end,
        focus_mode: this.lastResult.focus_mode,
        detail_level: "standard",
        output_action: "create_chapter",
        api_key: "saved"
      });
      this.close();
      if (this.onChapterCreated && res.created_chapter_id) {
        await this.onChapterCreated(res.created_chapter_id);
      }
    } catch (e) {
      alert("Could not save condensed chapter: " + e.message);
    }
  }
  async exportAsNewBook() {
    if (!this.currentProject || !this.lastResult)
      return;
    const inputStart = document.getElementById("ai-start-chapter");
    const inputEnd = document.getElementById("ai-end-chapter");
    const start = parseInt(inputStart?.value || "1", 10);
    const end = parseInt(inputEnd?.value || "1", 10);
    try {
      const res = await ApiClient.condenseChapters({
        project_id: this.currentProject.id,
        start_index: start,
        end_index: end,
        focus_mode: this.lastResult.focus_mode,
        detail_level: "standard",
        output_action: "new_book",
        api_key: "saved"
      });
      alert(`Created new book: "${this.currentProject.title} (Digest Arc)"! View it in the Library.`);
      this.close();
      window.location.reload();
    } catch (e) {
      alert("Could not create new book: " + e.message);
    }
  }
}

// src/url_sequence.ts
function parseUrlChapterPattern(rawUrl) {
  const clean = (rawUrl || "").trim();
  if (!clean)
    return null;
  const m1 = clean.match(/(chapter|ch|episode|ep|part)[-_/]?(\d+)/i);
  if (m1 && m1[2] && m1.index !== undefined) {
    const digits = m1[2];
    const num = parseInt(digits, 10);
    const dStart = m1.index + m1[0].lastIndexOf(digits);
    const dEnd = dStart + digits.length;
    return {
      num,
      width: digits.length,
      pad: digits.startsWith("0") && digits.length > 1,
      prefix: clean.substring(0, dStart),
      suffix: clean.substring(dEnd)
    };
  }
  const m2 = clean.match(/[-_/](\d+)(?:[/._-]|\.html|\.htm|\?|$)/i);
  if (m2 && m2[1] && m2.index !== undefined) {
    const digits = m2[1];
    const num = parseInt(digits, 10);
    const dStart = m2.index + m2[0].indexOf(digits);
    const dEnd = dStart + digits.length;
    return {
      num,
      width: digits.length,
      pad: digits.startsWith("0") && digits.length > 1,
      prefix: clean.substring(0, dStart),
      suffix: clean.substring(dEnd)
    };
  }
  const m3 = clean.match(/([?&](?:chapter|ch|page|p|ep)=)(\d+)/i);
  if (m3 && m3[2] && m3.index !== undefined) {
    const digits = m3[2];
    const num = parseInt(digits, 10);
    const dStart = m3.index + m3[0].lastIndexOf(digits);
    const dEnd = dStart + digits.length;
    return {
      num,
      width: digits.length,
      pad: digits.startsWith("0") && digits.length > 1,
      prefix: clean.substring(0, dStart),
      suffix: clean.substring(dEnd)
    };
  }
  const pathMatch = clean.match(/https?:\/\/[^?#]+/i);
  if (pathMatch) {
    const basePath = pathMatch[0];
    const digitMatches = Array.from(basePath.matchAll(/(\d+)/g));
    if (digitMatches.length > 0) {
      const lastMatch = digitMatches[digitMatches.length - 1];
      const digits = lastMatch[1];
      const num = parseInt(digits, 10);
      const dStart = lastMatch.index;
      const dEnd = dStart + digits.length;
      return {
        num,
        width: digits.length,
        pad: digits.startsWith("0") && digits.length > 1,
        prefix: clean.substring(0, dStart),
        suffix: clean.substring(dEnd)
      };
    }
  }
  return null;
}
function generateUrlSequence(url, start, end, count) {
  const parsed = parseUrlChapterPattern(url);
  if (!parsed)
    return url.trim() ? [url.trim()] : [];
  const s = start !== undefined ? start : parsed.num;
  let e = end !== undefined ? end : count !== undefined ? s + count - 1 : s + 9;
  if (e < s)
    e = s;
  if (e - s > 250)
    e = s + 250;
  const urls = [];
  for (let n = s;n <= e; n++) {
    const numStr = parsed.pad ? n.toString().padStart(parsed.width, "0") : n.toString();
    urls.push(`${parsed.prefix}${numStr}${parsed.suffix}`);
  }
  return urls;
}

// src/app.ts
class App {
  player;
  reader;
  studio;
  shelf;
  voicesGallery;
  voiceBlender;
  condenser;
  currentView = "shelf";
  constructor() {
    this.player = new AudioPlayer;
    this.reader = new ReadAlongManager("reader-prose-container");
    this.studio = new StudioManager(this.reader, this.player);
    this.shelf = new BookshelfManager;
    this.voicesGallery = new VoiceGalleryManager;
    this.voiceBlender = new VoiceBlenderManager(async () => {
      await this.loadVoices();
    });
    this.voicesGallery.setOpenBlenderCallback(() => {
      this.voiceBlender.open();
    });
    this.voicesGallery.setDeleteCustomVoiceCallback(async (voiceId) => {
      if (confirm(`Are you sure you want to delete custom voice "${voiceId}"?`)) {
        await ApiClient.deleteCustomVoice(voiceId);
        await this.loadVoices();
      }
    });
    this.condenser = new AICondenserManager(async (chapterId) => {
      const p = this.studio.getCurrentProject();
      if (p) {
        await this.studio.open(p.id);
        await this.studio.selectChapter(chapterId);
      }
    });
    this.voicesGallery.setRoleSelectCallback((role, voiceId) => {
      const proj = this.studio.getCurrentProject();
      if (proj) {
        const fieldMap = {
          narrator: "narrator_voice",
          dialogue: "dialogue_voice",
          thought: "thought_voice"
        };
        ApiClient.updateSettings(proj.id, { [fieldMap[role]]: voiceId }).catch(console.error);
      }
      const selectEl = document.getElementById(`select-${role}-voice`);
      if (selectEl)
        selectEl.value = voiceId;
    });
    this.initCallbacks();
    this.initNavigation();
    this.initImportTabs();
    this.initImportForms();
    this.initPlayerControls();
    this.initKeyboardShortcuts();
    this.exposeGlobalBridge();
  }
  async start() {
    await this.checkHardware();
    await this.loadVoices();
    await this.shelf.load();
  }
  initCallbacks() {
    this.player.setTimeUpdateListener((currentTime) => {
      this.reader.updateTime(currentTime);
    });
    this.reader.setSeekListener((seconds) => {
      this.player.seek(seconds);
    });
    this.shelf.setCallbacks((projectId) => this.openStudio(projectId), (project) => this.playProject(project));
  }
  initNavigation() {
    const btnShelf = document.getElementById("nav-btn-shelf");
    const btnImport = document.getElementById("nav-btn-import");
    const btnVoices = document.getElementById("nav-btn-voices");
    const btnStudio = document.getElementById("nav-btn-studio");
    if (btnShelf)
      btnShelf.onclick = () => this.switchView("shelf");
    if (btnImport)
      btnImport.onclick = () => this.switchView("import");
    if (btnVoices)
      btnVoices.onclick = () => this.switchView("voices");
    if (btnStudio)
      btnStudio.onclick = () => this.switchView("studio");
    const btnOpenFolder = document.getElementById("btn-open-folder");
    if (btnOpenFolder) {
      btnOpenFolder.onclick = async () => {
        try {
          await ApiClient.openRootFolder();
        } catch (e) {
          alert("Could not open folder: " + e.message);
        }
      };
    }
  }
  switchView(view) {
    this.currentView = view;
    document.querySelectorAll(".view-pane").forEach((pane2) => {
      pane2.classList.remove("active");
    });
    document.querySelectorAll(".nav-link").forEach((link2) => {
      link2.classList.remove("active");
    });
    const pane = document.getElementById(`view-${view}`);
    const link = document.getElementById(`nav-btn-${view}`);
    const studioNav = document.getElementById("nav-btn-studio");
    if (pane)
      pane.classList.add("active");
    if (link)
      link.classList.add("active");
    if (view === "studio" && studioNav) {
      studioNav.style.display = "inline-flex";
    }
    if (view === "shelf") {
      this.shelf.load();
    } else if (view === "voices") {
      this.voicesGallery.render();
    }
  }
  async openStudio(projectId) {
    await this.studio.open(projectId);
    this.switchView("studio");
  }
  async playChapter(chapterId) {
    const proj = this.studio.getCurrentProject();
    if (!proj)
      return;
    const chapters = proj.chapters || [];
    const ch = chapters.find((c) => c.id === chapterId);
    if (!ch)
      return;
    await this.studio.selectChapter(ch.id);
    this.player.loadChapter(ch.id, ch.title, proj.title, proj.cover_image);
  }
  async playProject(projectOrId) {
    let proj;
    if (typeof projectOrId === "string") {
      try {
        proj = await ApiClient.getProject(projectOrId);
      } catch (e) {
        alert("Could not load project: " + e.message);
        return;
      }
    } else {
      if (!projectOrId.chapters || projectOrId.chapters.length === 0) {
        try {
          proj = await ApiClient.getProject(projectOrId.id);
        } catch {
          proj = projectOrId;
        }
      } else {
        proj = projectOrId;
      }
    }
    const chapters = proj.chapters || [];
    const completedChs = chapters.filter((c) => c.status === "completed");
    if (completedChs.length === 0) {
      alert("This book has no completed chapters yet. Open the studio to synthesize.");
      return;
    }
    const first = completedChs[0];
    await this.openStudio(proj.id);
    await this.studio.selectChapter(first.id);
    this.player.loadChapter(first.id, first.title, proj.title, proj.cover_image);
  }
  initImportTabs() {
    const tabs = ["batch", "article", "file"];
    tabs.forEach((tab) => {
      const btn = document.getElementById(`tab-btn-${tab}`);
      if (btn) {
        btn.onclick = () => {
          document.querySelectorAll(".import-tab-btn").forEach((b) => b.classList.remove("active"));
          document.querySelectorAll(".import-panel").forEach((p) => p.classList.remove("active"));
          btn.classList.add("active");
          const panel = document.getElementById(`import-panel-${tab}`);
          if (panel)
            panel.classList.add("active");
        };
      }
    });
  }
  initImportForms() {
    const seqStartUrl = document.getElementById("seq-start-url");
    const seqStartNum = document.getElementById("seq-start-num");
    const seqEndNum = document.getElementById("seq-end-num");
    const seqBadge = document.getElementById("seq-detected-badge");
    const seqStatus = document.getElementById("seq-status-text");
    const btnGenSeq = document.getElementById("btn-generate-sequence");
    const batchUrls = document.getElementById("batch-urls");
    const batchUrlsCount = document.getElementById("batch-urls-count");
    const quickBanner = document.getElementById("seq-quick-banner");
    const quickBannerText = document.getElementById("quick-banner-text");
    const quickBannerEnd = document.getElementById("quick-banner-end");
    const btnQuickExpand = document.getElementById("btn-quick-expand");
    const updateBatchCount = () => {
      const raw = batchUrls?.value || "";
      const count = raw.split(`
`).map((u) => u.trim()).filter((u) => u.startsWith("http")).length;
      if (batchUrlsCount) {
        batchUrlsCount.textContent = count > 0 ? `${count} ${count === 1 ? "link" : "links"} ready to extract` : "Paste links or generate sequence above";
      }
    };
    if (seqStartUrl) {
      seqStartUrl.addEventListener("input", () => {
        const val = seqStartUrl.value.trim();
        const parsed = parseUrlChapterPattern(val);
        if (parsed) {
          if (seqBadge) {
            seqBadge.textContent = `Detected Ch. ${parsed.num}`;
            seqBadge.style.display = "inline-block";
          }
          if (seqStartNum)
            seqStartNum.value = parsed.num.toString();
          if (seqEndNum)
            seqEndNum.value = (parsed.num + 9).toString();
          if (seqStatus) {
            seqStatus.textContent = `Ready: Ch ${parsed.num} to ${parsed.num + 9} (10 chapters)`;
          }
        } else {
          if (seqBadge)
            seqBadge.style.display = "none";
          if (seqStatus)
            seqStatus.textContent = "";
        }
      });
    }
    const triggerSequenceGeneration = (overrideEnd) => {
      const url = seqStartUrl?.value.trim() || "";
      if (!url) {
        alert("Please enter a starting chapter URL first.");
        return;
      }
      const s = parseInt(seqStartNum?.value || "1", 10);
      const e = overrideEnd !== undefined ? overrideEnd : parseInt(seqEndNum?.value || "10", 10);
      if (overrideEnd !== undefined && seqEndNum) {
        seqEndNum.value = overrideEnd.toString();
      }
      const urls = generateUrlSequence(url, s, e);
      if (batchUrls) {
        batchUrls.value = urls.join(`
`);
      }
      updateBatchCount();
      if (seqStatus) {
        seqStatus.textContent = `✓ Generated ${urls.length} URLs (Ch. ${s}–${e})`;
      }
    };
    if (btnGenSeq) {
      btnGenSeq.onclick = () => triggerSequenceGeneration();
    }
    document.querySelectorAll(".seq-preset-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const count = parseInt(btn.getAttribute("data-count") || "10", 10);
        const s = parseInt(seqStartNum?.value || "1", 10);
        const e = s + count - 1;
        triggerSequenceGeneration(e);
      });
    });
    if (batchUrls) {
      batchUrls.addEventListener("input", () => {
        updateBatchCount();
        const raw = batchUrls.value.trim();
        const lines = raw.split(`
`).map((l) => l.trim()).filter(Boolean);
        if (lines.length === 1 && lines[0]?.startsWith("http")) {
          const parsed = parseUrlChapterPattern(lines[0]);
          if (parsed && quickBanner && quickBannerText && quickBannerEnd) {
            quickBannerText.textContent = `Detected Chapter ${parsed.num} in single URL.`;
            quickBannerEnd.textContent = `${parsed.num + 9} (+10 chapters)`;
            quickBanner.style.display = "flex";
            btnQuickExpand.onclick = () => {
              if (seqStartUrl)
                seqStartUrl.value = lines[0];
              if (seqStartNum)
                seqStartNum.value = parsed.num.toString();
              if (seqEndNum)
                seqEndNum.value = (parsed.num + 9).toString();
              const urls = generateUrlSequence(lines[0], parsed.num, parsed.num + 9);
              batchUrls.value = urls.join(`
`);
              quickBanner.style.display = "none";
              updateBatchCount();
            };
            return;
          }
        }
        if (quickBanner)
          quickBanner.style.display = "none";
      });
    }
    const formBatch = document.getElementById("form-import-batch");
    if (formBatch) {
      formBatch.onsubmit = async (e) => {
        e.preventDefault();
        const textarea = document.getElementById("batch-urls");
        const titleInput = document.getElementById("batch-title");
        const authorInput = document.getElementById("batch-author");
        const raw = textarea?.value || "";
        const urls = raw.split(`
`).map((u) => u.trim()).filter((u) => u.startsWith("http"));
        if (urls.length === 0) {
          alert("Please enter at least one valid HTTP/HTTPS URL.");
          return;
        }
        const submitBtn = formBatch.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Extracting Chapters...";
        }
        try {
          const res = await ApiClient.ingestBatchLinks(urls, titleInput?.value, authorInput?.value);
          await this.openStudio(res.project_id);
          textarea.value = "";
        } catch (err) {
          alert("Batch import error: " + err.message);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `${Icons.arrowRight(16)} Ingest & Open Studio`;
          }
        }
      };
    }
    const formArticle = document.getElementById("form-import-article");
    if (formArticle) {
      formArticle.onsubmit = async (e) => {
        e.preventDefault();
        const urlInput = document.getElementById("article-url");
        const url = urlInput?.value.trim();
        if (!url)
          return;
        try {
          const res = await ApiClient.ingestArticle(url);
          await this.openStudio(res.project_id);
          urlInput.value = "";
        } catch (err) {
          alert("Article import error: " + err.message);
        }
      };
    }
    const formFile = document.getElementById("form-import-file");
    const fileInput = document.getElementById("file-upload-input");
    if (formFile && fileInput) {
      formFile.onsubmit = async (e) => {
        e.preventDefault();
        if (!fileInput.files || fileInput.files.length === 0) {
          alert("Please select an EPUB, PDF, or TXT file.");
          return;
        }
        const formData = new FormData;
        formData.append("file", fileInput.files[0]);
        try {
          const res = await ApiClient.uploadFile(formData);
          await this.openStudio(res.project_id);
          formFile.reset();
        } catch (err) {
          alert("File upload error: " + err.message);
        }
      };
    }
  }
  initPlayerControls() {
    const playBtn = document.getElementById("dock-btn-play");
    if (playBtn)
      playBtn.onclick = () => this.player.toggle();
    const backBtn = document.getElementById("dock-btn-back");
    if (backBtn)
      backBtn.onclick = () => this.player.skip(-15);
    const fwdBtn = document.getElementById("dock-btn-fwd");
    if (fwdBtn)
      fwdBtn.onclick = () => this.player.skip(15);
    const scrub = document.getElementById("dock-scrub");
    if (scrub) {
      scrub.oninput = () => {
        const dur = this.player.audio.duration || 0;
        const pct = parseFloat(scrub.value);
        this.player.seek(pct / 100 * dur);
      };
    }
    const slider = document.getElementById("dock-speed-slider");
    if (slider) {
      slider.oninput = () => {
        this.player.setSpeed(parseFloat(slider.value));
      };
    }
    document.querySelectorAll(".speed-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = parseFloat(btn.getAttribute("data-speed") || "1.0");
        this.player.setSpeed(val);
      });
    });
  }
  initKeyboardShortcuts() {
    window.addEventListener("keydown", (e) => {
      const target = e.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        this.switchView("shelf");
        const searchInput = document.getElementById("library-search-input");
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      } else if (e.code === "Space") {
        e.preventDefault();
        this.player.toggle();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        this.player.skip(-10);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        this.player.skip(10);
      } else if (e.key === "[") {
        e.preventDefault();
        const cur = this.player.audio.playbackRate || 1;
        this.player.setSpeed(cur - 0.1);
      } else if (e.key === "]") {
        e.preventDefault();
        const cur = this.player.audio.playbackRate || 1;
        this.player.setSpeed(cur + 0.1);
      }
    });
  }
  async checkHardware() {
    const badge = document.getElementById("nav-hw-status");
    if (!badge)
      return;
    try {
      const hw = await ApiClient.getHardwareInfo();
      if (hw.use_gpu) {
        badge.className = "hw-pill hw-cuda";
        badge.innerHTML = `${Icons.cpu(13)} <span>CUDA Active • RTX 2050</span>`;
        badge.setAttribute("title", `Inference Device: ${hw.device.toUpperCase()} • Acceleration: Active`);
      } else {
        badge.className = "hw-pill hw-cpu";
        badge.innerHTML = `${Icons.cpu(13)} <span>CPU Mode</span>`;
        badge.setAttribute("title", "Running on CPU");
      }
    } catch {
      badge.style.display = "none";
    }
  }
  async loadVoices() {
    try {
      const data = await ApiClient.getVoices();
      this.studio.setVoices(data);
      this.shelf.setVoices(data);
      this.voicesGallery.setVoices(data);
      this.voiceBlender.setVoicesData(data);
    } catch (e) {
      console.warn("Voices load failed:", e);
    }
  }
  openAppendChaptersModal() {
    const proj = this.studio.getCurrentProject();
    if (!proj) {
      alert("Please open a book project in the Studio first.");
      return;
    }
    const modal = document.getElementById("modal-append-chapters");
    const bookTitleEl = document.getElementById("append-book-title");
    const highestEl = document.getElementById("append-current-highest");
    const startUrlInput = document.getElementById("append-start-url");
    const startNumInput = document.getElementById("append-start-num");
    const endNumInput = document.getElementById("append-end-num");
    const previewTextarea = document.getElementById("append-urls-preview");
    const previewCount = document.getElementById("append-preview-count");
    const countLabel = document.getElementById("append-count-label");
    if (!modal)
      return;
    if (bookTitleEl)
      bookTitleEl.textContent = proj.title;
    const chapters = proj.chapters || [];
    let highestNum = 0;
    chapters.forEach((c) => {
      const match = c.title.match(/chapter\s+(\d+)/i) || c.title.match(/(\d+)/);
      if (match && match[1]) {
        const n = parseInt(match[1], 10);
        if (n > highestNum)
          highestNum = n;
      }
      if (c.chapter_index > highestNum)
        highestNum = c.chapter_index;
    });
    if (highestEl)
      highestEl.textContent = `Chapter ${highestNum} (${chapters.length} chapters in book)`;
    const nextStart = highestNum > 0 ? highestNum + 1 : 1;
    const nextEnd = nextStart + 9;
    if (startNumInput)
      startNumInput.value = nextStart.toString();
    if (endNumInput)
      endNumInput.value = nextEnd.toString();
    let baseSourceUrl = proj.source_url || "";
    if (baseSourceUrl) {
      const parsed = parseUrlChapterPattern(baseSourceUrl);
      if (parsed) {
        const nextUrl = `${parsed.prefix}${parsed.pad ? nextStart.toString().padStart(parsed.width, "0") : nextStart}${parsed.suffix}`;
        if (startUrlInput)
          startUrlInput.value = nextUrl;
      } else if (startUrlInput) {
        startUrlInput.value = baseSourceUrl;
      }
    }
    const updatePreview = () => {
      const url = startUrlInput?.value.trim() || "";
      const s = parseInt(startNumInput?.value || "1", 10);
      const e = parseInt(endNumInput?.value || "10", 10);
      const count = Math.max(1, e - s + 1);
      if (countLabel)
        countLabel.textContent = `${count} Chapters`;
      if (url) {
        const urls = generateUrlSequence(url, s, e);
        if (previewTextarea)
          previewTextarea.value = urls.join(`
`);
        if (previewCount)
          previewCount.textContent = `${urls.length} links ready`;
      } else {
        if (previewTextarea)
          previewTextarea.value = "";
        if (previewCount)
          previewCount.textContent = "0 links";
      }
    };
    updatePreview();
    if (startUrlInput) {
      startUrlInput.oninput = () => {
        const parsed = parseUrlChapterPattern(startUrlInput.value);
        if (parsed) {
          if (startNumInput)
            startNumInput.value = parsed.num.toString();
          if (endNumInput)
            endNumInput.value = (parsed.num + 9).toString();
        }
        updatePreview();
      };
    }
    const btnPreview = document.getElementById("btn-append-preview");
    if (btnPreview)
      btnPreview.onclick = () => updatePreview();
    document.querySelectorAll(".append-preset-btn").forEach((btn) => {
      btn.onclick = () => {
        const count = parseInt(btn.getAttribute("data-count") || "10", 10);
        const s = parseInt(startNumInput?.value || "1", 10);
        if (endNumInput)
          endNumInput.value = (s + count - 1).toString();
        updatePreview();
      };
    });
    const closeBtn = document.getElementById("btn-close-append-modal");
    const cancelBtn = document.getElementById("btn-cancel-append");
    const closeModal = () => {
      modal.style.display = "none";
    };
    if (closeBtn)
      closeBtn.onclick = closeModal;
    if (cancelBtn)
      cancelBtn.onclick = closeModal;
    const form = document.getElementById("form-append-chapters");
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const raw = previewTextarea?.value || "";
        const urls = raw.split(`
`).map((u) => u.trim()).filter((u) => u.startsWith("http"));
        if (urls.length === 0) {
          alert("Please ensure there is at least one valid chapter URL to append.");
          return;
        }
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Fetching & Appending Chapters...";
        }
        try {
          const res = await ApiClient.appendChaptersToProject(proj.id, urls);
          modal.style.display = "none";
          await this.studio.open(proj.id);
          alert(`Successfully added ${res.added_count} chapters to "${proj.title}"! (Total: ${res.total_chapters} chapters)`);
        } catch (err) {
          alert("Append chapters error: " + err.message);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> <span>Fetch & Append Chapters</span>`;
          }
        }
      };
    }
    modal.style.display = "flex";
  }
  exposeGlobalBridge() {
    window.__audiobooked = {
      switchView: (v) => this.switchView(v),
      openStudio: (id) => this.openStudio(id),
      playChapter: (id) => this.playChapter(id),
      playProject: (id) => this.playProject(id),
      openFolder: async (id) => {
        try {
          await ApiClient.openProjectFolder(id);
        } catch (e) {
          alert("Could not open folder: " + e.message);
        }
      },
      openRootFolder: async () => {
        try {
          await ApiClient.openRootFolder();
        } catch (e) {
          alert("Could not open storage vault: " + e.message);
        }
      },
      openEditModal: (id) => this.shelf.openEditModal(id),
      openDeleteModal: (id) => this.shelf.openDeleteModal(id),
      openMergeModal: (ids) => this.shelf.openMergeModal(ids),
      removeMergeCandidate: (id) => this.shelf.removeMergeCandidate(id),
      toggleProjectSelect: (id) => this.shelf.toggleProjectSelect(id),
      toggleSelectAll: () => this.shelf.toggleSelectAll(),
      clearLibraryFilters: () => {
        const input = document.getElementById("library-search-input");
        if (input)
          input.value = "";
        this.shelf.setFilter("all");
      },
      openAppendChaptersModal: () => this.openAppendChaptersModal(),
      openAIDigestModal: () => {
        const p = this.studio.getCurrentProject();
        if (!p) {
          alert("Please open a book in Studio first to condense chapters.");
          return;
        }
        const ch = this.studio.getActiveChapter();
        this.condenser.open(p, ch ? ch.chapter_index : 1);
      },
      closeAIDigestModal: () => this.condenser.close(),
      reindexStudio: () => this.studio.reindex(),
      synthesizeCurrent: () => this.studio.synthesizeCurrent(),
      synthesizeAll: () => this.studio.synthesizeAll(),
      exportM4b: () => this.studio.exportM4b(),
      saveSettings: () => this.studio.saveSettings(),
      deleteGlossary: async (ruleId) => {
        await ApiClient.deleteGlossaryRule(ruleId);
        const p = this.studio.getCurrentProject();
        if (p)
          await this.studio.open(p.id);
      },
      auditionVoice: (vId) => this.voicesGallery.playAudition(vId),
      stopVoiceAudition: () => this.voicesGallery.stopAudition(),
      resetVoiceFilters: () => this.voicesGallery.resetFilters(),
      assignVoiceRole: (role, vId) => this.voicesGallery.assignRole(role, vId),
      openVoiceBlender: () => this.voiceBlender.open(),
      closeVoiceBlender: () => this.voiceBlender.close(),
      deleteCustomVoice: async (vId) => {
        if (confirm(`Delete custom voice blend "${vId}"?`)) {
          await ApiClient.deleteCustomVoice(vId);
          await this.loadVoices();
        }
      },
      addGlossaryRule: async () => {
        const p = this.studio.getCurrentProject();
        if (!p)
          return;
        const termInput = document.getElementById("glossary-term");
        const repInput = document.getElementById("glossary-rep");
        if (!termInput?.value || !repInput?.value)
          return;
        await ApiClient.addGlossaryRule(p.id, termInput.value.trim(), repInput.value.trim());
        termInput.value = "";
        repInput.value = "";
        await this.studio.open(p.id);
      }
    };
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const app = new App;
  app.start();
});
