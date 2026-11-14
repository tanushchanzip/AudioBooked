import { ApiClient } from './api';
import { AudioPlayer } from './player';
import { ReadAlongManager } from './readalong';
import { StudioManager } from './studio';
import { BookshelfManager } from './shelf';
import { VoiceGalleryManager } from './voices';
import { VoiceBlenderManager } from './voice_blender';
import { AICondenserManager } from './condenser';
import { Icons } from './icons';
import type { Project } from './types';
import { parseUrlChapterPattern, generateUrlSequence } from './url_sequence';

class App {
  private player: AudioPlayer;
  private reader: ReadAlongManager;
  private studio: StudioManager;
  private shelf: BookshelfManager;
  private voicesGallery: VoiceGalleryManager;
  private voiceBlender: VoiceBlenderManager;
  private condenser: AICondenserManager;
  private currentView: 'shelf' | 'import' | 'voices' | 'studio' = 'shelf';

  constructor() {
    this.player = new AudioPlayer();
    this.reader = new ReadAlongManager('reader-prose-container');
    this.studio = new StudioManager(this.reader, this.player);
    this.shelf = new BookshelfManager();
    this.voicesGallery = new VoiceGalleryManager();
    this.voiceBlender = new VoiceBlenderManager(async () => {
      await this.loadVoices();
    });

    this.voicesGallery.setOpenBlenderCallback(() => {
      this.voiceBlender.open();
    });

    this.voicesGallery.setDeleteCustomVoiceCallback(async (voiceId: string) => {
      if (confirm(`Are you sure you want to delete custom voice "${voiceId}"?`)) {
        await ApiClient.deleteCustomVoice(voiceId);
        await this.loadVoices();
      }
    });

    this.condenser = new AICondenserManager(async (chapterId: string) => {
      const p = this.studio.getCurrentProject();
      if (p) {
        await this.studio.open(p.id);
        await this.studio.selectChapter(chapterId);
      }
    });

    this.voicesGallery.setRoleSelectCallback((role, voiceId) => {
      const proj = this.studio.getCurrentProject();
      if (proj) {
        const fieldMap: Record<string, string> = {
          narrator: 'narrator_voice',
          dialogue: 'dialogue_voice',
          thought: 'thought_voice',
        };
        ApiClient.updateSettings(proj.id, { [fieldMap[role]!]: voiceId }).catch(console.error);
      }
      const selectEl = document.getElementById(`select-${role}-voice`) as HTMLSelectElement | null;
      if (selectEl) selectEl.value = voiceId;
    });

    this.initCallbacks();
    this.initNavigation();
    this.initImportTabs();
    this.initImportForms();
    this.initPlayerControls();
    this.initKeyboardShortcuts();
    this.exposeGlobalBridge();
  }

  public async start(): Promise<void> {
    await this.checkHardware();
    await this.loadVoices();
    await this.shelf.load();
  }

  private initCallbacks(): void {
    // When audio player updates playback time, sync reader
    this.player.setTimeUpdateListener((currentTime) => {
      this.reader.updateTime(currentTime);
    });

    // When reader sentence is clicked, seek audio
    this.reader.setSeekListener((seconds) => {
      this.player.seek(seconds);
    });

    // When bookshelf clicks studio or play
    this.shelf.setCallbacks(
      (projectId) => this.openStudio(projectId),
      (project) => this.playProject(project)
    );
  }

  private initNavigation(): void {
    const btnShelf = document.getElementById('nav-btn-shelf');
    const btnImport = document.getElementById('nav-btn-import');
    const btnVoices = document.getElementById('nav-btn-voices');
    const btnStudio = document.getElementById('nav-btn-studio');

    if (btnShelf) btnShelf.onclick = () => this.switchView('shelf');
    if (btnImport) btnImport.onclick = () => this.switchView('import');
    if (btnVoices) btnVoices.onclick = () => this.switchView('voices');
    if (btnStudio) btnStudio.onclick = () => this.switchView('studio');

    const btnOpenFolder = document.getElementById('btn-open-folder');
    if (btnOpenFolder) {
      btnOpenFolder.onclick = async () => {
        try {
          await ApiClient.openRootFolder();
        } catch (e: any) {
          alert('Could not open folder: ' + e.message);
        }
      };
    }
  }

