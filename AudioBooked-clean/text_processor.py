import re
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass

@dataclass
class TextSegment:
    segment_type: str  # 'narration', 'dialogue', 'thought'
    text: str
    voice_override: str | None = None
    speed_override: float | None = None
    pause_after_ms: int = 250

class TextProcessor:
    """
    Advanced text cleaner, thought & dialogue segmenter, pronunciation normalizer,
    and smart chunker tailored for books, web novels, and articles.
    """

    def __init__(self, glossary: Dict[str, str] = None):
        self.glossary = glossary or {}

    def apply_glossary(self, text: str) -> str:
        """Replace difficult names, fantasy/wuxia terms with phonetic pronunciations."""
        for term, replacement in self.glossary.items():
            if term.startswith(r"\b") or term.endswith(r"\b"):
                text = re.sub(term, replacement, text, flags=re.IGNORECASE)
            else:
                pattern = r"\b" + re.escape(term) + r"\b"
                text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        return text

    def clean_raw_text(self, text: str) -> str:
        """Normalize whitespace, quotes, dashes, and strip web novel & markdown noise."""
        if not text:
            return ""

        # Normalize curly quotes and apostrophes to standard
        text = text.replace("“", '"').replace("”", '"')
        text = text.replace("‘", "'").replace("’", "'")
        text = text.replace("—", " - ").replace("–", " - ")

        # 1. Strip markdown horizontal rules / scene breaks (---, ***, ___, - - -, * * *)
        text = re.sub(r'(?m)^[ \t]*([-*_][ \t]*){3,}$', '', text)

        # 2. Strip markdown headers (# Header -> Header)
        text = re.sub(r'(?m)^[ \t]*#{1,6}[ \t]+', '', text)

        # 3. Strip markdown blockquotes (> Quote -> Quote)
        text = re.sub(r'(?m)^[ \t]*>[ \t]*', '', text)

        # 4. Strip markdown bold (**text** or __text__ -> text)
        text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
        text = re.sub(r'__(.*?)__', r'\1', text)

        # 5. Clean system notice brackets and markdown links: [text](url) -> text, [text] -> text
        text = re.sub(r'\[([^\[\]]+)\](?:\([^\(\)]+\))?', r'\1', text)

        # 6. Inline code or strikethrough (`code` -> code, ~~del~~ -> del)
        text = re.sub(r'`([^`]+)`', r'\1', text)
        text = re.sub(r'~~([^~]+)~~', r'\1', text)

        # Normalize ellipses to 3 dots with spacing for natural thinking pauses
        text = re.sub(r"\.{4,}", "... ", text)
        text = re.sub(r"(?<!\.)\.\.\.(?!\.)", " ... ", text)

        # Remove repetitive exclamation/question marks
        text = re.sub(r"!{2,}", "!", text)
        text = re.sub(r"\?{2,}", "?", text)

        # Normalize whitespace and newlines
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\r\n|\r", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)

        # If text is primarily single-newline separated (common in scraped webnovels),
        # convert single newlines to double newlines for proper paragraph structure
        single_count = text.count("\n")
        double_count = text.count("\n\n")
        if single_count > 0 and double_count < max(1, single_count // 4):
            text = re.sub(r"(?<!\n)\n(?!\n)", "\n\n", text)

        # Separate chapter headings cleanly from following prose
        text = re.sub(r"(?im)^((?:Chapter|Episode|Prologue|Epilogue|Act|Part)\s+\d+.*?)\n([^\n])", r"\1\n\n\2", text)
        text = re.sub(r"(?im)^((?:Chapter|Episode|Prologue|Epilogue|Act|Part)\s+\d+)\s+([A-Z\"'「].*)$", r"\1\n\n\2", text)

        return text.strip()

    def segment_paragraph(
        self,
        paragraph: str,
        narrator_voice: str = "af_heart",
        dialogue_voice: str = "af_bella",
        thought_voice: str = "af_sky",
        base_speed: float = 1.0,
        thought_speed: float = 0.92
    ) -> List[TextSegment]:
        """
        Decomposes a single paragraph into distinct narration, spoken dialogue,
        and internal thought/monologue segments with appropriate voices and speeds.
        """
        segments: List[TextSegment] = []
        
        # Regex patterns for thoughts:
        # 1. Asterisks: *I must be careful...*
        # 2. Italic tags: <i>...</i> or <em>...</em>
        # 3. Single quotes (not contractions like doesn't/can't): 'What should I do?' he thought
        # 3. Single quotes containing internal thoughts (allowing internal contractions like doesn't)
        # followed by thought verbs: 'What should I do?' he thought
        thought_patterns = [
            (r"\*([^*]+)\*", 1),
            (r"<i>([^<]+)</i>", 1),
            (r"<em>([^<]+)</em>", 1),
            (r"(?:^|(?<=\s))'((?:[a-zA-Z]+'[a-zA-Z]+|[^'\n])+?)'(?=\s*(?:he|she|they|I|[A-Z][a-z]+)\s+(?:thought|wondered|pondered|mused|realized|reflected|whispered))", 1),
        ]

        # Use unique tokens that won't conflict
        thought_store: Dict[str, str] = {}
        processed = paragraph
        
        for pat, group_id in thought_patterns:
            def repl_thought(m):
                tok = f"[[THOUGHT_{len(thought_store)}]]"
                thought_store[tok] = m.group(group_id).strip()
                return f" {tok} "
            processed = re.sub(pat, repl_thought, processed, flags=re.IGNORECASE)

        dialogue_store: Dict[str, str] = {}
        def repl_dialogue(m):
            tok = f"[[DIALOGUE_{len(dialogue_store)}]]"
            dialogue_store[tok] = m.group(1).strip()
            return f" {tok} "

        processed = re.sub(r'"([^"]+)"', repl_dialogue, processed)

        # Split on token delimiters
        token_regex = r"(\[\[(?:DIALOGUE|THOUGHT)_\d+\]\])"
        parts = re.split(token_regex, processed)

        for part in parts:
            part = part.strip()
            if not part:
                continue

            if part in dialogue_store:
                diag_text = dialogue_store[part].strip()
                if not re.search(r"[a-zA-Z0-9\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\u0900-\u097f]", diag_text):
                    continue
                segments.append(TextSegment(
                    segment_type="dialogue",
                    text=f'"{diag_text}"',
                    voice_override=dialogue_voice,
                    speed_override=base_speed,
                    pause_after_ms=300
                ))
            elif part in thought_store:
                tht_text = thought_store[part].strip("*_`~#[] \t\r\n")
                if not re.search(r"[a-zA-Z0-9\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\u0900-\u097f]", tht_text):
                    continue
                segments.append(TextSegment(
                    segment_type="thought",
                    text=tht_text,
                    voice_override=thought_voice,
                    speed_override=thought_speed,  # slightly slower/reflective
                    pause_after_ms=450  # thoughtful pause
                ))
            else:
                narr_text = part.strip("*_`~#[] \t\r\n")
                if not re.search(r"[a-zA-Z0-9\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\u0900-\u097f]", narr_text):
                    continue
                segments.append(TextSegment(
                    segment_type="narration",
                    text=narr_text,
                    voice_override=narrator_voice,
                    speed_override=base_speed,
                    pause_after_ms=200
                ))

        return segments

    def chunk_text_for_tts(
        self,
        text: str,
        narrator_voice: str = "af_heart",
        dialogue_voice: str = "af_bella",
        thought_voice: str = "af_sky",
        base_speed: float = 1.0,
        thought_speed: float = 0.92,
        max_chunk_words: int = 150
    ) -> List[TextSegment]:
        """
        Full pipeline: cleans text, applies glossary, splits into paragraphs,
        segments into typed pieces (narration/dialogue/thought), and groups into safe chunks.
        """
        cleaned = self.clean_raw_text(text)
        cleaned = self.apply_glossary(cleaned)

        paragraphs = [p.strip() for p in cleaned.split("\n\n") if p.strip()]
        all_segments: List[TextSegment] = []

        for p_idx, para in enumerate(paragraphs):
            para_segments = self.segment_paragraph(
                para,
                narrator_voice=narrator_voice,
                dialogue_voice=dialogue_voice,
                thought_voice=thought_voice,
                base_speed=base_speed,
                thought_speed=thought_speed
            )

            # Mark end of paragraph with longer pause on the last segment
            if para_segments:
                is_heading = re.match(r"^(?:Chapter|Episode|Prologue|Epilogue|Act|Part)\b", para_segments[0].text.strip(), re.I)
                if is_heading and len(para_segments) == 1:
                    para_segments[-1].pause_after_ms = 850
                else:
                    para_segments[-1].pause_after_ms = 600

            # Sub-chunk segments if any individual segment is very long (> max_chunk_words)
            for seg in para_segments:
                words = seg.text.split()
                if len(words) > max_chunk_words:
                    sentences = re.split(r"(?<=[.!?])\s+", seg.text)
                    curr_chunk = []
                    curr_count = 0
                    for s in sentences:
                        s_words = len(s.split())
                        if curr_count + s_words > max_chunk_words and curr_chunk:
                            all_segments.append(TextSegment(
                                segment_type=seg.segment_type,
                                text=" ".join(curr_chunk),
                                voice_override=seg.voice_override,
                                speed_override=seg.speed_override,
                                pause_after_ms=250
                            ))
                            curr_chunk = [s]
                            curr_count = s_words
                        else:
                            curr_chunk.append(s)
                            curr_count += s_words
                    if curr_chunk:
                        all_segments.append(TextSegment(
                            segment_type=seg.segment_type,
                            text=" ".join(curr_chunk),
                            voice_override=seg.voice_override,
                            speed_override=seg.speed_override,
                            pause_after_ms=seg.pause_after_ms
                        ))
                else:
                    all_segments.append(seg)

        return all_segments
