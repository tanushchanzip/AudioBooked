import { ApiClient } from './api';
import { Icons } from './icons';
import type { VoicesResponse, VoiceInfo } from './types';

export class VoiceGalleryManager {
  private voicesData: VoicesResponse | null = null;
  private audio: HTMLAudioElement;
  private currentPlayingId: string | null = null;
  private isPlaying: boolean = false;
  private currentFilter: string = 'all'; // all, rec, us, uk, female, male, intl
  private currentRoleFilter: string = 'all'; // all, narrator, dialogue, thought
  private searchQuery: string = '';
  private customText: string = '';
  private customSpeed: number = 1.0;
  private onSelectRoleCallback?: (role: 'narrator' | 'dialogue' | 'thought', voiceId: string) => void;
  private onOpenBlenderCallback?: () => void;
  private onDeleteCustomVoiceCallback?: (voiceId: string) => Promise<void>;

  constructor() {
    this.audio = new Audio();
    this.initAudioListeners();
    this.initControls();
  }

  public setRoleSelectCallback(cb: (role: 'narrator' | 'dialogue' | 'thought', voiceId: string) => void): void {
    this.onSelectRoleCallback = cb;
  }

  public setOpenBlenderCallback(cb: () => void): void {
    this.onOpenBlenderCallback = cb;
  }

  public setDeleteCustomVoiceCallback(cb: (voiceId: string) => Promise<void>): void {
    this.onDeleteCustomVoiceCallback = cb;
  }

  public setVoices(data: VoicesResponse): void {
    this.voicesData = data;
    this.render();
  }

