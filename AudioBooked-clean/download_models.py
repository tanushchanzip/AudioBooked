import os
import sys
import httpx
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

FILES = {
    "kokoro-v1.0.onnx": "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/kokoro-v1.0.onnx",
    "voices-v1.0.bin": "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/voices-v1.0.bin"
}

def download_file(filename: str, url: str):
    target = MODELS_DIR / filename
    if target.exists() and target.stat().st_size > 1000000:
        print(f"[*] {filename} already exists ({target.stat().st_size / (1024*1024):.2f} MB), skipping.")
        return

    print(f"[*] Downloading {filename} from {url}...")
    temp_target = target.with_suffix(".tmp")
    
    with httpx.Client(follow_redirects=True, timeout=120.0) as client:
        with client.stream("GET", url) as response:
            response.raise_for_status()
            total_size = int(response.headers.get("content-length", 0))
            downloaded = 0
            with open(temp_target, "wb") as f:
                for chunk in response.iter_bytes(chunk_size=1024 * 1024):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total_size > 0:
                            pct = (downloaded / total_size) * 100
                            mb = downloaded / (1024 * 1024)
                            total_mb = total_size / (1024 * 1024)
                            sys.stdout.write(f"\r    -> {mb:.1f} MB / {total_mb:.1f} MB ({pct:.1f}%)")
                            sys.stdout.flush()
                        else:
                            mb = downloaded / (1024 * 1024)
                            sys.stdout.write(f"\r    -> {mb:.1f} MB")
                            sys.stdout.flush()

    temp_target.rename(target)
    print(f"\n[+] Successfully saved {filename} ({target.stat().st_size / (1024*1024):.2f} MB)!")

def main():
    for name, url in FILES.items():
        download_file(name, url)
    print("[+] All model files verified and ready!")

if __name__ == "__main__":
    main()

