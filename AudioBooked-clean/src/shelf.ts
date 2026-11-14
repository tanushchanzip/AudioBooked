import { ApiClient } from './api';
import { Icons } from './icons';
import type { Project, LibraryStats, VoicesResponse } from './types';

export class BookshelfManager {
  private projects: Project[] = [];
  private filteredProjects: Project[] = [];
  private stats: LibraryStats | null = null;
  private voicesData: VoicesResponse | null = null;

  private searchQuery = '';
  private currentFilter = 'all';
  private currentSort = 'recent';
  private viewMode: 'grid' | 'table' = 'grid';
  private selectedIds: Set<string> = new Set();

  private editingProjectId: string | null = null;
  private selectedClothColor = 'burgundy';
  private selectedCoverFile: File | null = null;

  private deletingProjectId: string | null = null;
  private mergeCandidateIds: Set<string> = new Set();

  private onOpenStudioCb?: (projectId: string) => void;
  private onPlayProjectCb?: (project: Project) => void;

  constructor() {
    this.initUI();
  }

  public setCallbacks(onOpenStudio: (id: string) => void, onPlayProject: (p: Project) => void): void {
    this.onOpenStudioCb = onOpenStudio;
    this.onPlayProjectCb = onPlayProject;
  }

  public setVoices(voices: VoicesResponse): void {
    this.voicesData = voices;
  }

