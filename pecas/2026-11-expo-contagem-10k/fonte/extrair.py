"""Extrai do .ai (página 2, “10.000 participantes”) tudo o que a animação usa,
em vetor, para o vídeo sair idêntico à arte:

  - cada linha de texto como contorno, na posição exata de cada letra
    (Helvetica LT Pro Roman embutida no arquivo);
  - os dígitos da contagem. A Helvetica LT Pro Bold embutida só traz 0, 1, 2,
    7 e o ponto; 3, 4, 5, 6, 8 e 9 vêm da Nimbus Sans Bold (URW, clone métrico
    da Helvetica, mesma largura de 556/1000 por dígito). O quadro final,
    “10.000”, usa só glifos do arquivo original.

Uso: python3 extrair.py posts.ai NimbusSans-Bold.otf  → grava glifos.js
(a Nimbus Sans vem do pacote fonts-urw-base35 do Debian/Ubuntu)
"""
import io, json, sys
import pdfplumber
from pypdf import PdfReader
from fontTools.agl import UV2AGL
from fontTools.cffLib import CFFFontSet
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont

ai, nimbus = sys.argv[1], sys.argv[2]
PAGINA = 1  # segunda página do arquivo

# ---- fontes embutidas (CFF) ------------------------------------------------
fontes = {}
for nome, ref in PdfReader(ai).pages[PAGINA]['/Resources']['/Font'].items():
    f = ref.get_object()
    dados = f['/FontDescriptor'].get_object()['/FontFile3'].get_object().get_data()
    cff = CFFFontSet(); cff.decompile(io.BytesIO(dados), None)
    fontes[str(f['/BaseFont']).lstrip('/')] = cff[cff.fontNames[0]].CharStrings

def caminho_cff(charstrings, glifo):
    pen = SVGPathPen(None, ntos=lambda v: ('%.2f' % v).rstrip('0').rstrip('.'))
    charstrings[glifo].draw(pen)
    return pen.getCommands()

nome_glifo = lambda ch: 'space' if ch == ' ' else UV2AGL.get(ord(ch), ch)

# ---- linhas de texto -------------------------------------------------------
with pdfplumber.open(ai) as pdf:
    pg = pdf.pages[PAGINA]
    altura = pg.height
    linhas = {}
    for c in pg.chars:
        linhas.setdefault(round(c['top']), []).append(c)

saida = {'largura': 1080, 'altura': 1920, 'linhas': []}
for _, cs in sorted(linhas.items()):
    texto = ''.join(c['text'] for c in cs).strip()
    a, _b, _c, _d, _e, f = cs[0]['matrix']
    cor = '#%02x%02x%02x' % tuple(round(v * 255) for v in cs[0]['non_stroking_color'])
    glifos = []
    for c in cs:
        if c['text'] == ' ':
            continue
        fonte = fontes[c['fontname']]
        glifos.append({'x': round(c['matrix'][4], 3), 'd': caminho_cff(fonte, nome_glifo(c['text']))})
    saida['linhas'].append({
        'texto': texto, 'cor': cor, 'corpo': round(a, 3), 'base': round(altura - f, 3),
        'x0': round(min(c['x0'] for c in cs), 3), 'x1': round(max(c['x1'] for c in cs if c['text'] != ' '), 3),
        'fonte': cs[0]['fontname'].split('+')[-1], 'glifos': glifos,
    })

# ---- dígitos da contagem ---------------------------------------------------
bold = fontes[[k for k in fontes if k.endswith('Bold')][0]]
nim = TTFont(nimbus); nim_gs = nim.getGlyphSet(); nim_hm = nim['hmtx']
digitos = {}
for ch in '0123456789.':
    g = nome_glifo(ch)
    if g in bold:
        digitos[ch] = {'d': caminho_cff(bold, g), 'origem': 'HelveticaLTPro-Bold (do .ai)'}
    else:
        pen = SVGPathPen(nim_gs, ntos=lambda v: ('%.2f' % v).rstrip('0').rstrip('.'))
        nim_gs[g].draw(pen)
        digitos[ch] = {'d': pen.getCommands(), 'origem': 'NimbusSans-Bold'}
    digitos[ch]['avanco'] = nim_hm[g][0]  # 556 para dígitos, 278 para o ponto (igual à Helvetica)
saida['digitos'] = digitos

with open('glifos.js', 'w', encoding='utf-8') as arq:
    arq.write('/* gerado por extrair.py a partir de posts.ai (página 2) — não editar à mão */\n')
    arq.write('window.GLIFOS = ' + json.dumps(saida, ensure_ascii=False) + ';\n')
for l in saida['linhas']:
    print(f"{l['texto']!r:24} {l['fonte']:22} {l['corpo']:8} base {l['base']:9} x {l['x0']}–{l['x1']} {l['cor']}")
print({k: v['origem'].split()[0] for k, v in digitos.items()})
