import { ApiClient } from './api';
import { Icons } from './icons';
import type { VoicesResponse, VoiceInfo } from './types';

export class VoiceBlenderManager {
  private modal: HTMLElement | null = null;
  private audio: HTMLAudioElement;
  private isAuditioning: boolean = false;
  private currentPreviewUrl: string | null = null;
  private voicesData: VoicesResponse | null = null;
  private onVoiceSavedCallback: () => Promise<void>;

  constructor(onVoiceSaved: () => Promise<void>) {
    this.onVoiceSavedCallback = onVoiceSaved;
    this.audio = new Audio();
    this.initAudioListeners();
    this.initElements();
  }

  public setVoicesData(data: VoicesResponse): void {
    this.voicesData = data;
    this.populateSelects();
  }

  private initAudioListeners(): void {
    this.audio.addEventListener('ended', () => {
      this.isAuditioning = false;
      this.updateAuditionButton(false);
    });

    this.audio.addEventListener('error', () => {
      this.isAuditioning = false;
      this.updateAuditionButton(false);
      this.showStatus('Audio preview playback error', true);
    });
  }

  private initElements(): void {
    this.modal = document.getElementById('modal-voice-blender');
    if (!this.modal) return;

    // Close button & backdrop
    const btnClose = document.getElementById('btn-close-vb-modal');
    if (btnClose) btnClose.onclick = () => this.close();

    const btnCancel = document.getElementById('btn-vb-cancel');
    if (btnCancel) btnCancel.onclick = () => this.close();

    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // Slider listener
    const slider = document.getElementById('vb-blend-slider') as HTMLInputElement | null;
    if (slider) {
      slider.addEventListener('input', () => {
        const ratio = parseFloat(slider.value);
        this.updateSliderUI(ratio);
      });
    }

    // Preset chips
    document.querySelectorAll('.vb-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const ratio = parseFloat((chip as HTMLElement).dataset.ratio || '0.30');
        if (slider) {
          slider.value = ratio.toString();
          this.updateSliderUI(ratio);
        }
        document.querySelectorAll('.vb-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });

    // Speed slider
    const speedSlider = document.getElementById('vb-speed-slider') as HTMLInputElement | null;
    const speedVal = document.getElementById('vb-speed-val');
    if (speedSlider) {
      speedSlider.addEventListener('input', () => {
        if (speedVal) speedVal.textContent = `${parseFloat(speedSlider.value).toFixed(2)}×`;
      });
    }

    // Phrase buttons
    document.querySelectorAll('.vb-phrase-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const phrase = (btn as HTMLElement).dataset.phrase;
        const phraseInput = document.getElementById('vb-test-phrase') as HTMLInputElement | null;
        if (phrase && phraseInput) phraseInput.value = phrase;
      });
    });

    // Audition button
    const btnAudition = document.getElementById('btn-vb-audition');
    if (btnAudition) {
      btnAudition.onclick = () => this.audition();
    }

    // Save button
    const btnSave = document.getElementById('btn-vb-save');
    if (btnSave) {
      btnSave.onclick = () => this.save();
    }

