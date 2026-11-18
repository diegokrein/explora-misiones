from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import webbrowser

os.chdir(Path(__file__).resolve().parent)
try:
    server = ThreadingHTTPServer(("127.0.0.1", 8765), SimpleHTTPRequestHandler)
except OSError:
    server = ThreadingHTTPServer(("127.0.0.1", 0), SimpleHTTPRequestHandler)

with server:
    url = f"http://localhost:{server.server_port}/"
    print(f"Abri {url} para jugar. Para salir, presiona Ctrl+C.", flush=True)
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
