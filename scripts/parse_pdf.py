import PyPDF2, re, json, sys

PDF = r'C:\Users\digit\Downloads\FIJIAN-LYRICS.pdf'

def titlecase(s):
    small = {'ni', 'na', 'ko', 'a', 'kei', 'mai', 'ki', 'e', 'se'}
    words = s.split()
    out = []
    for i, w in enumerate(words):
        lw = w.lower()
        if i > 0 and lw in small:
            out.append(lw)
        else:
            out.append(w.capitalize())
    return ' '.join(out)

def parse_page(text):
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    if not lines:
        return None
    hdr_idx = None
    for i, l in enumerate(lines):
        if 'PROPERTY' in l and 'NAYACAKALOU' in l:
            hdr_idx = i
            break
    if hdr_idx is None:
        return None
    hdr = lines[hdr_idx]
    rest = hdr.split('NAYACAKALOU', 1)[1] if 'NAYACAKALOU' in hdr else hdr
    m = re.split(r'[^\x00-\x7F]+', rest, maxsplit=1)
    title = m[0].strip()
    artist = m[1].strip() if len(m) > 1 else ''
    body = lines[hdr_idx + 1:]
    return {'title_raw': title, 'artist_raw': artist, 'body': body}

def format_lyrics(body):
    """Convert raw body lines into VERSE/CHORUS structured uppercase lyrics."""
    out = []
    verse_no = 0
    for raw in body:
        line = raw.strip()
        if not line:
            continue
        low = line.lower()
        # Skip pure performance notes
        if re.match(r'^(musical\s*fill|repeat|to end|2x|3x)\b', low):
            continue
        # Numbered verse start e.g. "1.AU A NAKITA..."
        mv = re.match(r'^(\d+)\.\s*(.*)', line)
        if mv:
            verse_no = int(mv.group(1))
            out.append('')
            out.append(f'VERSE {verse_no}')
            if mv.group(2).strip():
                out.append(mv.group(2).strip().upper())
            continue
        # Chorus header e.g. "Chorus: KO KACI..."
        mc = re.match(r'^chorus:?\s*(.*)', low)
        if mc:
            out.append('')
            out.append('CHORUS')
            tail = line.split(':', 1)[1].strip() if ':' in line else ''
            if tail:
                out.append(tail.upper())
            continue
        # Solo/Bridge
        ms = re.match(r'^(solo|bridge):?\s*(.*)', low)
        if ms:
            out.append('')
            out.append('BRIDGE')
            tail = line.split(':', 1)[1].strip() if ':' in line else ''
            if tail:
                out.append(tail.upper())
            continue
        # Normal lyric line
        out.append(line.upper())
    # Trim leading blank
    while out and out[0] == '':
        out.pop(0)
    return '\n'.join(out).strip()

songs = []
with open(PDF, 'rb') as f:
    reader = PyPDF2.PdfReader(f)
    npages = len(reader.pages)
    for i in range(npages):
        text = reader.pages[i].extract_text()
        p = parse_page(text)
        if p and p['title_raw']:
            title = titlecase(p['title_raw'])
            artist = titlecase(p['artist_raw'])
            lyrics = format_lyrics(p['body'])
            if len(lyrics) < 30:  # skip pages with no real lyrics
                continue
            songs.append({
                'title': title,
                'artist': artist,
                'lyrics': lyrics,
                'category': 'Traditional',
                'free': True,
                'page': i + 1,
            })

with open(r'C:\Users\digit\sigidrigi\scripts\pdf_songs.json', 'w', encoding='utf-8') as f:
    json.dump(songs, f, ensure_ascii=False, indent=1)

print(f'Pages: {npages}')
print(f'Songs extracted: {len(songs)}')
print()
print('=== SAMPLE (first song full) ===')
print(f"TITLE:  {songs[0]['title']}")
print(f"ARTIST: {songs[0]['artist']}")
print('LYRICS:')
print(songs[0]['lyrics'])
print()
print('=== TITLES 1-40 ===')
for s in songs[:40]:
    print(f"  {s['title']}  —  {s['artist']}")
