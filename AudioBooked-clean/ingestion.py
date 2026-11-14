import os
import re
import httpx
from typing import List, Dict, Any, Tuple
import trafilatura
from bs4 import BeautifulSoup

class IngestionManager:
    """
    Handles extracting content, chapter splits, and metadata from:
    1. Articles (URLs)
    2. Web Novels (URL, Chapter lists, TOC)
    3. Books (EPUB, PDF, TXT)
    """

    @staticmethod
    def ingest_article(url: str) -> Dict[str, Any]:
        """Fetches and extracts clean body text and metadata from an article URL."""
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            raise ValueError(f"Could not fetch webpage from {url}")

        result = trafilatura.extract(
            downloaded,
            include_comments=False,
            include_tables=False,
            no_fallback=False,
            output_format="json"
        )
        import json
        data = json.loads(result) if result else {}

        title = data.get("title") or "Article"
        author = data.get("author") or "Unknown Author"
        text = data.get("text") or ""

        if not text:
            # Fallback simple text extraction
            soup = BeautifulSoup(downloaded, "html.parser")
            title = soup.title.string.strip() if soup.title else "Web Article"
            paragraphs = [p.get_text().strip() for p in soup.find_all("p") if p.get_text().strip()]
            text = "\n\n".join(paragraphs)

        return {
            "title": title,
            "author": author,
            "source_type": "article",
            "source_url": url,
            "chapters": [
                {
                    "title": title,
                    "index": 1,
                    "content": text
                }
            ]
        }

    @staticmethod
    def ingest_epub(epub_path: str, output_cover_dir: str = None) -> Dict[str, Any]:
        """Extracts chapters, title, author, and cover image from an EPUB file."""
        import ebooklib
        from ebooklib import epub

        book = epub.read_epub(epub_path)
        title = book.get_metadata("DC", "title")
        title = title[0][0] if title else Path(epub_path).stem
        creator = book.get_metadata("DC", "creator")
        author = creator[0][0] if creator else "Unknown Author"

        # Attempt to extract cover image
        cover_path = None
        if output_cover_dir:
            os.makedirs(output_cover_dir, exist_ok=True)
            for item in book.get_items_of_type(ebooklib.ITEM_IMAGE):
                if "cover" in item.get_name().lower():
                    cover_filename = os.path.basename(item.get_name())
                    cover_path = os.path.join(output_cover_dir, cover_filename)
                    with open(cover_path, "wb") as f:
                        f.write(item.get_content())
                    break

        chapters = []
        ch_idx = 1
        for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
            soup = BeautifulSoup(item.get_body_content(), "html.parser")
            
            # Find chapter title
            heading = soup.find(["h1", "h2", "h3"])
            raw_heading = heading.get_text().strip() if heading else ""

            # Extract clean paragraphs
            paragraphs = [p.get_text().strip() for p in soup.find_all("p") if p.get_text().strip()]
            if paragraphs:
                body_text = "\n\n".join(paragraphs)
                if len(body_text.split()) > 20:  # Skip trivial copyright or empty pages
                    from chapter_detector import detect_chapter_metadata
                    meta = detect_chapter_metadata(body_text, html_title=raw_heading, fallback_index=ch_idx)
                    chapters.append({
                        "title": meta["title"],
                        "index": meta["index"],
                        "content": body_text
                    })
                    ch_idx += 1

        return {
            "title": title,
            "author": author,
            "source_type": "epub",
            "cover_image": cover_path,
            "chapters": chapters
        }

    @staticmethod
    def ingest_pdf(pdf_path: str) -> Dict[str, Any]:
        """Extracts text and chapter divisions from a PDF file using PyMuPDF."""
        import fitz  # PyMuPDF

        doc = fitz.open(pdf_path)
        metadata = doc.metadata or {}
        title = metadata.get("title") or os.path.splitext(os.path.basename(pdf_path))[0]
        author = metadata.get("author") or "Unknown Author"

        # Check for PDF Outline / TOC
        toc = doc.get_toc()  # [[lvl, title, page], ...]
        chapters = []

        if toc and len(toc) > 1:
            for i in range(len(toc)):
                lvl, ch_title, start_page = toc[i]
                end_page = toc[i+1][2] - 1 if i+1 < len(toc) else len(doc)
                
                ch_text_parts = []
                for pno in range(max(0, start_page - 1), min(len(doc), end_page)):
                    page_text = doc[pno].get_text("text")
                    ch_text_parts.append(page_text)

                body = "\n\n".join(ch_text_parts).strip()
                if body:
                    chapters.append({
                        "title": ch_title,
                        "index": i + 1,
                        "content": body
                    })
        else:
            # Fallback: extract pages and split on "Chapter X" regex patterns
            full_text = []
            for page in doc:
                full_text.append(page.get_text("text"))
            raw = "\n".join(full_text)
            
            # Split by Chapter headings
            splits = re.split(r"(?i)(?=^Chapter\s+\d+|^\b(?:Part|Book|Prologue|Epilogue)\b)", raw, flags=re.MULTILINE)
            ch_idx = 1
            from chapter_detector import detect_chapter_metadata
            for part in splits:
                part = part.strip()
                if len(part.split()) > 30:
                    meta = detect_chapter_metadata(part, fallback_index=ch_idx)
                    chapters.append({
                        "title": meta["title"],
                        "index": meta["index"],
                        "content": part
                    })
                    ch_idx += 1

        return {
            "title": title,
            "author": author,
            "source_type": "pdf",
            "chapters": chapters
        }

    @staticmethod
    def ingest_text(text_content: str, default_title: str = "Uploaded Book") -> Dict[str, Any]:
        """Parses raw text or markdown and detects chapter boundaries."""
        splits = re.split(r"(?i)(?=^Chapter\s+\d+|^\b(?:Part|Book|Prologue|Epilogue)\b)", text_content, flags=re.MULTILINE)
        chapters = []
        ch_idx = 1

        from chapter_detector import detect_chapter_metadata
        for part in splits:
            part = part.strip()
            if not part:
                continue
            meta = detect_chapter_metadata(part, fallback_index=ch_idx)
            chapters.append({
                "title": meta["title"],
                "index": meta["index"],
                "content": part
            })
            ch_idx += 1

        if not chapters:
            chapters = [{
                "title": default_title,
                "index": 1,
                "content": text_content.strip()
            }]

        return {
            "title": default_title,
            "author": "Unknown Author",
            "source_type": "text",
            "chapters": chapters
        }

    @staticmethod
    def ingest_webnovel_chapter(url: str) -> Dict[str, Any]:
        """Fetches and cleans a web novel chapter from popular webnovel sites."""
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            raise ValueError(f"Failed to fetch novel chapter from {url}")

        soup = BeautifulSoup(downloaded, "html.parser")
        raw_page_title = soup.title.string.strip() if soup.title else ""
        
        # Try common webnovel title selectors
        title_tag = soup.find(["h1", "h2", ".chapter-title", ".entry-title"])
        heading_text = title_tag.get_text().strip() if title_tag else ""

        # Try to find novel body content container
        content_div = soup.find(["div", "article"], class_=re.compile(r"chapter-content|entry-content|epcontent|chapter-inner|read-content|reading-content|text-left", re.I))
        
        if content_div:
            # Remove scripts, comments, and author notes divs
            for tag in content_div(["script", "style", "nav", "aside", ".author-note", ".ads"]):
                tag.decompose()
            paragraphs = [p.get_text().strip() for p in content_div.find_all("p") if p.get_text().strip()]
            text = "\n\n".join(paragraphs)
        else:
            # Fallback to trafilatura
            text = trafilatura.extract(downloaded, include_comments=False) or ""

        from chapter_detector import detect_chapter_metadata, extract_novel_title
        meta = detect_chapter_metadata(text, url=url, html_title=raw_page_title)
        novel_title = extract_novel_title(raw_page_title or heading_text)

        return {
            "title": meta["title"],
            "chapter_index": meta["index"],
            "chapter_number": meta["chapter_number"],
            "novel_title": novel_title,
            "url": url,
            "content": text
        }

