# AudioBooked Studio 🎧📚
### *The Humanist Audiobook Press & Neural Literary Synthesizer*

[![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11-blue?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Kokoro-82M](https://img.shields.io/badge/Kokoro-82M%20Neural%20TTS-ff5722)](https://huggingface.co/hexgrad/Kokoro-82M)
[![CUDA](https://img.shields.io/badge/CUDA-Accelerated-76B900?logo=nvidia&logoColor=white)](https://developer.nvidia.com/cuda-zone)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**AudioBooked Studio** is an all-in-one local audiobook production suite and web application. It turns **Web Novels**, **Serialized Web Fiction**, **EPUBs**, **PDFs**, and **Articles** into broadcast-quality audiobooks featuring **multi-voice character acting**, an interactive **Karaoke Read-Along player**, a **Neural Voice Blender**, and **M4B packaging** with embedded chapter markers.

---

## 🌟 Key Highlights & Features

### 🎙️ 1. Kokoro-82M Neural Synthesis & Multi-Voice Acting
* **54 Distinct Neural Voices**: American, British, Japanese, Mandarin, Spanish, French, Italian, Hindi, and Portuguese.
* **GPU & CUDA Native**: Lightning-fast batch generation on modern NVIDIA GPUs, with automatic fallback to CPU.
* **Tri-Voice Automatic Directing**:
  * 📖 **Narrator Voice**: Rich, literary prose narration (e.g. `af_heart`, `bm_george`).
  * 💬 **Dialogue Voice**: Dynamic character dialogue extracted automatically from quotation marks (`af_bella`, `am_michael`).
  * 💭 **Thought / Monologue Voice**: Introspective inner monologue detected from italics (`*thoughts*`) and single quotes, voiced with a softer, slower contemplative cadence.

### ✨ 2. Voice Lab & Neural Voice Blender
* **Latent Space Voice Mixing**: Interpolate between any two voices using Kokoro's 256-dimensional neural style embeddings.
* **Cross-Lingual Anime English**: Blend a Japanese anime character voice (e.g. `jf_alpha` or `jm_kumo`) with an English voice (e.g. `af_bella` or `am_michael`) at a **70/30 ratio**. The result: **authentic anime character timbre speaking fluent, natural English with fluid conversational prosody and breath pauses!**
* **Real-Time Auditioning**: Adjust the visual dual-color slider and test sample phrases instantly on GPU before saving.
* **Global Studio Availability**: Saved custom voices automatically populate in all Narrator, Dialogue, and Thought dropdowns across the application.

### ⚡ 3. AI Arc Digest & Story Condenser
* **Cut Web Novel Fluff**: Web novels frequently suffer from 70%+ repetitive filler, author rants, and tedious status screens. The built-in AI Condenser distills bulk chapters into high-octane story arcs.
* **Dialogue Quote Preservation**: Retains character banter, teasing, and critical quotes word-for-word in quotation marks so Kokoro's multi-voice director can continue acting each character seamlessly.
* **Multi-Provider Support**: Connects to **Google Gemini** (Free tier available), **Hydrogen**, **OpenAI**, **Anthropic Claude**, or any **OpenAI-compatible local LLM gateway**.
* **Narrative Presets**:
  * 🌸 *Romcom & Banter Focus* (preserves romantic tension, cute teasing, and dialogue).
  * ⚔️ *Action & Climax* (focuses on battle choreography and clutch decisions).
  * 📜 *Story Arc Digest* (balanced literary condensation of multi-chapter arcs).

### 📖 4. Interactive Karaoke Read-Along Reader
* **Synchronized Highlighting**: Highlights sentences in real-time as the narrator speaks, with automatic fluid scrolling.
* **Interactive Seeking**: Click any sentence in the book to instantly jump playback to that exact timestamp.
* **Markdown Hygiene**: Automatically parses formatting (`*thought*`, `**bold**`, headers) in the reader interface while stripping markdown artifacts from TTS so the voice never awkwardly reads aloud asterisks or hashtags.

### 📦 5. Multi-Source Ingestion & M4B Packaging
* **Web Novel Sequence Scraper**: Auto-generates and fetches consecutive URL sequences (e.g. `chapter-1` to `chapter-50`) with scraper bypass, boiler-plate cleaning, and auto-indexing.
* **Book Formats**: Native extraction of **EPUB** (with full Table of Contents and cover art), layout-aware **PDF**, and **Markdown/TXT**.
* **Single-File M4B Audiobook Container**: Packages all chapters, metadata, timestamps, and cover artwork into an industry-standard `.m4b` file compatible with Apple Books, Audiobookshelf, Smart AudioBook Player, and VLC.

### 📝 6. Pronunciation Glossary
* Define phonetic substitutions for complex fantasy, foreign, or cultivation names (e.g., `Xiao Yan` → `Shyao Yen`, `Detto` → `Det-toe`) to ensure perfect pronunciation every time.

---

## 🛠️ Architecture

```
AudioBooked/
├── main.py                  # FastAPI REST API & background worker
├── tts_engine.py            # Kokoro neural engine (CUDA/CPU + voice blending)
├── database.py              # SQLite storage (projects, chapters, custom voices)
├── text_processor.py        # Dialogue/thought segmentation & markdown cleaner
├── audio_packager.py        # M4B container compiler with chapter markers
├── ingestion.py             # EPUB, PDF, and web scraper ingestion
├── voice_catalog.py         # Metadata, traits, and personas for 54 voices
├── ai_condenser.py          # Multi-provider LLM arc condenser
├── src/                     # TypeScript frontend source
│   ├── app.ts               # Core application orchestrator
│   ├── voice_blender.ts     # Voice Lab & Blender modal controller
│   ├── condenser.ts         # AI Condenser workflow controller
│   ├── readalong.ts         # Synchronized karaoke reader
│   ├── studio.ts            # Audiobook editing & voice director
│   └── voices.ts            # Voice Gallery & audition deck
└── static/                  # Web interface (HTML, CSS, bundled JS)
```

---

## 🚀 Quickstart & Installation

### Prerequisites
* **Python 3.10 or 3.11**
* **NVIDIA GPU** with CUDA support recommended (CPU is supported as a fallback)
* **FFmpeg** (required for `.m4b` audiobook packaging)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/AudioBooked.git
cd AudioBooked
```

### 2. Set Up Python Environment

#### Windows
Run the automated setup script:
```cmd
setup.bat
```
Or manually:
```cmd
python -m venv venv
venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

#### Linux / macOS
```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

*(Optional GPU Note: For CUDA-accelerated PyTorch on Windows/Linux, ensure you have PyTorch installed with your CUDA version, e.g. `pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu124`)*

### 3. Launch AudioBooked
```cmd
run.bat
```
Or with Python:
```bash
python run_server.py
```

### 4. Open in Your Browser
Navigate to **`http://localhost:8000`** to access the studio!

---

## 🎮 How to Use

1. **Import a Work**:
   * Click **Import Work**.
   * Choose **Upload File** (`.epub`, `.pdf`, `.txt`) or paste a **Web URL / Sequential Chapter Range**.
2. **Design Your Cast**:
   * Head over to **Voice Gallery** or click **✨ Voice Lab & Blender** to craft a custom hybrid voice (like `70% jf_alpha + 30% af_bella`).
   * In the **Studio**, pick your **Narrator**, **Dialogue**, and **Thought** voices.
3. **Condense Fluff (Optional)**:
   * Click **✨ AI Story Condenser** in the Studio to distill chapters into focused novel digests while keeping spoken dialogue quotes intact.
4. **Synthesize & Listen**:
   * Click **Synthesize Current Chapter** or **Synthesize All**.
   * Use the **Karaoke Read-Along Reader** to follow along with synchronized text highlighting.
5. **Export .M4B**:
   * Click **Export .M4B Audiobook** to package the complete audiobook with embedded chapter timestamps and cover artwork!

---

## 📜 License
This project is licensed under the [MIT License](LICENSE).

## 🙏 Acknowledgments
* [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) by `@hexgrad` for the incredible open-weight TTS model.
* [StyleTTS2](https://github.com/yl4579/StyleTTS2) for foundational neural speech research.
* [FastAPI](https://fastapi.tiangolo.com) for high-performance Python web APIs.
