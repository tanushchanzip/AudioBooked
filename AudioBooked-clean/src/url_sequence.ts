export interface UrlSequenceInfo {
  num: number;
  width: number;
  pad: boolean;
  prefix: string;
  suffix: string;
}

export function parseUrlChapterPattern(rawUrl: string): UrlSequenceInfo | null {
  const clean = (rawUrl || '').trim();
  if (!clean) return null;

  // 1. Keyword: chapter-146, ch_146, episode-146, ep146, part-146
  const m1 = clean.match(/(chapter|ch|episode|ep|part)[-_/]?(\d+)/i);
  if (m1 && m1[2] && m1.index !== undefined) {
    const digits = m1[2];
    const num = parseInt(digits, 10);
    const dStart = m1.index + m1[0].lastIndexOf(digits);
    const dEnd = dStart + digits.length;
    return {
      num,
      width: digits.length,
      pad: digits.startsWith('0') && digits.length > 1,
      prefix: clean.substring(0, dStart),
      suffix: clean.substring(dEnd)
    };
  }

  // 2. Dash or slash followed by number in URL slug, e.g. -146 or /146 or /146.html
  const m2 = clean.match(/[-_/](\d+)(?:[/._-]|\.html|\.htm|\?|$)/i);
  if (m2 && m2[1] && m2.index !== undefined) {
    const digits = m2[1];
    const num = parseInt(digits, 10);
    const dStart = m2.index + m2[0].indexOf(digits);
    const dEnd = dStart + digits.length;
    return {
      num,
      width: digits.length,
      pad: digits.startsWith('0') && digits.length > 1,
      prefix: clean.substring(0, dStart),
      suffix: clean.substring(dEnd)
    };
  }

  // 3. Query parameter: ?ch=146 or &chapter=146 or ?p=146
  const m3 = clean.match(/([?&](?:chapter|ch|page|p|ep)=)(\d+)/i);
  if (m3 && m3[2] && m3.index !== undefined) {
    const digits = m3[2];
    const num = parseInt(digits, 10);
    const dStart = m3.index + m3[0].lastIndexOf(digits);
    const dEnd = dStart + digits.length;
    return {
      num,
      width: digits.length,
      pad: digits.startsWith('0') && digits.length > 1,
      prefix: clean.substring(0, dStart),
      suffix: clean.substring(dEnd)
    };
  }

  // 4. Fallback: last occurrence of digits in base path
  const pathMatch = clean.match(/https?:\/\/[^?#]+/i);
  if (pathMatch) {
    const basePath = pathMatch[0];
    const digitMatches = Array.from(basePath.matchAll(/(\d+)/g));
    if (digitMatches.length > 0) {
      const lastMatch = digitMatches[digitMatches.length - 1]!;
      const digits = lastMatch[1]!;
      const num = parseInt(digits, 10);
      const dStart = lastMatch.index!;
      const dEnd = dStart + digits.length;
      return {
        num,
        width: digits.length,
        pad: digits.startsWith('0') && digits.length > 1,
        prefix: clean.substring(0, dStart),
        suffix: clean.substring(dEnd)
      };
    }
  }

  return null;
}

export function generateUrlSequence(
  url: string,
  start?: number,
  end?: number,
  count?: number
): string[] {
  const parsed = parseUrlChapterPattern(url);
  if (!parsed) return url.trim() ? [url.trim()] : [];

  const s = start !== undefined ? start : parsed.num;
  let e = end !== undefined ? end : (count !== undefined ? s + count - 1 : s + 9);
  if (e < s) e = s;
  if (e - s > 250) e = s + 250;

  const urls: string[] = [];
  for (let n = s; n <= e; n++) {
    const numStr = parsed.pad ? n.toString().padStart(parsed.width, '0') : n.toString();
    urls.push(`${parsed.prefix}${numStr}${parsed.suffix}`);
  }
  return urls;
}

