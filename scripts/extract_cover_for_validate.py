#!/usr/bin/env python3
"""Extract the cover page from the archive HTML into a standalone file
so cover_validate.js can run on it as designed (cover-only tool)."""
import re

SRC = "/home/z/my-project/download/malete-kits-source-archive.html"
OUT = "/tmp/archive-cover-only.html"

html = open(SRC, encoding="utf-8").read()
head = html.split("<body>")[0] + "<body>\n"
cover_start = html.index('<div class="cover">')
cover_end = html.index('<div class="toc-page">')
cover = html[cover_start:cover_end]
open(OUT, "w", encoding="utf-8").write(head + cover + "\n</body></html>\n")
print("written", OUT, "cover bytes:", len(cover))
