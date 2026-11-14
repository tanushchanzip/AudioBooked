"""
AI Narrative Condenser for AudioBooked.
Compresses multiple web novel / book chapters into a cohesive, high-quality
audiobook chapter, with special emphasis on character dynamics, dialogue, and romcom moments
while cutting out repetitive exposition, system logs, author complaints, and scraper fluff.
"""

import json
import re
import requests
from typing import List, Dict, Any, Optional, Tuple

SUPPORTED_PROVIDERS = {
    "gemini": {
        "name": "Google Gemini (Hydrogen & Flash)",
        "default_model": "gemini-4-hydrogen",
        "models": ["gemini-4-hydrogen", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"],
        "key_url": "https://aistudio.google.com/app/apikey",
        "description": "Massive 1.05M context window. Supports Gemini 4 Hydrogen and Flash. Best for condensing 20-50+ chapters."
    },
    "openrouter": {
        "name": "OpenRouter (Hydrogen & Multi-model)",
        "default_model": "google/gemini-4-hydrogen",
        "models": ["google/gemini-4-hydrogen", "deepseek/deepseek-chat", "anthropic/claude-3.5-haiku", "google/gemini-2.5-flash"],
        "key_url": "https://openrouter.ai/keys",
        "description": "Access google/gemini-4-hydrogen or any frontier model with a single unified key."
    },
    "custom": {
        "name": "Custom Hydrogen Gateway (OpenAI-Compatible)",
        "default_model": "gemini-4-hydrogen",
        "models": ["gemini-4-hydrogen"],
        "key_url": "",
        "description": "Connect to your custom Hydrogen gateway, proxy, or OpenAI-compatible endpoint."
    },
    "groq": {
        "name": "Groq",
        "default_model": "llama-3.3-70b-versatile",
        "models": ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
        "key_url": "https://console.groq.com/keys",
        "description": "Ultra-fast generation speeds (300+ tok/s). Free tier available."
    },
    "openai": {
        "name": "OpenAI",
        "default_model": "gpt-4o-mini",
        "models": ["gpt-4o-mini", "gpt-4o"],
        "key_url": "https://platform.openai.com/api-keys",
        "description": "High fidelity, nuanced dialogue and storytelling fidelity."
    },
    "ollama": {
        "name": "Ollama (Local / Offline)",
        "default_model": "llama3.2",
        "models": ["llama3.2", "llama3.1", "qwen2.5", "mistral"],
        "key_url": "http://localhost:11434",
        "description": "100% private, free, and runs on your local machine. No API key needed."
    }
}

class AICondenser:
    @staticmethod
    def clean_raw_chapter(text: str) -> str:
        """Strip known scraper watermarks, author notes, and repetitive junk before feeding to LLM."""
        if not text:
            return ""
        
        # Remove typical scraper watermarks
        text = re.sub(r'(?i)this chapter was taken from [^\n]+', '', text)
        text = re.sub(r'(?i)read latest chapters at [^\n]+', '', text)
        text = re.sub(r'(?i)translated by [^\n]+', '', text)
        text = re.sub(r'(?i)edited by [^\n]+', '', text)
        text = re.sub(r'(?i)if you want to read more chapters[^\n]+', '', text)
        text = re.sub(r'(?i)novel info\s+demon king of the royal class[^\n]+', '', text)
        
        # Collapse excessive whitespace
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    @staticmethod
    def build_system_prompt(focus_mode: str, detail_level: str, custom_instructions: Optional[str] = None) -> str:
        target_words = {
            "brief": "500 to 800 words",
            "standard": "1,000 to 1,500 words",
            "detailed": "2,000 to 3,000 words"
        }.get(detail_level, "1,200 to 1,800 words")

        focus_guidance = ""
        if focus_mode == "romcom":
            focus_guidance = """
PRIORITY FOCUS — ROMANCE, COMEDY & CHARACTER DYNAMICS:
1. PRESERVE AND EXPAND THE ROMCOM BEATS: Keep every moment of romantic tension, tsundere bickering, flustered reactions, blushing, cute nicknames, hand-holding, mutual teasing, secret jealousy, and heartwarming interactions between the protagonist and heroines/rivals.
2. CUT OUT THE BULLSHIT & FLUFF: Drastically trim or eliminate:
   - Long repetitive internal monologues about author past life, system stats, point farming, and game mechanics.
   - Tedious logistics (walking down hallways, endless door passwords, mundane school timetable descriptions).
   - Filler side-character exposition that has zero bearing on the core relationships.
3. PRESERVE NATURAL DIALOGUE: Keep direct character dialogue in clear English quotation marks (e.g. “...” or "..."). This is critical because an AI voice actor will voice the dialogue in a distinct character tone!
"""
        elif focus_mode == "action":
            focus_guidance = """
PRIORITY FOCUS — ACTION, CONFLICT & CLIMAX:
1. Keep the most intense fight scenes, tactical moves, magical revelations, and turning points.
2. Condense downtime and repetitive training into quick transitional prose.
3. Retain key battle cries and pivotal spoken exchanges in quotation marks.
"""
        else: # balanced
            focus_guidance = """
PRIORITY FOCUS — BALANCED LITERARY ARC:
1. Craft a seamless narrative episode preserving both the main story progression and the memorable character interactions.
2. Smoothly bridge the chapters so it reads like one continuous, well-paced novel chapter.
3. Retain key dialogue in quotation marks.
"""

        custom_part = f"\nUSER SPECIAL INSTRUCTIONS:\n{custom_instructions.strip()}\n" if custom_instructions else ""

        prompt = f"""You are an expert literary novel adapter and storyteller.
Your task is to take multiple raw web novel chapters and condense them into ONE captivating, beautifully paced audiobook chapter of approximately {target_words}.

WRITING RULES:
1. FORMAT AS A NOVEL CHAPTER: Do NOT write bullet points, meta-summaries, or outline notes (do NOT write "In chapter 144, this happened..."). Write it as direct, immersive prose in the same perspective and tone as the novel (first-person or third-person as established in the source).
2. PRESERVE SPOKEN DIALOGUE IN QUOTES: Keep character dialogue in quotation marks (“...” or "..."). Retain memorable lines, witty banter, and emotional exchanges.
3. SEAMLESS CONTINUITY: Connect scenes with smooth, cinematic narrative transitions.
4. CLEAN OUTPUT: Do not include introductory notes, author comments, or post-scripts. Output ONLY the story chapter prose with a fitting Chapter Title at the top.

{focus_guidance}
{custom_part}
"""
        return prompt.strip()

    @classmethod
    def condense(
        cls,
        chapters: List[Dict[str, Any]],
        provider: str = "gemini",
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        focus_mode: str = "romcom",
        detail_level: str = "standard",
        custom_instructions: Optional[str] = None,
        base_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sends chapters to selected AI provider and returns condensed manuscript.
        """
        if not chapters:
            raise ValueError("No chapters provided for condensation.")

        # Prepare aggregated clean text
        total_original_chars = 0
        formatted_chapters = []
        for ch in chapters:
            title = ch.get("title", f"Chapter {ch.get('chapter_index', '?')}")
            raw = ch.get("content", "")
            cleaned = cls.clean_raw_chapter(raw)
            if len(cleaned) < 300 and ("demon king" in cleaned.lower() or "novel info" in cleaned.lower()):
                # Skip dummy scraped paywall chapters
                continue
            total_original_chars += len(cleaned)
            formatted_chapters.append(f"--- {title} ---\n{cleaned}")

        if not formatted_chapters:
            raise ValueError("All selected chapters were empty or placeholder paywalls. Please select valid chapters.")

        combined_manuscript = "\n\n".join(formatted_chapters)
        system_prompt = cls.build_system_prompt(focus_mode, detail_level, custom_instructions)

        provider = provider.lower()
        if provider not in SUPPORTED_PROVIDERS:
            provider = "gemini"

        conf = SUPPORTED_PROVIDERS[provider]
        chosen_model = model or conf["default_model"]

        # Call provider API
        if provider == "gemini":
            condensed_text = cls._call_gemini(api_key, chosen_model, system_prompt, combined_manuscript)
        elif provider == "groq":
            condensed_text = cls._call_openai_compatible(
                base_url="https://api.groq.com/openai/v1",
                api_key=api_key,
                model=chosen_model,
                system_prompt=system_prompt,
                user_content=combined_manuscript
            )
        elif provider == "openai":
            condensed_text = cls._call_openai_compatible(
                base_url="https://api.openai.com/v1",
                api_key=api_key,
                model=chosen_model,
                system_prompt=system_prompt,
                user_content=combined_manuscript
            )
        elif provider == "openrouter":
            condensed_text = cls._call_openai_compatible(
                base_url="https://openrouter.ai/api/v1",
                api_key=api_key,
                model=chosen_model,
                system_prompt=system_prompt,
                user_content=combined_manuscript
            )
        elif provider == "custom":
            custom_url = base_url or "https://api.openai.com/v1"
            condensed_text = cls._call_openai_compatible(
                base_url=custom_url,
                api_key=api_key,
                model=chosen_model,
                system_prompt=system_prompt,
                user_content=combined_manuscript
            )
        elif provider == "ollama":
            url = base_url or "http://localhost:11434"
            condensed_text = cls._call_ollama(url, chosen_model, system_prompt, combined_manuscript)
        else:
            raise ValueError(f"Unsupported AI provider: {provider}")

        # Post-clean condensed text
        condensed_text = condensed_text.strip()
        
        # Extract title if model provided one on the first line
        lines = condensed_text.split("\n")
        suggested_title = f"Arc Digest: Chapters {chapters[0].get('chapter_index', 1)}–{chapters[-1].get('chapter_index', len(chapters))}"
        if lines and lines[0].strip().startswith(("#", "Chapter", "Title:")):
            first_line = lines[0].strip().lstrip("#").replace("Title:", "").strip()
            if len(first_line) > 3:
                suggested_title = first_line
                condensed_text = "\n".join(lines[1:]).strip()

        condensed_chars = len(condensed_text)
        compression_ratio = round((1 - (condensed_chars / max(1, total_original_chars))) * 100, 1)

        return {
            "title": suggested_title,
            "content": condensed_text,
            "original_chapters_count": len(chapters),
            "valid_chapters_count": len(formatted_chapters),
            "original_chars": total_original_chars,
            "condensed_chars": condensed_chars,
            "compression_ratio_pct": max(0, compression_ratio),
            "focus_mode": focus_mode,
            "provider": provider,
            "model": chosen_model
        }

    @staticmethod
    def _call_gemini(api_key: Optional[str], model: str, system_prompt: str, user_content: str) -> str:
        if not api_key:
            raise ValueError("Google Gemini API Key is required. Get a free key at https://aistudio.google.com/app/apikey")
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {
            "system_instruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [
                {
                    "parts": [{"text": f"Here are the chapters to condense into one cohesive audiobook chapter:\n\n{user_content}"}]
                }
            ],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 8192
            }
        }
        
        resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=120)
        if resp.status_code != 200:
            err_msg = resp.text
            try:
                err_json = resp.json()
                err_msg = err_json.get("error", {}).get("message", resp.text)
            except Exception:
                pass
            raise RuntimeError(f"Gemini API Error ({resp.status_code}): {err_msg}")
        
        data = resp.json()
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError) as e:
            raise RuntimeError(f"Gemini returned an unexpected response structure: {data}")

    @staticmethod
    def _call_openai_compatible(base_url: str, api_key: Optional[str], model: str, system_prompt: str, user_content: str) -> str:
        if not api_key:
            raise ValueError("API Key is required for this provider.")
        
        url = f"{base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Here are the chapters to condense into one cohesive audiobook chapter:\n\n{user_content}"}
            ],
            "temperature": 0.7
        }
        
        resp = requests.post(url, json=payload, headers=headers, timeout=120)
        if resp.status_code != 200:
            err_msg = resp.text
            try:
                err_json = resp.json()
                err_msg = err_json.get("error", {}).get("message", resp.text)
            except Exception:
                pass
            raise RuntimeError(f"API Error ({resp.status_code}): {err_msg}")
        
        data = resp.json()
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            raise RuntimeError(f"Unexpected response structure from {base_url}: {data}")

    @staticmethod
    def _call_ollama(base_url: str, model: str, system_prompt: str, user_content: str) -> str:
        url = f"{base_url.rstrip('/')}/api/chat"
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Here are the chapters to condense into one cohesive audiobook chapter:\n\n{user_content}"}
            ],
            "stream": False
        }
        try:
            resp = requests.post(url, json=payload, timeout=180)
        except requests.exceptions.ConnectionError:
            raise RuntimeError(f"Could not connect to Ollama at {base_url}. Make sure Ollama is running (`ollama serve`).")
        
        if resp.status_code != 200:
            raise RuntimeError(f"Ollama Error ({resp.status_code}): {resp.text}")
        
        data = resp.json()
        try:
            return data["message"]["content"]
        except KeyError:
            raise RuntimeError(f"Unexpected response from Ollama: {data}")
