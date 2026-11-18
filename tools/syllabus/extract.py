"""Extract the HSK syllabus PDF (docs/HSK3.0-syllabus-…-12.25.pdf) into JSON.

    python3 tools/syllabus/extract.py docs/HSK3.0-syllabus-vocabulary-characters-grammar-12.25.pdf OUT_DIR

Writes OUT_DIR/vocab.json, OUT_DIR/chars.json and OUT_DIR/grammar.json.
Needs pdfplumber (pip install pdfplumber). Page numbers in the output are the
numbers printed on the pages (PDF page index minus 2).

How the three parts are read:
* Every page carries a rotated 66pt "汉考国际" watermark; characters larger
  than 30pt are dropped before anything else.
* 词汇大纲 (PDF pages 4–278): columns are told apart by content, not by x
  position (one page repeats a header word in the wrong column). 序号 is
  digits, 等级 matches the level pattern, 拼音 is set in the HanYuPinYin font,
  词语 is the SimSun text before it and 词性 the SimSun text after it.
* 汉字大纲 (PDF pages 280–308): "N.字" items under each "HSK（…）认读字/书写字"
  heading; numbering must run 1..N without gaps.
* 语法大纲 (PDF pages 310–330): tables are rebuilt from cell geometry.
  pdfplumber only returns cells closed on four sides, so a merged cell that
  crosses a page break is added back as an "open" strip and joined with its
  counterpart on the neighbouring page. Superscript digits (sense numbers such
  as 了¹/了²) become Unicode superscripts. A line break inside a cell is kept
  only when the line does not fill the cell (a real break, not a wrap).
"""
import collections
import json
import os
import re
import sys

import pdfplumber

SUP = str.maketrans("0123456789", "⁰¹²³⁴⁵⁶⁷⁸⁹")
LEVEL = re.compile(r"^(?:[1-6]|7-9)(?:（(?:[1-6]|7-9)）)*$")
LEVEL_NAMES = {"一级": "1", "二级": "2", "三级": "3", "四级": "4", "五级": "5",
               "六级": "6", "七—九级": "7-9", "一级）~（二级": "1-2"}
CJK = r"[㐀-鿿\U00020000-\U0003ffff]"
PINYIN_ONLY = re.compile(r"^[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňǹḿ’'\-]+$")


def no_watermark(page):
    return page.filter(lambda o: not (o.get("object_type") == "char" and o.get("size", 0) > 30))


def cluster_rows(words, tol=4.0):
    out = []
    for w in sorted(words, key=lambda w: (w["top"], w["x0"])):
        if out and abs(out[-1][0] - w["top"]) <= tol:
            out[-1][1].append(w)
        else:
            out.append([w["top"], [w]])
    return [sorted(ws, key=lambda w: w["x0"]) for _, ws in out]


def join_by_gap(ws):
    """Join word boxes, adding a space only where the PDF leaves a gap."""
    text = ""
    for i, w in enumerate(ws):
        if i and w["x0"] - ws[i - 1]["x1"] > 1.5:
            text += " "
        text += w["text"]
    return text


