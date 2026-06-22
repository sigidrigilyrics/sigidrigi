import json, urllib.request

KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvb2ZqbXhydmRsaG5wbnhjcGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMjY3NzMsImV4cCI6MjA5NzcwMjc3M30.qsaZpCbnn8EOkAYZVgDXWqN0TnfAFqkbOT-3vfFXvwk'
BASE = 'https://toofjmxrvdlhnpnxcpgm.supabase.co/rest/v1/songs'
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json', 'Prefer': 'return=minimal'}

songs = [
  {
    'title': 'Isa Lei Baraca', 'artist': 'Police Jazz', 'category': 'Traditional', 'free': True,
    'lyrics': """VERSE 1
ISA LEI BARACA ME RAU VOSOTI
NA KEMU I TUKUTUKU ME ROGOCI
VAKARONITAKI E NA SIGA KEI NA BOGI
KAI IKO A ROSI NI SARONI
SE KALOKALO SERAU E NA BOGI

VERSE 2
NIKO RAI MAI SOBO E DA DIVA
MATAMUNI AI VOLASIGA
RA CAURAVOU ERA VAKA ISAISIA
SEGA CA NA TU A LAI YADRA SIGA
DREDRE MAI A GATIMA E TALIVA

VERSE 3
ISA LAI MOCE ROSI PIQI
MAI LOLOMA YANI VEI KEMUNANI
KUA NIKO PERE SE YALO BIBI
OILEI ISA A BALUMUNI
SINIRIGI DINA A TOLOMUNI"""
  },
  {
    'title': 'Makosoi Ni Delai Devo', 'artist': '', 'category': 'Traditional', 'free': True,
    'lyrics': """VERSE 1
TU YAWA YALI YAWA MAI VEI AU
GUNA KONI SEGA NI KILA
NA GAULI NI BULA VEISIGA KECE
BOGI AU MOCE VAKACA

VERSE 2
E NA VEI GAUNA NIU DAU VAKANANUMA
NA QITO MAI NA NOMUI VANUA
KAUTA NA YALOQU VESUKI VAKADUA
MATAMUNI TOTOKA ADI VULA

CHORUS
SOGO RUI LUVUCI AU
MOMOEI NI NOMUI VAKARAU
NA QUA KO TOKARA E NA SEGA
NI YALI

VERSE 3
YACA MAREQETI E LOMANI VUVALE
KO DAU VAKAMENEMENEI KINA
LITI GA NA YACA AU NA DAU WILA
O ROSI DINA MAI NOMU VANUA

VERSE 4
OTI NAI TAVI MEU SA NA SUKA
LESU KI NOQU DELA NI YAVU
NI NAICA BEKA MEU NA QAI TADRA
IKO ISA LITI NOQU LEWA"""
  }
]

# Dedup by normalized title
def norm(t): return ''.join(c.lower() for c in t if c.isalnum())
req = urllib.request.Request(f'{BASE}?select=title', headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}'})
with urllib.request.urlopen(req) as r:
    existing = {norm(s['title']) for s in json.load(r)}

new = [s for s in songs if norm(s['title']) not in existing]
print(f'To insert: {[s["title"] for s in new]}')
if new:
    body = json.dumps(new).encode('utf-8')
    req = urllib.request.Request(BASE, data=body, headers=H, method='POST')
    with urllib.request.urlopen(req) as r:
        print(f'Inserted {len(new)} (status {r.status})')