  private initAudioListeners(): void {
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.updatePlayingUI();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updatePlayingUI();
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.currentPlayingId = null;
      this.updatePlayingUI();
    });

    this.audio.addEventListener('error', (e) => {
      console.error('Audition playback failed:', e);
      this.isPlaying = false;
      this.currentPlayingId = null;
      this.updatePlayingUI();
      this.showToast('Could not play voice preview. Check engine status.');
    });
  }

  private initControls(): void {
    // Open Voice Blender button
    const btnOpenBlender = document.getElementById('btn-open-voice-blender');
    if (btnOpenBlender) {
      btnOpenBlender.onclick = () => {
        if (this.onOpenBlenderCallback) {
          this.onOpenBlenderCallback();
        }
      };
    }

    // Search input
    const searchInput = document.getElementById('voices-search-input') as HTMLInputElement | null;
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.searchQuery = searchInput.value.trim().toLowerCase();
        this.render();
      });
    }

    // Filter pills
    const pillContainer = document.getElementById('voices-filter-pills');
    if (pillContainer) {
      pillContainer.addEventListener('click', (e) => {
        const target = (e.target as HTMLElement).closest('.filter-pill') as HTMLElement | null;
        if (!target) return;
        const filter = target.dataset.filter || 'all';
        this.currentFilter = filter;
        pillContainer.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
        target.classList.add('active');
        this.render();
      });
    }

    // Role filter pills
    const roleContainer = document.getElementById('voices-role-pills');
    if (roleContainer) {
      roleContainer.addEventListener('click', (e) => {
        const target = (e.target as HTMLElement).closest('.filter-pill') as HTMLElement | null;
        if (!target) return;
        const role = target.dataset.role || 'all';
        this.currentRoleFilter = role;
        roleContainer.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
        target.classList.add('active');
        this.render();
      });
    }

    // Tester input
    const testerInput = document.getElementById('voices-tester-text') as HTMLInputElement | null;
    if (testerInput) {
      testerInput.addEventListener('input', () => {
        this.customText = testerInput.value.trim();
      });
    }

    // Tester speed slider
    const speedSlider = document.getElementById('voices-tester-speed') as HTMLInputElement | null;
    const speedValue = document.getElementById('voices-tester-speed-val');
    if (speedSlider) {
      speedSlider.addEventListener('input', () => {
        this.customSpeed = parseFloat(speedSlider.value);
        if (speedValue) speedValue.textContent = `${this.customSpeed.toFixed(2)}×`;
      });
    }

    // Quick preset buttons for tester
    const presetBtns = document.querySelectorAll('.tester-preset-btn');
    presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const phrase = (btn as HTMLElement).dataset.phrase || '';
        if (testerInput && phrase) {
          testerInput.value = phrase;
          this.customText = phrase;
        }
      });
    });

    // Stop audio button
    const btnStop = document.getElementById('btn-stop-audition');
    if (btnStop) {
      btnStop.onclick = () => this.stopAudition();
    }
  }

  public async playAudition(voiceId: string, customPhrase?: string): Promise<void> {
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
    } catch (err: any) {
      console.warn('Playback request error:', err);
      this.isPlaying = false;
      this.currentPlayingId = null;
      this.updatePlayingUI();
    }
  }

  public stopAudition(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying = false;
    this.currentPlayingId = null;
    this.updatePlayingUI();
  }

  private updatePlayingUI(): void {
    document.querySelectorAll('.voice-card').forEach((card) => {
      const vId = (card as HTMLElement).dataset.voiceId;
      const isCardActive = vId === this.currentPlayingId && this.isPlaying;
      card.classList.toggle('playing', isCardActive);

      const playBtn = card.querySelector('.btn-voice-audition') as HTMLElement | null;
      if (playBtn) {
        if (isCardActive) {
          playBtn.innerHTML = `${Icons.pause(16)} <span>Pause</span>`;
          playBtn.classList.add('btn-playing');
        } else {
          playBtn.innerHTML = `${Icons.play(16)} <span>Audition</span>`;
          playBtn.classList.remove('btn-playing');
        }
      }
    });

    const stopBtn = document.getElementById('btn-stop-audition');
    if (stopBtn) {
      stopBtn.style.display = this.isPlaying ? 'inline-flex' : 'none';
    }
  }

  public render(): void {
    const grid = document.getElementById('voice-cards-grid');
    if (!grid) return;

    if (!this.voicesData || !this.voicesData.voices) {
      grid.innerHTML = `<div class="voices-loading">Loading Kokoro neural voice catalog...</div>`;
      return;
    }

    const details = this.voicesData.details || {};
    const recommended = this.voicesData.recommended || { narrator: [], dialogue: [], thought: [] };
    const allRecSet = new Set([...recommended.narrator, ...recommended.dialogue, ...recommended.thought]);

    const filtered = this.voicesData.voices.filter((vId) => {
      const info = details[vId] || this.fallbackInfo(vId);

      // 1. Accent & Group Filter
      if (this.currentFilter === 'custom' && !info.is_custom && !vId.startsWith('cv_')) return false;
      if (this.currentFilter === 'rec' && !allRecSet.has(vId)) return false;
      if (this.currentFilter === 'us' && info.accent !== 'American') return false;
      if (this.currentFilter === 'uk' && info.accent !== 'British') return false;
      if (this.currentFilter === 'female' && info.gender !== 'female') return false;
      if (this.currentFilter === 'male' && info.gender !== 'male') return false;
      if (this.currentFilter === 'intl' && (info.accent === 'American' || info.accent === 'British' || info.accent === 'Hybrid')) return false;

      // 2. Role Filter
      if (this.currentRoleFilter !== 'all') {
        const isRecForRole = (recommended as any)[this.currentRoleFilter]?.includes(vId);
        const matchesRole = info.role === this.currentRoleFilter || isRecForRole;
        if (!matchesRole) return false;
      }

      // 3. Search Query
      if (this.searchQuery) {
        const haystack = `${info.name} ${info.id} ${info.accent} ${info.gender} ${info.description} ${info.tags.join(' ')}`.toLowerCase();
        if (!haystack.includes(this.searchQuery)) return false;
      }

      return true;
    });

    // Update count labels
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

    grid.innerHTML = '';
    filtered.forEach((vId) => {
      const info = details[vId] || this.fallbackInfo(vId);
      const isCustom = info.is_custom || vId.startsWith('cv_');
      const isNarratorRec = recommended.narrator?.includes(vId);
      const isDialogueRec = recommended.dialogue?.includes(vId);
      const isThoughtRec = recommended.thought?.includes(vId);

      const card = document.createElement('article');
      card.className = `voice-card ${isCustom ? 'is-custom' : ''} ${this.currentPlayingId === vId && this.isPlaying ? 'playing' : ''}`;
      card.dataset.voiceId = vId;

      let rolePill = '';
      if (isCustom) {
        rolePill = `<span class="voice-badge badge-custom">✨ Neural Blend</span>`;
      } else if (isNarratorRec) {
        rolePill = `<span class="voice-badge badge-narrator">Recommended Narrator</span>`;
      } else if (isDialogueRec) {
        rolePill = `<span class="voice-badge badge-dialogue">Recommended Dialogue</span>`;
      } else if (isThoughtRec) {
        rolePill = `<span class="voice-badge badge-thought">Recommended Thought</span>`;
      }

      let deleteBtn = '';
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
              <span class="meta-pill gender-pill">${info.gender === 'female' ? 'Female' : info.gender === 'male' ? 'Male' : 'Blend'}</span>
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
          ${info.tags.map((t: string) => `<span class="tag-chip">${t}</span>`).join('')}
        </div>

        <footer class="voice-card-footer">
          <button class="btn-voice-audition ${this.currentPlayingId === vId && this.isPlaying ? 'btn-playing' : ''}" onclick="window.__audiobooked.auditionVoice('${vId}')">
            ${this.currentPlayingId === vId && this.isPlaying ? Icons.pause(16) : Icons.play(16)}
            <span>${this.currentPlayingId === vId && this.isPlaying ? 'Pause' : 'Audition'}</span>
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

  private updateFilterCounts(): void {
    if (!this.voicesData || !this.voicesData.voices) return;
    const details = this.voicesData.details || {};
    const voices = this.voicesData.voices;

    const counts: Record<string, number> = {
      all: voices.length,
      custom: 0,
      rec: 0,
      us: 0,
      uk: 0,
      female: 0,
      male: 0,
      intl: 0,
    };

    const recSet = new Set([
      ...(this.voicesData.recommended?.narrator || []),
      ...(this.voicesData.recommended?.dialogue || []),
      ...(this.voicesData.recommended?.thought || []),
    ]);
    counts.rec = recSet.size;

    voices.forEach((vId) => {
      const info = details[vId] || this.fallbackInfo(vId);
      if (info.is_custom || vId.startsWith('cv_')) {
        counts.custom++;
      }
      if (info.accent === 'American') counts.us++;
      else if (info.accent === 'British') counts.uk++;
      else if (info.accent !== 'Hybrid') counts.intl++;

      if (info.gender === 'female') counts.female++;
      else if (info.gender === 'male') counts.male++;
    });

    const pillCustom = document.getElementById('pill-custom-count');
    if (pillCustom) pillCustom.textContent = `${counts.custom}`;

    // Update pill text if badges exist
    document.querySelectorAll('#voices-filter-pills .filter-pill').forEach((pill) => {
      const f = (pill as HTMLElement).dataset.filter;
      if (f && counts[f] !== undefined) {
        const badge = pill.querySelector('.pill-count');
        if (badge) badge.textContent = `${counts[f]}`;
      }
    });
  }

  private fallbackInfo(voiceId: string): VoiceInfo {
    const isFemale = voiceId.includes('f_');
    const isUs = voiceId.startsWith('a');
    const isUk = voiceId.startsWith('b');
    const accent = isUs ? 'American' : isUk ? 'British' : 'International';
    const name = voiceId.replace(/^[a-z]{2}_/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    return {
      id: voiceId,
      name,
      gender: isFemale ? 'female' : 'male',
      accent,
      language: 'en',
      role: 'character',
      tags: [accent, isFemale ? 'Female' : 'Male'],
      description: `Neural voice for literary voicing and dialogue.`,
      sample_quote: `This is a synthesized preview of the ${name} voice.`,
    };
  }

  public resetFilters(): void {
    this.currentFilter = 'all';
    this.currentRoleFilter = 'all';
    this.searchQuery = '';

    const searchInput = document.getElementById('voices-search-input') as HTMLInputElement | null;
    if (searchInput) searchInput.value = '';

    document.querySelectorAll('#voices-filter-pills .filter-pill').forEach((p, idx) => {
      p.classList.toggle('active', idx === 0);
    });
    document.querySelectorAll('#voices-role-pills .filter-pill').forEach((p, idx) => {
      p.classList.toggle('active', idx === 0);
    });

    this.render();
  }

  public assignRole(role: 'narrator' | 'dialogue' | 'thought', voiceId: string): void {
    if (this.onSelectRoleCallback) {
      this.onSelectRoleCallback(role, voiceId);
    }
    const roleLabels = {
      narrator: 'Narrator (Prose)',
      dialogue: 'Dialogue (Quotation)',
      thought: 'Internal Monologue (Thoughts)',
    };
    this.showToast(`Set ${voiceId} as default ${roleLabels[role]}`);
  }

  private showToast(msg: string): void {
    const toast = document.createElement('div');
    toast.className = 'voices-toast';
    toast.innerHTML = `${Icons.check(16)} <span>${msg}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }
}
