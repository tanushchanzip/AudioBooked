import os
import time
import threading
import numpy as np
import soundfile as sf
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from text_processor import TextSegment

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = str(BASE_DIR / "models" / "kokoro-v1.0.onnx")
VOICES_PATH = str(BASE_DIR / "models" / "voices-v1.0.bin")

class TTSEngine:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self, async_init: bool = True):
        self.sample_rate = 24000
        self.use_gpu = False
        self.device = "cpu"
        self.pipeline = None
        self._pipelines: Dict[str, Any] = {}
        self.voices = ['af_heart', 'af_bella', 'af_sky', 'am_adam', 'am_michael', 'bf_emma', 'bm_george']
        if os.path.exists(VOICES_PATH):
            try:
                with np.load(VOICES_PATH) as data:
                    self.voices = sorted(data.files)
            except Exception:
                pass
        self.is_ready = False
        self.init_error = None
        self._init_lock = threading.Lock()
        self._ready_event = threading.Event()

        if async_init:
            self._thread = threading.Thread(target=self._init_pipeline, daemon=True)
            self._thread.start()
        else:
            self._init_pipeline()

    def wait_until_ready(self, timeout: float = 60.0) -> bool:
        """Blocks until the neural engine is initialized or timeout occurs."""
        if self.is_ready:
            return True
        return self._ready_event.wait(timeout=timeout)

    def _init_pipeline(self):
        with self._init_lock:
            if self.is_ready:
                return
            print("[*] Initializing Kokoro TTS Engine...")
            try:
                import torch
                from kokoro import KPipeline
                if torch.cuda.is_available():
                    self.device = "cuda"
                    self.use_gpu = True
                    gpu_name = torch.cuda.get_device_name(0)
                    vram_gb = round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 2)
                    print(f"[+] GPU detected: {gpu_name} ({vram_gb} GB VRAM). Initializing CUDA Kokoro pipeline...")
                else:
                    self.device = "cpu"
                    print("[-] CUDA not available for PyTorch. Initializing CPU Kokoro pipeline...")

                t0 = time.time()
                self.pipeline = KPipeline(lang_code='a', device=self.device, repo_id='hexgrad/Kokoro-82M')
                self._pipelines['a'] = self.pipeline

                # Preload all 54 voices from local binary
                if os.path.exists(VOICES_PATH):
                    with np.load(VOICES_PATH) as data:
                        for name in data.files:
                            self.pipeline.voices[name] = torch.from_numpy(data[name])
                    self.voices = sorted(list(self.pipeline.voices.keys()))
                    print(f"[+] Loaded {len(self.voices)} voices from {VOICES_PATH} into pipeline.")
                else:
                    self.voices = ['af_heart', 'af_bella', 'af_sky', 'am_adam', 'am_michael', 'bf_emma', 'bm_george']

                # Warm up GPU kernel compilation so first generation is instant
                if self.use_gpu:
                    print("[*] Warming up GPU kernels...")
                    _ = list(self.pipeline("System ready.", voice="af_heart", speed=1.0))
                    print(f"[+] Kokoro GPU Engine ready in {time.time() - t0:.2f}s!")
                else:
                    print(f"[+] Kokoro CPU Engine ready in {time.time() - t0:.2f}s!")

                self.is_ready = True
                self._ready_event.set()

            except Exception as e:
                print(f"[!] Warning: Failed to load PyTorch Kokoro ({e}). Falling back to ONNX CPU engine...")
                self._init_onnx_fallback()
                self.is_ready = True
                self._ready_event.set()

    def _init_onnx_fallback(self):
        import onnxruntime as ort
        from kokoro_onnx import Kokoro

        self.use_gpu = False
        self.device = "cpu"
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = max(1, (os.cpu_count() or 4) // 2)
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        self.session = ort.InferenceSession(
            MODEL_PATH,
            opts,
            providers=["CPUExecutionProvider"]
        )
        self.kokoro = Kokoro.from_session(self.session, VOICES_PATH)
        self.voices = sorted(self.kokoro.get_voices())
        print(f"[+] Kokoro ONNX CPU Fallback ready with {len(self.voices)} voices!")

    def list_voices(self) -> List[str]:
        try:
            from database import DB
            custom = [cv["id"] for cv in DB.get_custom_voices()]
            return custom + self.voices
        except Exception:
            return self.voices

    def get_hardware_info(self) -> Dict[str, Any]:
        return {
            "device": self.device,
            "use_gpu": self.use_gpu,
            "sample_rate": self.sample_rate,
            "total_voices": len(self.voices),
            "is_ready": self.is_ready,
            "status": "ready" if self.is_ready else "initializing"
        }

    def create_silence(self, duration_ms: int) -> np.ndarray:
        """Generate silence samples for the given duration in milliseconds."""
        num_samples = int((duration_ms / 1000.0) * self.sample_rate)
        return np.zeros(num_samples, dtype=np.float32)

    def get_lang_code(self, voice: str, text: Optional[str] = None) -> str:
        """
        Derive Kokoro language code.
        If text is provided:
        - Detect Japanese script (Hiragana/Katakana) -> 'j'
        - Detect Devanagari script -> 'h'
        - Detect Chinese script (Hanzi) when voice is Chinese -> 'z'
        - If text is in Latin/English script:
            * 'b' if British voice (bf_*, bm_*)
            * 'a' for all others (af_*, jf_*, jm_*, hf_*, zf_*, etc.)
          This enables cross-lingual voice synthesis: Japanese, Mandarin, Hindi voices
          speak fluent English with their authentic character timbre and anime-style accent!
        If no text is provided, fallback to voice prefix.
        """
        if text:
            # Check for Japanese Kana
            if any(0x3040 <= ord(c) <= 0x30FF for c in text):
                return 'j'
            # Check for Devanagari (Hindi)
            if any(0x0900 <= ord(c) <= 0x097F for c in text):
                return 'h'
            # Check for Chinese (Hanzi)
            if voice and voice.startswith('z') and any(0x4E00 <= ord(c) <= 0x9FFF for c in text):
                return 'z'
            # English / Latin text:
            if voice and voice.startswith('b'):
                return 'b'
            return 'a'

        if not voice:
            return 'a'
        prefix = voice[0].lower()
        return prefix if prefix in 'abehijkpz' else 'a'

    def get_pipeline(self, lang_code: str):
        """Get or lazily initialize a language-specific pipeline reusing the master neural model."""
        lang = lang_code.lower() if lang_code.lower() in 'abehijkpz' else 'a'
        if lang in self._pipelines:
            return self._pipelines[lang]

        try:
            from kokoro import KPipeline
            master_model = self.pipeline.model if self.pipeline else None
            new_pipe = KPipeline(lang_code=lang, model=master_model, device=self.device, repo_id='hexgrad/Kokoro-82M')
            if self.pipeline and hasattr(self.pipeline, 'voices'):
                new_pipe.voices = self.pipeline.voices
            self._pipelines[lang] = new_pipe
            return new_pipe
        except Exception as e:
            print(f"[!] Warning: Failed to initialize pipeline for lang '{lang}': {e}. Falling back to default pipeline.")
            return self.pipeline

    def resolve_voice(self, voice_str: Any, pipe) -> Any:
        """
        Resolves a voice string into a voice tensor or string identifier.
        Supports:
        - Registered custom voice: 'cv_charlotte_sweet' (loaded from DB)
        - Single voice: 'af_heart', 'jf_alpha'
        - Comma blend (equal weight): 'jf_alpha,af_bella'
        - Weighted blend: 'jf_alpha(0.7)+af_bella(0.3)' or 'jf_alpha:0.7,af_bella:0.3'
        Blending an anime voice (e.g. jf_alpha) with an English voice (e.g. af_bella)
        yields an exceptionally natural, expressive anime character English voice!
        """
        if not isinstance(voice_str, str):
            return voice_str

        # If registered custom voice, look up expression in DB
        if voice_str.startswith('cv_'):
            try:
                from database import DB
                cv = DB.get_custom_voice(voice_str)
                if cv and cv.get('expression'):
                    voice_str = cv['expression']
            except Exception as e:
                print(f"[!] Warning: could not resolve custom voice '{voice_str}': {e}")

        # If no blend delimiters, return original voice name
        if not any(sep in voice_str for sep in [',', '+', ':', '(']):
            return voice_str

        import re
        parts = re.split(r'[,+]', voice_str)
        tensors = []
        weights = []

        for part in parts:
            part = part.strip()
            if not part:
                continue
            m = re.match(r'^([a-zA-Z0-9_]+)(?:[:\(]([0-9.]+)\)?)?$', part)
            if m:
                v_name, weight_str = m.groups()
                weight = float(weight_str) if weight_str else 1.0
                try:
                    pack = pipe.load_single_voice(v_name)
                    tensors.append(pack)
                    weights.append(weight)
                except Exception as e:
                    print(f"[!] Warning: failed to load voice '{v_name}' for blend: {e}")
            else:
                try:
                    pack = pipe.load_single_voice(part)
                    tensors.append(pack)
                    weights.append(1.0)
                except Exception as e:
                    print(f"[!] Warning: failed to load voice '{part}' for blend: {e}")

        if not tensors:
            return 'af_heart'
        if len(tensors) == 1:
            return tensors[0]

        total_w = sum(weights) or 1.0
        norm_weights = [w / total_w for w in weights]
        blended = sum(w * t for w, t in zip(norm_weights, tensors))
        return blended

    def _synthesize_text(self, text: str, voice: str, speed: float) -> np.ndarray:
        """Internal helper to synthesize text using language-specific PyTorch pipeline or ONNX."""
        self.wait_until_ready(timeout=60.0)
        if self.pipeline is not None:
            import torch
            with torch.inference_mode():
                lang_code = self.get_lang_code(voice, text=text)
                pipe = self.get_pipeline(lang_code)
                resolved_v = self.resolve_voice(voice, pipe)
                generator = pipe(text, voice=resolved_v, speed=speed)
                chunks = []
                for _, _, audio in generator:
                    if audio is not None:
                        if hasattr(audio, 'detach'):
                            audio = audio.detach().cpu().numpy()
                        chunks.append(audio)
                if chunks:
                    return np.concatenate(chunks)
                return np.array([], dtype=np.float32)
        else:
            # ONNX fallback
            lang_map = {
                'a': 'en-us', 'b': 'en-gb', 'e': 'es', 'f': 'fr-fr',
                'h': 'hi', 'i': 'it', 'j': 'ja', 'p': 'pt-br', 'z': 'zh'
            }
            lang = lang_map.get(self.get_lang_code(voice, text=text), 'en-us')
            try:
                samples, _ = self.kokoro.create(text, voice=voice, speed=speed, lang=lang)
            except Exception:
                samples, _ = self.kokoro.create(text, voice=voice, speed=speed, lang="en-us")
            return samples

    def synthesize_raw_text(self, text: str, voice: str = "af_heart", speed: float = 1.0) -> Tuple[np.ndarray, int]:
        """Synthesize plain text into audio samples and sample rate."""
        samples = self._synthesize_text(text, voice=voice, speed=speed)
        return samples, self.sample_rate

    def synthesize_segment(self, segment: TextSegment, default_voice: str = "af_heart", default_speed: float = 1.0) -> np.ndarray:
        """Synthesize a single text segment with appropriate voice, speed, and trailing pause."""
        voice = segment.voice_override or default_voice
        speed = segment.speed_override or default_speed
        text = segment.text.strip()

        if not text:
            return np.array([], dtype=np.float32)

        try:
            samples = self._synthesize_text(text, voice=voice, speed=speed)
            if segment.pause_after_ms > 0:
                silence = self.create_silence(segment.pause_after_ms)
                return np.concatenate([samples, silence])
            return samples
        except Exception as e:
            print(f"[!] Warning: error synthesizing segment '{text[:30]}...': {e}")
            return self.create_silence(500)

    def synthesize_chapter(
        self,
        segments: List[TextSegment],
        output_wav_path: str,
        default_voice: str = "af_heart",
        default_speed: float = 1.0,
        progress_callback = None
    ) -> Tuple[float, List[Dict[str, Any]]]:
        """
        Synthesizes an entire chapter from a list of segments and writes to output_wav_path.
        Returns (duration_seconds, timings_list).
        """
        output_dir = os.path.dirname(output_wav_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        all_samples = []
        timings = []
        current_time_sec = 0.0
        total_segments = len(segments)

        for i, seg in enumerate(segments):
            text = seg.text.strip()
            if not text:
                continue

            voice = seg.voice_override or default_voice
            speed = seg.speed_override or default_speed

            try:
                speech_samples = self._synthesize_text(text, voice=voice, speed=speed)
            except Exception as e:
                print(f"[!] Warning: error synthesizing segment '{text[:30]}...': {e}")
                speech_samples = self.create_silence(500)

            speech_dur = len(speech_samples) / self.sample_rate
            start_t = round(current_time_sec, 3)
            end_t = round(current_time_sec + speech_dur, 3)

            timings.append({
                "id": i,
                "start": start_t,
                "end": end_t,
                "text": text,
                "type": seg.segment_type,
                "voice": voice
            })

            all_samples.append(speech_samples)
            current_time_sec += speech_dur

            # Append silence pause (e.g. for thoughts or paragraph breaks)
            if seg.pause_after_ms > 0:
                silence_samples = self.create_silence(seg.pause_after_ms)
                all_samples.append(silence_samples)
                current_time_sec += (seg.pause_after_ms / 1000.0)

            if progress_callback:
                progress_callback(i + 1, total_segments)

            # Prevent CUDA memory accumulation on long chapters
            if self.use_gpu and (i + 1) % 15 == 0:
                import torch
                torch.cuda.empty_cache()

        if self.use_gpu:
            import torch
            torch.cuda.empty_cache()

        if not all_samples:
            silence = self.create_silence(1000)
            sf.write(output_wav_path, silence, self.sample_rate)
            return 1.0, []

        full_audio = np.concatenate(all_samples)

        # Audio normalization: prevent clipping and ensure consistent volume
        max_val = np.max(np.abs(full_audio))
        if max_val > 0.98:
            full_audio = full_audio * (0.95 / max_val)

        sf.write(output_wav_path, full_audio, self.sample_rate)
        duration = len(full_audio) / self.sample_rate
        return duration, timings
