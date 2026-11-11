#!/usr/bin/env python3
"""本仓库的本地预览服务器（模拟 GitHub Pages 的 404 兜底）。

    python tools/serve.py            # http://127.0.0.1:8722/
    python tools/serve.py --port 9000

为什么不用 `python -m http.server`：
    站点用的是干净 URL（/forum/1-1/、/topic/<tid>/）。Apache 靠 v2p/.htaccess，
    GitHub Pages 靠根目录的 404.html。本脚本在文件不存在时返回 404.html（HTTP 404），
    让 404.html 里的前端路由把地址翻译成 board.html?b=… / topic.html?t=…，
    和线上行为一致。
"""
from __future__ import annotations

import argparse
import mimetypes
import posixpath
import urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

mimetypes.add_type("image/avif", ".avif")
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("application/javascript", ".js")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _not_found(self) -> None:
        body = (ROOT / "404.html").read_bytes()
        self.send_response(404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802 - stdlib naming
        parsed = urllib.parse.urlsplit(self.path)
        rel = urllib.parse.unquote(parsed.path)
        rel = posixpath.normpath(rel)
        # 兼容 404.html 里写死的 /HOSHIKAI/ 首页链接：本地也认这个前缀。
        if rel == "/HOSHIKAI":
            rel = "/"
        elif rel.startswith("/HOSHIKAI/"):
            rel = rel[len("/HOSHIKAI"):]
        if rel in ("/", "."):
            rel = "/index.html"
        target = (ROOT / rel.lstrip("/")).resolve()
        if ROOT not in target.parents and target != ROOT:
            self.send_error(403)
            return
        if target.is_dir():
            target = target / "index.html"
        if not target.is_file():
            self._not_found()
            return
        # 让父类的 translate_path 也走同一套映射（/HOSHIKAI/ 前缀、目录索引）。
        self.path = rel + (("?" + parsed.query) if parsed.query else "")
        super().do_GET()

    def log_message(self, fmt: str, *args) -> None:
        print(f"[serve] {self.address_string()} {fmt % args}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8722)
    ap.add_argument("--bind", default="127.0.0.1")
    args = ap.parse_args()
    with ThreadingHTTPServer((args.bind, args.port), Handler) as httpd:
        print(f"[serve] 星海社静态站 → http://{args.bind}:{args.port}/")
        print(f"[serve] 根目录 {ROOT}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
