#!/usr/bin/env python3
"""
Sync lyrics with audio using OpenAI's Whisper.
Generates line-by-line timing for karaoke sync.
Usage: python sync_lyrics.py <youtube_url> <intro_seconds> <lyrics_file>
"""

import subprocess
import json
import sys
from pathlib import Path

def download_audio(youtube_url: str, output_path: str = "temp_audio.m4a") -> str:
    """Download audio from YouTube using yt-dlp"""
    print(f"\n📥 Downloading audio...")
    try:
        cmd = [
            sys.executable, "-m", "yt_dlp",
            "-f", "bestaudio[ext=m4a]/bestaudio/best",
            "-o", output_path,
            "--no-playlist",
            youtube_url
        ]
        subprocess.run(cmd, check=True)
        print(f"✅ Saved: {output_path}")
        return output_path
    except FileNotFoundError:
        print("❌ yt-dlp not found. Install with: pip install yt-dlp")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Download failed: {e}")
        sys.exit(1)

# Transcribe with Whisper
def transcribe_with_whisper(audio_path: str) -> dict:
    """Use OpenAI Whisper to transcribe with word-level timing"""
    print(f"🎙️  Transcribing with Whisper (word-level timing)...")
    import subprocess
    import sys

    # Check if whisper is installed
    try:
        subprocess.run([sys.executable, "-m", "whisper", "--help"], capture_output=True)
    except Exception:
        pass  # will fail below if truly missing

    # Run Whisper with verbose_json output for word-level timing
    cmd = [
        sys.executable, "-m", "whisper",
        audio_path,
        "--model", "base",
        "--language", "fj",
        "--output_format", "verbose_json",
        "--output_dir", "whisper_output"
    ]
    result = subprocess.run(cmd)
    if result.returncode != 0:
        print("❌ Whisper failed. Install: pip install openai-whisper")
        sys.exit(1)

    json_file = Path("whisper_output") / f"{Path(audio_path).stem}.json"
    with open(json_file, encoding='utf-8') as f:
        return json.load(f)

# Match lyrics to timing with Whisper's actual word-level data
def match_lyrics_to_timing(lyrics_text: str, whisper_data: dict) -> list:
    """
    Match provided lyrics to Whisper's actual word-level timings.
    Returns list of {line, words: [{text, start_time, end_time}]}
    """
    print("🔄 Matching lyrics to timing (Whisper word-level)...")

    lyric_lines = [line.strip() for line in lyrics_text.strip().split('\n') if line.strip()]
    segments = whisper_data.get('segments', [])

    # Extract all words with their actual timing from Whisper
    all_words = []
    for segment in segments:
        words = segment.get('words', [])
        if words:
            # Whisper provides word-level timing in verbose_json
            all_words.extend(words)
        else:
            # Fallback: estimate if not provided
            text = segment.get('text', '').strip()
            if text:
                start = segment.get('start', 0)
                end = segment.get('end', 0)
                word_texts = text.split()
                if len(word_texts) > 0:
                    word_duration = (end - start) / len(word_texts)
                    for i, word_text in enumerate(word_texts):
                        all_words.append({
                            'word': word_text,
                            'start': start + (i * word_duration),
                            'end': start + ((i + 1) * word_duration)
                        })

    # Normalize word format (Whisper uses 'word'/'start'/'end')
    normalized_words = [
        {
            'text': w.get('word') or w.get('text', ''),
            'start_time': w.get('start') or w.get('start_time', 0),
            'end_time': w.get('end') or w.get('end_time', 0)
        }
        for w in all_words
    ]

    # Match words to lyric lines
    timed_lines = []
    word_idx = 0

    for lyric_line in lyric_lines:
        target_words = lyric_line.split()
        line_words = []

        for _ in range(len(target_words)):
            if word_idx < len(normalized_words):
                line_words.append(normalized_words[word_idx])
                word_idx += 1

        if line_words:
            timed_lines.append({
                'line': lyric_line,
                'start_time': line_words[0]['start_time'],
                'end_time': line_words[-1]['end_time'],
                'words': line_words
            })

    return timed_lines

def main():
    print("\n" + "="*60)
    print("🎵 SIGIDRIGI LYRIC SYNC TOOL")
    print("="*60)

    # Interactive input
    youtube_url = input("\n🔗 YouTube URL: ").strip()
    song_title = input("🎤 Song title: ").strip()
    try:
        intro_seconds = float(input("⏱️  Intro (seconds, e.g. 24): ").strip())
    except ValueError:
        intro_seconds = 0

    lyrics_file = input("📄 Lyrics file (lyrics.txt) or paste lyrics: ").strip()

    if Path(lyrics_file).exists():
        with open(lyrics_file) as f:
            lyrics_text = f.read()
    else:
        print("(Paste lyrics, press Enter twice when done)")
        lines = []
        while True:
            line = input()
            if not line:
                break
            lines.append(line)
        lyrics_text = "\n".join(lines)

    print(f"\n🎵 Syncing: {song_title}")
    print(f"   Intro: {intro_seconds}s")
    print(f"   Lines: {len([l for l in lyrics_text.split(chr(10)) if l.strip()])}")

    try:
        # Step 1: Download
        audio_file = "temp_audio.m4a"
        download_audio(youtube_url, audio_file)

        # Step 2: Transcribe
        print("\n🎙️  Transcribing (this takes ~1-2 min)...")
        whisper_output = transcribe_with_whisper(audio_file)

        # Step 3: Match
        timed_lines = match_lyrics_to_timing(lyrics_text, whisper_output)

        # Step 4: Output
        output = {
            'song_title': song_title,
            'intro_seconds': intro_seconds,
            'lyric_timing': timed_lines
        }

        with open('lyric_timing.json', 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        print(f"\n✅ Timing exported to lyric_timing.json")
        print(f"   {len(timed_lines)} lines timed\n")
        for i, line in enumerate(timed_lines[:10]):
            print(f"   {line['start_time']:6.2f}s — {line['line']}")

        if len(timed_lines) > 10:
            print(f"   ... and {len(timed_lines) - 10} more")

        print(f"\n📋 Next: Copy lyric_timing.json → Admin → Add Song\n")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
