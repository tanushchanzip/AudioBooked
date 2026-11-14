import { ApiClient } from './api';
import { Icons } from './icons';
import type { Project, Chapter, VoicesResponse } from './types';
import { ReadAlongManager } from './readalong';
import { AudioPlayer } from './player';

export class StudioManager {
  private currentProject: Project | null = null;
  private activeChapter: Chapter | null = null;
  private voicesData: VoicesResponse | null = null;
  private reader: ReadAlongManager;
  private player: AudioPlayer;
  private pollTimer: any = null;
  private mode: 'read' | 'edit' = 'read';

  constructor(reader: ReadAlongManager, player: AudioPlayer) {
    this.reader = reader;
    this.player = player;
    this.initModeToggles();
  }

  public setVoices(voices: VoicesResponse): void {
    this.voicesData = voices;
    this.populateVoiceSelects();
  }

  public async open(projectId: string): Promise<void> {
    try {
      this.currentProject = await ApiClient.getProject(projectId);
      this.renderProjectHeader();
      this.renderVoiceSettings();
      this.renderGlossary();
      this.renderChapterList();

      const chapters = this.currentProject.chapters || [];
      if (chapters.length > 0) {
        const first = chapters[0]!;
        await this.selectChapter(first.id);
      }

      this.startPollingIfNeeded();
    } catch (err: any) {
      console.error('Failed to load project into studio:', err);
      alert('Could not open Studio: ' + err.message);
    }
  }

  public getCurrentProject(): Project | null {
    return this.currentProject;
  }

  public getActiveChapter(): Chapter | null {
    return this.activeChapter;
  }

  private initModeToggles(): void {
    const btnRead = document.getElementById('btn-mode-read');
    const btnEdit = document.getElementById('btn-mode-edit');

    if (btnRead && btnEdit) {
      btnRead.onclick = () => this.setMode('read');
      btnEdit.onclick = () => this.setMode('edit');
    }
  }

  public setMode(mode: 'read' | 'edit'): void {
    this.mode = mode;
    const btnRead = document.getElementById('btn-mode-read');
    const btnEdit = document.getElementById('btn-mode-edit');
    const readView = document.getElementById('reader-container');
    const editView = document.getElementById('chapter-editor-view');

    if (btnRead && btnEdit && readView && editView) {
      if (mode === 'read') {
        btnRead.classList.add('active');
        btnEdit.classList.remove('active');
        readView.style.display = 'block';
        editView.style.display = 'none';
        if (this.activeChapter) {
          this.loadActiveChapterReader();
        }
      } else {
        btnRead.classList.remove('active');
        btnEdit.classList.add('active');
        readView.style.display = 'none';
        editView.style.display = 'block';
      }
    }
  }

  public async selectChapter(chapterId: string): Promise<void> {
    if (!this.currentProject) return;
    const chapters = this.currentProject.chapters || [];
    const ch = chapters.find(c => c.id === chapterId);
    if (!ch) return;

    this.activeChapter = ch;

    // Highlight in list
    document.querySelectorAll('.chapter-nav-item').forEach(el => el.classList.remove('active'));
    const item = document.getElementById(`nav-ch-${ch.id}`);
    if (item) item.classList.add('active');

    // Update active chapter heading
    const titleEl = document.getElementById('studio-chapter-title');
    if (titleEl) {
      const isHeading = /^(?:chapter|ch\.?|episode|ep\.?|prologue|epilogue|interlude)\b/i.test(ch.title.trim());
      titleEl.textContent = isHeading ? ch.title : `${ch.chapter_index}. ${ch.title}`;
    }

    // Populate editor text
    const editor = document.getElementById('chapter-textarea') as HTMLTextAreaElement;
    if (editor) editor.value = ch.content;

    // Load reader timings or fallback
    await this.loadActiveChapterReader();
  }

  private async loadActiveChapterReader(): Promise<void> {
    if (!this.activeChapter) return;
    if (this.activeChapter.status === 'completed') {
      const timings = await ApiClient.getChapterTimings(this.activeChapter.id);
      if (timings && timings.length > 0) {
        this.reader.setTimings(timings, this.activeChapter.title, this.activeChapter.content);
        return;
      }
    }
    this.reader.renderFallbackText(this.activeChapter.content, this.activeChapter.title);
  }