  public switchView(view: 'shelf' | 'import' | 'voices' | 'studio'): void {
    this.currentView = view;

    document.querySelectorAll('.view-pane').forEach((pane) => {
      pane.classList.remove('active');
    });

    document.querySelectorAll('.nav-link').forEach((link) => {
      link.classList.remove('active');
    });

    const pane = document.getElementById(`view-${view}`);
    const link = document.getElementById(`nav-btn-${view}`);
    const studioNav = document.getElementById('nav-btn-studio');

    if (pane) pane.classList.add('active');
    if (link) link.classList.add('active');

    if (view === 'studio' && studioNav) {
      studioNav.style.display = 'inline-flex';
    }

    if (view === 'shelf') {
      this.shelf.load();
    } else if (view === 'voices') {
      this.voicesGallery.render();
    }
  }

  public async openStudio(projectId: string): Promise<void> {
    await this.studio.open(projectId);
    this.switchView('studio');
  }

  public async playChapter(chapterId: string): Promise<void> {
    const proj = this.studio.getCurrentProject();
    if (!proj) return;
    const chapters = proj.chapters || [];
    const ch = chapters.find((c) => c.id === chapterId);
    if (!ch) return;

    await this.studio.selectChapter(ch.id);
    this.player.loadChapter(ch.id, ch.title, proj.title, proj.cover_image);
  }

  public async playProject(projectOrId: Project | string): Promise<void> {
    let proj: Project;
    if (typeof projectOrId === 'string') {
      try {
        proj = await ApiClient.getProject(projectOrId);
      } catch (e: any) {
        alert('Could not load project: ' + e.message);
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
    const completedChs = chapters.filter((c) => c.status === 'completed');
    if (completedChs.length === 0) {
      alert('This book has no completed chapters yet. Open the studio to synthesize.');
      return;
    }
    const first = completedChs[0]!;
    await this.openStudio(proj.id);
    await this.studio.selectChapter(first.id);
    this.player.loadChapter(first.id, first.title, proj.title, proj.cover_image);
  }

  private initImportTabs(): void {
    const tabs = ['batch', 'article', 'file'];
    tabs.forEach((tab) => {
      const btn = document.getElementById(`tab-btn-${tab}`);
      if (btn) {
        btn.onclick = () => {
          document.querySelectorAll('.import-tab-btn').forEach((b) => b.classList.remove('active'));
          document.querySelectorAll('.import-panel').forEach((p) => p.classList.remove('active'));

          btn.classList.add('active');
          const panel = document.getElementById(`import-panel-${tab}`);
          if (panel) panel.classList.add('active');
        };
      }
    });
  }

  private initImportForms(): void {
    // 1. Batch Links & Smart Auto-Sequence Generator
    const seqStartUrl = document.getElementById('seq-start-url') as HTMLInputElement;
    const seqStartNum = document.getElementById('seq-start-num') as HTMLInputElement;
    const seqEndNum = document.getElementById('seq-end-num') as HTMLInputElement;
    const seqBadge = document.getElementById('seq-detected-badge') as HTMLElement;
    const seqStatus = document.getElementById('seq-status-text') as HTMLElement;
    const btnGenSeq = document.getElementById('btn-generate-sequence') as HTMLButtonElement;
    const batchUrls = document.getElementById('batch-urls') as HTMLTextAreaElement;
    const batchUrlsCount = document.getElementById('batch-urls-count') as HTMLElement;

    const quickBanner = document.getElementById('seq-quick-banner') as HTMLElement;
    const quickBannerText = document.getElementById('quick-banner-text') as HTMLElement;
    const quickBannerEnd = document.getElementById('quick-banner-end') as HTMLElement;
    const btnQuickExpand = document.getElementById('btn-quick-expand') as HTMLButtonElement;

    const updateBatchCount = () => {
      const raw = batchUrls?.value || '';
      const count = raw.split('\n').map(u => u.trim()).filter(u => u.startsWith('http')).length;
      if (batchUrlsCount) {
        batchUrlsCount.textContent = count > 0 ? `${count} ${count === 1 ? 'link' : 'links'} ready to extract` : 'Paste links or generate sequence above';
      }
    };

    if (seqStartUrl) {
      seqStartUrl.addEventListener('input', () => {
        const val = seqStartUrl.value.trim();
        const parsed = parseUrlChapterPattern(val);
        if (parsed) {
          if (seqBadge) {
            seqBadge.textContent = `Detected Ch. ${parsed.num}`;
            seqBadge.style.display = 'inline-block';
          }
          if (seqStartNum) seqStartNum.value = parsed.num.toString();
          if (seqEndNum) seqEndNum.value = (parsed.num + 9).toString();
          if (seqStatus) {
            seqStatus.textContent = `Ready: Ch ${parsed.num} to ${parsed.num + 9} (10 chapters)`;
          }
        } else {
          if (seqBadge) seqBadge.style.display = 'none';
          if (seqStatus) seqStatus.textContent = '';
        }
      });
    }

    const triggerSequenceGeneration = (overrideEnd?: number) => {
      const url = seqStartUrl?.value.trim() || '';
      if (!url) {
        alert('Please enter a starting chapter URL first.');
        return;
      }
      const s = parseInt(seqStartNum?.value || '1', 10);
      const e = overrideEnd !== undefined ? overrideEnd : parseInt(seqEndNum?.value || '10', 10);
      if (overrideEnd !== undefined && seqEndNum) {
        seqEndNum.value = overrideEnd.toString();
      }

      const urls = generateUrlSequence(url, s, e);
      if (batchUrls) {
        batchUrls.value = urls.join('\n');
      }
      updateBatchCount();
      if (seqStatus) {
        seqStatus.textContent = `✓ Generated ${urls.length} URLs (Ch. ${s}–${e})`;
      }
    };

    if (btnGenSeq) {
      btnGenSeq.onclick = () => triggerSequenceGeneration();
    }

    document.querySelectorAll('.seq-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const count = parseInt(btn.getAttribute('data-count') || '10', 10);
        const s = parseInt(seqStartNum?.value || '1', 10);
        const e = s + count - 1;
        triggerSequenceGeneration(e);
      });
    });