def extract_vocab(pdf):
    rows, problems = [], []
    for pno in range(4, 279):
        page = no_watermark(pdf.pages[pno - 1])
        for ws in cluster_rows(page.extract_words(extra_attrs=["fontname", "size"])):
            texts = [w["text"] for w in ws]
            if "序号" in texts or "词性" in texts:
                continue
            if len(ws) == 1 and re.fullmatch(r"\d+", texts[0]) and "Times" in ws[0]["fontname"]:
                continue  # printed page number
            if len(ws) < 4 or not re.fullmatch(r"\d+", texts[0]) or not LEVEL.match(texts[1]):
                problems.append((pno, texts))
                continue
            rest = ws[2:]
            py_index = [i for i, w in enumerate(rest) if "PinYin" in w["fontname"]]
            if not py_index or py_index[0] == 0:
                problems.append((pno, texts))
                continue
            word_ws = rest[:py_index[0]]
            py_ws = rest[py_index[0]:py_index[-1] + 1]
            pos_ws = rest[py_index[-1] + 1:]
            # A pinyin letter set in SimSun (嗯 ǹg) lands in the word column.
            while len(word_ws) > 1 and PINYIN_ONLY.match(word_ws[-1]["text"]):
                py_ws = [word_ws.pop()] + py_ws
            rows.append({
                "seq": int(texts[0]),
                "levelRaw": texts[1],
                "word": "".join(w["text"] for w in word_ws),
                "pinyin": join_by_gap(py_ws),
                "pos": "".join(w["text"] for w in pos_ws),
                "page": pno - 2,
            })
    seqs = [r["seq"] for r in rows]
    if problems or seqs != list(range(1, len(seqs) + 1)):
        raise SystemExit("vocab: unexpected rows %r" % problems[:5])
    return rows


def extract_chars(pdf):
    item = re.compile(r"(\d+)\s*[.．]\s*(" + CJK + r")")
    sections = collections.OrderedDict()
    current = None
    for pno in range(280, 309):
        page = no_watermark(pdf.pages[pno - 1])
        for ws in cluster_rows(page.extract_words(extra_attrs=["fontname", "size"])):
            line = " ".join(w["text"] for w in ws)
            m = re.search(r"HSK（(.+?)）(认读字|书写字)", line.replace(" ", ""))
            if m:
                current = ("read" if m.group(2) == "认读字" else "write", LEVEL_NAMES[m.group(1)])
                sections[current] = []
                continue
            if len(ws) == 1 and re.fullmatch(r"\d+", line) and "Times" in ws[0]["fontname"]:
                continue
            if item.sub("", line).strip():
                raise SystemExit("chars: unread text on page %d: %r" % (pno - 2, line))
            for num, ch in item.findall(line):
                sections[current].append((int(num), ch, pno - 2))
    out = {"read": collections.OrderedDict(), "write": collections.OrderedDict()}
    for (kind, level), items in sections.items():
        items.sort()
        if [n for n, _, _ in items] != list(range(1, len(items) + 1)):
            raise SystemExit("chars: numbering gap in %s %s" % (kind, level))
        out[kind][level] = {"chars": "".join(c for _, c, _ in items),
                            "pages": sorted({p for _, _, p in items})}
    return out


def _cluster(values, tol=2.0):
    groups = []
    for v in sorted(values):
        if groups and v - groups[-1][-1] <= tol:
            groups[-1].append(v)
        else:
            groups.append([v])
    return [sum(g) / len(g) for g in groups]


def _cell_lines(page, bbox):
    crop = page.crop((bbox[0] + 0.5, bbox[1] + 0.5, bbox[2] - 0.5, bbox[3] - 0.5))
    return [{"t": l["text"].replace(" ", ""), "w": l["x1"] - l["x0"]}
            for l in crop.extract_text_lines(strip=True)]


def _join_cell(lines, width):
    text = ""
    for i, line in enumerate(lines):
        if i:
            prev = lines[i - 1]
            ratio = prev["w"] / width
            soft = ratio >= 0.86 or (prev["t"].endswith("、") and ratio >= 0.80)
            text += "" if soft else "\n"
        text += line["t"]
    return text


