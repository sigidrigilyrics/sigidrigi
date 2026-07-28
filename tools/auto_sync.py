#!/usr/bin/env python3
"""Auto-sync — generate line_timings for a Sigidrigi song from its YouTube track.

Free, local pipeline: yt-dlp downloads the ORIGINAL recording (reference_url —
the one with singing), demucs isolates the vocal stem, sung spans are marked
wherever the stem carries energy, and the song's known lyric lines are
distributed across the sung time in order, weighted by line length.

(Whisper was tried first and fails on Fijian band recordings — it either hears
nothing or hallucinates; demucs energy detection is engine-agnostic.)

Usage:
    python tools/auto_sync.py "<song id or title substring>"
    python tools/auto_sync.py "Adi Losalini" --karaoke              # also export music-minus-vocals .m4a
    python tools/auto_sync.py "Adi Losalini" --karaoke --upload     # + upload it and set audio_url,
                                                                     #   so Sing Mode can play/cache it
                                                                     #   fully offline (no YouTube needed)

Output:
    tools/output/<song-id>.json   the line_timings payload (TapSync shape)
    tools/output/<song-id>.sql    paste into the Supabase SQL editor to apply

Deps: pip install yt-dlp demucs av   (already installed on this machine)
Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from .env.local automatically.
"""

import argparse
import json
import pathlib
import re
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

# Windows' default console codepage (cp1252/cp437) can't encode the arrows/em-dashes
# this script prints — without this, output crashes mid-run, after side effects
# (uploads, DB-bound writes) have already happened but before the result files land.
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT_DIR = pathlib.Path(__file__).resolve().parent / "output"

HEADER_RE = re.compile(r"^(verse|chorus|bridge|outro|pre-?chorus|intro|hook|\[)", re.I)

# Same bucket the Admin panel's AudioUploader writes to (src/pages/Admin.jsx) — its
# RLS policy already accepts anon-key uploads, so no extra credentials are needed here.
STORAGE_BUCKET = "instrumentals"


def load_env():
    env = {}
    for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()
    return env


def fetch_song(env, query):
    base = env["VITE_SUPABASE_URL"].rstrip("/")
    key = env["VITE_SUPABASE_ANON_KEY"]
    sel = "id,title,lyrics,intro,sing_end,instrumental_url,reference_url,line_timings"
    uuid_like = re.fullmatch(r"[0-9a-f-]{36}", query.lower())
    flt = f"id=eq.{query}" if uuid_like else f"title=ilike.*{urllib.parse.quote(query)}*"
    req = urllib.request.Request(
        f"{base}/rest/v1/songs?select={sel}&{flt}",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
    )
    rows = json.loads(urllib.request.urlopen(req).read())
    if not rows:
        sys.exit(f"No song matches {query!r}")
    if len(rows) > 1:
        for r in rows:
            print(f"  {r['id']}  {r['title']}")
        sys.exit(f"{len(rows)} songs match — re-run with the exact id.")
    return rows[0]


def youtube_id(url):
    if not url:
        return None
    m = re.search(r"(?:youtu\.be/|v=|embed/)([\w-]{11})", url)
    return m.group(1) if m else None