    if (batchUrls) {
      batchUrls.addEventListener('input', () => {
        updateBatchCount();
        const raw = batchUrls.value.trim();
        const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 1 && lines[0]?.startsWith('http')) {
          const parsed = parseUrlChapterPattern(lines[0]!);
          if (parsed && quickBanner && quickBannerText && quickBannerEnd) {
            quickBannerText.textContent = `Detected Chapter ${parsed.num} in single URL.`;
            quickBannerEnd.textContent = `${parsed.num + 9} (+10 chapters)`;
            quickBanner.style.display = 'flex';

            btnQuickExpand.onclick = () => {
              if (seqStartUrl) seqStartUrl.value = lines[0]!;
              if (seqStartNum) seqStartNum.value = parsed.num.toString();
              if (seqEndNum) seqEndNum.value = (parsed.num + 9).toString();
              const urls = generateUrlSequence(lines[0]!, parsed.num, parsed.num + 9);
              batchUrls.value = urls.join('\n');
              quickBanner.style.display = 'none';
              updateBatchCount();
            };
            return;
          }
        }
        if (quickBanner) quickBanner.style.display = 'none';
      });
    }

    const formBatch = document.getElementById('form-import-batch');
    if (formBatch) {
      formBatch.onsubmit = async (e) => {
        e.preventDefault();
        const textarea = document.getElementById('batch-urls') as HTMLTextAreaElement;
        const titleInput = document.getElementById('batch-title') as HTMLInputElement;
        const authorInput = document.getElementById('batch-author') as HTMLInputElement;

        const raw = textarea?.value || '';
        const urls = raw.split('\n').map((u) => u.trim()).filter((u) => u.startsWith('http'));

        if (urls.length === 0) {
          alert('Please enter at least one valid HTTP/HTTPS URL.');
          return;
        }

        const submitBtn = formBatch.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Extracting Chapters...';
        }

        try {
          const res = await ApiClient.ingestBatchLinks(urls, titleInput?.value, authorInput?.value);
          await this.openStudio(res.project_id);
          textarea.value = '';
        } catch (err: any) {
          alert('Batch import error: ' + err.message);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `${Icons.arrowRight(16)} Ingest & Open Studio`;
          }
        }
      };
    }

    // 2. Single Article
    const formArticle = document.getElementById('form-import-article');
    if (formArticle) {
      formArticle.onsubmit = async (e) => {
        e.preventDefault();
        const urlInput = document.getElementById('article-url') as HTMLInputElement;
        const url = urlInput?.value.trim();
        if (!url) return;

        try {
          const res = await ApiClient.ingestArticle(url);
          await this.openStudio(res.project_id);
          urlInput.value = '';
        } catch (err: any) {
          alert('Article import error: ' + err.message);
        }
      };
    }

    // 3. File Upload
    const formFile = document.getElementById('form-import-file');
    const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
    if (formFile && fileInput) {
      formFile.onsubmit = async (e) => {
        e.preventDefault();
        if (!fileInput.files || fileInput.files.length === 0) {
          alert('Please select an EPUB, PDF, or TXT file.');
          return;
        }

        const formData = new FormData();
        formData.append('file', fileInput.files[0]!);

        try {
          const res = await ApiClient.uploadFile(formData);
          await this.openStudio(res.project_id);
          formFile.reset();
        } catch (err: any) {
          alert('File upload error: ' + err.message);
        }
      };
    }
  }

  private initPlayerControls(): void {
    const playBtn = document.getElementById('dock-btn-play');
    if (playBtn) playBtn.onclick = () => this.player.toggle();

    const backBtn = document.getElementById('dock-btn-back');
    if (backBtn) backBtn.onclick = () => this.player.skip(-15);

    const fwdBtn = document.getElementById('dock-btn-fwd');
    if (fwdBtn) fwdBtn.onclick = () => this.player.skip(15);

    const scrub = document.getElementById('dock-scrub') as HTMLInputElement;
    if (scrub) {
      scrub.oninput = () => {
        const dur = (this.player as any).audio.duration || 0;
        const pct = parseFloat(scrub.value);
        this.player.seek((pct / 100) * dur);
      };
    }

    const slider = document.getElementById('dock-speed-slider') as HTMLInputElement;
    if (slider) {
      slider.oninput = () => {
        this.player.setSpeed(parseFloat(slider.value));
      };
    }

    document.querySelectorAll('.speed-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = parseFloat(btn.getAttribute('data-speed') || '1.0');
        this.player.setSpeed(val);
      });
    });
  }

  private initKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      // Don't intercept if user is typing in input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        this.switchView('shelf');
        const searchInput = document.getElementById('library-search-input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      } else if (e.code === 'Space') {
        e.preventDefault();
        this.player.toggle();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.player.skip(-10);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.player.skip(10);
      } else if (e.key === '[') {
        e.preventDefault();
        const cur = (this.player as any).audio.playbackRate || 1.0;
        this.player.setSpeed(cur - 0.1);
      } else if (e.key === ']') {
        e.preventDefault();
        const cur = (this.player as any).audio.playbackRate || 1.0;
        this.player.setSpeed(cur + 0.1);
      }
    });
  }

  private async checkHardware(): Promise<void> {
    const badge = document.getElementById('nav-hw-status');
    if (!badge) return;

    try {
      const hw = await ApiClient.getHardwareInfo();
      if (hw.use_gpu) {
        badge.className = 'hw-pill hw-cuda';
        badge.innerHTML = `${Icons.cpu(13)} <span>CUDA Active • RTX 2050</span>`;
        badge.setAttribute('title', `Inference Device: ${hw.device.toUpperCase()} • Acceleration: Active`);
      } else {
        badge.className = 'hw-pill hw-cpu';
        badge.innerHTML = `${Icons.cpu(13)} <span>CPU Mode</span>`;
        badge.setAttribute('title', 'Running on CPU');
      }
    } catch {
      badge.style.display = 'none';
    }
  }

  private async loadVoices(): Promise<void> {
    try {
      const data = await ApiClient.getVoices();
      this.studio.setVoices(data);
      this.shelf.setVoices(data);
      this.voicesGallery.setVoices(data);
      this.voiceBlender.setVoicesData(data);
    } catch (e) {
      console.warn('Voices load failed:', e);
    }
  }

  public openAppendChaptersModal(): void {
    const proj = this.studio.getCurrentProject();
    if (!proj) {
      alert('Please open a book project in the Studio first.');
      return;
    }

    const modal = document.getElementById('modal-append-chapters');
    const bookTitleEl = document.getElementById('append-book-title');
    const highestEl = document.getElementById('append-current-highest');
    const startUrlInput = document.getElementById('append-start-url') as HTMLInputElement;
    const startNumInput = document.getElementById('append-start-num') as HTMLInputElement;
    const endNumInput = document.getElementById('append-end-num') as HTMLInputElement;
    const previewTextarea = document.getElementById('append-urls-preview') as HTMLTextAreaElement;
    const previewCount = document.getElementById('append-preview-count');
    const countLabel = document.getElementById('append-count-label');

    if (!modal) return;

    if (bookTitleEl) bookTitleEl.textContent = proj.title;

    // Find highest chapter number in existing chapters
    const chapters = proj.chapters || [];
    let highestNum = 0;
    chapters.forEach(c => {
      const match = c.title.match(/chapter\s+(\d+)/i) || c.title.match(/(\d+)/);
      if (match && match[1]) {
        const n = parseInt(match[1], 10);
        if (n > highestNum) highestNum = n;
      }
      if (c.chapter_index > highestNum) highestNum = c.chapter_index;
    });

    if (highestEl) highestEl.textContent = `Chapter ${highestNum} (${chapters.length} chapters in book)`;

    const nextStart = highestNum > 0 ? highestNum + 1 : 1;
    const nextEnd = nextStart + 9;

    if (startNumInput) startNumInput.value = nextStart.toString();
    if (endNumInput) endNumInput.value = nextEnd.toString();

    // Suggest start URL based on source_url
    let baseSourceUrl = proj.source_url || '';
    if (baseSourceUrl) {
      const parsed = parseUrlChapterPattern(baseSourceUrl);
      if (parsed) {
        const nextUrl = `${parsed.prefix}${parsed.pad ? nextStart.toString().padStart(parsed.width, '0') : nextStart}${parsed.suffix}`;
        if (startUrlInput) startUrlInput.value = nextUrl;
      } else if (startUrlInput) {
        startUrlInput.value = baseSourceUrl;
      }
    }

    const updatePreview = () => {
      const url = startUrlInput?.value.trim() || '';
      const s = parseInt(startNumInput?.value || '1', 10);
      const e = parseInt(endNumInput?.value || '10', 10);
      const count = Math.max(1, e - s + 1);

      if (countLabel) countLabel.textContent = `${count} Chapters`;

      if (url) {
        const urls = generateUrlSequence(url, s, e);
        if (previewTextarea) previewTextarea.value = urls.join('\n');
        if (previewCount) previewCount.textContent = `${urls.length} links ready`;
      } else {
        if (previewTextarea) previewTextarea.value = '';
        if (previewCount) previewCount.textContent = '0 links';
      }
    };

    updatePreview();

    if (startUrlInput) {
      startUrlInput.oninput = () => {
        const parsed = parseUrlChapterPattern(startUrlInput.value);
        if (parsed) {
          if (startNumInput) startNumInput.value = parsed.num.toString();
          if (endNumInput) endNumInput.value = (parsed.num + 9).toString();
        }
        updatePreview();
      };
    }

    const btnPreview = document.getElementById('btn-append-preview');
    if (btnPreview) btnPreview.onclick = () => updatePreview();

    document.querySelectorAll('.append-preset-btn').forEach(btn => {
      btn.onclick = () => {
        const count = parseInt(btn.getAttribute('data-count') || '10', 10);
        const s = parseInt(startNumInput?.value || '1', 10);
        if (endNumInput) endNumInput.value = (s + count - 1).toString();
        updatePreview();
      };
    });

    const closeBtn = document.getElementById('btn-close-append-modal');
    const cancelBtn = document.getElementById('btn-cancel-append');
    const closeModal = () => { modal.style.display = 'none'; };
    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;

    const form = document.getElementById('form-append-chapters') as HTMLFormElement;
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const raw = previewTextarea?.value || '';
        const urls = raw.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'));
        if (urls.length === 0) {
          alert('Please ensure there is at least one valid chapter URL to append.');
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Fetching & Appending Chapters...';
        }

        try {
          const res = await ApiClient.appendChaptersToProject(proj.id, urls);
          modal.style.display = 'none';
          await this.studio.open(proj.id);
          alert(`Successfully added ${res.added_count} chapters to "${proj.title}"! (Total: ${res.total_chapters} chapters)`);
        } catch (err: any) {
          alert('Append chapters error: ' + err.message);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> <span>Fetch & Append Chapters</span>`;
          }
        }
      };
    }

    modal.style.display = 'flex';
  }

  private exposeGlobalBridge(): void {
    (window as any).__audiobooked = {
      switchView: (v: any) => this.switchView(v),
      openStudio: (id: string) => this.openStudio(id),
      playChapter: (id: string) => this.playChapter(id),
      playProject: (id: string) => this.playProject(id),
      openFolder: async (id: string) => {
        try {
          await ApiClient.openProjectFolder(id);
        } catch (e: any) {
          alert('Could not open folder: ' + e.message);
        }
      },
      openRootFolder: async () => {
        try {
          await ApiClient.openRootFolder();
        } catch (e: any) {
          alert('Could not open storage vault: ' + e.message);
        }
      },
      openEditModal: (id: string) => this.shelf.openEditModal(id),
      openDeleteModal: (id: string) => this.shelf.openDeleteModal(id),
      openMergeModal: (ids: any) => this.shelf.openMergeModal(ids),
      removeMergeCandidate: (id: string) => this.shelf.removeMergeCandidate(id),
      toggleProjectSelect: (id: string) => this.shelf.toggleProjectSelect(id),
      toggleSelectAll: () => this.shelf.toggleSelectAll(),
      clearLibraryFilters: () => {
        const input = document.getElementById('library-search-input') as HTMLInputElement;
        if (input) input.value = '';
        this.shelf.setFilter('all');
      },
      openAppendChaptersModal: () => this.openAppendChaptersModal(),
      openAIDigestModal: () => {
        const p = this.studio.getCurrentProject();
        if (!p) {
          alert('Please open a book in Studio first to condense chapters.');
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
      deleteGlossary: async (ruleId: string) => {
        await ApiClient.deleteGlossaryRule(ruleId);
        const p = this.studio.getCurrentProject();
        if (p) await this.studio.open(p.id);
      },
      auditionVoice: (vId: string) => this.voicesGallery.playAudition(vId),
      stopVoiceAudition: () => this.voicesGallery.stopAudition(),
      resetVoiceFilters: () => this.voicesGallery.resetFilters(),
      assignVoiceRole: (role: any, vId: string) => this.voicesGallery.assignRole(role, vId),
      openVoiceBlender: () => this.voiceBlender.open(),
      closeVoiceBlender: () => this.voiceBlender.close(),
      deleteCustomVoice: async (vId: string) => {
        if (confirm(`Delete custom voice blend "${vId}"?`)) {
          await ApiClient.deleteCustomVoice(vId);
          await this.loadVoices();
        }
      },
      addGlossaryRule: async () => {
        const p = this.studio.getCurrentProject();
        if (!p) return;
        const termInput = document.getElementById('glossary-term') as HTMLInputElement;
        const repInput = document.getElementById('glossary-rep') as HTMLInputElement;
        if (!termInput?.value || !repInput?.value) return;

        await ApiClient.addGlossaryRule(p.id, termInput.value.trim(), repInput.value.trim());
        termInput.value = '';
        repInput.value = '';
        await this.studio.open(p.id);
      },
    };
  }
}

// Boot application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.start();
});

