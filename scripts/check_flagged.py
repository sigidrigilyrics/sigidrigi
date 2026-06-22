import urllib.request, json

KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvb2ZqbXhydmRsaG5wbnhjcGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMjY3NzMsImV4cCI6MjA5NzcwMjc3M30.qsaZpCbnn8EOkAYZVgDXWqN0TnfAFqkbOT-3vfFXvwk'
BASE = 'https://toofjmxrvdlhnpnxcpgm.supabase.co/rest/v1/songs'
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}'}

ids = [
    'e6732f54-4474-4f5e-baa8-85d542d554b3',  # Rona
    'd0fc7aa5-26e1-4f71-9486-63f9d222207f',  # Sa Kua So
    'a100c73d-2628-4ae5-a39f-544add9e286c',  # Masuta
    '84ec7d53-588c-4576-8ea0-17866d07f076',  # I Vola Siga
    '657ea45a-9774-47ac-8f05-b43f2be8c39b',  # Loma I Galoa
    '613a49f0-d7de-47ba-8656-ff1e60fa9be6',  # Rerevaki Dina
    '595db640-5285-49df-aec5-4c4e6aeb469b',  # Noqu Viti
    '2922fc57-2681-4755-a720-62eff7e74382',  # Ko a Coriti
]

for sid in ids:
    req = urllib.request.Request(f'{BASE}?id=eq.{sid}&select=title,lyrics', headers=H)
    with urllib.request.urlopen(req) as r:
        s = json.load(r)[0]
    print('=' * 50)
    print(f"TITLE: {s['title']}")
    print((s.get('lyrics') or '')[:280])
    print()
