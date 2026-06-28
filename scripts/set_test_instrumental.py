import json, urllib.request

KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvb2ZqbXhydmRsaG5wbnhjcGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMjY3NzMsImV4cCI6MjA5NzcwMjc3M30.qsaZpCbnn8EOkAYZVgDXWqN0TnfAFqkbOT-3vfFXvwk'
BASE = 'https://toofjmxrvdlhnpnxcpgm.supabase.co/rest/v1/songs'
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json', 'Prefer': 'return=representation'}

# Au A Nakita Lo Voli — set a test instrumental (its existing artist video)
sid = 'e6353573-60b2-43d5-a700-6e7f714218f1'
body = json.dumps({'instrumental_url': 'https://www.youtube.com/watch?v=L5OhtZ0SGCU'}).encode()
req = urllib.request.Request(f'{BASE}?id=eq.{sid}', data=body, headers=H, method='PATCH')
try:
    with urllib.request.urlopen(req) as r:
        data = json.load(r)
        s = data[0]
        print(f"OK status={r.status}")
        print(f"  title: {s['title']}")
        print(f"  instrumental_url: {s.get('instrumental_url')}")
except urllib.error.HTTPError as e:
    print(f"FAILED {e.code}: {e.read().decode()}")
