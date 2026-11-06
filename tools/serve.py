#!/usr/bin/env python3
"""Serve the site locally the way GitHub Pages does.

/name is answered with name.html, and an address that doesn't exist gets 404.html with a 404 status.

    python3 tools/serve.py [port]      (default port 8000)
"""
import http.server
import io
import os
import sys
from urllib.parse import unquote, urlsplit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_head(self):
        parts = urlsplit(self.path)
        path = unquote(parts.path)
        local = os.path.normpath(os.path.join(ROOT, path.lstrip('/')))
        if local != ROOT and not local.startswith(ROOT + os.sep):
            self.send_error(403)
            return None
        if os.path.isfile(local) or (os.path.isdir(local) and os.path.isfile(os.path.join(local, 'index.html'))):
            return super().send_head()
        if not path.endswith('/') and os.path.isfile(local + '.html'):
            self.path = path + '.html' + ('?' + parts.query if parts.query else '')
            return super().send_head()
        try:
            with open(os.path.join(ROOT, '404.html'), 'rb') as f:
                body = f.read()
        except OSError:
            self.send_error(404)
            return None
        self.send_response(404)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        return io.BytesIO(body)


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f'Serving {ROOT} at http://localhost:{port}')
    http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
