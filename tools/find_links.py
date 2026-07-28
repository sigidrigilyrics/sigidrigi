#!/usr/bin/env python3
"""Find YouTube reference links for catalogue songs missing one.

Fijian song titles are usually the first line of the first verse, so a YouTube
title search on the song title works well. For each song the top 5 results are
scored on title-word overlap and sane song duration; everything is written to a
review file — nothing touches the database until a human approves.

Usage:
    python tools/find_links.py            # all songs missing reference_url
    python tools/find_links.py --limit 5  # trial run
    python tools/find_links.py "Adi Losalini"   # one song

Output (tools/output/):
    reference_links.jsonl   raw results, appended per song (rerun-safe: skips done)
    reference_links.md      review sheet — open, check links, delete bad rows
    reference_links.sql     UPDATEs for CONFIDENT matches only — paste after review
"""

import argparse
import json
import pathlib
import re
import sys
import time
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(__file__).resolve().parent / "output"
JSONL = OUT / "reference_links.jsonl"


def load_env():
    env = {}
    for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()
    return env


def fetch_songs(env, query=None):
    base = env["VITE_SUPABASE_URL"].rstrip("/")
    key = env["VITE_SUPABASE_ANON_KEY"]
    sel = "id,title,artist,reference_url"
    url = f"{base}/rest/v1/songs?select={sel}&order=title.asc"
    if query:
        url += f"&title=ilike.*{urllib.parse.quote(query)}*"
    req = urllib.request.Request(url, headers={"apikey": key, "Authorization": f"Bearer {key}"})
    return json.loads(urllib.request.urlopen(req).read())


def norm_words(s):
    return set(re.findall(r"[a-z]+", (s or "").lower()))


def search_youtube(query, n=5):
    import yt_dlp

    opts = {"quiet": True, "no_warnings": True, "extract_flat": True, "skip_download": True}
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(f"ytsearch{n}:{query}", download=False)
    out = []
    for e in info.get("entries", []) or []:
        out.append(
            {
                "id": e.get("id"),
                "title": e.get("title") or "",
                "channel": e.get("channel") or e.get("uploader") or "",
                "duration": e.get("duration") or 0,
                "views": e.get("view_count") or 0,
            }
        )
    return out


def score(song_title, cand):
    tw = norm_words(song_title)
    vw = norm_words(cand["title"])
    if not tw:
        return 0.0
    overlap = len(tw & vw) / len(tw)
    dur_ok = 1.0 if 90 <= (cand["duration"] or 0) <= 600 else 0.3
    return round(overlap * dur_ok, 3)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("query", nargs="?", help="optional single-song title filter")
    ap.add_argument("--limit", type=int, default=0, help="stop after N songs")
    args = ap.parse_args()

    env = load_env()
    songs = [s for s in fetch_songs(env, args.query) if not s.get("reference_url")]
    done_ids = set()
    if JSONL.exists():
        for line in JSONL.read_text(encoding="utf-8").splitlines():
            try:
                done_ids.add(json.loads(line)["song_id"])
            except Exception:
                pass
    todo = [s for s in songs if s["id"] not in done_ids]
    if args.limit:
        todo = todo[: args.limit]
    print(f"{len(songs)} songs missing reference_url, {len(done_ids)} already searched, doing {len(todo)}")

    OUT.mkdir(exist_ok=True)
    for i, s in enumerate(todo, 1):
        q = f"{s['title']} fiji"
        try:
            cands = search_youtube(q)
        except Exception as e:
            print(f"[{i}/{len(todo)}] {s['title']!r} — search failed: {e}")
            time.sleep(3)
            continue
        for c in cands:
            c["score"] = score(s["title"], c)
        cands.sort(key=lambda c: (-c["score"], -c["views"]))
        best = cands[0] if cands else None
        rec = {"song_id": s["id"], "title": s["title"], "artist": s.get("artist"), "candidates": cands}
        with JSONL.open("a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        tag = f"{best['score']:.2f} {best['title'][:48]!r}" if best else "NO RESULTS"
        print(f"[{i}/{len(todo)}] {s['title'][:34]:34} -> {tag}")
        time.sleep(1.0)  # be polite to YouTube

    # Rebuild review sheet + SQL from the full JSONL
    rows = [json.loads(l) for l in JSONL.read_text(encoding="utf-8").splitlines() if l.strip()]
    md = ["# Reference link review", "",
          "Score ≥0.8 = confident (in the SQL). Check the link plays the right song;",
          "delete the SQL line for any wrong match. Low scores: pick manually from alternates.", ""]
    sql = ["-- Confident matches only (score >= 0.8). Review reference_links.md first!"]
    confident = 0
    for r in rows:
        cands = r["candidates"]
        if not cands:
            md.append(f"## {r['title']}  — NO RESULTS\n")
            continue
        best = cands[0]
        mark = "CONFIDENT" if best["score"] >= 0.8 else "check manually"
        md.append(f"## {r['title']}  ({mark}, score {best['score']})")
        for c in cands[:3]:
            mins = f"{int((c['duration'] or 0) // 60)}:{int((c['duration'] or 0) % 60):02d}"
            md.append(f"- [{c['score']}] {mins} **{c['title']}** — {c['channel']}  \n"
                      f"  https://youtu.be/{c['id']}")
        md.append("")
        if best["score"] >= 0.8:
            confident += 1
            sql.append(
                f"update songs set reference_url = 'https://youtu.be/{best['id']}' "
                f"where id = '{r['song_id']}' and reference_url is null;"
            )
    (OUT / "reference_links.md").write_text("\n".join(md), encoding="utf-8")
    (OUT / "reference_links.sql").write_text("\n".join(sql) + "\n", encoding="utf-8")
    print(f"\n{len(rows)} songs searched, {confident} confident.")
    print("Review tools/output/reference_links.md, then paste reference_links.sql into Supabase.")


if __name__ == "__main__":
    main()