  private renderProjectHeader(): void {
    if (!this.currentProject) return;
    const titleEl = document.getElementById('studio-project-title');
    const metaEl = document.getElementById('studio-project-meta');
    const countBadge = document.getElementById('studio-chapter-count');

    const chapters = this.currentProject.chapters || [];
    if (titleEl) titleEl.textContent = this.currentProject.title;
    if (metaEl) {
      const chCount = chapters.length;
      metaEl.textContent = `${this.currentProject.author} • ${this.currentProject.source_type.toUpperCase()} • ${chCount} ${chCount === 1 ? 'Chapter' : 'Chapters'}`;
    }
    if (countBadge) countBadge.textContent = `${chapters.length} Ch`;
  }

  public renderChapterList(): void {
    if (!this.currentProject) return;
    const container = document.getElementById('studio-chapters-nav');
    if (!container) return;

    container.innerHTML = '';
    const chapters = this.currentProject.chapters || [];

    chapters.forEach(ch => {
      const el = document.createElement('div');
      el.id = `nav-ch-${ch.id}`;
      el.className = `chapter-nav-item ${this.activeChapter?.id === ch.id ? 'active' : ''}`;
      el.onclick = () => this.selectChapter(ch.id);

      const isHeading = /^(?:chapter|ch\.?|episode|ep\.?|prologue|epilogue|interlude)\b/i.test(ch.title.trim());
      const displayTitle = isHeading ? ch.title : `${ch.chapter_index}. ${ch.title}`;

      const isDone = ch.status === 'completed';
      const isSynth = ch.status === 'synthesizing';

      let statusLabel = 'Pending';
      let statusClass = 'status-pending';

      if (isDone) {
        statusLabel = ch.duration ? `${Math.round(ch.duration)}s` : 'Done';
        statusClass = 'status-done';
      } else if (isSynth) {
        statusLabel = `${Math.round(ch.progress)}%`;
        statusClass = 'status-active';
      }

      el.innerHTML = `
        <div class="ch-nav-header">
          <span class="ch-nav-title">${displayTitle}</span>
          ${isDone ? `
            <button class="btn-icon-subtle btn-play-chapter" title="Listen to chapter" onclick="event.stopPropagation(); window.__audiobooked.playChapter('${ch.id}')">
              ${Icons.play(13)}
            </button>` : ''}
        </div>
        <div class="ch-nav-meta">
          <span class="status-dot ${statusClass}"></span>
          <span class="ch-nav-status">${isSynth ? `Synthesizing ${statusLabel}` : statusLabel}</span>
        </div>
      `;

      container.appendChild(el);
    });
  }