    // When base or blend selects change, update slider label
    const baseSel = document.getElementById('vb-base-voice') as HTMLSelectElement | null;
    const blendSel = document.getElementById('vb-blend-voice') as HTMLSelectElement | null;
    if (baseSel) baseSel.addEventListener('change', () => this.updateSliderFromCurrent());
    if (blendSel) blendSel.addEventListener('change', () => this.updateSliderFromCurrent());
  }

  public open(): void {
    if (!this.modal) return;
    this.populateSelects();

    // Default to anime cross-lingual preset if available
    const baseSel = document.getElementById('vb-base-voice') as HTMLSelectElement | null;
    const blendSel = document.getElementById('vb-blend-voice') as HTMLSelectElement | null;
    if (baseSel && Array.from(baseSel.options).some(o => o.value === 'jf_alpha')) {
      baseSel.value = 'jf_alpha';
    }
    if (blendSel && Array.from(blendSel.options).some(o => o.value === 'af_bella')) {
      blendSel.value = 'af_bella';
    }

    const nameInput = document.getElementById('vb-voice-name') as HTMLInputElement | null;
    if (nameInput) nameInput.value = 'Charlotte (Sweet Anime)';

    const descInput = document.getElementById('vb-voice-desc') as HTMLInputElement | null;
    if (descInput) descInput.value = 'Sweet anime heroine timbre with natural English prosody';

    const slider = document.getElementById('vb-blend-slider') as HTMLInputElement | null;
    if (slider) slider.value = '0.30';
    this.updateSliderUI(0.30);

    const errBanner = document.getElementById('vb-error-banner');
    if (errBanner) errBanner.style.display = 'none';

    this.modal.style.display = 'flex';
  }

  public close(): void {
    if (this.modal) this.modal.style.display = 'none';
    this.stopAudio();
  }

  private stopAudio(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isAuditioning = false;
    this.updateAuditionButton(false);
  }

  private populateSelects(): void {
    if (!this.voicesData || !this.voicesData.voices) return;

    const baseSel = document.getElementById('vb-base-voice') as HTMLSelectElement | null;
    const blendSel = document.getElementById('vb-blend-voice') as HTMLSelectElement | null;
    if (!baseSel || !blendSel) return;

    const details = this.voicesData.details || {};
    // Only standard voices as building blocks for blends
    const baseList = this.voicesData.voices.filter(v => !v.startsWith('cv_'));

    const renderOpts = (sel: HTMLSelectElement, selectedVal: string) => {
      const currentVal = sel.value || selectedVal;
      sel.innerHTML = '';

      // Group by category
      const jpGroup = document.createElement('optgroup');
      jpGroup.label = '🌸 Japanese Anime Voices (Cross-Lingual)';
      const usGroup = document.createElement('optgroup');
      usGroup.label = '🇺🇸 American English (Natural Prosody)';
      const ukGroup = document.createElement('optgroup');
      ukGroup.label = '🇬🇧 British English';
      const intlGroup = document.createElement('optgroup');
      intlGroup.label = '🌍 International Voices';

      baseList.forEach(vId => {
        const info = details[vId];
        const opt = document.createElement('option');
        opt.value = vId;
        const displayName = info ? `${info.name} (${vId})` : vId;
        opt.textContent = displayName;

        if (vId.startsWith('j')) {
          jpGroup.appendChild(opt);
        } else if (vId.startsWith('a')) {
          usGroup.appendChild(opt);
        } else if (vId.startsWith('b')) {
          ukGroup.appendChild(opt);
        } else {
          intlGroup.appendChild(opt);
        }
      });

      if (jpGroup.children.length > 0) sel.appendChild(jpGroup);
      if (usGroup.children.length > 0) sel.appendChild(usGroup);
      if (ukGroup.children.length > 0) sel.appendChild(ukGroup);
      if (intlGroup.children.length > 0) sel.appendChild(intlGroup);

      sel.value = currentVal;
    };

    renderOpts(baseSel, 'jf_alpha');
    renderOpts(blendSel, 'af_bella');
  }

  private updateSliderFromCurrent(): void {
    const slider = document.getElementById('vb-blend-slider') as HTMLInputElement | null;
    const ratio = slider ? parseFloat(slider.value) : 0.30;
    this.updateSliderUI(ratio);
  }

  private updateSliderUI(ratio: number): void {
    const baseSel = document.getElementById('vb-base-voice') as HTMLSelectElement | null;
    const blendSel = document.getElementById('vb-blend-voice') as HTMLSelectElement | null;

    const baseName = baseSel?.value ? baseSel.value.replace(/^[a-z]{2}_/, '').replace(/_/g, ' ') : 'Primary';
    const blendName = blendSel?.value ? blendSel.value.replace(/^[a-z]{2}_/, '').replace(/_/g, ' ') : 'Blend';

    const basePct = Math.round((1.0 - ratio) * 100);
    const blendPct = Math.round(ratio * 100);

    const label = document.getElementById('vb-blend-ratio-label');
    if (label) {
      label.textContent = `${basePct}% ${baseName} • ${blendPct}% ${blendName}`;
    }

    const barLeft = document.getElementById('vb-bar-left');
    const barRight = document.getElementById('vb-bar-right');
    if (barLeft) barLeft.style.width = `${basePct}%`;
    if (barRight) barRight.style.width = `${blendPct}%`;
  }

  private async audition(): Promise<void> {
    if (this.isAuditioning) {
      this.stopAudio();
      return;
    }

    const baseSel = document.getElementById('vb-base-voice') as HTMLSelectElement | null;
    const blendSel = document.getElementById('vb-blend-voice') as HTMLSelectElement | null;
    const slider = document.getElementById('vb-blend-slider') as HTMLInputElement | null;
    const phraseInput = document.getElementById('vb-test-phrase') as HTMLInputElement | null;
    const speedSlider = document.getElementById('vb-speed-slider') as HTMLInputElement | null;

    const baseVoice = baseSel?.value || 'jf_alpha';
    const blendVoice = blendSel?.value || 'af_bella';
    const blendRatio = slider ? parseFloat(slider.value) : 0.30;
    const phrase = phraseInput?.value.trim() || 'Detto, wait! Did not we hear the members do not even know each other?';
    const speed = speedSlider ? parseFloat(speedSlider.value) : 1.0;

    this.showStatus('Synthesizing neural blend preview on GPU...', false);
    this.updateAuditionButton(true, true);

    try {
      const audioUrl = await ApiClient.previewCustomVoice({
        base_voice: baseVoice,
        blend_voice: blendVoice,
        blend_ratio: blendRatio,
        text: phrase,
        speed: speed,
      });

      if (this.currentPreviewUrl) {
        URL.revokeObjectURL(this.currentPreviewUrl);
      }
      this.currentPreviewUrl = audioUrl;

      this.audio.src = audioUrl;
      this.isAuditioning = true;
      this.updateAuditionButton(true, false);
      this.showStatus('Playing preview', false);
      await this.audio.play();
    } catch (err: any) {
      console.error('Audition failed:', err);
      this.isAuditioning = false;
      this.updateAuditionButton(false);
      this.showStatus('Preview failed: ' + (err.message || 'Error'), true);
    }
  }

  private async save(): Promise<void> {
    const nameInput = document.getElementById('vb-voice-name') as HTMLInputElement | null;
    const baseSel = document.getElementById('vb-base-voice') as HTMLSelectElement | null;
    const blendSel = document.getElementById('vb-blend-voice') as HTMLSelectElement | null;
    const slider = document.getElementById('vb-blend-slider') as HTMLInputElement | null;
    const descInput = document.getElementById('vb-voice-desc') as HTMLInputElement | null;

    const name = nameInput?.value.trim() || '';
    if (!name) {
      this.showError('Please give your new voice a name (e.g. Charlotte Sweet Anime).');
      return;
    }

    const baseVoice = baseSel?.value || 'jf_alpha';
    const blendVoice = blendSel?.value || 'af_bella';
    const blendRatio = slider ? parseFloat(slider.value) : 0.30;
    const desc = descInput?.value.trim() || '';

    const btnSave = document.getElementById('btn-vb-save') as HTMLButtonElement | null;
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = 'Saving Neural Voice...';
    }

    try {
      await ApiClient.createCustomVoice({
        name: name,
        base_voice: baseVoice,
        blend_voice: blendVoice,
        blend_ratio: blendRatio,
        description: desc,
      });

      this.close();
      await this.onVoiceSavedCallback();
    } catch (err: any) {
      console.error('Failed to save custom voice:', err);
      this.showError(err.message || 'Failed to save voice');
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

  private updateAuditionButton(isActive: boolean, isLoading: boolean = false): void {
    const btn = document.getElementById('btn-vb-audition');
    if (!btn) return;

    if (isLoading) {
      btn.innerHTML = `<div class="humanist-spinner" style="width:14px;height:14px;border-width:2px;"></div> <span>Synthesizing...</span>`;
    } else if (isActive) {
      btn.innerHTML = `${Icons.pause(15)} <span>Stop Audition</span>`;
    } else {
      btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> <span>Audition Voice</span>`;
    }
  }

  private showStatus(msg: string, isError: boolean): void {
    const statusEl = document.getElementById('vb-audition-status');
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.style.color = isError ? '#ef4444' : 'var(--text-prose-muted)';
  }

  private showError(msg: string): void {
    const banner = document.getElementById('vb-error-banner');
    if (!banner) return;
    banner.textContent = msg;
    banner.style.display = 'block';
  }
}
