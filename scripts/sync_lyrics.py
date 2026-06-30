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
            "yt-dlp",
            "-f", "bestaudio[ext=m4a]/best",
            "-o", output_path,
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
    print(f"🎙️  Transcribing with Whisper: {audio_path}")
    cmd = [
        "whisper",
        audio_path,
        "--model", "base",  # tiny, base, small, medium, large
        "--language", "en",  # Fiji English lyrics
        "--output_format", "json",
        "--output_dir", "whisper_output"
    ]
    subprocess.run(cmd, check=True)

    json_file = Path("whisper_output") / f"{Path(audio_path).stem}.json"
    with open(json_file) as f:
        return json.load(f)

# Match lyrics to timing with word-level precision
def match_lyrics_to_timing(lyrics_text: str, whisper_data: dict) -> list:
    """
    Match provided lyrics to Whisper's word timings.
    Returns list of {line, words: [{text, start_time, end_time}]}
    """
    print("🔄 Matching lyrics to timing (word-level)...")

    lyric_lines = [line.strip() for line in lyrics_text.strip().split('\n') if line.strip()]
    segments = whisper_data.get('segments', [])

    timed_lines = []
    current_line_idx = 0
    current_words = []
    word_buffer = []  # Track words for current line

    for segment in segments:
        text = segment.get('text', '').strip()
        start = segment.get('start', 0)
        end = segment.get('end', 0)

        words = text.split()
        word_count = len(words)

        # Estimate word timing: divide segment time by word count
        if word_count > 0:
            word_duration = (end - start) / word_count
            for i, word in enumerate(words):
                word_start = start + (i * word_duration)
                word_end = start + ((i + 1) * word_duration)
                word_buffer.append({
                    'text': word,
                    'start_time': word_start,
                    'end_time': word_end
                })

        # Check if we've completed a lyric line
        current_text = ' '.join([w['text'] for w in word_buffer])

        if current_line_idx < len(lyric_lines):
            target_line = lyric_lines[current_line_idx]

            if target_line.upper() in current_text.upper():
                # Extract only the words that match this line
                line_word_count = len(target_line.split())
                line_words = word_buffer[-line_word_count:] if len(word_buffer) >= line_word_count else word_buffer

                timed_lines.append({
                    'line': target_line,
                    'start_time': line_words[0]['start_time'] if line_words else start,
                    'end_time': line_words[-1]['end_time'] if line_words else end,
                    'words': line_words
                })
                current_line_idx += 1
                word_buffer = []

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
