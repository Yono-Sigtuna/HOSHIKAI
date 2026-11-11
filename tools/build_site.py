#!/usr/bin/env python3
"""把星海社线上站点（v2p 星座网格）同步进本仓库，供 GitHub Pages 托管。

用法：
    python tools/build_site.py
    HOSHIKAI_SRC="D:/path/to/WWW/ai" python tools/build_site.py

默认源目录是 phpstudy 里的 WWW/ai。只同步 v2p/ 与 shared/，
不碰 _probes / _archive / project.md / memories.md。

路径改写：
    /v2p/...      -> ./...          （站点根 = 仓库根，相对路径可迁移）
    /shared/...   -> ./shared/...
    ../shared/... -> ./shared/...

干净 URL（/forum/1-1/ 之类）由仓库根目录的 404.html 在 GitHub Pages 上兜底，
见该文件头部的说明。.htaccess 不复制（GitHub Pages 不认 Apache 规则）。
"""
from __future__ import annotations

import os
import re
import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SRC = Path(os.environ.get("HOSHIKAI_SRC", r"D:/_HumanUP/PhPStudy/phpstudy_pro/WWW/ai"))
V2P = SRC / "v2p"
SHARED = SRC / "shared"

TEXT_SUFFIXES = {".html", ".js", ".css"}
SKIP_COPY = {".htaccess"}


def copy_site() -> int:
    if not V2P.is_dir():
        sys.exit(f"[x] 找不到源目录：{V2P}\n    用 HOSHIKAI_SRC 指定 WWW/ai 的位置。")

    copied = 0
    for item in V2P.iterdir():
        if item.name in SKIP_COPY:
            continue
        dst = REPO / item.name
        if item.is_dir():
            shutil.copytree(item, dst, dirs_exist_ok=True)
            copied += sum(1 for p in item.rglob("*") if p.is_file())
        else:
            shutil.copy2(item, dst)
            copied += 1

    shared_dst = REPO / "shared"
    shared_dst.mkdir(exist_ok=True)
    for item in SHARED.iterdir():
        if item.is_file():
            shutil.copy2(item, shared_dst / item.name)
            copied += 1

    # op/ 是「放 opening.mp4 的空目录」，git 不跟踪空目录，补一个占位文件。
    op = REPO / "op"
    op.mkdir(exist_ok=True)
    gitkeep = op / ".gitkeep"
    if not gitkeep.exists():
        gitkeep.write_text("", encoding="utf-8")

    return copied


def rewrite_paths() -> tuple[int, int]:
    files = 0
    replacements = 0
    for path in REPO.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        if ".git" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        # 先处理 ../shared/，再用「前面不是点或词字符」的规则处理绝对 /shared/。
        # 顺序反了会把 ./shared/ 再补一个点变回 ../shared/（第一版就这么翻过车）。
        text, n1 = re.subn(r"\.\./shared/", "./shared/", text)
        text, n2 = re.subn(r"(?<![\w.])/shared/", "./shared/", text)
        text, n3 = re.subn(r"(?<![\w.])/v2p/", "./", text)
        # menu.js 里用转义斜杠写的正则，上面三条匹配不到；改写成同时认 ./forum/ 与 /forum/。
        text, n4 = re.subn(
            re.escape(r"/^\/v2p\/forum\/\d+-\d+\/$/"),
            lambda _m: r"/^(?:\.\/|\/)?forum\/\d+-\d+\/$/",
            text,
        )
        text, n5 = re.subn(
            re.escape(r"/^#board-\d+$/"),
            lambda _m: r"/^(?:\.\/)?#board-\d+$/",
            text,
        )
        n = n1 + n2 + n3 + n4 + n5
        if n:
            path.write_text(text, encoding="utf-8", newline="\n")
            files += 1
            replacements += n
    return files, replacements


def check_leftovers() -> list[str]:
    bad = []
    for path in REPO.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        if ".git" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        for needle in ("/v2p/", "../shared/", 'src="/shared/', 'href="/shared/'):
            if needle in text:
                bad.append(f"{path.relative_to(REPO)}: {needle}")
    return bad


def main() -> None:
    copied = copy_site()
    files, replacements = rewrite_paths()
    (REPO / ".nojekyll").write_text("", encoding="utf-8")

    print(f"[ok] 复制 {copied} 个文件：{V2P} -> {REPO}")
    print(f"[ok] 改写 {files} 个文本文件，共 {replacements} 处路径")
    print(f"[ok] 写入 .nojekyll")

    bad = check_leftovers()
    if bad:
        print("[!] 仍有旧路径残留：")
        for line in bad[:20]:
            print("    " + line)
        sys.exit(1)
    print("[ok] 没有 /v2p/ 或 /shared/ 绝对路径残留")


if __name__ == "__main__":
    main()