  private populateVoiceSelects(): void {
    if (!this.voicesData) return;
    const details = this.voicesData.details || {};
    const populate = (id: string, def: string) => {
      const sel = document.getElementById(id) as HTMLSelectElement;
      if (!sel) return;
      sel.innerHTML = '';

      const customVoices = this.voicesData!.voices.filter(v => v.startsWith('cv_') || details[v]?.is_custom);
      const standardVoices = this.voicesData!.voices.filter(v => !v.startsWith('cv_') && !details[v]?.is_custom);

      if (customVoices.length > 0) {
        const customGroup = document.createElement('optgroup');
        customGroup.label = '✨ Custom Hybrid Blends';
        customVoices.forEach(v => {
          const opt = document.createElement('option');
          opt.value = v;
          const info = details[v];
          opt.textContent = info ? `✨ ${info.name}` : `✨ ${v}`;
          if (v === def) opt.selected = true;
          customGroup.appendChild(opt);
        });
        sel.appendChild(customGroup);
      }

      const standardGroup = document.createElement('optgroup');
      standardGroup.label = 'Kokoro Neural Voices';
      standardVoices.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        const info = details[v];
        opt.textContent = info ? `${info.name} (${v})` : v.replace('_', ' ');
        if (v === def) opt.selected = true;
        standardGroup.appendChild(opt);
      });
      sel.appendChild(standardGroup);
    };

    const p = this.currentProject;
    populate('select-narrator-voice', p?.narrator_voice || 'af_heart');
    populate('select-dialogue-voice', p?.dialogue_voice || 'af_bella');
    populate('select-thought-voice', p?.thought_voice || 'af_sky');
  }

  private renderVoiceSettings(): void {
    if (!this.currentProject) return;
    this.populateVoiceSelects();

    const speedSlider = document.getElementById('slider-narrator-speed') as HTMLInputElement;
    const speedVal = document.getElementById('val-narrator-speed');
    const thoughtSlider = document.getElementById('slider-thought-speed') as HTMLInputElement;
    const thoughtVal = document.getElementById('val-thought-speed');

    const spd = this.currentProject.speed || 1.0;
    const thtSpd = this.currentProject.thought_speed || 0.90;

    if (speedSlider) speedSlider.value = spd.toString();
    if (speedVal) speedVal.textContent = `${spd.toFixed(2)}×`;

    if (thoughtSlider) thoughtSlider.value = thtSpd.toString();
    if (thoughtVal) thoughtVal.textContent = `${thtSpd.toFixed(2)}×`;
  }

  public async saveSettings(): Promise<void> {
    if (!this.currentProject) return;

    const nVoice = (document.getElementById('select-narrator-voice') as HTMLSelectElement)?.value || 'af_heart';
    const dVoice = (document.getElementById('select-dialogue-voice') as HTMLSelectElement)?.value || 'af_bella';
    const tVoice = (document.getElementById('select-thought-voice') as HTMLSelectElement)?.value || 'af_sky';
    const spd = parseFloat((document.getElementById('slider-narrator-speed') as HTMLInputElement)?.value || '1.0');
    const thtSpd = parseFloat((document.getElementById('slider-thought-speed') as HTMLInputElement)?.value || '0.9');

    const payload = {
      narrator_voice: nVoice,
      dialogue_voice: dVoice,
      thought_voice: tVoice,
      speed: spd,
      thought_speed: thtSpd,
    };

    await ApiClient.updateSettings(this.currentProject.id, payload);
    Object.assign(this.currentProject, payload);
  }

  public renderGlossary(): void {
    if (!this.currentProject) return;
    const container = document.getElementById('studio-glossary-tags');
    if (!container) return;
    container.innerHTML = '';

    const list = this.currentProject.glossary || [];
    if (list.length === 0) {
      container.innerHTML = '<span class="glossary-empty">No rules added.</span>';
      return;
    }

    list.forEach(g => {
      const chip = document.createElement('span');
      chip.className = 'glossary-chip';
      chip.innerHTML = `
        <strong>${g.term}</strong> &rarr; <em>${g.replacement}</em>
        <button class="chip-delete" onclick="window.__audiobooked.deleteGlossary('${g.id}')">
          ${Icons.trash(12)}
        </button>
      `;
      container.appendChild(chip);
    });
  }

  public async reindex(): Promise<void> {
    if (!this.currentProject) return;
    try {
      const res = await ApiClient.reindexChapters(this.currentProject.id);
      await this.open(this.currentProject.id);
      alert(`Re-indexed ${res.updated_chapters.length} chapters.`);
    } catch (err: any) {
      alert('Re-index failed: ' + err.message);
    }
  }

  public async synthesizeCurrent(): Promise<void> {
    if (!this.currentProject || !this.activeChapter) return;
    await this.saveSettings();
    await ApiClient.generate(this.currentProject.id, [this.activeChapter.id]);
    this.startPollingIfNeeded();
  }

  public async synthesizeAll(): Promise<void> {
    if (!this.currentProject) return;
    await this.saveSettings();
    await ApiClient.generate(this.currentProject.id);
    this.startPollingIfNeeded();
  }

  public async exportM4b(): Promise<void> {
    if (!this.currentProject) return;
    try {
      const res = await ApiClient.exportM4b(this.currentProject.id);
      alert(`Audiobook packaged successfully!`);
      await this.open(this.currentProject.id);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  }

  private startPollingIfNeeded(): void {
    clearInterval(this.pollTimer);
    this.pollTimer = setInterval(async () => {
      if (!this.currentProject) {
        clearInterval(this.pollTimer);
        return;
      }
      try {
        const updated = await ApiClient.getProject(this.currentProject.id);
        const updatedChs = updated.chapters || [];
        const hasProcessing = updatedChs.some(c => c.status === 'synthesizing');

        this.currentProject = updated;
        this.renderChapterList();

        if (this.activeChapter) {
          const freshActive = updatedChs.find(c => c.id === this.activeChapter!.id);
          if (freshActive && freshActive.status !== this.activeChapter.status) {
            this.activeChapter = freshActive;
            await this.loadActiveChapterReader();
          }
        }

        if (!hasProcessing && updated.status !== 'processing') {
          clearInterval(this.pollTimer);
        }
      } catch (e) {
        console.warn('Poll error:', e);
      }
    }, 2000);
  }
}
