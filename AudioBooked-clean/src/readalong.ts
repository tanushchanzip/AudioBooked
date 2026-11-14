import type { TextTiming } from './types';

export function appendInlineMarkdown(container: HTMLElement, text: string): void {
  const tokenRegex = /(\*\*[^*\n]+?\*\*|__[^_\n]+?__|\*[^*\n]+?\*|_[^_\n]+?_|`[^`\n]+?`|~~[^~\n]+?~~)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      container.appendChild(document.createTextNode(text.substring(lastIdx, match.index)));
    }

    const token = match[0];
    if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
      const strong = document.createElement('strong');
      strong.textContent = token.slice(2, -2);
      container.appendChild(strong);
    } else if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
      const em = document.createElement('em');
      em.className = 'reader-thought-inline';
      em.textContent = token.slice(1, -1);
      container.appendChild(em);
    } else if (token.startsWith('`') && token.endsWith('`')) {
      const code = document.createElement('code');
      code.className = 'reader-code-inline';
      code.textContent = token.slice(1, -1);
      container.appendChild(code);
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      const del = document.createElement('del');
      del.textContent = token.slice(2, -2);
      container.appendChild(del);
    }

    lastIdx = tokenRegex.lastIndex;
  }

  if (lastIdx < text.length) {
    container.appendChild(document.createTextNode(text.substring(lastIdx)));
  }
}

function isChapterHeading(text: string, title?: string): boolean {
  const clean = text.replace(/^#{1,6}\s+/, '').trim();
  if (title && clean.toLowerCase() === title.replace(/^#{1,6}\s+/, '').trim().toLowerCase()) return true;
  if (clean.length > 80 || clean.split(/\s+/).length > 12) return false;
  return /^(?:chapter|ch\.?|episode|ep\.?|prologue|epilogue|interlude|act|part|scene)\b/i.test(clean);
}

function isSceneBreak(text: string): boolean {
  return /^[\*\-–—_#\s]{3,}$/.test(text.trim());
}

export class ReadAlongManager {
  private timings: TextTiming[] = [];
  private activeIndex: number = -1;
  private container: HTMLElement;
  private userIsScrolling = false;
  private scrollTimeout: any = null;
  private onSeekRequest?: (seconds: number) => void;
  private chapterTitle?: string;
  private rawContent?: string;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container #${containerId} not found`);
    this.container = el;

    this.container.addEventListener('wheel', () => {
      this.userIsScrolling = true;
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(() => {
        this.userIsScrolling = false;
      }, 4000);
    }, { passive: true });
  }

  public setSeekListener(cb: (secs: number) => void): void {
    this.onSeekRequest = cb;
  }

  public setTimings(timings: TextTiming[], chapterTitle?: string, rawContent?: string): void {
    this.timings = timings;
    this.chapterTitle = chapterTitle;
    this.rawContent = rawContent;
    this.activeIndex = -1;
    this.render();
  }

  public renderFallbackText(rawText: string, chapterTitle?: string): void {
    this.timings = [];
    this.activeIndex = -1;
    this.chapterTitle = chapterTitle;
    this.rawContent = rawText;
    this.container.innerHTML = '';
    this.container.scrollTop = 0;

    const article = document.createElement('article');
    article.className = 'reader-prose';

    let text = rawText.replace(/\r\n|\r/g, '\n');
    const singleCount = (text.match(/(?<!\n)\n(?!\n)/g) || []).length;
    const doubleCount = (text.match(/\n\n/g) || []).length;
    if (singleCount > 0 && doubleCount < Math.max(1, Math.floor(singleCount / 4))) {
      text = text.replace(/(?<!\n)\n(?!\n)/g, '\n\n');
    }

    const lines = text.split(/\n\n+/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      this.container.innerHTML = '<div class="reader-empty">No text content available for this chapter.</div>';
      return;
    }

    let startLine = 0;
    const firstLine = lines[0] || '';
    const headingMatch = firstLine.match(/^(?:Chapter|Episode|Prologue|Epilogue|Act|Part)\s+\d+[:\s-]*(.*)$/i);
    const isHeading = isChapterHeading(firstLine, chapterTitle) || (headingMatch && firstLine.length < 80);
    let bannerTitle = isHeading ? firstLine : (chapterTitle || '');
    bannerTitle = bannerTitle.replace(/^#{1,6}\s+/, '').trim();

    if (bannerTitle) {
      const banner = document.createElement('header');
      banner.className = 'reader-chapter-banner';

      const pretitle = document.createElement('span');
      pretitle.className = 'reader-chapter-pretitle';
      pretitle.textContent = 'Chapter Reading';
      banner.appendChild(pretitle);

      const h1 = document.createElement('h1');
      h1.className = 'reader-chapter-heading';
      appendInlineMarkdown(h1, bannerTitle);
      banner.appendChild(h1);

      const ornament = document.createElement('div');
      ornament.className = 'reader-ornament-line';
      banner.appendChild(ornament);

      article.appendChild(banner);
      if (isHeading) startLine = 1;
    }

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i]!;
      if (!line) continue;

      if (isSceneBreak(line)) {
        const divider = document.createElement('div');
        divider.className = 'reader-scene-break';
        divider.setAttribute('aria-hidden', 'true');
        const mark = document.createElement('span');
        mark.className = 'scene-break-mark';
        mark.textContent = '❦';
        divider.appendChild(mark);
        article.appendChild(divider);
        continue;
      }

      // 1. Markdown Headings (# Heading, ## Subheading, ### Subheading)
      const hMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (hMatch) {
        const level = hMatch[1]!.length;
        const hText = hMatch[2]!.trim();
        const headingEl = document.createElement(level <= 2 ? 'h2' : 'h3');
        headingEl.className = level <= 2 ? 'reader-section-heading' : 'reader-subheading';
        appendInlineMarkdown(headingEl, hText);
        article.appendChild(headingEl);
        continue;
      }

      // 2. System notice / Game notification: [Event Completed...] or **[Occult Research Club]**
      const sysMatch = line.match(/^(\*\*|)?\[(.*?)\](\*\*|)?$/);
      if (sysMatch && sysMatch[2]!.trim().length > 15) {
        const sysBox = document.createElement('div');
        sysBox.className = 'reader-system-notice';
        appendInlineMarkdown(sysBox, sysMatch[2]!.trim());
        article.appendChild(sysBox);
        continue;
      }

      const p = document.createElement('p');
      let pClass = 'reader-paragraph';
      if (/^["“'「『]/.test(line)) {
        pClass += ' paragraph-dialogue';
      } else if (/^\*.*\*$/.test(line) || /^<[ie][m]?>.*<\/[ie][m]?>$/.test(line)) {
        pClass += ' paragraph-thought';
      }
      p.className = pClass;
      appendInlineMarkdown(p, line);
      article.appendChild(p);
    }

    this.container.appendChild(article);
  }

  private render(): void {
    this.container.innerHTML = '';
    this.container.scrollTop = 0;

    if (!this.timings || this.timings.length === 0) {
      this.container.innerHTML = '<div class="reader-empty">Select or synthesize a chapter to start synchronized reading.</div>';
      return;
    }

    const article = document.createElement('article');
    article.className = 'reader-prose';

    let startIdx = 0;
    const firstSeg = this.timings[0];
    let bannerTitle = this.chapterTitle || '';
    let firstSegRemainder = '';

    if (firstSeg) {
      const segText = firstSeg.text.trim();
      const firstLine = segText.split('\n')[0]?.trim() || '';
      if (isChapterHeading(firstLine, this.chapterTitle) || isChapterHeading(segText, this.chapterTitle)) {
        bannerTitle = isChapterHeading(firstLine, this.chapterTitle) ? firstLine : segText;
        if (segText.includes('\n')) {
          firstSegRemainder = segText.split('\n').slice(1).join(' ').trim();
        }
        startIdx = 1;
      }
    }

    if (bannerTitle) {
      const banner = document.createElement('header');
      banner.className = 'reader-chapter-banner';

      const pretitle = document.createElement('span');
      pretitle.className = 'reader-chapter-pretitle';
      pretitle.textContent = 'Web Novel Chapter';
      banner.appendChild(pretitle);

      const h1 = document.createElement('h1');
      h1.className = 'reader-chapter-heading';

      if (firstSeg && startIdx === 1) {
        const headingSpan = document.createElement('span');
        headingSpan.id = `read-seg-${firstSeg.id ?? 0}`;
        headingSpan.className = `reader-segment seg-heading read-seg-${firstSeg.id ?? 0}`;
        headingSpan.setAttribute('data-seg-id', `${firstSeg.id ?? 0}`);
        headingSpan.setAttribute('data-start', firstSeg.start.toString());
        headingSpan.setAttribute('title', `${firstSeg.voice} (${firstSeg.start.toFixed(1)}s - ${firstSeg.end.toFixed(1)}s)`);
        const cleanBanner = bannerTitle.replace(/^#{1,6}\s+/, '').trim();
        appendInlineMarkdown(headingSpan, cleanBanner);
        headingSpan.onclick = () => {
          if (this.onSeekRequest) this.onSeekRequest(firstSeg.start);
        };
        h1.appendChild(headingSpan);
      } else {
        const cleanBanner = bannerTitle.replace(/^#{1,6}\s+/, '').trim();
        appendInlineMarkdown(h1, cleanBanner);
      }

      banner.appendChild(h1);

      const ornament = document.createElement('div');
      ornament.className = 'reader-ornament-line';
      banner.appendChild(ornament);

      article.appendChild(banner);
    }

    let currentParagraphSpans: HTMLElement[] = [];
    let currentParaType: 'narration' | 'dialogue' | 'thought' = 'narration';
    let currentParaHasDialogue = false;
    let currentParaHasThought = false;

    const flushParagraph = () => {
      if (currentParagraphSpans.length === 0) return;
      const p = document.createElement('p');
      let pClass = 'reader-paragraph';
      if (currentParaType === 'dialogue' || (currentParaHasDialogue && !currentParaHasThought && currentParagraphSpans.length <= 2)) {
        pClass += ' paragraph-dialogue';
      } else if (currentParaType === 'thought' || currentParaHasThought) {
        pClass += ' paragraph-thought';
      }
      p.className = pClass;
      currentParagraphSpans.forEach(span => p.appendChild(span));
      article.appendChild(p);

      currentParagraphSpans = [];
      currentParaType = 'narration';
      currentParaHasDialogue = false;
      currentParaHasThought = false;
    };

    if (firstSegRemainder) {
      const span = document.createElement('span');
      span.className = `reader-segment seg-narration read-seg-0`;
      span.setAttribute('data-seg-id', `0`);
      span.setAttribute('data-start', (firstSeg?.start || 0).toString());
      appendInlineMarkdown(span, firstSegRemainder);
      span.appendChild(document.createTextNode(' '));
      span.onclick = () => {
        if (this.onSeekRequest && firstSeg) this.onSeekRequest(firstSeg.start);
      };
      currentParagraphSpans.push(span);
    }

    for (let i = startIdx; i < this.timings.length; i++) {
      const seg = this.timings[i]!;
      const segIdx = seg.id !== undefined ? seg.id : i;
      const lines = seg.text.split('\n');

      for (let lIdx = 0; lIdx < lines.length; lIdx++) {
        const rawLine = lines[lIdx]!;
        const trimmed = rawLine.trim();

        // Line break in original text triggers a new paragraph
        if (lIdx > 0 && currentParagraphSpans.length > 0) {
          flushParagraph();
        }

        if (!trimmed) {
          if (currentParagraphSpans.length > 0) {
            flushParagraph();
          }
          continue;
        }

        // Scene break ornament
        if (isSceneBreak(trimmed)) {
          flushParagraph();
          const divider = document.createElement('div');
          divider.className = 'reader-scene-break';
          divider.setAttribute('aria-hidden', 'true');
          const mark = document.createElement('span');
          mark.className = 'scene-break-mark';
          mark.textContent = '❦';
          divider.appendChild(mark);
          article.appendChild(divider);
          continue;
        }

        // Dialogue turn start quotes trigger a new paragraph if paragraph already contains text
        const isDialogueStart = /^["“'「『]/.test(trimmed);
        if (isDialogueStart && currentParagraphSpans.length > 0) {
          flushParagraph();
        }

        // Classify paragraph features
        if (seg.type === 'dialogue' || isDialogueStart) {
          currentParaHasDialogue = true;
          if (currentParagraphSpans.length === 0) currentParaType = 'dialogue';
        } else if (seg.type === 'thought') {
          currentParaHasThought = true;
          if (currentParagraphSpans.length === 0) currentParaType = 'thought';
        }

        const span = document.createElement('span');
        span.className = `reader-segment seg-${seg.type} read-seg-${segIdx}`;
        span.setAttribute('data-seg-id', `${segIdx}`);
        span.setAttribute('data-start', seg.start.toString());
        span.setAttribute('title', `${seg.type.toUpperCase()} • ${seg.voice} (${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s)`);
        
        appendInlineMarkdown(span, trimmed);
        span.appendChild(document.createTextNode(' '));

        span.onclick = () => {
          if (this.onSeekRequest) {
            this.onSeekRequest(seg.start);
          }
        };

        currentParagraphSpans.push(span);
      }
    }

    // Flush any remaining paragraph
    flushParagraph();

    this.container.appendChild(article);
  }

  public updateTime(currentTime: number): void {
    if (!this.timings || this.timings.length === 0) return;

    // Find the segment whose interval covers currentTime
    let newIndex = -1;
    for (let i = 0; i < this.timings.length; i++) {
      const seg = this.timings[i]!;
      if (currentTime >= seg.start && currentTime < seg.end) {
        newIndex = seg.id !== undefined ? seg.id : i;
        break;
      }
    }

    // If past all or during brief gap, stick to nearest past segment
    if (newIndex === -1 && currentTime > 0) {
      for (let i = this.timings.length - 1; i >= 0; i--) {
        if (currentTime >= this.timings[i]!.start) {
          newIndex = this.timings[i]!.id !== undefined ? this.timings[i]!.id : i;
          break;
        }
      }
    }

    if (newIndex !== this.activeIndex) {
      if (this.activeIndex >= 0) {
        const prevSpans = this.container.querySelectorAll(`.read-seg-${this.activeIndex}`);
        prevSpans.forEach(el => el.classList.remove('active'));
      }

      this.activeIndex = newIndex;

      if (this.activeIndex >= 0) {
        const currSpans = this.container.querySelectorAll(`.read-seg-${this.activeIndex}`);
        currSpans.forEach(el => el.classList.add('active'));

        const firstEl = currSpans[0];
        if (firstEl && !this.userIsScrolling) {
          firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }
}
