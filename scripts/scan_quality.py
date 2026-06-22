import urllib.request, json, re

KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvb2ZqbXhydmRsaG5wbnhjcGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMjY3NzMsImV4cCI6MjA5NzcwMjc3M30.qsaZpCbnn8EOkAYZVgDXWqN0TnfAFqkbOT-3vfFXvwk'
BASE = 'https://toofjmxrvdlhnpnxcpgm.supabase.co/rest/v1/songs'
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}'}

req = urllib.request.Request(f'{BASE}?select=id,title,artist,lyrics&order=title', headers=H)
with urllib.request.urlopen(req) as r:
    songs = json.load(r)

def quality(lyrics):
    if not lyrics:
        return 0.0, 'empty'
    body = re.sub(r'(VERSE \d+|CHORUS|BRIDGE)', '', lyrics)
    letters = sum(c.isalpha() or c.isspace() for c in body)
    total = max(1, len(body))
    alpha_ratio = letters / total
    has_struct = bool(re.search(r'VERSE \d+|CHORUS', lyrics))
    # average token length over real word tokens
    tokens = re.findall(r'[A-Za-z]+', body)
    avg_len = sum(len(t) for t in tokens) / max(1, len(tokens))
    short_frac = sum(1 for t in tokens if len(t) <= 2) / max(1, len(tokens))
    reasons = []
    if not has_struct: reasons.append('no VERSE/CHORUS')
    if alpha_ratio < 0.82: reasons.append(f'noisy({alpha_ratio:.2f})')
    if avg_len < 3.2: reasons.append(f'short-words({avg_len:.1f})')
    if short_frac > 0.42: reasons.append(f'fragments({short_frac:.2f})')
    score = len(reasons)
    return score, ', '.join(reasons) if reasons else 'ok'

flagged = []
for s in songs:
    score, reason = quality(s.get('lyrics', ''))
    if score >= 2:
        flagged.append((score, s['id'], s['title'], s.get('artist') or '', reason))

flagged.sort(reverse=True)
print(f'Total songs: {len(songs)}')
print(f'Flagged (likely garbage / needs review): {len(flagged)}')
print()
for score, sid, title, artist, reason in flagged:
    print(f'  [{score}] {title}  ({artist})  ->  {reason}')
    print(f'        id={sid}')

with open(r'C:\Users\digit\sigidrigi\scripts\flagged.json', 'w', encoding='utf-8') as f:
    json.dump([{'id': x[1], 'title': x[2]} for x in flagged], f, ensure_ascii=False, indent=1)
