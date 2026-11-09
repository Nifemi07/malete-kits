#!/usr/bin/env python3
"""Debug: how do part-tag spans extract from the archive PDF?"""
import fitz

PDF = "/home/z/my-project/download/malete-kits-source-archive.pdf"
doc = fitz.open(PDF)
for pno in range(2, 30):
    page = doc[pno]
    t = page.get_text()
    if "PART A" in t or "Part A" in t:
        print(f"--- page {pno+1} contains Part A text ---")
        d = page.get_text("dict")
        for blk in d["blocks"]:
            if blk.get("type") != 0:
                continue
            for line in blk["lines"]:
                for span in line["spans"]:
                    tx = span["text"].strip()
                    if "PART" in tx.upper() and len(tx) < 20:
                        print(repr(tx), "| font:", span["font"], "| size:", round(span["size"], 2),
                              "| color:", span["color"], "| flags:", span["flags"])
        break
else:
    print("no page contains 'PART A' text at all!")
    # maybe uppercase transform produced something else; dump small-bold spans on page with 'Project Documentation'
    for pno in range(2, 30):
        if "Project Documentation" in doc[pno].get_text():
            print(f"found 'Project Documentation' on page {pno+1}; dumping all spans size<9:")
            d = doc[pno].get_text("dict")
            for blk in d["blocks"]:
                if blk.get("type") != 0:
                    continue
                for line in blk["lines"]:
                    for span in line["spans"]:
                        if span["size"] < 9:
                            print(repr(span["text"][:40]), "| font:", span["font"], "| size:", round(span["size"], 2), "| color:", span["color"])
            break
