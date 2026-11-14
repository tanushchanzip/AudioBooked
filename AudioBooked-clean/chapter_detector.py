import re
from typing import Dict, Any, Optional, Union, List

def format_num(val: Optional[Union[int, float]]) -> str:
    if val is None:
        return ""
    if isinstance(val, int) or (isinstance(val, float) and val.is_integer()):
        return str(int(val))
    return str(val)

def detect_chapter_metadata(
    content: str,
    url: str = "",
    html_title: str = "",
    fallback_index: int = 1
) -> Dict[str, Any]:
    """
    Intelligent algorithm to detect chapter numbers, chapter names, and clean titles
    from:
    1. Chapter content beginning (first 6 non-empty lines)
    2. URL slugs (/chapter-144, /ch-144, /c144)
    3. HTML/site title tags (e.g. "Novel - Chapter 144 - ...")
    """
    lines = [line.strip() for line in (content or "").split("\n") if line.strip()]
    first_lines = lines[:6] if lines else []

    detected_num: Optional[Union[int, float]] = None
    detected_title: Optional[str] = None
    subtitle: Optional[str] = None

    def parse_num(s: str) -> Optional[Union[int, float]]:
        try:
            return float(s) if "." in s else int(s)
        except Exception:
            return None

    # --- Strategy 1: Check Content Headings (Highest Priority) ---
    for i, line in enumerate(first_lines):
        # Pattern 1a: "Chapter 144: Exodium" or "Chapter 144 - The Secret" or "Chapter 144"
        m1 = re.match(
            r"(?i)^(?:Chapter|Ch\.?|Episode|Ep\.?|Section|Sec\.?)\s*([0-9]+(?:[.\-][0-9]+)?)\s*(?:[:.\-–—]\s*(.*))?$",
            line
        )
        if m1:
            raw_num = m1.group(1).replace("-", ".")
            detected_num = parse_num(raw_num)
            sub = (m1.group(2) or "").strip()

            # Check if next line is a two-line subtitle (e.g. line 1 = "Chapter 144", line 2 = "Exodium")
            if not sub and i + 1 < len(first_lines):
                next_line = first_lines[i + 1]
                if (
                    len(next_line) < 70
                    and not next_line.startswith(('"', "“", "'", "‘"))
                    and not next_line.endswith((".", "?", "!", "...", "—"))
                    and not re.search(r"\b(said|whispered|screamed|asked|replied|thought)\b", next_line, re.I)
                    and not re.match(r"(?i)^(?:Chapter|Ch\.?|Episode|Ep\.?)\b", next_line)
                ):
                    sub = next_line

            num_str = format_num(detected_num)
            if sub:
                detected_title = f"Chapter {num_str}: {sub}"
                subtitle = sub
            else:
                detected_title = f"Chapter {num_str}"
            break

        # Pattern 1b: Volume X Chapter Y
        m_vol = re.match(
            r"(?i)^(?:Vol(?:ume|\.)?\s*([0-9]+)\s*[,:\-–—]?\s*)?(?:Chapter|Ch\.?|Episode|Ep\.?)\s*([0-9]+(?:[.\-][0-9]+)?)\s*(?:[:.\-–—]\s*(.*))?$",
            line
        )
        if m_vol:
            detected_num = parse_num(m_vol.group(2).replace("-", "."))
            sub = (m_vol.group(3) or "").strip()
            num_str = format_num(detected_num)
            detected_title = f"Chapter {num_str}: {sub}" if sub else f"Chapter {num_str}"
            break

        # Pattern 1c: Special Named Chapters (Prologue, Epilogue, Interlude, Side Story)
        m_spec = re.match(
            r"(?i)^(Prologue|Epilogue|Interlude|Afterword|Side\s*Story(?:\s*[0-9]+)?|Extra(?:\s*[0-9]+)?)\s*(?:[:.\-–—]\s*(.*))?$",
            line
        )
        if m_spec:
            sec_name = m_spec.group(1).title()
            sub = (m_spec.group(2) or "").strip()
            detected_title = f"{sec_name}: {sub}" if sub else sec_name
            if "prologue" in sec_name.lower():
                detected_num = 0
            break

        # Pattern 1d: Bare Number as heading (e.g. "144" on its own line)
        m_bare = re.match(r"^#?\s*([0-9]{1,4})\s*(?:[:.\-–—]\s*(.*))?$", line)
        if m_bare:
            raw_num = m_bare.group(1)
            detected_num = parse_num(raw_num)
            sub = (m_bare.group(2) or "").strip()
            num_str = format_num(detected_num)
            detected_title = f"Chapter {num_str}: {sub}" if sub else f"Chapter {num_str}"
            break

    # --- Strategy 2: URL Inspection (Reinforce or Fallback) ---
    if url:
        m_url = re.search(r"(?i)[/_.-](?:chapter|ch|episode|ep)[/_.-]?([0-9]+(?:[.\-][0-9]+)?)", url)
        if m_url:
            url_num = parse_num(m_url.group(1).replace("-", "."))
            if detected_num is None and url_num is not None:
                detected_num = url_num
                num_str = format_num(detected_num)
                if not detected_title:
                    detected_title = f"Chapter {num_str}"

    # --- Strategy 3: HTML Title Tag Parsing ---
    if html_title and not detected_title:
        # e.g. "Demon King of the Royal Class - Chapter 144 - Read Novel"
        m_html = re.search(
            r"(?i)\b(?:Chapter|Ch\.?|Episode|Ep\.?)\s*([0-9]+(?:[.\-][0-9]+)?)\s*(?:[:.\-–—]\s*([^-|]+))?",
            html_title
        )
        if m_html:
            html_num = parse_num(m_html.group(1).replace("-", "."))
            sub = (m_html.group(2) or "").strip()
            if html_num is not None:
                detected_num = detected_num or html_num
                num_str = format_num(detected_num)
                detected_title = f"Chapter {num_str}: {sub}" if sub else f"Chapter {num_str}"

    # Final Consolidation
    if detected_num is not None and (isinstance(detected_num, int) or (isinstance(detected_num, float) and detected_num.is_integer())):
        final_index = int(detected_num)
    else:
        final_index = fallback_index

    if not detected_title:
        detected_title = f"Chapter {final_index}"

    return {
        "chapter_number": detected_num,
        "title": detected_title,
        "index": final_index,
        "subtitle": subtitle
    }

