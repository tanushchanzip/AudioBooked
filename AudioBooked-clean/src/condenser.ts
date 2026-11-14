import { ApiClient } from './api';
import { Icons } from './icons';
import type { Project, Chapter, AIProvidersResponse } from './types';

export class AICondenserManager {
  private currentProject: Project | null = null;
  private currentChapterIndex: number = 1;
  private providersData: AIProvidersResponse | null = null;
  private isProcessing: boolean = false;
  private lastResult: any = null;
  private onChapterCreated?: (chapterId: string) => Promise<void>;

  constructor(onChapterCreated?: (chapterId: string) => Promise<void>) {
    this.onChapterCreated = onChapterCreated;
    this.initUI();
  }

  public setProject(project: Project, currentChapterIndex?: number): void {
    this.currentProject = project;
    if (currentChapterIndex !== undefined) {
      this.currentChapterIndex = currentChapterIndex;
    }
  }

  private initUI(): void {
    const modal = document.getElementById('modal-ai-condenser');
    if (!modal) return;

    // Close button
    const btnClose = document.getElementById('btn-close-ai-modal');
    if (btnClose) {
      btnClose.onclick = () => this.close();
    }

    // Close on backdrop click
    modal.onclick = (e) => {
      if (e.target === modal) this.close();
    };

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        this.close();
      }
    });

    // Provider select change
    const providerSelect = document.getElementById('ai-provider-select') as HTMLSelectElement;
    if (providerSelect) {
      providerSelect.onchange = () => this.handleProviderChange();
    }

    // Quick range buttons
    const btnAdd5 = document.getElementById('btn-ai-range-add5');
    const btnAdd10 = document.getElementById('btn-ai-range-add10');
    const btnAdd20 = document.getElementById('btn-ai-range-add20');
    if (btnAdd5) btnAdd5.onclick = () => this.extendRange(5);
    if (btnAdd10) btnAdd10.onclick = () => this.extendRange(10);
    if (btnAdd20) btnAdd20.onclick = () => this.extendRange(20);

    // Range input changes
    const inputStart = document.getElementById('ai-start-chapter') as HTMLInputElement;
    const inputEnd = document.getElementById('ai-end-chapter') as HTMLInputElement;
    if (inputStart) inputStart.oninput = () => this.updateSelectionSummary();
    if (inputEnd) inputEnd.oninput = () => this.updateSelectionSummary();

    // Focus mode pills
    const focusPills = document.querySelectorAll('.ai-focus-pill');
    focusPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        focusPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
      });
    });

    // Detail level pills
    const detailPills = document.querySelectorAll('.ai-detail-pill');
    detailPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        detailPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
      });
    });

    // Run condensation button
    const btnRun = document.getElementById('btn-run-ai-condense');
    if (btnRun) {
      btnRun.onclick = () => this.runCondensation();
    }

    // Accept / Save buttons in review deck
    const btnSaveChapter = document.getElementById('btn-ai-save-chapter');
    if (btnSaveChapter) {
      btnSaveChapter.onclick = () => this.saveToCurrentBook();
    }

    const btnNewBook = document.getElementById('btn-ai-new-book');
    if (btnNewBook) {
      btnNewBook.onclick = () => this.exportAsNewBook();
    }

    const btnDiscard = document.getElementById('btn-ai-discard-review');
    if (btnDiscard) {
      btnDiscard.onclick = () => this.resetToConfigView();
    }
  }

  public async open(project: Project, currentChapterIndex?: number): Promise<void> {
    this.currentProject = project;
    if (currentChapterIndex !== undefined) {
      this.currentChapterIndex = currentChapterIndex;
    }

    const modal = document.getElementById('modal-ai-condenser');
    if (!modal) return;

    this.resetToConfigView();

    // Show modal centered on screen immediately
    modal.style.display = 'flex';

    // If chapters are not fully populated on this project object, fetch full project
    if (!this.currentProject.chapters || this.currentProject.chapters.length === 0) {
      try {
        const fullProj = await ApiClient.getProject(this.currentProject.id);
        this.currentProject = fullProj;
      } catch (err) {
        console.warn('Could not fetch project chapters:', err);
      }
    }

    // Populate initial chapter range based on actual project chapters
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

    const inputStart = document.getElementById('ai-start-chapter') as HTMLInputElement;
    const inputEnd = document.getElementById('ai-end-chapter') as HTMLInputElement;
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

    // Load AI providers and keys from backend
    try {
      this.providersData = await ApiClient.getAIProviders();
      this.renderProviders();
    } catch (e) {
      console.warn('Could not load AI providers:', e);
    }
  }

  public close(): void {
    const modal = document.getElementById('modal-ai-condenser');
    if (modal) modal.style.display = 'none';
  }

  private renderProviders(): void {
    if (!this.providersData) return;
    const providerSelect = document.getElementById('ai-provider-select') as HTMLSelectElement;
    if (!providerSelect) return;

    providerSelect.innerHTML = '';
    const providers = this.providersData.providers;
    for (const [id, info] of Object.entries(providers)) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = info.name + (info.has_key ? ' (Key Saved)' : '');
      if (id === this.providersData.current_provider) {
        opt.selected = true;
      }
      providerSelect.appendChild(opt);
    }

    this.handleProviderChange();
  }

  private handleProviderChange(): void {
    if (!this.providersData) return;
    const providerSelect = document.getElementById('ai-provider-select') as HTMLSelectElement;
    const modelSelect = document.getElementById('ai-model-select') as HTMLSelectElement;
    const keyInput = document.getElementById('ai-api-key') as HTMLInputElement;
    const keyHint = document.getElementById('ai-key-hint') as HTMLElement;
    const keyLink = document.getElementById('ai-key-link') as HTMLAnchorElement;

    const providerId = providerSelect?.value || 'gemini';
    const info = this.providersData.providers[providerId];
    if (!info) return;

    // Populate models
    if (modelSelect) {
      modelSelect.innerHTML = '';
      info.models.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        if (m === info.default_model) opt.selected = true;
        modelSelect.appendChild(opt);
      });
    }

    // Populate key info
    if (keyInput) {
      if (providerId === 'ollama') {
        keyInput.placeholder = 'No key needed for local Ollama';
        keyInput.disabled = true;
        keyInput.value = '';
      } else {
        keyInput.disabled = false;
        keyInput.placeholder = info.has_key ? `Saved: ${info.masked_key}` : 'Enter your API key here...';
        keyInput.value = '';
      }
    }

    if (keyHint && keyLink) {
      if (providerId === 'ollama') {
        keyHint.textContent = 'Ensure Ollama is running locally on http://localhost:11434';
        keyLink.style.display = 'none';
      } else if (providerId === 'custom') {
        keyHint.textContent = 'Enter your custom Hydrogen / OpenAI-compatible endpoint below.';
        keyLink.style.display = 'none';
      } else {
        keyHint.textContent = 'Free or low-cost API keys available at: ';
        keyLink.href = info.key_url;
        keyLink.textContent = info.name.split(' ')[0] + ' Console';
        keyLink.style.display = 'inline';
      }
    }

    const customUrlContainer = document.getElementById('ai-custom-url-container');
    const customUrlInput = document.getElementById('ai-base-url') as HTMLInputElement;
    if (customUrlContainer && customUrlInput) {
      if (providerId === 'custom') {
        customUrlContainer.style.display = 'block';
        customUrlInput.value = info.saved_base_url || '';
      } else {
        customUrlContainer.style.display = 'none';
      }
    }
  }

  private extendRange(count: number): void {
    const inputStart = document.getElementById('ai-start-chapter') as HTMLInputElement;
    const inputEnd = document.getElementById('ai-end-chapter') as HTMLInputElement;
    if (!inputStart || !inputEnd || !this.currentProject) return;

    const chapters = (this.currentProject.chapters || []).slice().sort((a, b) => a.chapter_index - b.chapter_index);
    const maxIdx = chapters.length > 0 ? chapters[chapters.length - 1].chapter_index : 9999;

    const start = parseInt(inputStart.value || '1', 10);
    inputEnd.value = Math.min(start + count - 1, maxIdx).toString();
    this.updateSelectionSummary();
  }

  private updateSelectionSummary(): void {
    if (!this.currentProject) return;
    const inputStart = document.getElementById('ai-start-chapter') as HTMLInputElement;
    const inputEnd = document.getElementById('ai-end-chapter') as HTMLInputElement;
    const summaryBadge = document.getElementById('ai-selected-count');
    if (!inputStart || !inputEnd || !summaryBadge) return;

    const start = parseInt(inputStart.value || '1', 10);
    const end = parseInt(inputEnd.value || '1', 10);

    const allChapters = (this.currentProject.chapters || []).slice().sort((a, b) => a.chapter_index - b.chapter_index);
    const inRange = allChapters.filter((c) => c.chapter_index >= start && c.chapter_index <= end);

    let totalChars = 0;
    let validCount = 0;
    for (const c of inRange) {
      const len = (c.content || '').length;
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
      summaryBadge.style.color = '#ef4444';
    } else {
      summaryBadge.textContent = `${inRange.length} chapters selected (${validCount} valid manuscript chapters, ~${estimatedWords.toLocaleString()} words)`;
      summaryBadge.style.color = 'var(--accent-terracotta)';
    }
  }

  private resetToConfigView(): void {
    const deckConfig = document.getElementById('ai-deck-config');
    const deckLoading = document.getElementById('ai-deck-loading');
    const deckReview = document.getElementById('ai-deck-review');
    const errorBanner = document.getElementById('ai-error-banner');

    if (deckConfig) deckConfig.style.display = 'block';
    if (deckLoading) deckLoading.style.display = 'none';
    if (deckReview) deckReview.style.display = 'none';
    if (errorBanner) {
      errorBanner.style.display = 'none';
      errorBanner.textContent = '';
    }
  }

  private async runCondensation(): Promise<void> {
    if (!this.currentProject || this.isProcessing) return;

    const inputStart = document.getElementById('ai-start-chapter') as HTMLInputElement;
    const inputEnd = document.getElementById('ai-end-chapter') as HTMLInputElement;
    const providerSelect = document.getElementById('ai-provider-select') as HTMLSelectElement;
    const modelSelect = document.getElementById('ai-model-select') as HTMLSelectElement;
    const keyInput = document.getElementById('ai-api-key') as HTMLInputElement;
    const errorBanner = document.getElementById('ai-error-banner');

    const start = parseInt(inputStart?.value || '1', 10);
    const end = parseInt(inputEnd?.value || '1', 10);
    if (isNaN(start) || isNaN(end) || start > end) {
      alert('Please enter a valid starting and ending chapter index.');
      return;
    }

    const activeFocusPill = document.querySelector('.ai-focus-pill.active') as HTMLElement;
    const focusMode = (activeFocusPill?.dataset.mode || 'romcom') as any;

    const activeDetailPill = document.querySelector('.ai-detail-pill.active') as HTMLElement;
    const detailLevel = (activeDetailPill?.dataset.detail || 'standard') as any;

    const provider = providerSelect?.value || 'gemini';
    const model = modelSelect?.value || undefined;
    const apiKey = keyInput?.value?.trim() || undefined;
    const customInput = document.getElementById('ai-custom-instructions') as HTMLInputElement;
    const customInstructions = customInput?.value?.trim() || undefined;
    const customUrlInput = document.getElementById('ai-base-url') as HTMLInputElement;
    const baseUrl = customUrlInput?.value?.trim() || undefined;

    // Show loading state
    const deckConfig = document.getElementById('ai-deck-config');
    const deckLoading = document.getElementById('ai-deck-loading');
    const loadingStatus = document.getElementById('ai-loading-status');

    if (deckConfig) deckConfig.style.display = 'none';
    if (deckLoading) deckLoading.style.display = 'block';
    if (errorBanner) errorBanner.style.display = 'none';
    if (loadingStatus) {
      loadingStatus.textContent = `Consulting ${provider.toUpperCase()} (${model || 'default'}) to condense Chapters ${start} to ${end} (${focusMode} cut)...`;
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
        provider: provider,
        model: model,
        base_url: baseUrl,
        api_key: apiKey,
        save_key: true,
        output_action: 'preview_only',
      });

      this.lastResult = res;
      this.showReview(res);
    } catch (err: any) {
      console.error('Condensation error:', err);
      if (deckConfig) deckConfig.style.display = 'block';
      if (deckLoading) deckLoading.style.display = 'none';
      if (errorBanner) {
        errorBanner.textContent = err.message || 'An error occurred while condensing chapters.';
        errorBanner.style.display = 'block';
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private showReview(res: any): void {
    const deckLoading = document.getElementById('ai-deck-loading');
    const deckReview = document.getElementById('ai-deck-review');
    const titleInput = document.getElementById('ai-review-title') as HTMLInputElement;
    const contentText = document.getElementById('ai-review-content') as HTMLTextAreaElement;
    const statsBadge = document.getElementById('ai-review-stats');

    if (deckLoading) deckLoading.style.display = 'none';
    if (deckReview) deckReview.style.display = 'block';

    if (titleInput) titleInput.value = res.title || 'Arc Digest';
    if (contentText) contentText.value = res.content || '';

    if (statsBadge) {
      const origWords = Math.round(res.original_chars / 5.5);
      const condWords = Math.round(res.condensed_chars / 5.5);
      statsBadge.textContent = `${res.compression_ratio_pct}% fluff trimmed • Reduced from ~${origWords.toLocaleString()} to ~${condWords.toLocaleString()} words (${res.focus_mode.toUpperCase()} focus)`;
    }
  }

  private async saveToCurrentBook(): Promise<void> {
    if (!this.currentProject || !this.lastResult) return;
    const titleInput = document.getElementById('ai-review-title') as HTMLInputElement;
    const contentText = document.getElementById('ai-review-content') as HTMLTextAreaElement;

    const title = titleInput?.value.trim() || this.lastResult.title;
    const content = contentText?.value.trim() || this.lastResult.content;
    if (!content) {
      alert('Content cannot be empty.');
      return;
    }

    try {
      // Re-call condense with create_chapter action or direct save
      const inputStart = document.getElementById('ai-start-chapter') as HTMLInputElement;
      const inputEnd = document.getElementById('ai-end-chapter') as HTMLInputElement;
      const start = parseInt(inputStart?.value || '1', 10);
      const end = parseInt(inputEnd?.value || '1', 10);

      // Add chapter via API
      const res = await ApiClient.condenseChapters({
        project_id: this.currentProject.id,
        start_index: start,
        end_index: end,
        focus_mode: this.lastResult.focus_mode,
        detail_level: 'standard',
        output_action: 'create_chapter',
        api_key: 'saved', // will use DB saved key
      });

      this.close();
      if (this.onChapterCreated && res.created_chapter_id) {
        await this.onChapterCreated(res.created_chapter_id);
      }
    } catch (e: any) {
      alert('Could not save condensed chapter: ' + e.message);
    }
  }

  private async exportAsNewBook(): Promise<void> {
    if (!this.currentProject || !this.lastResult) return;
    const inputStart = document.getElementById('ai-start-chapter') as HTMLInputElement;
    const inputEnd = document.getElementById('ai-end-chapter') as HTMLInputElement;
    const start = parseInt(inputStart?.value || '1', 10);
    const end = parseInt(inputEnd?.value || '1', 10);

    try {
      const res = await ApiClient.condenseChapters({
        project_id: this.currentProject.id,
        start_index: start,
        end_index: end,
        focus_mode: this.lastResult.focus_mode,
        detail_level: 'standard',
        output_action: 'new_book',
        api_key: 'saved',
      });

      alert(`Created new book: "${this.currentProject.title} (Digest Arc)"! View it in the Library.`);
      this.close();
      window.location.reload();
    } catch (e: any) {
      alert('Could not create new book: ' + e.message);
    }
  }
}