  private initUI(): void {
    // Search input
    const searchInput = document.getElementById('library-search-input') as HTMLInputElement;
    const searchClear = document.getElementById('library-search-clear');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.searchQuery = searchInput.value.trim().toLowerCase();
        if (searchClear) searchClear.style.display = this.searchQuery ? 'flex' : 'none';
        this.applyFiltersAndRender();
      });
    }

    if (searchClear && searchInput) {
      searchClear.onclick = () => {
        searchInput.value = '';
        this.searchQuery = '';
        searchClear.style.display = 'none';
        searchInput.focus();
        this.applyFiltersAndRender();
      };
    }

    // Refresh button
    const btnRefresh = document.getElementById('btn-refresh-library');
    if (btnRefresh) {
      btnRefresh.onclick = () => this.load();
    }

    // Disk stat click -> open folder
    const btnStatDisk = document.getElementById('btn-stat-disk');
    if (btnStatDisk) {
      btnStatDisk.onclick = () => ApiClient.openRootFolder();
    }

    // Filter pills
    const pillContainer = document.getElementById('library-filter-pills');
    if (pillContainer) {
      pillContainer.addEventListener('click', (e) => {
        const target = (e.target as HTMLElement).closest('.filter-pill') as HTMLElement;
        if (!target) return;
        const filter = target.dataset.filter || 'all';
        this.setFilter(filter);
      });
    }

    // Sort select
    const sortSelect = document.getElementById('library-sort-select') as HTMLSelectElement;
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        this.currentSort = sortSelect.value;
        this.applyFiltersAndRender();
      });
    }

    // View mode toggle
    const btnGrid = document.getElementById('btn-view-grid');
    const btnTable = document.getElementById('btn-view-table');
    if (btnGrid) {
      btnGrid.onclick = () => this.setViewMode('grid');
    }
    if (btnTable) {
      btnTable.onclick = () => this.setViewMode('table');
    }

    // Batch actions
    const btnBatchDeselect = document.getElementById('btn-batch-deselect');
    if (btnBatchDeselect) {
      btnBatchDeselect.onclick = () => this.clearSelection();
    }

    const btnBatchDelete = document.getElementById('btn-batch-delete');
    if (btnBatchDelete) {
      btnBatchDelete.onclick = () => this.performBatchDelete();
    }

    const btnBatchExport = document.getElementById('btn-batch-export');
    if (btnBatchExport) {
      btnBatchExport.onclick = () => this.performBatchExport();
    }

    const btnBatchSynth = document.getElementById('btn-batch-synthesize');
    if (btnBatchSynth) {
      btnBatchSynth.onclick = () => this.performBatchSynthesize();
    }

    const btnBatchMerge = document.getElementById('btn-batch-merge');
    if (btnBatchMerge) {
      btnBatchMerge.onclick = () => this.openMergeModal(Array.from(this.selectedIds));
    }

    // Edit modal listeners
    this.initEditModal();

    // Delete modal listeners
    this.initDeleteModal();

    // Merge modal listeners
    this.initMergeModal();
  }

  private initEditModal(): void {
    const modal = document.getElementById('modal-edit-book');
    const btnClose = document.getElementById('btn-close-edit-modal');
    const btnCancel = document.getElementById('btn-cancel-edit');
    const form = document.getElementById('form-edit-book') as HTMLFormElement;

    const closeFn = () => this.closeEditModal();
    if (btnClose) btnClose.onclick = closeFn;
    if (btnCancel) btnCancel.onclick = closeFn;

    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) closeFn();
      };
    }

    // Cloth swatch buttons
    document.querySelectorAll('.colorway-btn').forEach((btn) => {
      (btn as HTMLElement).onclick = () => {
        document.querySelectorAll('.colorway-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedClothColor = (btn as HTMLElement).dataset.cloth || 'burgundy';
        this.selectedCoverFile = null;
        const nameLabel = document.getElementById('edit-cover-filename');
        if (nameLabel) nameLabel.textContent = `Cloth preset: ${this.selectedClothColor}`;
      };
    });

    // File input
    const fileInput = document.getElementById('edit-cover-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.onchange = () => {
        if (fileInput.files && fileInput.files[0]) {
          this.selectedCoverFile = fileInput.files[0];
          const nameLabel = document.getElementById('edit-cover-filename');
          if (nameLabel) nameLabel.textContent = this.selectedCoverFile.name;
          document.querySelectorAll('.colorway-btn').forEach((b) => b.classList.remove('active'));
        }
      };
    }

    // Sliders
    const speedSlider = document.getElementById('edit-speed-input') as HTMLInputElement;
    const speedVal = document.getElementById('edit-speed-val');
    if (speedSlider && speedVal) {
      speedSlider.oninput = () => {
        speedVal.textContent = `${parseFloat(speedSlider.value).toFixed(2)}×`;
      };
    }

    const thoughtSpeedSlider = document.getElementById('edit-thought-speed-input') as HTMLInputElement;
    const thoughtSpeedVal = document.getElementById('edit-thought-speed-val');
    if (thoughtSpeedSlider && thoughtSpeedVal) {
      thoughtSpeedSlider.oninput = () => {
        thoughtSpeedVal.textContent = `${parseFloat(thoughtSpeedSlider.value).toFixed(2)}×`;
      };
    }

    // Submit
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        await this.saveEditModal();
      };
    }
  }

  private initDeleteModal(): void {
    const modal = document.getElementById('modal-delete-book');
    const btnClose = document.getElementById('btn-close-delete-modal');
    const btnCancel = document.getElementById('btn-cancel-delete');
    const btnConfirm = document.getElementById('btn-confirm-delete');

    const closeFn = () => this.closeDeleteModal();
    if (btnClose) btnClose.onclick = closeFn;
    if (btnCancel) btnCancel.onclick = closeFn;

    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) closeFn();
      };
    }

    if (btnConfirm) {
      btnConfirm.onclick = async () => {
        await this.confirmDelete();
      };
    }
  }

  public async load(): Promise<void> {
    try {
      const [projects, stats] = await Promise.all([
        ApiClient.getProjects(),
        ApiClient.getLibraryStats().catch(() => null),
      ]);

      this.projects = Array.isArray(projects) ? projects : [];
      this.stats = stats;
      this.updateStatsUI();
      this.applyFiltersAndRender();
    } catch (err: any) {
      const grid = document.getElementById('bookshelf-grid');
      if (grid) grid.innerHTML = `<div class="shelf-error">Could not load library: ${err.message}</div>`;
    }
  }

  private updateStatsUI(): void {
    const elBooks = document.getElementById('lib-stat-books');
    const elDuration = document.getElementById('lib-stat-duration');
    const elChapters = document.getElementById('lib-stat-chapters');
    const elDisk = document.getElementById('lib-stat-disk');

    if (this.stats) {
      if (elBooks) elBooks.textContent = `${this.stats.total_books}`;
      if (elDuration) elDuration.textContent = this.stats.formatted_duration || '0m';
      if (elChapters) elChapters.textContent = `${this.stats.completed_chapters} / ${this.stats.total_chapters}`;
      if (elDisk) elDisk.textContent = this.stats.formatted_disk_size || '0 MB';
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
      const mins = Math.floor((totalSecs % 3600) / 60);
      const durStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      if (elBooks) elBooks.textContent = `${totalCount}`;
      if (elDuration) elDuration.textContent = durStr;
      if (elChapters) elChapters.textContent = `${completedChs} / ${totalChs}`;
    }
  }

  public setFilter(filter: string): void {
    this.currentFilter = filter;
    document.querySelectorAll('.filter-pill').forEach((pill) => {
      if ((pill as HTMLElement).dataset.filter === filter) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
    this.applyFiltersAndRender();
  }

  public setViewMode(mode: 'grid' | 'table'): void {
    this.viewMode = mode;
    const btnGrid = document.getElementById('btn-view-grid');
    const btnTable = document.getElementById('btn-view-table');

    if (btnGrid && btnTable) {
      if (mode === 'grid') {
        btnGrid.classList.add('active');
        btnTable.classList.remove('active');
      } else {
        btnGrid.classList.remove('active');
        btnTable.classList.add('active');
      }
    }
    this.render();
  }

  private applyFiltersAndRender(): void {
    // 1. Filter
    this.filteredProjects = this.projects.filter((p) => {
      // Search
      if (this.searchQuery) {
        const titleMatch = (p.title || '').toLowerCase().includes(this.searchQuery);
        const authorMatch = (p.author || '').toLowerCase().includes(this.searchQuery);
        const urlMatch = (p.source_url || '').toLowerCase().includes(this.searchQuery);
        if (!titleMatch && !authorMatch && !urlMatch) return false;
      }

      // Filter Pill
      const totalCh = p.chapter_count ?? 0;
      const doneCh = p.completed_chapters ?? 0;
      const isDone = totalCh > 0 && doneCh === totalCh;
      const isSynth = p.status === 'processing';

      switch (this.currentFilter) {
        case 'ready':
          return isDone;
        case 'synthesizing':
          return isSynth;
        case 'pending':
          return !isDone && !isSynth;
        case 'links':
          return p.source_type === 'links';
        case 'article':
          return p.source_type === 'article';
        case 'file':
          return ['epub', 'pdf', 'txt', 'file'].includes(p.source_type);
        case 'all':
        default:
          return true;
      }
    });

    // 2. Sort
    this.filteredProjects.sort((a, b) => {
      switch (this.currentSort) {
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'author-asc':
          return a.author.localeCompare(b.author);
        case 'duration-desc':
          return (b.total_duration ?? 0) - (a.total_duration ?? 0);
        case 'chapters-desc':
          return (b.chapter_count ?? 0) - (a.chapter_count ?? 0);
        case 'recent':
        default:
          return (b.created_at || '').localeCompare(a.created_at || '');
      }
    });

    this.updateFilterCounts();
    this.render();
  }

  private updateFilterCounts(): void {
    const counts: Record<string, number> = {
      all: this.projects.length,
      ready: 0,
      synth: 0,
      draft: 0,
      novels: 0,
      articles: 0,
      books: 0,
    };

    this.projects.forEach((p) => {
      const totalCh = p.chapter_count ?? 0;
      const doneCh = p.completed_chapters ?? 0;
      const isDone = totalCh > 0 && doneCh === totalCh;
      const isSynth = p.status === 'processing';

      if (isDone) counts.ready!++;
      if (isSynth) counts.synth!++;
      if (!isDone && !isSynth) counts.draft!++;

      if (p.source_type === 'links') counts.novels!++;
      else if (p.source_type === 'article') counts.articles!++;
      else if (['epub', 'pdf', 'txt', 'file'].includes(p.source_type)) counts.books!++;
    });

    const setBadge = (id: string, val: number) => {
      const el = document.getElementById(id);
      if (el) el.textContent = `${val}`;
    };

    setBadge('count-all', counts.all);
    setBadge('count-ready', counts.ready);
    setBadge('count-synth', counts.synth);
    setBadge('count-draft', counts.draft);
    setBadge('count-novels', counts.novels);
    setBadge('count-articles', counts.articles);
    setBadge('count-books', counts.books);
  }

  public render(): void {
    const grid = document.getElementById('bookshelf-grid');
    const ledger = document.getElementById('bookshelf-ledger');
    const batchBar = document.getElementById('library-batch-bar');

    // Batch Bar visibility
    if (batchBar) {
      if (this.selectedIds.size > 0) {
        batchBar.style.display = 'flex';
        const countEl = document.getElementById('batch-selected-count');
        if (countEl) countEl.textContent = `${this.selectedIds.size} selected`;

        const btnMerge = document.getElementById('btn-batch-merge');
        if (btnMerge) {
          btnMerge.style.display = this.selectedIds.size >= 2 ? 'inline-flex' : 'none';
        }
      } else {
        batchBar.style.display = 'none';
      }
    }

    if (this.viewMode === 'grid') {
      if (grid) grid.style.display = 'grid';
      if (ledger) ledger.style.display = 'none';
      this.renderGrid();
    } else {
      if (grid) grid.style.display = 'none';
      if (ledger) ledger.style.display = 'block';
      this.renderLedger();
    }
  }

  private getClothClass(project: Project): string {
    if (project.cover_image && project.cover_image.startsWith('color:')) {
      const col = project.cover_image.replace('color:', '');
      return `cloth-${col}`;
    }
    // Deterministic cloth colorway based on title hash
    const colors = ['burgundy', 'navy', 'forest', 'charcoal', 'terracotta'];
    let hash = 0;
    for (let i = 0; i < project.title.length; i++) {
      hash = (hash << 5) - hash + project.title.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % colors.length;
    return `cloth-${colors[idx]}`;
  }

  private renderGrid(): void {
    const grid = document.getElementById('bookshelf-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (this.filteredProjects.length === 0) {
      grid.innerHTML = `
        <div class="shelf-empty">
          <div class="empty-icon">${Icons.book(36)}</div>
          <h3>${this.projects.length === 0 ? 'Your Library is Empty' : 'No Works Match Filter'}</h3>
          <p>${this.projects.length === 0 ? 'Begin by importing a web novel, an article, or an EPUB / PDF book.' : 'Try changing your search terms or filter selection.'}</p>
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
      const card = document.createElement('article');
      card.className = 'book-card';
      card.onclick = () => {
        if (this.onOpenStudioCb) this.onOpenStudioCb(project.id);
      };

      const completedCount = project.completed_chapters ?? 0;
      const totalCount = project.chapter_count ?? 0;
      const totalSecs = project.total_duration ?? 0;
      const mins = Math.round(totalSecs / 60);

      const isAllDone = totalCount > 0 && completedCount === totalCount;
      const isProcessing = project.status === 'processing';
      const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      let badgeHtml = '';
      if (isAllDone) {
        badgeHtml = `<span class="book-badge badge-done">${Icons.check(12)} Complete</span>`;
      } else if (isProcessing) {
        badgeHtml = `<span class="book-badge badge-active">${Icons.refresh(12)} Synthesizing</span>`;
      } else {
        badgeHtml = `<span class="book-badge badge-draft">${completedCount}/${totalCount} Ch</span>`;
      }

      const clothClass = this.getClothClass(project);
      const hasCustomCover = project.cover_image && !project.cover_image.startsWith('color:');

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
                <img class="book-cover-thumb" src="/cover/${encodeURIComponent(project.cover_image!)}" alt="Cover" loading="lazy">
              ` : ''}
              <div class="book-titles-col">
                <h3 class="book-title" title="${project.title}">${project.title}</h3>
                <p class="book-author">${project.author}</p>
              </div>
            </div>

            <div class="book-stats">
              <span>${totalCount} ${totalCount === 1 ? 'Chapter' : 'Chapters'}</span>
              ${mins > 0 ? `<span>• ${mins} min</span>` : ''}
              <span>• ${project.narrator_voice.replace('_', ' ')}</span>
            </div>
          </div>

          <div class="jacket-progress-track">
            <div class="jacket-progress-fill ${isAllDone ? 'done' : ''}" style="width: ${pct}%"></div>
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
            </a>` : ''}

          <button class="btn-card-action btn-card-icon-only btn-card-danger" title="Remove from Library" onclick="event.stopPropagation(); window.__audiobooked.openDeleteModal('${project.id}')">
            ${Icons.trash(14)}
          </button>
        </div>
      `;

      grid.appendChild(card);
    });
  }

  private renderLedger(): void {
    const ledger = document.getElementById('bookshelf-ledger');
    if (!ledger) return;

    if (this.filteredProjects.length === 0) {
      ledger.innerHTML = `
        <div class="shelf-empty">
          <div class="empty-icon">${Icons.book(36)}</div>
          <h3>${this.projects.length === 0 ? 'Your Library is Empty' : 'No Works Match Filter'}</h3>
          <p>${this.projects.length === 0 ? 'Begin by importing a web novel, an article, or an EPUB / PDF book.' : 'Try changing your search terms or filter selection.'}</p>
        </div>
      `;
      return;
    }

    const allSelected = this.filteredProjects.length > 0 && this.filteredProjects.every((p) => this.selectedIds.has(p.id));

    let rowsHtml = '';
    this.filteredProjects.forEach((project) => {
      const isSelected = this.selectedIds.has(project.id);
      const totalCh = project.chapter_count ?? 0;
      const doneCh = project.completed_chapters ?? 0;
      const pct = totalCh > 0 ? Math.round((doneCh / totalCh) * 100) : 0;
      const isAllDone = totalCh > 0 && doneCh === totalCh;

      const totalSecs = project.total_duration ?? 0;
      const hours = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const durStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      const clothClass = this.getClothClass(project);

      rowsHtml += `
        <tr class="ledger-row ${isSelected ? 'selected' : ''}">
          <td class="ledger-col-check">
            <input type="checkbox" class="ledger-checkbox" data-id="${project.id}" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); window.__audiobooked.toggleProjectSelect('${project.id}')">
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
            <div style="font-size: 0.8rem; color: var(--text-ink);">${project.narrator_voice.replace('_', ' ')}</div>
            <div style="font-size: 0.72rem; color: var(--text-faint);">${project.speed}× pace</div>
          </td>
          <td class="ledger-progress-cell">
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
              <span>${doneCh} / ${totalCh} ch</span>
              <span>${pct}%</span>
            </div>
            <div class="ledger-progress-bar">
              <div class="ledger-progress-fill ${isAllDone ? 'done' : ''}" style="width: ${pct}%"></div>
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
                </button>` : ''}
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
                </a>` : ''}
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
              <input type="checkbox" id="ledger-check-all" ${allSelected ? 'checked' : ''} onclick="window.__audiobooked.toggleSelectAll()">
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

  // Selection
  public toggleProjectSelect(id: string): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.render();
  }

  public toggleSelectAll(): void {
    const allSelected = this.filteredProjects.length > 0 && this.filteredProjects.every((p) => this.selectedIds.has(p.id));
    if (allSelected) {
      this.selectedIds.clear();
    } else {
      this.filteredProjects.forEach((p) => this.selectedIds.add(p.id));
    }
    this.render();
  }

  public clearSelection(): void {
    this.selectedIds.clear();
    this.render();
  }

  // Modals: Edit
  public openEditModal(projectId: string): void {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;

    this.editingProjectId = projectId;
    this.selectedCoverFile = null;

    const idInput = document.getElementById('edit-book-id') as HTMLInputElement;
    const titleInput = document.getElementById('edit-book-title') as HTMLInputElement;
    const authorInput = document.getElementById('edit-book-author') as HTMLInputElement;
    const speedInput = document.getElementById('edit-speed-input') as HTMLInputElement;
    const speedVal = document.getElementById('edit-speed-val');
    const thoughtSpeedInput = document.getElementById('edit-thought-speed-input') as HTMLInputElement;
    const thoughtSpeedVal = document.getElementById('edit-thought-speed-val');
    const coverName = document.getElementById('edit-cover-filename');

    if (idInput) idInput.value = project.id;
    if (titleInput) titleInput.value = project.title;
    if (authorInput) authorInput.value = project.author;

    if (speedInput) speedInput.value = `${project.speed || 1.0}`;
    if (speedVal) speedVal.textContent = `${(project.speed || 1.0).toFixed(2)}×`;

    if (thoughtSpeedInput) thoughtSpeedInput.value = `${project.thought_speed || 0.9}`;
    if (thoughtSpeedVal) thoughtSpeedVal.textContent = `${(project.thought_speed || 0.9).toFixed(2)}×`;

    if (coverName) {
      if (project.cover_image && !project.cover_image.startsWith('color:')) {
        coverName.textContent = `Custom artwork: ${project.cover_image}`;
      } else {
        coverName.textContent = 'Using cloth preset (upload to replace)';
      }
    }

    // Populate voices in dropdowns
    this.populateEditVoiceDropdowns(project);

    // Set cloth preset
    let currentCloth = 'burgundy';
    if (project.cover_image && project.cover_image.startsWith('color:')) {
      currentCloth = project.cover_image.replace('color:', '');
    }
    this.selectedClothColor = currentCloth;
    document.querySelectorAll('.colorway-btn').forEach((b) => {
      if ((b as HTMLElement).dataset.cloth === currentCloth) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    const modal = document.getElementById('modal-edit-book');
    if (modal) modal.style.display = 'flex';
  }

  private populateEditVoiceDropdowns(project: Project): void {
    if (!this.voicesData) return;
    const populate = (id: string, selected: string) => {
      const sel = document.getElementById(id) as HTMLSelectElement;
      if (!sel) return;
      sel.innerHTML = '';
      this.voicesData!.voices.forEach((v) => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v.replace('_', ' ');
        if (v === selected) opt.selected = true;
        sel.appendChild(opt);
      });
    };

    populate('edit-narrator-voice', project.narrator_voice);
    populate('edit-dialogue-voice', project.dialogue_voice);
    populate('edit-thought-voice', project.thought_voice);
  }

  public closeEditModal(): void {
    const modal = document.getElementById('modal-edit-book');
    if (modal) modal.style.display = 'none';
    this.editingProjectId = null;
    this.selectedCoverFile = null;
  }

  private async saveEditModal(): Promise<void> {
    if (!this.editingProjectId) return;

    const titleInput = document.getElementById('edit-book-title') as HTMLInputElement;
    const authorInput = document.getElementById('edit-book-author') as HTMLInputElement;
    const narratorSel = document.getElementById('edit-narrator-voice') as HTMLSelectElement;
    const dialogueSel = document.getElementById('edit-dialogue-voice') as HTMLSelectElement;
    const thoughtSel = document.getElementById('edit-thought-voice') as HTMLSelectElement;
    const speedInput = document.getElementById('edit-speed-input') as HTMLInputElement;
    const thoughtSpeedInput = document.getElementById('edit-thought-speed-input') as HTMLInputElement;

    const updates: Partial<Project> = {
      title: titleInput ? titleInput.value.trim() : undefined,
      author: authorInput ? authorInput.value.trim() : undefined,
      narrator_voice: narratorSel ? narratorSel.value : undefined,
      dialogue_voice: dialogueSel ? dialogueSel.value : undefined,
      thought_voice: thoughtSel ? thoughtSel.value : undefined,
      speed: speedInput ? parseFloat(speedInput.value) : undefined,
      thought_speed: thoughtSpeedInput ? parseFloat(thoughtSpeedInput.value) : undefined,
    };

    // If cloth preset chosen without file
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
    } catch (err: any) {
      alert('Failed to save changes: ' + err.message);
    }
  }

  // Modals: Delete
  public openDeleteModal(projectId: string): void {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;

    this.deletingProjectId = projectId;
    const titleEl = document.getElementById('delete-book-title');
    if (titleEl) titleEl.textContent = `"${project.title}"`;

    const modal = document.getElementById('modal-delete-book');
    if (modal) modal.style.display = 'flex';
  }

  public closeDeleteModal(): void {
    const modal = document.getElementById('modal-delete-book');
    if (modal) modal.style.display = 'none';
    this.deletingProjectId = null;
  }

  private async confirmDelete(): Promise<void> {
    if (!this.deletingProjectId) return;
    const chk = document.getElementById('delete-remove-files') as HTMLInputElement;
    const deleteFiles = chk ? chk.checked : true;

    try {
      await ApiClient.deleteProject(this.deletingProjectId, deleteFiles);
      this.selectedIds.delete(this.deletingProjectId);
      this.closeDeleteModal();
      await this.load();
    } catch (err: any) {
      alert('Failed to delete work: ' + err.message);
    }
  }

  // Batch actions
  public async performBatchDelete(): Promise<void> {
    if (this.selectedIds.size === 0) return;
    const count = this.selectedIds.size;
    if (!confirm(`Are you sure you want to delete ${count} selected work(s) from your library?`)) {
      return;
    }

    try {
      await ApiClient.batchDeleteProjects(Array.from(this.selectedIds), true);
      this.selectedIds.clear();
      await this.load();
    } catch (err: any) {
      alert('Batch delete failed: ' + err.message);
    }
  }

  public async performBatchExport(): Promise<void> {
    if (this.selectedIds.size === 0) return;
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

  public async performBatchSynthesize(): Promise<void> {
    if (this.selectedIds.size === 0) return;
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

  // Modals: Merge Works
  private initMergeModal(): void {
    const modal = document.getElementById('modal-merge-books');
    const btnClose = document.getElementById('btn-close-merge-modal');
    const btnCancel = document.getElementById('btn-cancel-merge');
    const form = document.getElementById('form-merge-books') as HTMLFormElement;
    const addSelect = document.getElementById('merge-add-project-select') as HTMLSelectElement;
    const targetSelect = document.getElementById('merge-target-select') as HTMLSelectElement;

    const closeFn = () => this.closeMergeModal();
    if (btnClose) btnClose.onclick = closeFn;
    if (btnCancel) btnCancel.onclick = closeFn;

    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) closeFn();
      };
    }

    if (addSelect) {
      addSelect.addEventListener('change', () => {
        const id = addSelect.value;
        if (id) {
          this.mergeCandidateIds.add(id);
          this.updateMergeModalUI();
        }
      });
    }

    if (targetSelect) {
      targetSelect.addEventListener('change', () => {
        const targetId = targetSelect.value;
        const targetProj = this.projects.find((p) => p.id === targetId);
        if (targetProj) {
          const titleInput = document.getElementById('merge-new-title') as HTMLInputElement;
          const authorInput = document.getElementById('merge-new-author') as HTMLInputElement;
          if (titleInput && !titleInput.value) titleInput.value = targetProj.title;
          if (authorInput && !authorInput.value) authorInput.value = targetProj.author;
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

  public openMergeModal(initialIds: string[] | string): void {
    this.mergeCandidateIds.clear();
    const ids = Array.isArray(initialIds) ? initialIds : [initialIds];
    ids.forEach((id) => this.mergeCandidateIds.add(id));

    // If only 1 project selected, find any other projects with similar or identical title to auto-suggest
    if (this.mergeCandidateIds.size === 1) {
      const firstId = ids[0]!;
      const firstProj = this.projects.find((p) => p.id === firstId);
      if (firstProj) {
        const matches = this.projects.filter(
          (p) => p.id !== firstId && p.title.toLowerCase().trim() === firstProj.title.toLowerCase().trim()
        );
        matches.forEach((m) => this.mergeCandidateIds.add(m.id));
      }
    }

    this.updateMergeModalUI();

    const modal = document.getElementById('modal-merge-books');
    if (modal) modal.style.display = 'flex';
  }

  public closeMergeModal(): void {
    const modal = document.getElementById('modal-merge-books');
    if (modal) modal.style.display = 'none';
    this.mergeCandidateIds.clear();
  }

  private updateMergeModalUI(): void {
    const listEl = document.getElementById('merge-works-list');
    const addSelect = document.getElementById('merge-add-project-select') as HTMLSelectElement;
    const targetSelect = document.getElementById('merge-target-select') as HTMLSelectElement;
    const titleInput = document.getElementById('merge-new-title') as HTMLInputElement;
    const authorInput = document.getElementById('merge-new-author') as HTMLInputElement;

    const candidateProjects = this.projects.filter((p) => this.mergeCandidateIds.has(p.id));

    // Render works list
    if (listEl) {
      if (candidateProjects.length === 0) {
        listEl.innerHTML = `<div class="shelf-empty" style="padding: 1rem;">Please select at least 2 works to merge.</div>`;
      } else {
        listEl.innerHTML = candidateProjects
          .map((p) => {
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
          })
          .join('');
      }
    }

    // Populate Add More Select
    if (addSelect) {
      addSelect.innerHTML = '<option value="">-- Choose work to add to merge list --</option>';
      const available = this.projects.filter((p) => !this.mergeCandidateIds.has(p.id));
      available.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.title} (${p.chapter_count ?? 0} ch, ${p.author})`;
        addSelect.appendChild(opt);
      });
      addSelect.value = '';
    }

    // Populate Target Select
    if (targetSelect) {
      const prevTarget = targetSelect.value;
      targetSelect.innerHTML = '';
      candidateProjects.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.title} (${p.chapter_count ?? 0} ch) — Master`;
        targetSelect.appendChild(opt);
      });

      // Default to project with most chapters or previous target
      if (prevTarget && this.mergeCandidateIds.has(prevTarget)) {
        targetSelect.value = prevTarget;
      } else if (candidateProjects.length > 0) {
        const best = [...candidateProjects].sort((a, b) => (b.chapter_count ?? 0) - (a.chapter_count ?? 0))[0]!;
        targetSelect.value = best.id;
      }
    }

    // Pre-fill unified title & author if empty
    if (candidateProjects.length > 0) {
      const primary = this.projects.find((p) => p.id === targetSelect.value) || candidateProjects[0]!;
      if (titleInput && (!titleInput.value || !this.editingProjectId)) {
        titleInput.value = primary.title;
      }
      if (authorInput && (!authorInput.value || !this.editingProjectId)) {
        authorInput.value = primary.author;
      }
    }
  }

  public removeMergeCandidate(id: string): void {
    this.mergeCandidateIds.delete(id);
    this.updateMergeModalUI();
  }

  private async submitMerge(): Promise<void> {
    if (this.mergeCandidateIds.size < 2) {
      alert('Please select at least 2 works to merge.');
      return;
    }

    const targetSelect = document.getElementById('merge-target-select') as HTMLSelectElement;
    const titleInput = document.getElementById('merge-new-title') as HTMLInputElement;
    const authorInput = document.getElementById('merge-new-author') as HTMLInputElement;
    const strategyRadios = document.getElementsByName('merge-strategy') as NodeListOf<HTMLInputElement>;
    const chkDeduplicate = document.getElementById('merge-deduplicate') as HTMLInputElement;
    const chkCleanup = document.getElementById('merge-cleanup-sources') as HTMLInputElement;
    const submitBtn = document.getElementById('btn-submit-merge') as HTMLButtonElement;

    const targetId = targetSelect.value;
    if (!targetId) {
      alert('Please select a primary destination book.');
      return;
    }

    let strategy: 'smart_sort' | 'append' = 'smart_sort';
    strategyRadios.forEach((r) => {
      if (r.checked) strategy = r.value as any;
    });

    const sources = Array.from(this.mergeCandidateIds).filter((id) => id !== targetId);
    if (sources.length === 0) {
      alert('Please select at least one other work to merge into the primary book.');
      return;
    }

    const origBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Consolidating Volumes...';

    try {
      const res = await ApiClient.mergeProjects({
        target_project_id: targetId,
        source_project_ids: sources,
        new_title: titleInput ? titleInput.value.trim() : undefined,
        new_author: authorInput ? authorInput.value.trim() : undefined,
        strategy,
        deduplicate: chkDeduplicate ? chkDeduplicate.checked : true,
        delete_sources: chkCleanup ? chkCleanup.checked : true,
      });

      this.closeMergeModal();
      this.selectedIds.clear();
      await this.load();

      alert(`Merge Complete!\n\nConsolidated into: "${res.title}"\nTotal Chapters: ${res.total_chapters}\nCompleted Audio: ${res.completed_chapters}\nDuplicates Removed: ${res.deduplicated_count}`);
    } catch (err: any) {
      alert('Failed to merge works: ' + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origBtnText;
    }
  }
}