def extract_novel_title(page_title: str, default: str = "Web Novel") -> str:
    """Extracts clean novel series title from webpage title (e.g. 'Demon King of the Royal Class - Chapter 144' -> 'Demon King of the Royal Class')."""
    if not page_title:
        return default
    
    # Strip site watermarks like 'Read Novel Online Free' or 'NovelBuddy'
    cleaned = re.sub(r"(?i)\s*[-|–—]\s*(?:Read|Novel|LightNovel|Free|Online|NovelBuddy|BoxNovel|RoyalRoad|WuxiaWorld).*$", "", page_title).strip()
    
    # Strip chapter suffixes: "Demon King of the Royal Class - Chapter 144"
    cleaned = re.sub(r"(?i)\s*[-|–—:]\s*(?:Chapter|Ch\.?|Episode|Ep\.?)\s*\d+.*$", "", cleaned).strip()
    return cleaned or default

def parse_url_chapter_pattern(url: str) -> Optional[Dict[str, Any]]:
    """
    Analyzes a novel chapter URL (e.g. .../chapter-146, ...-146, .../c146, .../146.html)
    and extracts the chapter number, formatting (padding), prefix, and suffix.
    """
    url = (url or "").strip()
    if not url:
        return None

    # Priority 1: Keyword followed by number (e.g. chapter-146, ch_146, episode-146, ep146)
    m = re.search(r"(?i)(chapter|ch|episode|ep|part)[-_/]?(\d+)", url)
    if m:
        keyword = m.group(1)
        sub_match = re.search(r"(?i)" + re.escape(keyword) + r"[-_/]?(\d+)", url)
        if sub_match:
            digits_str = sub_match.group(1)
            num = int(digits_str)
            width = len(digits_str)
            pad = digits_str.startswith("0") and width > 1
            return {
                "num": num,
                "width": width,
                "pad": pad,
                "prefix": url[:sub_match.start(1)],
                "suffix": url[sub_match.end(1):]
            }

    # Priority 2: Dash or slash followed by number in URL slug, e.g. -146 or /146 or /146.html
    m2 = re.search(r"[-_/](\d+)(?:[/._-]|\.html|\.htm|\?|$)", url)
    if m2:
        digits_str = m2.group(1)
        num = int(digits_str)
        width = len(digits_str)
        pad = digits_str.startswith("0") and width > 1
        return {
            "num": num,
            "width": width,
            "pad": pad,
            "prefix": url[:m2.start(1)],
            "suffix": url[m2.end(1):]
        }

    # Priority 3: Query parameter (e.g. ?chapter=146 or ?ch=146 or ?p=146)
    m3 = re.search(r"(?i)([?&](?:chapter|ch|page|p|ep)=)(\d+)", url)
    if m3:
        digits_str = m3.group(2)
        num = int(digits_str)
        width = len(digits_str)
        pad = digits_str.startswith("0") and width > 1
        return {
            "num": num,
            "width": width,
            "pad": pad,
            "prefix": url[:m3.start(2)],
            "suffix": url[m3.end(2):]
        }

    # Priority 4: Last digits in path
    path_match = re.search(r"https?://[^?#]+", url)
    if path_match:
        base_path = path_match.group(0)
        digits_iter = list(re.finditer(r"(\d+)", base_path))
        if digits_iter:
            last_m = digits_iter[-1]
            digits_str = last_m.group(1)
            num = int(digits_str)
            width = len(digits_str)
            pad = digits_str.startswith("0") and width > 1
            return {
                "num": num,
                "width": width,
                "pad": pad,
                "prefix": url[:last_m.start(1)],
                "suffix": url[last_m.end(1):]
            }

    return None

def generate_url_sequence(
    url: str,
    start: Optional[int] = None,
    end: Optional[int] = None,
    count: Optional[int] = None
) -> List[str]:
    """
    Generates a list of sequential URLs given a starting chapter URL.
    """
    parsed = parse_url_chapter_pattern(url)
    if not parsed:
        return [url] if url else []

    curr_num = parsed["num"]
    width = parsed["width"]
    pad = parsed["pad"]
    prefix = parsed["prefix"]
    suffix = parsed["suffix"]

    s = start if start is not None else curr_num
    if end is not None:
        e = end
    elif count is not None:
        e = s + count - 1
    else:
        e = s + 9

    if e < s:
        e = s

    # Cap maximum at 250 chapters per batch
    if e - s > 250:
        e = s + 250

    urls = []
    for n in range(s, e + 1):
        num_str = str(n).zfill(width) if pad else str(n)
        urls.append(f"{prefix}{num_str}{suffix}")

    return urls


