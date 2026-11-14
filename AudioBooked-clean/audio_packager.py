import os
import subprocess
from typing import List, Dict, Any

class AudioPackager:
    """
    Packages individual chapter audio files (WAV/MP3) into a single M4B audiobook container
    with true chapter markers, book metadata, and embedded cover art.
    """

    def __init__(self, ffmpeg_bin: str = "ffmpeg"):
        self.ffmpeg_bin = ffmpeg_bin

    def get_audio_duration(self, file_path: str) -> float:
        """Calculates audio duration in seconds using ffprobe."""
        cmd = [
            "ffprobe", "-v", "quiet",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            file_path
        ]
        try:
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
            return float(result.stdout.strip())
        except Exception:
            # Fallback using soundfile if ffprobe has an issue
            import soundfile as sf
            info = sf.info(file_path)
            return float(info.duration)

    def create_m4b(
        self,
        chapter_files: List[Dict[str, Any]],  # [{'path': '...', 'title': '...'}, ...]
        output_m4b_path: str,
        title: str = "Audiobook",
        author: str = "Unknown Author",
        cover_image_path: str = None
    ) -> str:
        """
        Merges chapter WAV files into a single M4B container with AAC encoding and embedded chapters.
        """
        if not chapter_files:
            raise ValueError("No chapter files provided for M4B compilation.")

        working_dir = os.path.dirname(output_m4b_path)
        os.makedirs(working_dir, exist_ok=True)

        concat_list_path = os.path.join(working_dir, "concat_list.txt")
        metadata_path = os.path.join(working_dir, "ffmetadata.txt")

        # 1. Build FFmpeg concat list
        with open(concat_list_path, "w", encoding="utf-8") as f:
            for ch in chapter_files:
                abs_path = os.path.abspath(ch["path"]).replace("\\", "/")
                f.write(f"file '{abs_path}'\n")

        # 2. Build FFMETADATA1 chapter markers
        current_time_ms = 0
        with open(metadata_path, "w", encoding="utf-8") as f:
            f.write(";FFMETADATA1\n")
            f.write(f"title={title}\n")
            f.write(f"artist={author}\n")
            f.write(f"album_artist={author}\n")
            f.write("genre=Audiobook\n\n")

            for ch in chapter_files:
                duration_sec = ch.get("duration") or self.get_audio_duration(ch["path"])
                duration_ms = int(duration_sec * 1000)
                ch_title = ch.get("title", f"Chapter {ch.get('index', 1)}")

                f.write("[CHAPTER]\n")
                f.write("TIMEBASE=1/1000\n")
                f.write(f"START={current_time_ms}\n")
                f.write(f"END={current_time_ms + duration_ms}\n")
                f.write(f"title={ch_title}\n\n")

                current_time_ms += duration_ms

        # 3. Assemble FFmpeg command
        cmd = [
            self.ffmpeg_bin, "-y",
            "-f", "concat", "-safe", "0", "-i", concat_list_path,
            "-i", metadata_path
        ]

        has_cover = cover_image_path and os.path.exists(cover_image_path)
        if has_cover:
            cmd.extend([
                "-i", cover_image_path,
                "-map", "0:a", "-map", "2:v",
                "-disposition:v:0", "attached_pic"
            ])
        else:
            cmd.extend(["-map", "0:a"])

        cmd.extend([
            "-map_metadata", "1",
            "-c:a", "aac", "-b:a", "128k",
            output_m4b_path
        ])

        print(f"[*] Compiling M4B audiobook to {output_m4b_path} with {len(chapter_files)} chapters...")
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

        # Cleanup temporary text files
        if os.path.exists(concat_list_path):
            os.remove(concat_list_path)
        if os.path.exists(metadata_path):
            os.remove(metadata_path)

        if proc.returncode != 0:
            raise RuntimeError(f"FFmpeg failed to create M4B: {proc.stderr}")

        print(f"[+] M4B Audiobook generated successfully ({os.path.getsize(output_m4b_path) / (1024*1024):.2f} MB)!")
        return output_m4b_path