def extract_grammar(pdf):
    header = ["类别", "类别名称", "细目", "语法内容"]
    pages, level = [], None
    for pno in range(310, len(pdf.pages) + 1):
        full = no_watermark(pdf.pages[pno - 1])
        heads = [l for l in full.extract_text_lines()
                 if re.search(r"HSK（.+?）语法", l["text"].replace(" ", ""))]
        page = full.filter(lambda o: not (o.get("object_type") == "char" and o.get("size", 0) > 13))
        body = collections.Counter(round(c["size"], 1) for c in page.chars
                                   if "SimSun" in c["fontname"]).most_common(1)[0][0]
        for c in page.chars:
            if c["text"].isdigit() and c["size"] < body * 0.8:
                c["text"] = c["text"].translate(SUP)
        tables = page.find_tables({"vertical_strategy": "lines", "horizontal_strategy": "lines"})
        if len(tables) != 1:
            raise SystemExit("grammar: %d tables on page %d" % (len(tables), pno - 2))
        t = tables[0]
        starts = bool(heads) and heads[-1]["top"] < t.bbox[1]
        if starts:
            level = LEVEL_NAMES[re.search(r"HSK（(.+?)）语法", heads[-1]["text"].replace(" ", "")).group(1)]
        xs = _cluster([r["x0"] for r in page.rects if r["width"] < 2 and r["height"] > 5
                       and t.bbox[1] - 1 <= r["top"] and r["bottom"] <= t.bbox[3] + 1])
        if len(xs) != 5:
            raise SystemExit("grammar: column rules on page %d: %r" % (pno - 2, xs))
        top, bottom = t.bbox[1], t.bbox[3]
        heading_cells = [c for c in t.cells if abs(c[1] - top) < 1
                         and [l["t"] for l in _cell_lines(page, c)] in ([h] for h in header)]
        if heading_cells:
            top = heading_cells[0][3]

        def col_of(x):
            return min(range(5), key=lambda i: abs(xs[i] - x))

        cols = [[] for _ in range(4)]
        for c in t.cells:
            if c[1] < top - 1:
                continue
            a, b = col_of(c[0]), col_of(c[2])
            for k in range(a, b):
                cols[k].append({"bbox": c, "open": None})
        for k in range(4):
            cols[k].sort(key=lambda c: c["bbox"][1])
            first = cols[k][0]["bbox"][1] if cols[k] else bottom
            if first - top > 3:
                cols[k].insert(0, {"bbox": (xs[k], top, xs[k + 1], first), "open": "top"})
            if bottom - cols[k][-1]["bbox"][3] > 3:
                cols[k].append({"bbox": (xs[k], cols[k][-1]["bbox"][3], xs[k + 1], bottom), "open": "bottom"})
            for c in cols[k]:
                lines = _cell_lines(page, c["bbox"])
                c["text"] = _join_cell(lines, c["bbox"][2] - c["bbox"][0]) if k == 3 else "".join(l["t"] for l in lines)
        pages.append({"page": pno - 2, "level": level, "starts": starts, "cols": cols})

    # A column joins across a page break only if all columns left of it joined.
    for a, b in zip(pages, pages[1:]):
        if b["starts"]:
            continue
        for k in range(3):
            lo, hi = a["cols"][k][-1], b["cols"][k][0]
            if lo["text"] and hi["text"] and lo["text"] != hi["text"]:
                break
            lo["text"] = hi["text"] = lo["text"] or hi["text"]

    rows = []
    for pg in pages:
        for leaf in pg["cols"][3]:
            y = (leaf["bbox"][1] + leaf["bbox"][3]) / 2
            labels = [next(c for c in pg["cols"][k] if c["bbox"][1] - 0.5 <= y <= c["bbox"][3] + 0.5)["text"]
                      for k in range(3)]
            rows.append({"level": pg["level"], "page": pg["page"], "cat": labels[0],
                         "name": labels[1], "item": labels[2], "text": leaf["text"]})
    return rows


def main():
    pdf_path, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    with pdfplumber.open(pdf_path) as pdf:
        parts = {"vocab": extract_vocab(pdf), "chars": extract_chars(pdf), "grammar": extract_grammar(pdf)}
    for name, data in parts.items():
        with open(os.path.join(out_dir, name + ".json"), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
    print("vocab", len(parts["vocab"]), "| chars",
          {k: {lv: len(v["chars"]) for lv, v in d.items()} for k, d in parts["chars"].items()},
          "| grammar", len(parts["grammar"]))


if __name__ == "__main__":
    main()
