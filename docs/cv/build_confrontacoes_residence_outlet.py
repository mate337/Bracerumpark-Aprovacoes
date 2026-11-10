#!/usr/bin/env python3
"""Confrontações (cláusula 6.2) e vértices (Anexo III) do Bracerum Residence e do Bracerum Outlet.

Mesmas tabelas de importação do CV feitas em 2026-11-10 (`base_cv/`, geradas pelo `build_tabela_cv.py`
do branch `claude/beautiful-babbage-imqfjx` do site: mesmos ids do CV, nomes, áreas e valores), com
`Latitude`/`Longitude (Unidade)` preenchidas (centro da unidade) e as oito colunas da tabela dos lotes:
Norte, Sul, Leste e Oeste (Confrontação) e Vértice NO, NE, SE e SO (Coordenada).

| Conjunto | Geometria |
|---|---|
| Residence — Casas (31) | lotes `LT.RES.Qxx.Lyy` separados no PDF do V14 rev. 02/11 (traço preto → polígono) |
| Residence — Aptos (1.452) | **a torre**: projeção (retângulo envolvente) do volume do `scene.json`; mesma linha para todos os aptos da torre |
| Outlet Premium 1ª fase (57) | desenho de vendas do cliente encaixado no contorno da 1ª fase do V14 (0,8089 m/px) |
| Supermercado + LJ1–LJ12 (13) | medidas do PDF vetorial do V14 |

Uso:
    python3 docs/cv/build_confrontacoes_residence_outlet.py --site ../BracerumPark            # gera as tabelas
    python3 docs/cv/build_confrontacoes_residence_outlet.py --site ../BracerumPark --extrair  # relê o PDF (~5 min)
`--extrair` precisa de pdftoppm, pdftotext, numpy, scipy, opencv e pdfplumber e grava
`geometria_v14_residence.json`; a geração normal só precisa de pillow.
"""
import argparse, collections, csv, json, math, os, re, subprocess, sys, tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build_confrontacoes as bc                                                   # noqa: E402

BASE = os.path.join(AQUI, 'base_cv')
GEO = os.path.join(AQUI, 'geometria_v14_residence.json')
PDF = os.path.join('docs', 'masterplan-v14', 'BRACERUM_PARK_V14_2026-11-02.pdf')
K = 25.4 / 72                                                                       # m por pt (1:1000)
SAIDAS = {
    'casas': ('cv_residence_casas_valores.csv', 'unidades_residence_casas_confrontacoes.csv'),
    'aptos': ('cv_residence_aptos_valores.csv', 'unidades_residence_aptos_confrontacoes.csv'),
    'outlet': ('cv_outlet_premium_1a_fase_valores.csv', 'unidades_outlet_premium_1a_fase_confrontacoes.csv'),
    'mercado': ('cv_outlet_supermercado_lojas_valores.csv', 'unidades_outlet_supermercado_lojas_confrontacoes.csv'),
}
FASE2 = 'Outlet Premium — 2ª fase (liberação futura)'
# Fora do loteamento industrial, rua → gramado → fim do parque é paisagismo, não a PY-19 nem a pista.
FAIXA_RES = {r: 'área verde' for r in bc.RUMOS}
# Entre a fachada do Outlet / das lojas LJ e a rua há 10 a 20 m de calçada e estacionamento (V14).
ALCANCE_OUT = 25.0
bc.MARCOS.update({'portaria resort': 'portaria do Resort', 'salão de festas': 'salão de festas do Resort',
                  'outlet fase 2': FASE2, 'vestiário': 'Bracerum Club', 'bar': 'Bracerum Club',
                  'salão de eventos': 'Bracerum Club'})