def download_audio(yt_id, dest_dir):
    import yt_dlp

    out = pathlib.Path(dest_dir) / "audio.m4a"
    opts = {
        "format": "bestaudio[ext=m4a]/bestaudio",
        "outtmpl": str(out.with_suffix("")) + ".%(ext)s",
        "quiet": True,
        "no_warnings": True,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([f"https://www.youtube.com/watch?v={yt_id}"])
    files = list(pathlib.Path(dest_dir).glob("audio.*"))
    if not files:
        sys.exit("yt-dlp produced no audio file")
    return files[0]


def separate(audio_path):
    """Decode + demucs-split the track. Returns (full_mix, vocal_stem) as
    float32 (2, N) arrays at 44.1kHz."""
    import numpy as np
    import av
    import torch
    from demucs.pretrained import get_model
    from demucs.apply import apply_model

    container = av.open(str(audio_path))
    stream = container.streams.audio[0]
    resampler = av.AudioResampler(format="fltp", layout="stereo", rate=44100)
    chunks = []
    for frame in container.decode(stream):
        for f in resampler.resample(frame):
            chunks.append(f.to_ndarray())
    wav = np.concatenate(chunks, axis=1).astype(np.float32)
    container.close()  # Windows: tempdir cleanup fails while the file is held open
    print(f"Separating vocals (demucs, ~2-3 min on CPU)…")
    model = get_model("htdemucs")
    model.eval()
    with torch.no_grad():
        out = apply_model(model, torch.from_numpy(wav)[None], split=True, overlap=0.1)[0]
    vocals = out[model.sources.index("vocals")].numpy().astype(np.float32)
    return wav, vocals


def export_karaoke(wav, vocals, path):
    """Karaoke mix = full mix minus the vocal stem, saved as .m4a (AAC).
    Encoded with PyAV — torchaudio.save needs torchcodec, which is a pain on
    Windows."""
    import numpy as np
    import av

    inst = np.clip(wav - vocals, -1.0, 1.0).astype(np.float32)
    out = av.open(str(path), "w")
    stream = out.add_stream("aac", rate=44100)
    stream.layout = "stereo"
    chunk = 1024
    for i in range(0, inst.shape[1], chunk):
        frame = av.AudioFrame.from_ndarray(
            np.ascontiguousarray(inst[:, i : i + chunk]), format="fltp", layout="stereo"
        )
        frame.sample_rate = 44100
        frame.pts = i
        for pkt in stream.encode(frame):
            out.mux(pkt)
    for pkt in stream.encode(None):
        out.mux(pkt)
    out.close()


def detect_segments(wav, vocals):
    """Whisper mis-hears Fijian band recordings entirely (validated on real
    tracks) — instead, mark sung spans wherever the demucs vocal stem carries
    energy."""
    import numpy as np

    mono = vocals.mean(axis=0)
    win = int(0.25 * 44100)
    n = len(mono) // win
    rms = np.sqrt((mono[: n * win].reshape(n, win) ** 2).mean(axis=1))
    # An instrumental-only track leaves the stem ~40dB down — refuse to guess.
    if float(rms.max()) < 0.01:
        sys.exit(
            "No vocals found on this track — it is likely an instrumental/karaoke "
            "version. Auto-sync needs the ORIGINAL recording (reference_url)."
        )
    thr = max(float(np.percentile(rms, 95)) * 0.18, float(rms.max()) * 0.06)
    spans = []
    for i, active in enumerate(rms > thr):
        t0, t1 = i * 0.25, (i + 1) * 0.25
        if active:
            if spans and t0 - spans[-1][1] < 0.75:
                spans[-1][1] = t1
            else:
                spans.append([t0, t1])
    spans = [s for s in spans if s[1] - s[0] >= 0.6]
    if not spans:
        sys.exit("Vocal stem present but no spans above threshold — inspect manually.")
    return spans


def build_timings(lyrics, spans):
    """Distribute lyric lines over the sung spans, weighted by line length.

    Time is measured on the CONCATENATED sung timeline (gaps between spans
    removed) so instrumental breaks never swallow a line, then mapped back to
    real track time through the span list.
    """
    lines = [l for l in lyrics.split("\n") if l.strip()]
    sung_idx = [i for i, l in enumerate(lines) if not HEADER_RE.match(l.strip())]
    if not sung_idx:
        sys.exit("No sung lines in lyrics")

    total_sung = sum(b - a for a, b in spans)
    weights = [max(len(lines[i].strip()), 8) for i in sung_idx]
    wsum = sum(weights)

    # start of each sung line on the concatenated timeline
    acc, virtual_starts = 0.0, []
    for w in weights:
        virtual_starts.append(acc / wsum * total_sung)
        acc += w

    def to_real(t):
        for a, b in spans:
            if t <= (b - a):
                return a + t
            t -= b - a
        return spans[-1][1]

    starts = {i: to_real(v) for i, v in zip(sung_idx, virtual_starts)}

    timings = []
    for i, line in enumerate(lines):
        # headers borrow the next sung line's start (TapSync convention)
        start = starts.get(i)
        if start is None:
            nxt = next((starts[j] for j in sung_idx if j > i), None)
            prv = next((starts[j] for j in reversed(sung_idx) if j < i), None)
            start = nxt if nxt is not None else (prv or 0.0)
        nxt_start = next((starts[j] for j in sung_idx if j > i), None)
        end = nxt_start if nxt_start and nxt_start > start else start + 3
        words = [w for w in line.split(" ") if w]
        dur = end - start
        timings.append(
            {
                "line": line,
                "start_time": round(start, 2),
                "end_time": round(end, 2),
                "words": [
                    {
                        "text": w,
                        "start_time": round(start + wi / len(words) * dur, 2),
                        "end_time": round(start + (wi + 1) / len(words) * dur, 2),
                    }
                    for wi, w in enumerate(words)
                ],
            }
        )
    return timings, starts[sung_idx[0]], spans[-1][1]


def upload_to_storage(env, path):
    """Upload to the same 'instrumentals' bucket the Admin panel's AudioUploader
    uses, via the Storage REST API — same anon-key auth as everywhere else in
    this file, no service-role key needed."""
    base = env["VITE_SUPABASE_URL"].rstrip("/")
    key = env["VITE_SUPABASE_ANON_KEY"]
    object_path = f"{int(time.time() * 1000)}-{path.name}"
    req = urllib.request.Request(
        f"{base}/storage/v1/object/{STORAGE_BUCKET}/{object_path}",
        data=path.read_bytes(),
        method="POST",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "audio/mp4",
            "x-upsert": "false",
        },
    )
    try:
        urllib.request.urlopen(req)
    except urllib.error.HTTPError as e:
        sys.exit(f"Storage upload failed ({e.code}): {e.read().decode('utf-8', 'replace')}")
    return f"{base}/storage/v1/object/public/{STORAGE_BUCKET}/{object_path}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("query", help="song id or title substring")
    ap.add_argument("--karaoke", action="store_true",
                    help="also export the karaoke mix (music minus vocals) as .m4a")
    ap.add_argument("--upload", action="store_true",
                    help="with --karaoke: also upload the mix to Supabase Storage and set "
                         "audio_url, so Sing Mode plays it directly (no YouTube dependency) "
                         "and it can be cached for true offline playback")
    args = ap.parse_args()

    env = load_env()
    song = fetch_song(env, args.query)
    print(f"Song: {song['title']}  ({song['id']})")
    if song.get("line_timings"):
        print("NOTE: song already has line_timings — output will overwrite them if applied.")

    # Vocals live on the ORIGINAL recording (reference_url) — that is the only
    # track auto-detection can work from. If the karaoke instrumental is a
    # different video with a different arrangement, the timings won't transfer;
    # today every instrumental_url in the catalogue is the same video as the
    # reference, so this is safe. Warn when they differ.
    url = song.get("reference_url") or song.get("instrumental_url")
    yt = youtube_id(url)
    if not yt:
        sys.exit("Song has no usable YouTube URL (reference_url/instrumental_url).")
    inst = youtube_id(song.get("instrumental_url"))
    if inst and inst != yt:
        print(f"WARNING: instrumental ({inst}) is a different video than the reference ({yt}) — "
              "verify the karaoke view still lines up after applying.")
    print(f"Audio: https://youtu.be/{yt}")

    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        audio = download_audio(yt, td)
        wav, vocals = separate(audio)
    spans = detect_segments(wav, vocals)

    audio_url_sql = ""
    if args.karaoke:
        OUT_DIR.mkdir(exist_ok=True)
        kpath = OUT_DIR / f"{song['id']}-karaoke.m4a"
        export_karaoke(wav, vocals, kpath)
        print(f"Karaoke track (mix minus vocals): tools/output/{kpath.name}")
        if args.upload:
            public_url = upload_to_storage(env, kpath)
            print(f"Uploaded: {public_url}")
            print("(SingMode plays this directly via <audio> — no YouTube network needed,")
            print(" and once cached by the service worker after first play, it works fully offline.)")
            audio_url_sql = f", audio_url = '{public_url}'"

    print(f"{len(spans)} sung spans, {spans[0][0]:.1f}s → {spans[-1][1]:.1f}s")
    timings, first_start, last_end = build_timings(song["lyrics"] or "", spans)

    mmss = lambda s: f"{int(s // 60)}:{int(s % 60):02d}"
    print("\nLine map (spot-check a few against the recording):")
    for t in timings[:6]:
        print(f"  {mmss(t['start_time'])}  {t['line'][:52]}")
    print(f"  …  ({len(timings)} lines, ends {mmss(timings[-1]['end_time'])})")

    OUT_DIR.mkdir(exist_ok=True)
    jpath = OUT_DIR / f"{song['id']}.json"
    jpath.write_text(json.dumps(timings, indent=1), encoding="utf-8")

    payload = json.dumps(timings, separators=(",", ":")).replace("'", "''")
    sql = (
        f"update songs set line_timings = '{payload}'::jsonb, "
        f"intro = {round(first_start)}, sing_end = {round(last_end)}{audio_url_sql} "
        f"where id = '{song['id']}';"
    )
    spath = OUT_DIR / f"{song['id']}.sql"
    spath.write_text(sql, encoding="utf-8")

    print(f"\nWrote {jpath.name} and {spath.name} in tools/output/")
    print("Apply: paste the .sql into the Supabase SQL editor, then check the song in Sing Mode.")


if __name__ == "__main__":
    main()
