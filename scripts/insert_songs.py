import json, urllib.request, urllib.parse

KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvb2ZqbXhydmRsaG5wbnhjcGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMjY3NzMsImV4cCI6MjA5NzcwMjc3M30.qsaZpCbnn8EOkAYZVgDXWqN0TnfAFqkbOT-3vfFXvwk'
BASE = 'https://toofjmxrvdlhnpnxcpgm.supabase.co/rest/v1/songs'
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}

def norm(t):
    return ''.join(c.lower() for c in t if c.isalnum())

# Fetch existing titles
req = urllib.request.Request(f'{BASE}?select=title', headers=H)
with urllib.request.urlopen(req) as r:
    existing = json.load(r)
existing_norm = {norm(s['title']) for s in existing}
print(f'Existing songs in DB: {len(existing)}')

# Load parsed songs
with open(r'C:\Users\digit\sigidrigi\scripts\pdf_songs.json', encoding='utf-8') as f:
    parsed = json.load(f)

# Dedup
new_songs = []
seen = set(existing_norm)
for s in parsed:
    n = norm(s['title'])
    if n in seen:
        continue
    seen.add(n)
    new_songs.append({
        'title': s['title'],
        'artist': s['artist'],
        'lyrics': s['lyrics'],
        'category': s['category'],
        'free': s['free'],
    })

print(f'Parsed from PDF: {len(parsed)}')
print(f'New to insert (after dedup): {len(new_songs)}')

# Insert in batches of 50
batch_size = 50
inserted = 0
for i in range(0, len(new_songs), batch_size):
    batch = new_songs[i:i+batch_size]
    body = json.dumps(batch).encode('utf-8')
    hh = dict(H); hh['Prefer'] = 'return=minimal'
    req = urllib.request.Request(BASE, data=body, headers=hh, method='POST')
    with urllib.request.urlopen(req) as r:
        inserted += len(batch)
        print(f'  Inserted batch {i//batch_size + 1}: {len(batch)} songs (status {r.status})')

print(f'\nTotal inserted: {inserted}')

# Verify total
req = urllib.request.Request(f'{BASE}?select=id', headers={**H, 'Prefer': 'count=exact'}, method='HEAD')
try:
    with urllib.request.urlopen(req) as r:
        cr = r.headers.get('Content-Range', '')
        print(f'DB total now: {cr}')
except Exception as e:
    pass
