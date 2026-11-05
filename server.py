"""Portal web server.

Code and user data are kept apart:
  ./html      the app (HTML, CSS, JS) — served at /
  DATA_DIR    config.json plus any images it references — served at /data/,
              and /config.json is answered from DATA_DIR/config.json

On start, DATA_DIR/config.json is created from default_config.json if missing.
Everything is sent with `Cache-Control: no-cache`, so edits show up without a
hard refresh. Standard library only.

/status is a page showing whether each service answers; /api/status returns the
same as JSON. The checks run here on the server, not in the browser.

Environment:
  PORT         port to listen on (default: 80)
  DATA_DIR     folder with config.json and images (default: ./data)
  STATUS_HOST  host used to check port-based services (default: the host the
               portal was opened with). Inside Docker, "localhost" is the
               container itself, so docker-compose.yml sets host.docker.internal.
"""

import json
import os
import re
import shutil
import ssl
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
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
STATUS_HOST = os.environ.get("STATUS_HOST", "").strip()
STATUS_TIMEOUT_S = 4

# Self-signed certificates are common on a home server; we only care whether something answers.
INSECURE_SSL = ssl.create_default_context()
INSECURE_SSL.check_hostname = False
INSECURE_SSL.verify_mode = ssl.CERT_NONE


class PortalHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        if urlsplit(self.path).path == "/api/status":
            self.send_status_json()
        else:
            super().do_GET()

    def send_status_json(self):
        try:
            with open(CONFIG_PATH, encoding="utf-8") as file:
                config = json.load(file)
            # Same host/protocol logic as serviceUrl() in html/js/portal.js, seen from the request.
            request_host = urlsplit("//" + self.headers.get("Host", "localhost")).hostname or "localhost"
            protocol = self.headers.get("X-Forwarded-Proto", "http")
            status, body = 200, status_report(config, STATUS_HOST or request_host, protocol)
        except (OSError, ValueError) as error:
            status, body = 500, {"error": f"Could not read config.json: {error}"}

        data = json.dumps(body, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def translate_path(self, path):
        url_path = urlsplit(path).path
        if url_path == "/config.json":
            return CONFIG_PATH
        if url_path == "/status":
            return os.path.join(HTML_DIR, "status.html")
        if url_path.startswith(DATA_URL_PREFIX):
            # Reuse the base class's safe path handling (strips "..", etc.), rooted at DATA_DIR.
            html_dir, self.directory = self.directory, DATA_DIR
            try:
                return super().translate_path(path[len(DATA_URL_PREFIX) - 1 :])
            finally:
                self.directory = html_dir
        return super().translate_path(path)


def service_url(service: dict, host: str, protocol: str) -> str:
    """`url` wins; otherwise build one from port/path. Mirrors serviceUrl() in html/js/portal.js."""
    protocol = service.get("protocol") or protocol
    url = str(service.get("url") or "").strip()
    if url.startswith("/"):  # path on the portal's own host
        return f"{protocol}://{service.get('host') or host}{url}"
    if url:
        return url if re.match(r"^[a-z][a-z0-9+.-]*://", url, re.I) else f"{protocol}://{url}"
    port = f":{service['port']}" if service.get("port") else ""
    return f"{protocol}://{service.get('host') or host}{port}{service.get('path') or '/'}"


def check_service(service: dict, host: str, protocol: str) -> dict:
    """Any HTTP answer (even 404 or 500) counts as up; no connection or a timeout counts as down."""
    url = service_url(service, host, protocol)
    result = {"name": service.get("name", ""), "group": service.get("group", ""), "url": url}
    started = time.monotonic()
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "portal-status"})
        with urllib.request.urlopen(request, timeout=STATUS_TIMEOUT_S, context=INSECURE_SSL) as response:
            http_status = response.status
    except urllib.error.HTTPError as error:
        http_status = error.code
    except Exception as error:  # URLError, timeouts, bad URLs, …
        reason = getattr(error, "reason", error)
        message = getattr(reason, "strerror", None) or str(reason)  # "Connection refused", not "[Errno 61] …"
        return {**result, "status": "down", "httpStatus": None, "latencyMs": None, "error": message}
    latency = round((time.monotonic() - started) * 1000)
    return {**result, "status": "up", "httpStatus": http_status, "latencyMs": latency, "error": None}


def status_report(config: dict, host: str, protocol: str) -> dict:
    services = [s for s in config.get("services", []) if not s.get("hidden")]
    with ThreadPoolExecutor(max_workers=max(1, min(16, len(services)))) as pool:
        results = list(pool.map(lambda service: check_service(service, host, protocol), services))
    up = sum(result["status"] == "up" for result in results)
    return {
        "checkedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "summary": {"total": len(results), "up": up, "down": len(results) - up},
        "services": results,
    }


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
