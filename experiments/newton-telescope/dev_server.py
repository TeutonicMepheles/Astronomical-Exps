"""Local development preview, with one fixed settings-write endpoint."""
import json
import math
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs

ROOT = Path(__file__).resolve().parent
LIMITS = {
    'feather': (0, 16), 'glowWidth': (0, 40), 'glowStrength': (0, 1),
    'rotationSpeed': (0, 3), 'twinkle': (0, 1), 'meteorInterval': (.5, 15),
    'meteorSpeed': (.3, 3), 'meteorTail': (30, 300),
}

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        url = urlsplit(self.path)
        if url.path in ('/', '/index.html'):
            html = (ROOT / 'index.html').read_text(encoding='utf-8')
            if parse_qs(url.query).get('production') != ['1']:
                html = html.replace('<head>', '<head><script>window.NightSkyDevelopment = true;</script>', 1)
            data = html.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        else:
            super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def do_POST(self):
        if self.path != '/__dev/sky-defaults':
            self.send_error(404)
            return
        expected = 'http://127.0.0.1:8792'
        if self.headers.get('Host') != '127.0.0.1:8792' or self.headers.get('Origin') != expected:
            self.send_error(403)
            return
        try:
            length = int(self.headers.get('Content-Length', 0))
            if not 0 < length <= 4096 or self.headers.get('Content-Type') != 'application/json':
                raise ValueError('invalid request')
            values = json.loads(self.rfile.read(length))
            if not isinstance(values, dict) or set(values) != set(LIMITS):
                raise ValueError('invalid fields')
            for key, (low, high) in LIMITS.items():
                value = values[key]
                if type(value) not in (float, int) or not math.isfinite(value) or not low <= value <= high:
                    raise ValueError('invalid value')
            target = ROOT / 'js' / 'sky-defaults.js'
            temp = target.with_suffix('.js.tmp')
            temp.write_text('/* Product defaults saved from the development panel. */\n'
                            + 'window.NightSkyDefaults = Object.freeze('
                            + json.dumps(values, indent=2) + ');\n', encoding='utf-8')
            os.replace(temp, target)
        except (ValueError, TypeError):
            self.send_error(400)
            return
        except OSError:
            self.send_error(500)
            return
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"saved":true}')

if __name__ == '__main__':
    os.chdir(ROOT)
    print('Development: http://127.0.0.1:8792/  |  Ctrl+Alt+D', flush=True)
    print('Product preview: http://127.0.0.1:8792/?production=1', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8792), Handler).serve_forever()
