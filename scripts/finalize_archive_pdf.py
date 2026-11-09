#!/usr/bin/env python3
"""Verify layout, stamp page numbers and build the bookmark outline for the
Malète Kits source archive PDF."""
import io
import re
import sys

import fitz  # pymupdf
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas

PDF = "/home/z/my-project/download/malete-kits-source-archive.pdf"
PAGE_W = 540.0   # 720px * 0.75
PAGE_H = 765.0   # 1020px * 0.75
TOP_MARGIN_PT = 44 * 0.75    # 33pt from @page margin
BOTTOM_MARGIN_PT = 48 * 0.75  # 36pt

doc = fitz.open(PDF)
print(f"pages: {doc.page_count}")

# ---------- locate body start (overview page) ----------
body_start = None
for i in range(1, doc.page_count):
    if "What This Document Contains" in doc[i].get_text():
        body_start = i  # 0-based index
        break
if body_start is None:
    print("FATAL: overview page not found")
    sys.exit(1)
print(f"body starts at PDF page {body_start + 1} (index {body_start})")

# ---------- layout checks ----------
def text_bbox(page):
    r = None
    for b in page.get_text("blocks"):
        br = fitz.Rect(b[:4])
        r = br if r is None else (br | r)
    return r

fail = False
checks = [(0, "cover", 0, PAGE_H), (1, "toc p1", TOP_MARGIN_PT - 2, PAGE_H - BOTTOM_MARGIN_PT + 2)]
if body_start >= 2:
    checks.append((body_start - 1, "toc p2", TOP_MARGIN_PT - 2, PAGE_H - BOTTOM_MARGIN_PT + 2))
checks += [(body_start, "body p1", TOP_MARGIN_PT - 2, PAGE_H - BOTTOM_MARGIN_PT + 2),
           (150, "body mid", TOP_MARGIN_PT - 2, PAGE_H - BOTTOM_MARGIN_PT + 2),
           (doc.page_count - 1, "last", TOP_MARGIN_PT - 2, PAGE_H - BOTTOM_MARGIN_PT + 2)]
for idx, label, lo, hi in checks:
    bb = text_bbox(doc[idx])
    ok = bb.y0 >= lo - 1 and bb.y1 <= hi + 1
    print(f"page {idx+1:>3} ({label:8s}) text bbox y: {bb.y0:6.1f} -> {bb.y1:6.1f}  {'OK' if ok else 'FAIL'}")
    if not ok:
        fail = True

# encoding scan
bad = 0
for p in doc:
    t = p.get_text()
    bad += t.count("\ufffd")
print(f"U+FFFD occurrences: {bad}")
if bad:
    fail = True

toc_page_ok = "Contents & File Index" in doc[1].get_text() and body_start >= 2
print(f"TOC at pages 2..{body_start}: {toc_page_ok}")
if not toc_page_ok:
    fail = True
if fail:
    print("LAYOUT CHECKS FAILED - aborting stamp/outline")
    sys.exit(1)

# ---------- collect file headers & part tags ----------
FILE_COLOR = 0x415864
entries = []          # (page1based, path)
part_pages = {}       # 'A' -> page1based
for pno in range(body_start, doc.page_count):  # body starts at overview page
    page = doc[pno]
    d = page.get_text("dict")
    for blk in d["blocks"]:
        if blk.get("type") != 0:
            continue
        for line in blk["lines"]:
            for span in line["spans"]:
                txt = span["text"].strip()
                if not txt:
                    continue
                if "Mono" in span["font"] and abs(span["color"] - FILE_COLOR) < 40 and len(txt) > 3:
                    entries.append((pno + 1, txt))
                elif re.fullmatch(r"PART [A-J]", txt) and span["size"] < 12:
                    part_pages[txt.split()[1]] = pno + 1

# de-duplicate consecutive (wrapped fpath spans may split)
dedup = []
for pg, t in entries:
    if dedup and dedup[-1][1] == t and pg - dedup[-1][0] <= 1:
        continue
    dedup.append((pg, t))
print(f"file headers found: {len(dedup)} | parts: {sorted(part_pages.items())}")

PART_TITLES = {
    "A": "Project Documentation", "B": "Configuration & Deployment",
    "C": "Database - Prisma Schema & Migrations", "D": "Core Libraries & Hooks",
    "E": "App Pages & API Routes", "F": "Storefront Components",
    "G": "Admin Dashboard", "H": "UI Component Library (shadcn/ui)",
    "I": "Build, Data & Operations Scripts", "J": "Example Integrations",
}
ORDER = "ABCDEFGHIJ"
# part I files start after part tag; associate files to parts by part page ranges
bounds = {}
for k in ORDER:
    bounds[k] = part_pages.get(k, 10**9)
outline = [[1, "Cover", 1], [1, "Contents & File Index", 2]]
cur = None
for pg, t in dedup:
    for k in ORDER:
        if pg >= bounds[k] and (cur is None or ORDER.index(k) >= ORDER.index(cur)):
            if cur != k:
                cur = k
                outline.append([1, f"Part {k} - {PART_TITLES[k]}", pg])
            break
    outline.append([2, t, pg])
missing = [k for k in ORDER if k not in part_pages]
print("parts missing from detection:", missing or "none")

# ---------- stamp page numbers ----------
reader = PdfReader(PDF)
writer = PdfWriter()
n = len(reader.pages)
ROMAN = {1: "i", 2: "ii", 3: "iii", 4: "iv", 5: "v"}
for i, page in enumerate(reader.pages):
    if i == 0:
        writer.add_page(page)
        continue
    label = ROMAN.get(i, str(i)) if i < body_start else str(i - body_start + 1)
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(PAGE_W, PAGE_H))
    c.setFont("Helvetica", 7.5)
    c.setFillColorRGB(0.50, 0.53, 0.54)
    c.drawCentredString(PAGE_W / 2, 18, label)
    c.save()
    buf.seek(0)
    overlay = PdfReader(buf).pages[0]
    page.merge_page(overlay)
    writer.add_page(page)
with open(PDF, "wb") as f:
    writer.write(f)
print(f"stamped: TOC pages 2..{body_start} roman, body pages {body_start+1}..{n} arabic 1..{n-body_start}")

# ---------- outline ----------
doc2 = fitz.open(PDF)
doc2.set_toc(outline)
doc2.saveIncr()
print(f"outline entries: {len(outline)}")
doc2.close()
doc.close()
print("DONE")
