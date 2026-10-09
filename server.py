"""Portal web server.

Code and user data are kept apart:
  ./html      the app (HTML, CSS, JS) — served at /
  DATA_DIR    config.json plus any images it references — served at /data/,
              and /config.json is answered from DATA_DIR/config.json

On start, DATA_DIR/config.json is created from default_config.json if missing.
Everything is sent with `Cache-Control: no-cache`, so edits show up without a
hard refresh. Standard library only.

Environment:
  PORT        port to listen on (default: 80)
  DATA_DIR    folder with config.json and images (default: ./data)
"""

import os
import shutil
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

APP_DIR = os.path.dirname(os.path.abspath(__file__))
HTML_DIR = os.path.join(APP_DIR, "html")
DEFAULT_CONFIG_PATH = os.path.join(APP_DIR, "default_config.json")
DATA_DIR = os.path.abspath(os.environ.get("DATA_DIR", os.path.join(APP_DIR, "data")))
CONFIG_PATH = os.path.join(DATA_DIR, "config.json")
DATA_URL_PREFIX = "/data/"

PORT = int(os.environ.get("PORT", "80"))


class PortalHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def translate_path(self, path):
        url_path = urlsplit(path).path
        if url_path == "/config.json":
            return CONFIG_PATH
        if url_path.startswith(DATA_URL_PREFIX):
            # Reuse the base class's safe path handling (strips "..", etc.), rooted at DATA_DIR.
            html_dir, self.directory = self.directory, DATA_DIR
            try:
                return super().translate_path(path[len(DATA_URL_PREFIX) - 1 :])
            finally:
                self.directory = html_dir
        return super().translate_path(path)


def ensure_config() -> None:
    if os.path.exists(CONFIG_PATH):
        return
    os.makedirs(DATA_DIR, exist_ok=True)
    shutil.copyfile(DEFAULT_CONFIG_PATH, CONFIG_PATH)
    print(f"Created {CONFIG_PATH} from default_config.json", flush=True)


def main() -> None:
    ensure_config()
    print(f"Portal listening on :{PORT}, serving {HTML_DIR} (data: {DATA_DIR})", flush=True)
    handler = partial(PortalHandler, directory=HTML_DIR)
    ThreadingHTTPServer(("", PORT), handler).serve_forever()


if __name__ == "__main__":
    main()