def retangulo(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


# ============================================================================== Outlet Premium, 1ª fase
# As 57 lojas, em px do desenho de vendas do cliente (premium-outlet-1a-fase-cliente.png, 683 × 647 px),
# eixo a eixo das linhas — copiadas do build_tabela_cv.py, que dá a numeração OUT-01…OUT-57.
def lojas_px():
    fx = [330.0, 345.43, 356.96, 371.5, 383.5, 398.5, 413.45, 425.5, 440.45, 451.99, 466.6]
    gx = [492.5, 507.5, 519.5, 534.46, 546.5, 561.45, 575.57, 590.5, 605.5]
    r = [(a, 161.39, b, 183.5) for a, b in zip(fx, fx[1:])]
    r += [(a, 161.39, b, 183.5) for a, b in zip(gx, gx[1:])]
    r += [(a, 193.5, b, 215.5) for a, b in zip(fx, fx[1:])]
    r += [(466.53, 193.5, 492.5, 215.5)]
    r += [(a, 193.5, b, 215.5) for a, b in zip(gx[:5], gx[1:5])]
    r += [(a, 193.5, b, 227.98) for a, b in zip([546.5, 561.45, 575.57], [561.45, 575.57, 596.0])]
    cy = [227.98, 242.52] + [298.5, 315.5, 328.53, 340.99, 355.5, 367.5, 382.5, 397.0]
    r += [(549.42, a, 596.0, b) for a, b in zip(cy, cy[1:]) if a != 242.52]
    ry = [207.59, 223.46, 238.48, 253.02, 268.5, 284.5, 298.5, 315.5, 328.53, 340.99, 355.5, 367.5, 382.5, 397.0]
    r += [(605.6, a, 652.5, b) for a, b in zip(ry, ry[1:])]
    assert len(r) == 57
    return r


# O desenho está em escala com o V14: o contorno da 1ª fase (x 330 → 652,5 px, y 161,39 → 397 px) cai no
# do V14 (1.508,0 → 1.769,0 m, 143,0 → 333,5 m) com 0,8093 e 0,8085 m/px; a Fase 2 horizontal do desenho
# (15 → 327 px) cai a 0,1 m da do V14. A Fase 2 vertical do desenho é esquemática (4 m mais curta) e fica fora.
ESC_OUT = 0.8089


def des(px, py):
    return 1508.0 + (px - 330.0) * ESC_OUT, 143.0 + (py - 161.39) * ESC_OUT


ELEMENTOS_OUT = [                         # partes comuns do desenho (px) que confrontam com as lojas
    ('acesso do Outlet', (466.6, 161.39, 492.5, 183.5)),
    ('circulação do Outlet', (330.0, 183.5, 605.6, 193.5)),
    ('acesso do Outlet', (596.0, 193.5, 605.6, 397.0)),
    ('acesso do Outlet', (605.5, 161.39, 652.5, 207.59)),
    ('doca do Outlet', (549.42, 242.52, 581.0, 298.5)),
    ('sanitários do Outlet', (581.0, 242.52, 596.0, 298.5)),
]

# ============================================================================== Supermercado + LJ1–LJ12
# PDF vetorial do V14 rev. 02/11: o bloco é um retângulo de 65,49 × 83,02 m (1.685,97 → 1.751,46 m,
# 507,15 → 590,17 m); o supermercado tem 55,49 m de largura e a faixa de lojas 10,00 m, em módulos de
# 6,00 m (LJ1–LJ6, passagem de 11 m, LJ7–LJ12) — os rótulos LJ1…LJ12 caem no meio de cada módulo.
SUPER = (1685.97, 507.15, 1741.46, 590.17)
LJ_X = (1741.46, 1751.46)
PASSAGEM = (LJ_X[0], 543.15, LJ_X[1], 554.15)


def lj(k):
    y0 = 507.15 + 6 * (k - 1) if k <= 6 else 554.15 + 6 * (k - 7)
    return (LJ_X[0], y0, LJ_X[1], y0 + 6)


# ============================================================================== torres do Residence
# Numeração = a mesma PROPOSTA que está no CV (build_unidades.py do site): dentro de cada tipologia, ordem
# de leitura da prancha (linha de cima para baixo, da esquerda para a direita). Refeita no V14 rev. 02/11,
# cai a 0,1 m das posições de 28/10.
TIPO_TORRE = {'3 quartos': range(1, 13), '2 quartos': range(13, 52), '1 quarto': range(52, 68)}
# O condomínio das torres T01–T12 não tem contorno fechado no PDF (a borda é feita de traços soltos, no mesmo
# cinza dos outros condomínios): topo y = 617,64, esquerda x = 1.824,86, base y = 740,66 e a diagonal de
# (1.972,48; 740,66) a (2.087,8; 635,04), que sobe até o canto (2.081,06; 617,64).
CONDOMINIO_T01_T12 = [(1824.86, 617.64), (2081.06, 617.64), (2087.8, 635.04), (1972.48, 740.66), (1824.86, 740.66)]


def torres(cena):
    def area(p):
        xs, ys = p[0::2], p[1::2]
        return abs(sum(xs[i] * ys[(i + 1) % len(xs)] - xs[(i + 1) % len(xs)] * ys[i] for i in range(len(xs)))) / 2
    achadas = {k: [] for k in TIPO_TORRE}
    for v in cena['vol']:
        if v['t'] == 'torre1':
            achadas['1 quarto'].append(v)
        elif v['t'] == 'torre':
            achadas['3 quartos' if area(v['p']) > 330 else '2 quartos'].append(v)
    out = []
    for k, vs in achadas.items():
        assert len(vs) == len(TIPO_TORRE[k]), (k, len(vs))
        vs.sort(key=lambda v: (round(bc.centro(v['p'])[1] / 20), bc.centro(v['p'])[0]))
        for n, v in zip(TIPO_TORRE[k], vs):
            xs, ys = v['p'][0::2], v['p'][1::2]
            out.append(dict(id=f'T{n:02d}', rot=f'Torre T{n:02d}', tipologia=k,
                            P=retangulo(min(xs), min(ys), max(xs), max(ys))))
    return out


# ============================================================================== extração do PDF (--extrair)
def extrair(site):
    import numpy as np, cv2, pdfplumber                                             # noqa: E401
    from scipy import ndimage as ndi
    from PIL import Image
    pdf = os.path.join(site, PDF)
    txt = subprocess.run(['pdftotext', '-bbox', pdf, '-'], capture_output=True, text=True, check=True).stdout
    palavras = [(w, (float(a) + float(c)) / 2 * K, (float(b) + float(d)) / 2 * K) for a, b, c, d, w in
                re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>', txt)]

    # --- lotes do Resort: o miolo branco de cada lote, entre os traços pretos, numa renderização a 8 px/m
    PXM, (x0, y0, x1, y1) = 8.0, (1640, 740, 2000, 1080)
    dpi = PXM * K * 72
    with tempfile.TemporaryDirectory() as tmp:
        f = dpi / 72
        subprocess.run(['pdftoppm', '-r', str(dpi), '-x', str(int(x0 / K * f)), '-y', str(int(y0 / K * f)),
                        '-W', str(int((x1 - x0) / K * f)), '-H', str(int((y1 - y0) / K * f)), '-png', '-singlefile',
                        pdf, os.path.join(tmp, 'r')], check=True)
        im = np.array(Image.open(os.path.join(tmp, 'r.png')).convert('RGB')).astype(int)
    rot, n = ndi.label(im.min(-1) > 235)
    tam = np.bincount(rot.ravel())
    resort = {}
    for w, x, y in sorted({(w, round(x, 2), round(y, 2)) for w, x, y in palavras if re.fullmatch(r'Q0\d\.L\d\d', w)}):
        px, py, r = (x - x0) * PXM, (y - y0) * PXM, int(3 * PXM)
        ids = rot[int(py) - r:int(py) + r, int(px) - r:int(px) + r].ravel()
        g = max(set(ids[ids > 0].tolist()), key=lambda i: tam[i])     # o maior miolo branco em volta do rótulo
        cs, _ = cv2.findContours((rot == g).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        c = max(cs, key=cv2.contourArea)
        eps = 0.5
        ap = cv2.approxPolyDP(c, eps * PXM, True)
        while len(ap) > 4 and eps < 6:
            eps += 0.25
            ap = cv2.approxPolyDP(c, eps * PXM, True)
        assert len(ap) == 4, (w, len(ap))
        resort[w] = [(round(float(p[0][0]) / PXM + x0, 3), round(float(p[0][1]) / PXM + y0, 3)) for p in ap]
    assert len(resort) == 31, len(resort)

    # --- contorno dos condomínios do Residence: o menor polígono fechado do PDF que contém cada torre
    cena = json.load(open(os.path.join(site, '3dmasterplan', 'data', 'scene.json'), encoding='utf-8'))
    T = torres(cena)
    pg = pdfplumber.open(pdf).pages[0].within_bbox((1680 / K, 225 / K, 2200 / K, 820 / K))   # ~4 min
    polis = [[(x * K, y * K) for x, y in o['pts']] for o in pg.curves if len(o['pts']) >= 4]
    polis += [retangulo(o['x0'] * K, o['top'] * K, o['x1'] * K, o['bottom'] * K) for o in pg.rects]
    polis = [p for p in polis if 2000 < bc.area_m2(p) < 60000]
    polis.append(CONDOMINIO_T01_T12)
    quadras = {}
    for t in T:
        c = bc.centro([v for p in t['P'] for v in p])
        cand = sorted((bc.area_m2(p), i) for i, p in enumerate(polis) if bc.dentro(c, p))
        assert cand, f"{t['id']}: sem condomínio"
        quadras.setdefault(cand[0][1], []).append(t['id'])
    cond = [dict(torres=sorted(ts), P=[(round(x, 3), round(y, 3)) for x, y in polis[i]]) for i, ts in quadras.items()]
    cond.sort(key=lambda q: q['torres'][0])
    geo = dict(fonte='Masterplan BRACERUM PARK V14 rev. 02/11/2026 (PDF), lido por build_confrontacoes_residence_outlet.py --extrair',
               resort=resort, condominios=cond)
    json.dump(geo, open(GEO, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'{len(resort)} lotes do Resort, {len(cond)} condomínios ({sum(len(q["torres"]) for q in cond)} torres) → '
          f'{os.path.relpath(GEO)}')


# ============================================================================== confrontação das torres
def faixas(torres):
    """['T24', 'T25', 'T26', 'T32', 'T33'] → 'T24 a T26, T32 e T33'."""
    ns, grupos = sorted(int(t[1:]) for t in torres), []
    for n in ns:
        if grupos and n == grupos[-1][-1] + 1:
            grupos[-1].append(n)
        else:
            grupos.append([n])
    partes = []
    for g in grupos:
        partes += [f'T{g[0]:02d} a T{g[-1]:02d}'] if len(g) > 2 else [f'T{n:02d}' for n in g]
    return bc.junta(partes)


def confronta_torres(site, T, condominios):
    """A torre fica na área comum do condomínio: em cada rumo, o que ela tem em frente — outra torre do mesmo
    condomínio, ou, saindo do condomínio, a rua e o que há do outro lado."""
    # do outro lado da rua, outro condomínio do Residence vai pelo nome das torres dele
    vizinhos = [dict(nome='condomínio das Torres ' + faixas(q['torres']), P=[tuple(p) for p in q['P']])
                for q in condominios]
    pl = bc.Planta(site, unidades=T, extras=vizinhos, ignorar=('galpão', 'torre', 'torre1'), faixa=FAIXA_RES)
    cond_de = {t: q['P'] for q in condominios for t in q['torres']}
    idx = bc.Grade([dict(t) for t in T])
    textos = {}
    for t in T:
        Q = cond_de[t['id']]
        lados = {r: collections.Counter() for r in bc.RUMOS}
        P = t['P']
        rumos = pl.rumos_dos_lados(P)
        for i in range(4):
            (x1, y1), (x2, y2) = P[i], P[(i + 1) % 4]
            dx, dy = x2 - x1, y2 - y1
            Ln = math.hypot(dx, dy)
            nx, ny = dy / Ln, -dx / Ln
            if bc.dentro(((x1 + x2) / 2 + nx * .3, (y1 + y2) / 2 + ny * .3), P):
                nx, ny = -nx, -ny
            r = rumos[i]
            n = max(4, int(Ln))
            for j in range(n):
                s = (j + .5) / n
                if not .06 <= s <= .94:
                    continue
                px, py = x1 + dx * s, y1 + dy * s
                achou = ('area', '')
                st = 0.5
                while st < 150:
                    q = (px + nx * st, py + ny * st)
                    o = idx.em(q)
                    if o and o['id'] != t['id']:
                        achou = ('torre', o['rot'])
                        break
                    if not bc.dentro(q, Q):              # saiu do condomínio: daqui é a rua
                        achou = pl.sonda(None, q[0], q[1], nx, ny)
                        if achou[0] == 'lote':          # torre de outro condomínio colada (não acontece)
                            achou = ('torre', pl.rot[achou[1]])
                        break
                    st += 0.5
                lados[r][achou] += Ln / n
        textos[t['id']] = {}
        for r in bc.RUMOS:
            fica = bc.filtra(lados[r])
            torres_ = [v for (k, v) in fica if k == 'torre']
            partes = bc.agrupa(torres_)
            via = collections.Counter()
            for (k, v), m in fica.items():
                if k == 'via':
                    via[pl.faixa.get(r, 'divisa do parque') if v == 'faixa verde' else v] += m
                elif k == 'direto' and v not in ('área verde',):
                    via[v] += m
            if via:
                frente = via.most_common(1)[0][0]
                partes.append('via interna' + (f' (do outro lado: {frente})' if frente and not frente.startswith('quadra:') else ''))
            textos[t['id']][r] = 'Área comum do condomínio' + (', em frente: ' + bc.junta(partes) if partes else '')
    return textos


# ============================================================================== saída
def le_base(nome):
    r = list(csv.reader(open(os.path.join(BASE, nome), encoding='utf-8-sig'), delimiter=';'))
    assert len(r[0]) == 126, (nome, len(r[0]))
    return r[0], r[1:]


def grava(nome, cab, linhas, chave, textos, vert, centro, pl):
    col = {c: i for i, c in enumerate(cab)}
    novas = [f'{bc.NOME_RUMO[r]} (Confrontação)' for r in 'NSLO'] + [f'Vértice {c} (Coordenada)' for c in bc.CANTOS]
    out = []
    for x in linhas:
        k = chave(x)
        y = list(x)
        lat, lon = pl.latlon(*centro[k])
        y[col['Latitude (Unidade)']], y[col['Longitude (Unidade)']] = f'{lat:.6f}', f'{lon:.6f}'
        y += [textos[k][r] for r in 'NSLO']
        y += ['{:.6f}, {:.6f}'.format(*pl.latlon(*v)) for v in vert[k]]
        out.append(y)
    with open(os.path.join(AQUI, nome), 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f, delimiter=';', lineterminator='\r\n')
        w.writerow(cab + novas)
        w.writerows(out)
    return len(out)


def ctr(P):
    return sum(x for x, _ in P) / len(P), sum(y for _, y in P) / len(P)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--site', help='checkout do mate337/BracerumPark (padrão: pasta irmã deste repositório)')
    ap.add_argument('--extrair', action='store_true', help='relê o PDF do V14 e regrava geometria_v14_residence.json')
    args = ap.parse_args()
    site = bc.acha_site(args.site)
    if args.extrair or not os.path.exists(GEO):
        extrair(site)
    geo = json.load(open(GEO, encoding='utf-8'))
    cena = json.load(open(os.path.join(site, '3dmasterplan', 'data', 'scene.json'), encoding='utf-8'))
    relato = []

    # --- Residence — casas (lotes do Resort)
    casas = [dict(id='LT.RES.' + w, rot='Lote LT.RES.' + w, q='Resort ' + w[:3], P=[tuple(p) for p in P])
             for w, P in sorted(geo['resort'].items())]
    condominios = [dict(nome='Bracerum Residence', P=[tuple(p) for p in q['P']]) for q in geo['condominios']]
    # o Simulador de Surf ocupa o vão da Q03 entre o L02 e o L03 (rótulos "SIMULADOR DE SURF" do V14)
    a, b = geo['resort']['Q03.L02'], geo['resort']['Q03.L03']
    xs = [x for x, _ in a + b]
    surf = dict(nome='Simulador de Surf', P=retangulo(min(xs), max(y for _, y in a), max(xs), min(y for _, y in b)))
    pl = bc.Planta(site, unidades=casas, extras=condominios + [surf], ignorar=('galpão', 'casa'), faixa=FAIXA_RES)
    _, tx, av = bc.confronta(pl)
    vt = bc.vertices(pl, casas, folga=0.25)        # o miolo branco fica ~0,25 m para dentro do eixo do traço
    cab, linhas = le_base(SAIDAS['casas'][0])
    ch = lambda x: f"LT.RES.{re.search(r'Q\d\d', x[cab.index('Nome (Bloco)')])[0]}.{x[cab.index('Nome (Unidade)')]}"
    area = {ch(x): float(x[cab.index('Área do terreno (Unidade)')].replace(',', '.')) for x in linhas}
    razao = sorted((bc.area_m2(vt[k]) / area[k], k) for k in area)
    n = grava(SAIDAS['casas'][1], cab, linhas, ch, tx, vt, {k: ctr(v) for k, v in vt.items()}, pl)
    relato.append(f'Casas: {n} lotes; área pelos vértices ÷ área do CV de {razao[0][0]:.3f} ({razao[0][1]}) '
                  f'a {razao[-1][0]:.3f} ({razao[-1][1]}); avisos {len(av)}' + ''.join('\n    ' + a for a in av))

    # --- Residence — aptos (a torre)
    T = torres(cena)
    tx = confronta_torres(site, T, geo['condominios'])
    pl = bc.Planta(site, unidades=T, ignorar=('galpão', 'torre', 'torre1'))
    vt = bc.vertices(pl, T, folga=0, junta=0.01)
    cab, linhas = le_base(SAIDAS['aptos'][0])
    ch = lambda x: x[cab.index('Nome (Bloco)')].replace('Torre ', '')
    n = grava(SAIDAS['aptos'][1], cab, linhas, ch, tx, vt, {t['id']: ctr(t['P']) for t in T}, pl)
    relato.append(f'Aptos: {n} unidades em {len({ch(x) for x in linhas})} torres')

    # --- Outlet Premium, 1ª fase
    lojas = [dict(id=f'OUT-{i:02d}', rot=f'Loja OUT-{i:02d}', q='Outlet',
                  P=[des(*p) for p in retangulo(*r)]) for i, r in enumerate(lojas_px(), 1)]
    extras = [dict(nome=nome, P=[des(*p) for p in retangulo(*r)]) for nome, r in ELEMENTOS_OUT]
    extras += [dict(nome=FASE2, P=bc.pontos(v['p'])) for v in cena['vol'] if v['t'] == 'outlet fase 2']
    pl = bc.Planta(site, unidades=lojas, extras=extras + condominios,
                   ignorar=('galpão', 'outlet', 'docas', 'outlet fase 2'), alcance=ALCANCE_OUT)
    _, tx, av = bc.confronta(pl)
    vt = bc.vertices(pl, lojas, folga=0, junta=0.3)
    cab, linhas = le_base(SAIDAS['outlet'][0])
    ch = lambda x: x[cab.index('Nome (Unidade)')]
    soma = sum(bc.area_m2(v) for v in vt.values())
    n = grava(SAIDAS['outlet'][1], cab, linhas, ch, tx, vt, {k: ctr(v) for k, v in vt.items()}, pl)
    relato.append(f'Outlet: {n} lojas; somam {soma:,.0f} m² pelo encaixe no V14 (o CV traz 17.870 m², o número do '
                  f'desenho); avisos {len(av)}' + ''.join('\n    ' + a for a in av))

    # --- Supermercado + LJ1–LJ12
    unid = [dict(id='Supermercado', rot='Supermercado', q='Mercado', P=retangulo(*SUPER))]
    unid += [dict(id=f'LJ{k}', rot=f'Loja LJ{k}', q='Mercado', P=retangulo(*lj(k))) for k in range(1, 13)]
    extras = [dict(nome='passagem entre LJ6 e LJ7', P=retangulo(*PASSAGEM))]
    extras += [dict(nome=FASE2, P=bc.pontos(v['p'])) for v in cena['vol'] if v['t'] == 'outlet fase 2']
    pl = bc.Planta(site, unidades=unid, extras=extras + condominios,
                   ignorar=('galpão', 'supermercado', 'outlet', 'docas', 'outlet fase 2'), alcance=ALCANCE_OUT)
    _, tx, av = bc.confronta(pl)
    vt = bc.vertices(pl, unid, folga=0, junta=0.3)
    cab, linhas = le_base(SAIDAS['mercado'][0])
    ch = lambda x: x[cab.index('Nome (Unidade)')]
    n = grava(SAIDAS['mercado'][1], cab, linhas, ch, tx, vt, {k: ctr(v) for k, v in vt.items()}, pl)
    relato.append(f'Supermercado + lojas: {n} unidades; avisos {len(av)}' + ''.join('\n    ' + a for a in av))

    print(geo['fonte'])
    for r in relato:
        print(r)


if __name__ == '__main__':
    main()
