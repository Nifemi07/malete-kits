#!/usr/bin/env python3
"""Rebuild the bookmark outline using the generator's own file ordering."""
import importlib.util
import fitz

PDF = "/home/z/my-project/download/malete-kits-source-archive.pdf"
GEN = "/home/z/my-project/scripts/gen_code_archive_html.py"

spec = importlib.util.spec_from_file_location("gen", GEN)
gen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gen)

files, fs, parts, _img = gen.build_parts()

doc = fitz.open(PDF)
body_start = None
for i in range(1, doc.page_count):
    if "What This Document Contains" in doc[i].get_text():
        body_start = i
        break
if body_start is None:
    raise SystemExit("overview page not found")
FILE_COLOR = 0x415864
detected = []
for pno in range(body_start, doc.page_count):
    d = doc[pno].get_text("dict")
    for blk in d["blocks"]:
        if blk.get("type") != 0:
            continue
        for line in blk["lines"]:
            for span in line["spans"]:
                txt = span["text"].strip()
                if "Mono" in span["font"] and abs(span["color"] - FILE_COLOR) < 40 and len(txt) > 3:
                    detected.append((pno + 1, txt))
dedup = []
for pg, t in detected:
    if dedup and dedup[-1][1] == t and pg - dedup[-1][0] <= 1:
        continue
    dedup.append((pg, t))

expected = [p for _, _, _, fl, _ in parts for p in fl]
print(f"detected {len(dedup)} headers, expected {len(expected)}")
if len(dedup) != len(expected):
    dt = [t for _, t in dedup]
    missing = [p for p in expected if p not in dt]
    extra = [t for _, t in dedup if t not in expected]
    print("missing:", missing[:10]); print("extra:", extra[:10])
    raise SystemExit(1)
mismatch = [(e, d) for e, d in zip(expected, dedup) if e != d[1]]
if mismatch:
    print("ORDER MISMATCH (first 5):", mismatch[:5])
    raise SystemExit(1)
print("sequence matches generator order exactly")

page_of = {t: pg for pg, t in dedup}
outline = [[1, "Cover", 1], [1, "Contents & File Index", 2]]
for key, title, _d, fl, _b in parts:
    outline.append([1, f"Part {key} - {title}", page_of[fl[0]]])
    for p in fl:
        outline.append([2, p, page_of[p]])
outline.append([1, "Appendix - Binary Assets & Excluded Files", doc.page_count])
# find appendix start: search backwards for the appendix part title text
for pno in range(doc.page_count - 1, 2, -1):
    if "Binary Assets & Excluded Files" in doc[pno].get_text():
        outline[-1][2] = pno + 1
        break
doc.set_toc(outline)

# rewrite dead named-destination links as explicit GoTo jumps
name_map = {}
for i, p in enumerate(expected):
    name_map[f"f{i}"] = page_of[p] - 1
for key, title, _d, fl, _b in parts:
    name_map[f"part-{key}"] = page_of[fl[0]] - 1
fixed = 0
for pno in range(1, body_start):
    page = doc[pno]
    for l in page.get_links():
        name = l.get("nameddest") or l.get("name")
        if name and name in name_map:
            nl = dict(l)
            nl.pop("nameddest", None)
            nl.pop("name", None)
            nl["kind"] = fitz.LINK_GOTO
            nl["page"] = name_map[name]
            nl["to"] = fitz.Point(0, 36)
            page.update_link(nl)
            fixed += 1
doc.saveIncr()
remaining_named = sum(1 for pno in range(1, body_start) for l in doc[pno].get_links()
                      if l["kind"] == fitz.LINK_NAMED)
print(f"outline rebuilt: {len(outline)} entries; appendix at page {outline[-1][2]}")
print(f"TOC links rewritten to GoTo: {fixed} (unresolved named links left: {remaining_named})")
doc.close()
