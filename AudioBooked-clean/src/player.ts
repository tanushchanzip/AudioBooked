import { Icons } from './icons';

export class AudioPlayer {
  private audio: HTMLAudioElement;
  private currentChapterId: string | null = null;
  private onTimeUpdateCb?: (currentTime: number) => void;
  private onChapterEndCb?: () => void;

  constructor() {
    this.audio = new Audio();
    this.initListeners();
    this.initSpeedFromStorage();
  }

  private initListeners(): void {
    this.audio.addEventListener('timeupdate', () => {
      this.updateProgressUI();
      if (this.onTimeUpdateCb) {
        this.onTimeUpdateCb(this.audio.currentTime);
      }
    });

    this.audio.addEventListener('play', () => this.updatePlayState(true));
    this.audio.addEventListener('pause', () => this.updatePlayState(false));

    this.audio.addEventListener('ended', () => {
      this.updatePlayState(false);
      if (this.onChapterEndCb) this.onChapterEndCb();
    });

    this.audio.addEventListener('error', (e) => {
      console.error('Audio playback error:', e, this.audio.error);
      this.updatePlayState(false);
      const timeDisplay = document.getElementById('dock-time-current');
      if (timeDisplay) timeDisplay.textContent = 'Error loading audio';
    });
  }

  private initSpeedFromStorage(): void {
    const saved = localStorage.getItem('audiobooked_speed');
    const speed = saved ? parseFloat(saved) : 1.0;
    this.setSpeed(speed);
  }

  public setTimeUpdateListener(cb: (t: number) => void): void {
    this.onTimeUpdateCb = cb;
  }

  public setChapterEndListener(cb: () => void): void {
    this.onChapterEndCb = cb;
  }

  public loadChapter(chapterId: string, title: string, bookTitle: string, coverUrl?: string | null): void {
    this.currentChapterId = chapterId;
    this.audio.src = `/api/chapters/${chapterId}/audio`;
    this.audio.load();

    const titleEl = document.getElementById('dock-book-title');
    const chEl = document.getElementById('dock-chapter-title');
    const coverEl = document.getElementById('dock-cover-art') as HTMLImageElement;

    if (titleEl) titleEl.textContent = bookTitle;
    if (chEl) chEl.textContent = title;
    if (coverEl) {
      if (coverUrl) {
        coverEl.src = `/cover/${encodeURIComponent(coverUrl)}`;
        coverEl.style.display = 'block';
      } else {
        coverEl.style.display = 'none';
      }
    }

    const dock = document.getElementById('audio-dock');
    if (dock) dock.classList.add('visible');

    this.play();
  }

  public async play(): Promise<void> {
    if (!this.audio.src) return;
    try {
      await this.audio.play();
    } catch (err) {
      console.warn('Autoplay prevented:', err);
      this.updatePlayState(false);
    }
  }

  public pause(): void {
    this.audio.pause();
  }

  public toggle(): void {
    if (this.audio.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  public seek(seconds: number): void {
    if (!isNaN(this.audio.duration)) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration));
    }
  }

  public skip(delta: number): void {
    this.seek(this.audio.currentTime + delta);
  }

  public setSpeed(speed: number): void {
    const clamped = Math.max(0.25, Math.min(5.0, Math.round(speed * 20) / 20));
    this.audio.playbackRate = clamped;
    localStorage.setItem('audiobooked_speed', clamped.toFixed(2));

    const slider = document.getElementById('dock-speed-slider') as HTMLInputElement;
    const label = document.getElementById('dock-speed-val');
    if (slider) slider.value = clamped.toString();
    if (label) label.textContent = `${clamped.toFixed(2)}×`;

    // Highlight active preset button if match
    document.querySelectorAll('.speed-pill').forEach((btn) => {
      const bSpeed = parseFloat(btn.getAttribute('data-speed') || '0');
      if (Math.abs(bSpeed - clamped) < 0.01) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  public getCurrentTime(): number {
    return this.audio.currentTime;
  }

  public getCurrentChapterId(): string | null {
    return this.currentChapterId;
  }

  private updatePlayState(isPlaying: boolean): void {
    const playBtn = document.getElementById('dock-btn-play');
    if (playBtn) {
      playBtn.innerHTML = isPlaying ? Icons.pause(20) : Icons.play(20);
      playBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
    }
  }

  private updateProgressUI(): void {
    const cur = this.audio.currentTime;
    const dur = this.audio.duration || 0;

    const curEl = document.getElementById('dock-time-current');
    const totalEl = document.getElementById('dock-time-total');
    const bar = document.getElementById('dock-progress-fill') as HTMLElement;
    const scrub = document.getElementById('dock-scrub') as HTMLInputElement;

    if (curEl) curEl.textContent = this.formatTime(cur);
    if (totalEl) totalEl.textContent = dur ? this.formatTime(dur) : '--:--';

    const pct = dur > 0 ? (cur / dur) * 100 : 0;
    if (bar) bar.style.width = `${pct}%`;
    if (scrub && !scrub.matches(':active')) {
      scrub.value = pct.toString();
    }
  }

  private formatTime(secs: number): string {
    const s = Math.floor(secs);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const remM = m % 60;
    const remS = s % 60;

    if (h > 0) {
      return `${h}:${remM.toString().padStart(2, '0')}:${remS.toString().padStart(2, '0')}`;
    }
    return `${remM}:${remS.toString().padStart(2, '0')}`;
  }
}

