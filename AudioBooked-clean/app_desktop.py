import os
import sys
import time
import socket
import threading
import urllib.request
from pathlib import Path

# Ensure working directory is the project directory
ROOT_DIR = Path(__file__).resolve().parent
os.chdir(ROOT_DIR)
sys.path.insert(0, str(ROOT_DIR))

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(('127.0.0.1', port)) == 0

def is_audiobooked_running(port: int) -> bool:
    try:
        req = urllib.request.urlopen(f"http://127.0.0.1:{port}/api/hardware", timeout=1.5)
        return req.status == 200
    except Exception:
        return False

def find_available_port(start_port: int = 8000) -> int:
    port = start_port
    while is_port_in_use(port):
        if is_audiobooked_running(port):
            return port
        port += 1
    return port

class UvicornServerThread(threading.Thread):
    def __init__(self, host: str, port: int):
        super().__init__(daemon=True)
        self.host = host
        self.port = port
        self.server = None

    def run(self):
        import uvicorn
        from main import app
        config = uvicorn.Config(app, host=self.host, port=self.port, log_level="warning")
        self.server = uvicorn.Server(config)
        self.server.run()

    def stop(self):
        if self.server:
            self.server.should_exit = True

def main():
    target_port = find_available_port(8000)
    server_thread = None

    if not is_audiobooked_running(target_port):
        print(f"[*] Starting AudioBooked backend on http://127.0.0.1:{target_port} ...")
        server_thread = UvicornServerThread(host="127.0.0.1", port=target_port)
        server_thread.start()

        # Wait up to 3 seconds for immediate fast-boot
        start_time = time.time()
        while time.time() - start_time < 3.0:
            if is_audiobooked_running(target_port):
                break
            time.sleep(0.2)

    import webview

    icon_path = str(ROOT_DIR / "static" / "icon.ico")
    if not os.path.exists(icon_path):
        icon_path = None

    # If backend is already responsive, load it directly; otherwise show splash loader
    if is_audiobooked_running(target_port):
        initial_url = f"http://127.0.0.1:{target_port}"
    else:
        splash_file = ROOT_DIR / "static" / "splash.html"
        initial_url = splash_file.as_uri() + f"?port={target_port}"

    window = webview.create_window(
        title="AudioBooked — Literary Synthesizer",
        url=initial_url,
        width=1440,
        height=920,
        min_size=(1080, 700),
        background_color="#121110",
        text_select=True,
        zoomable=True
    )

    try:
        # Launch native Edge Chromium WebView2 window
        webview.start(gui="edgechromium", debug=False)
    except Exception as e:
        print(f"[!] WebView2 start fallback: {e}")
        try:
            webview.start(debug=False)
        except Exception:
            # Fallback to browser if webview encounters system display issue
            import webbrowser
            webbrowser.open(f"http://127.0.0.1:{target_port}")
            if server_thread:
                server_thread.join()

    if server_thread:
        server_thread.stop()

if __name__ == "__main__":
    main()
