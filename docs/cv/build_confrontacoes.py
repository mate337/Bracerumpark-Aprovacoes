#!/usr/bin/env python3
"""Cadastro dos lotes industriais para o CV CRM, com as confrontações da cláusula 6.2 do contrato.

Mesma tabela do `unidades_3_loteamento.csv` (modelo de importação do CV: 126 colunas, `;`, UTF-8 com
BOM, vírgula decimal, mesmos códigos internos 302QQLL), refeita com o **Masterplan V14 rev. 02/11/2026**
e com oito colunas a mais no fim — **Norte, Sul, Leste e Oeste (Confrontação)** e os quatro cantos,
**Vértice NO, NE, SE e SO (Coordenada)** — para preencher

    6.1. … conforme croqui e coordenadas preliminares constantes do Anexo III.
    6.2. Confrontações preliminares: ao Norte, [___]; ao Sul, [___]; ao Leste, [___]; ao Oeste, [___].

**Os vértices** são o polígono do lote afastado 0,3 m (metade do vão de 0,6 m que o desenho deixa entre
dois lotes, ou seja, o eixo da divisa), com os cantos comuns a vizinhos unificados, em lat/lon WGS 84.
A posição absoluta é tão boa quanto o encaixe da planta na PY-19 do OpenStreetMap — preliminar.

De onde vem cada coisa (tudo do repositório do site, `mate337/BracerumPark`):
  * lotes, nomes oficiais, áreas de contrato e polígonos: `3dmasterplan/data/lotes.json`
    (gerado do PDF do V14 rev. 02/11/2026 por `docs/3dmasterplan/build_lotes.py`);
  * norte da prancha, conversão para lat/lon, prédios (Outlet, Hub, Refeitório...): `scene.json`;
  * ruas: a própria planta renderizada (`parque.webp`) — asfalto é o cinza neutro;
  * preço: `precos.json` (janela vigente na data, categoria do lote, 1 a 8 lotes, 20% + 12x).

**Como sai a confrontação.** Cada lado do lote é classificado pelo rumo da sua normal externa em
relação ao norte verdadeiro da prancha (N, L, S ou O, o mais próximo). Ao longo do lado, a cada metro,
olha-se 1,5 m para fora: se cai em outro lote, é esse o confrontante; se não, anda-se para fora até
achar asfalto (via interna) ou um prédio/área do parque encostado. Trechos menores que 3 m (encontro de
quinas) são descartados, a não ser que sejam o lado inteiro; no fim, a vizinhança é feita recíproca.
**A geometria é a fonte**: as frentes escritas no nome oficial (".S+O", ".L"...) só servem de
conferência (`conferencia_frentes.csv`) — na Q38/Q39 os rótulos do PDF trazem uma rua que não existe mais.

Uso:
    python3 docs/cv/build_confrontacoes.py [--site ../BracerumPark] [--hoje AAAA-MM-DD]
"""
import argparse, collections, csv, datetime, itertools, json, math, os, re, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
MODELO = os.path.join(AQUI, 'modelo_unidades_cv.csv')
SAIDA = os.path.join(AQUI, 'unidades_3_loteamento_confrontacoes.csv')
SAIDA_CONF = os.path.join(AQUI, 'conferencia_frentes.csv')

LAT_PARK = -25.7715                      # mesma base do build_unidades.py / build_refs.py do site
KY = 110540
KX = 111320 * math.cos(math.radians(LAT_PARK))

RUMOS = 'NLSO'
NOME_RUMO = {'N': 'Norte', 'L': 'Leste', 'S': 'Sul', 'O': 'Oeste'}
CANTOS = ['NO', 'NE', 'SE', 'SO']                # sentido horário no mapa, a partir do noroeste
COLUNAS_NOVAS = ([f'{NOME_RUMO[r]} (Confrontação)' for r in 'NSLO']
                 + [f'Vértice {c} (Coordenada)' for c in CANTOS])
FOLGA = 0.3     # m: o desenho deixa 0,6 m entre dois lotes; o canto do lote é o eixo dessa linha
JUNTA = 1.0     # m: cantos de lotes vizinhos mais perto que isso são o mesmo ponto (em lado
                #    inclinado a folga desloca o canto ~0,75 m; cantos distintos ficam a mais de 2 m)

PASSO = 0.5                              # m, ao andar para fora do lote
SONDA_LOTE = 1.5                         # m: o vão desenhado entre dois lotes é < 1 m
ALCANCE_DIRETO = 8.0                     # m: até onde um prédio conta como "encostado" (sem rua)
VIA_MIN = 3.0                            # m de asfalto contínuo para ser rua (marcação de piso não é)
ALEM_DA_VIA = 45.0                       # m depois do começo da rua para ver o que há do outro lado
TRECHO_MIN = 3.0                         # m: abaixo disso é encontro de quina
VERDE_MIN = 5.0                          # m de gramado contínuo depois da rua = faixa verde
ALEM_DA_FAIXA = 140.0                    # m: rua + faixa verde + PY-19 ou pista até sair do parque
# Rua → faixa verde → fim do parque: a oeste é a Rodovia PY-19, a leste a pista de pouso (V14).
FAIXA_VERDE = {'O': 'faixa verde e Rodovia PY-19', 'L': 'faixa verde e pista de pouso'}

# O que está do outro lado (ou encostado), em texto de contrato. Prédios do scene.json.
MARCOS = {
    'outlet': 'Bracerum Outlet Premium', 'outlet fase 2': 'Bracerum Outlet Premium',
    'docas': 'Bracerum Outlet Premium', 'supermercado': 'Supermercado',
    'posto e portaria': 'posto e portaria', 'hub de serviços': 'Hub de serviços',
    'refeitório': 'Refeitório e Grêmio', 'grêmio': 'Refeitório e Grêmio',
    'galpões de manutenção': 'galpões de manutenção do Park', 'abastecimento': 'aeroporto',
    'hangar': 'aeroporto', 'subestação': 'subestação / E.T.E.', 'ETE': 'subestação / E.T.E.',
    'administração': 'Administração', 'casa': 'Bracerum Resort', 'torre': 'Bracerum Residence',
    'torre1': 'Bracerum Residence',
}


# ------------------------------------------------------------------------------------- geometria
def pontos(p):
    return [(p[i], p[i + 1]) for i in range(0, len(p), 2)]


def dentro(pt, poli):
    x, y = pt
    c = False
    for i in range(len(poli)):
        (x1, y1), (x2, y2) = poli[i], poli[(i + 1) % len(poli)]
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
            c = not c
    return c


def centro(p):
    xs, ys = p[0::2], p[1::2]
    return sum(xs) / len(xs), sum(ys) / len(ys)


class Grade:
    """Índice espacial simples: em que objetos cai um ponto da prancha."""

    def __init__(self, objs, cel=20.0):
        self.cel, self.g = cel, collections.defaultdict(list)
        for o in objs:
            xs, ys = [a for a, _ in o['P']], [b for _, b in o['P']]
            o['bb'] = (min(xs), min(ys), max(xs), max(ys))
            for i in range(int(o['bb'][0] // cel), int(o['bb'][2] // cel) + 1):
                for j in range(int(o['bb'][1] // cel), int(o['bb'][3] // cel) + 1):
                    self.g[i, j].append(o)

    def em(self, pt, menos=None):
        for o in self.g.get((int(pt[0] // self.cel), int(pt[1] // self.cel)), ()):
            b = o['bb']
            if o is not menos and b[0] <= pt[0] <= b[2] and b[1] <= pt[1] <= b[3] and dentro(pt, o['P']):
                return o
        return None


class Planta:
    """A planta para as sondagens. `unidades` é o conjunto cujos vizinhos se procuram (padrão: os lotes
    industriais); `extras` são áreas com nome que valem mais que os prédios do scene.json (ex.: a Fase 2
    do Outlet); `ignorar` são tipos de volume que são só ilustração (galpão, casa...)."""

    def __init__(self, site, unidades=None, extras=(), ignorar=('galpão',), faixa=None, alcance=ALCANCE_DIRETO):
        d = os.path.join(site, '3dmasterplan', 'data')
        from PIL import Image                                    # pip install pillow
        self.cena = json.load(open(os.path.join(d, 'scene.json'), encoding='utf-8'))
        lj = json.load(open(os.path.join(d, 'lotes.json'), encoding='utf-8'))
        self.fonte = lj['fonte']
        self.img = Image.open(os.path.join(d, 'parque.webp')).convert('RGB')
        self.k = self.img.size[0] / self.cena['sheet'][0]
        A = self.cena['A']
        self.N, self.E = (math.cos(A), math.sin(A)), (-math.sin(A), math.cos(A))   # y da prancha para baixo
        self.lotes = [dict(l, P=pontos(l['p']), rot='Lote ' + l['id']) for l in lj['lotes']]
        extras = list(extras) + [dict(nome={'Q11': 'Administração', 'Q37': 'recinto alfandegado (Q37)'}[q['q']],
                                      P=pontos(q['p'])) for q in lj['quadras'] if q['q'] in ('Q11', 'Q37')]
        if unidades is None:
            self.unidades = self.lotes
        else:                                    # outro conjunto: lote industrial encostado vira vizinho com nome
            self.unidades = unidades
            extras += [dict(nome=l['rot'], P=l['P']) for l in self.lotes]
        self.rot = {u['id']: u['rot'] for u in self.unidades}
        vols = [dict(v, P=pontos(v['p'])) for v in self.cena['vol'] if v['t'] not in ignorar]
        self.i_lotes, self.i_extras, self.i_vols = Grade(self.unidades), Grade(extras), Grade(vols)
        self.contorno = pontos(self.cena['contorno'])          # divisa do parque na prancha
        self.faixa = FAIXA_VERDE if faixa is None else faixa    # rua → gramado → fim do parque, por rumo
        self.alcance = alcance                   # até onde procurar a rua (Outlet: calçada de ~15 m na frente)

    def latlon(self, X, Y):
        W, H = self.cena['sheet']
        lat0, lon0 = self.cena['centro_latlon']
        dx, dy = X - W / 2, Y - H / 2
        dE, dN = dx * self.E[0] + dy * self.E[1], dx * self.N[0] + dy * self.N[1]
        return lat0 + dN / KY, lon0 + dE / KX

    def rumo(self, nx, ny):
        b = math.degrees(math.atan2(nx * self.E[0] + ny * self.E[1], nx * self.N[0] + ny * self.N[1])) % 360
        return RUMOS[int(((b + 45) % 360) // 90)]

    def asfalto(self, pt):
        x, y = int(pt[0] * self.k), int(pt[1] * self.k)
        if not (0 <= x < self.img.size[0] and 0 <= y < self.img.size[1]):
            return False
        r, g, b = self.img.getpixel((x, y))
        return max(r, g, b) - min(r, g, b) < 22 and 110 <= (r + g + b) / 3 <= 196

    def gramado(self, pt):
        x, y = int(pt[0] * self.k), int(pt[1] * self.k)
        if not (0 <= x < self.img.size[0] and 0 <= y < self.img.size[1]):
            return False
        r, g, b = self.img.getpixel((x, y))
        return g > r + 8 and g > b + 20

    def marco(self, pt, lote):
        """(lote encontrado ou None, nome do marco ou None)."""
        o = self.i_lotes.em(pt, lote)
        if o:
            return o, 'quadra:' + o.get('q', '')
        o = self.i_extras.em(pt)
        if o:
            return None, o['nome']
        o = self.i_vols.em(pt)
        if o and not self.asfalto(pt):          # o volume do scene.json às vezes avança sobre a rua
            return None, MARCOS.get(o['t'], o['t'])
        return None, None

    def sonda(self, lote, px, py, nx, ny):
        """O que há do lado de fora de um ponto da divisa: ('lote', id) | ('via', além) | ('direto', marco) | ('?', '')."""
        o = self.i_lotes.em((px + nx * SONDA_LOTE, py + ny * SONDA_LOTE), lote)
        if o:
            return 'lote', o['id']
        # Depois da rua: um prédio/quadra → é o que fica em frente; saindo do contorno do parque → divisa
        # (se antes passou por gramado, é a faixa verde da PY-19 ou da pista); só gramado → área verde.
        corrida, verde, via_em, verde_visto, st = 0.0, 0.0, None, False, PASSO
        while True:
            q = (px + nx * st, py + ny * st)
            fora = not dentro(q, self.contorno)
            if via_em is not None and fora:
                return 'via', 'faixa verde' if verde_visto else 'divisa do parque'
            o, m = self.marco(q, lote)
            if m:
                if via_em is None:
                    return ('lote', o['id']) if o else ('direto', m)
                return 'via', m
            if via_em is None:
                if fora:                               # encosta na divisa sem rua no meio (Resort, Q04)
                    return 'direto', 'divisa do parque'
                verde = verde + PASSO if self.gramado(q) else 0.0
                if verde >= VERDE_MIN:                 # encosta em área verde sem rua no meio
                    return 'direto', 'área verde'
                corrida = corrida + PASSO if self.asfalto(q) else 0.0
                if corrida >= VIA_MIN:
                    via_em, verde = st, 0.0
                elif st > self.alcance + VIA_MIN:
                    return '?', ''
            else:
                verde = verde + PASSO if self.gramado(q) else 0.0
                if verde >= VERDE_MIN:                 # canteiro de árvore no meio da rua não chega a isso
                    verde_visto = True
                if st - via_em > (ALEM_DA_FAIXA if verde_visto else ALEM_DA_VIA):
                    break
            st += PASSO
        return ('via', 'área verde' if verde_visto else '') if via_em is not None else ('?', '')

    def rumos_dos_lados(self, P):
        """Rumo de cada lado pela normal externa. Num quadrilátero, um lado por rumo (a combinação que menos
        se desvia): num trapézio cortado pela diagonal, o lado inclinado e o vizinho dele caíam no mesmo rumo."""
        normais = []
        for i in range(len(P)):
            (x1, y1), (x2, y2) = P[i], P[(i + 1) % len(P)]
            Ln = math.hypot(x2 - x1, y2 - y1) or 1
            nx, ny = (y2 - y1) / Ln, -(x2 - x1) / Ln
            if dentro(((x1 + x2) / 2 + nx * .3, (y1 + y2) / 2 + ny * .3), P):
                nx, ny = -nx, -ny
            normais.append((nx, ny))
        rumos = [self.rumo(*n) for n in normais]
        if len(P) == 4 and len(set(rumos)) < 4:
            graus = [math.degrees(math.atan2(n[0] * self.E[0] + n[1] * self.E[1], n[0] * self.N[0] + n[1] * self.N[1])) % 360
                     for n in normais]
            desvio = lambda g, r: min(abs(g - 90 * RUMOS.index(r)) % 360, 360 - abs(g - 90 * RUMOS.index(r)) % 360)
            rumos = list(min(itertools.permutations(RUMOS), key=lambda pr: sum(desvio(g, r) for g, r in zip(graus, pr))))
        return rumos

    def confrontacoes(self, lote):
        P = lote['P']
        lados = {r: collections.Counter() for r in RUMOS}
        comp = collections.Counter()
        rumos = self.rumos_dos_lados(P)
        for i in range(len(P)):
            (x1, y1), (x2, y2) = P[i], P[(i + 1) % len(P)]
            dx, dy = x2 - x1, y2 - y1
            Ln = math.hypot(dx, dy)
            if Ln < 0.5:
                continue
            nx, ny = dy / Ln, -dx / Ln
            if dentro(((x1 + x2) / 2 + nx * .3, (y1 + y2) / 2 + ny * .3), P):
                nx, ny = -nx, -ny
            r = rumos[i]
            comp[r] += Ln
            n = max(4, int(Ln))
            for j in range(n):
                t = (j + .5) / n
                if .06 <= t <= .94:
                    lados[r][self.sonda(lote, x1 + dx * t, y1 + dy * t, nx, ny)] += Ln / n
        return lados, comp


# ------------------------------------------------------------------------------------- vértices
def expande(P, d):
    """Afasta cada lado do polígono `d` metros para fora e devolve os novos cantos."""
    n, linhas = len(P), []
    for i in range(n):
        (x1, y1), (x2, y2) = P[i], P[(i + 1) % n]
        Ln = math.hypot(x2 - x1, y2 - y1)
        ux, uy = (x2 - x1) / Ln, (y2 - y1) / Ln
        nx, ny = uy, -ux
        if dentro(((x1 + x2) / 2 + nx * .3, (y1 + y2) / 2 + ny * .3), P):
            nx, ny = -nx, -ny
        linhas.append(((x1 + nx * d, y1 + ny * d), (ux, uy)))
    out = []
    for i in range(n):
        (a, u), (b, v) = linhas[i - 1], linhas[i]
        cr = u[0] * v[1] - u[1] * v[0]
        if abs(cr) < 1e-6:                      # lados colineares: só desloca o canto
            out.append(b)
            continue
        t = ((b[0] - a[0]) * v[1] - (b[1] - a[1]) * v[0]) / cr
        out.append((a[0] + u[0] * t, a[1] + u[1] * t))
    return out


def vertices(pl, lotes, folga=FOLGA, junta=JUNTA):
    """{id: [(X, Y) dos cantos NO, NE, SE, SO]} na prancha, com os cantos comuns a vizinhos unificados.
    `folga` afasta o polígono até o eixo da linha de divisa (0 quando ele já está no eixo)."""
    cantos = {l['id']: expande(l['P'], folga) if folga else list(l['P']) for l in lotes}
    # une os cantos que caem no mesmo ponto (o mesmo marco serve aos dois, três ou quatro lotes)
    todos = [(i, k) for i, cs in cantos.items() for k in range(len(cs))]
    pai = {t: t for t in todos}

    def raiz(t):
        while pai[t] != t:
            pai[t] = pai[pai[t]]
            t = pai[t]
        return t
    grade = collections.defaultdict(list)
    for t in todos:
        x, y = cantos[t[0]][t[1]]
        grade[int(x // 2), int(y // 2)].append(t)
    for (gx, gy), ts in grade.items():
        viz = [u for dx in (-1, 0, 1) for dy in (-1, 0, 1) for u in grade.get((gx + dx, gy + dy), ())]
        for t in ts:
            for u in viz:
                if t < u and math.dist(cantos[t[0]][t[1]], cantos[u[0]][u[1]]) < junta:
                    pai[raiz(t)] = raiz(u)
    grupos = collections.defaultdict(list)
    for t in todos:
        grupos[raiz(t)].append(cantos[t[0]][t[1]])
    media = {g: (sum(x for x, _ in ps) / len(ps), sum(y for _, y in ps) / len(ps)) for g, ps in grupos.items()}

    out = {}
    for i, cs in cantos.items():
        cs = [media[raiz((i, k))] for k in range(len(cs))]
        en = [(x * pl.E[0] + y * pl.E[1], x * pl.N[0] + y * pl.N[1]) for x, y in cs]   # leste, norte
        area = sum(en[k][0] * en[(k + 1) % len(en)][1] - en[(k + 1) % len(en)][0] * en[k][1] for k in range(len(en)))
        ordem = list(range(len(cs)))
        if area > 0:                            # anti-horário com o norte para cima → inverte
            ordem.reverse()
        k0 = max(ordem, key=lambda k: en[k][1] - en[k][0])          # o mais a noroeste
        ordem = ordem[ordem.index(k0):] + ordem[:ordem.index(k0)]
        out[i] = [cs[k] for k in ordem]
    return out


def area_m2(cs):
    return abs(sum(cs[k][0] * cs[(k + 1) % len(cs)][1] - cs[(k + 1) % len(cs)][0] * cs[k][1] for k in range(len(cs)))) / 2


# ------------------------------------------------------------------------------------- texto
def junta(itens):
    return itens[0] if len(itens) == 1 else ', '.join(itens[:-1]) + ' e ' + itens[-1]


def filtra(cont):
    """Tira encontro de quina (< 3 m, a não ser que seja o lado quase todo)."""
    total = sum(cont.values())
    # "?" é quase sempre a esquina (meio-fio e faixa de pedestre brancos): só conta se dominar o lado
    return {k: v for k, v in cont.items()
            if (v >= TRECHO_MIN or v >= total * .5) and (k[0] != '?' or v >= total * .5)}


PLURAL = {'Lote': 'Lotes', 'Loja': 'Lojas', 'Torre': 'Torres'}


def natural(s):
    return [int(p) if p.isdigit() else p for p in re.split(r'(\d+)', s)]


def agrupa(nomes):
    """['Lote Q01.L002', 'Lote Q01.L003', 'Supermercado'] → ['Lotes Q01.L002 e Q01.L003', 'Supermercado']."""
    grupos = {}
    for n in sorted(nomes, key=natural):
        pre, _, cod = n.partition(' ')
        if pre in PLURAL and cod:
            grupos.setdefault(pre, []).append(cod)
        else:
            grupos.setdefault(n, None)
    return [k if cods is None else (k if len(cods) == 1 else PLURAL[k]) + ' ' + junta(cods)
            for k, cods in grupos.items()]


def texto(cont, rumo, rot=None, faixa=None):
    """Counter {(tipo, valor): metros} de um rumo → texto da cláusula e alertas. `rot`: id → nome."""
    faixa = FAIXA_VERDE if faixa is None else faixa
    fica = filtra(cont)
    vizinhos = [(rot or {}).get(v, 'Lote ' + v) for (t, v) in fica if t == 'lote' and not v.startswith('quadra:')]
    alem = collections.Counter()
    for (t, v), m in fica.items():
        if t == 'via':
            alem[faixa.get(rumo, 'divisa do parque') if v == 'faixa verde' else v] += m
    diretos = collections.Counter()
    for (t, v), m in fica.items():
        if t == 'direto':
            diretos[v] += m
    if alem:                                    # lado com rua: prédio "encostado" é o volume do scene.json
        for v in ('área verde', 'divisa do parque'):    # avançando sobre a calçada — conta como o que há
            diretos.pop(v, None)                # em frente; gramado de calçada não conta
        alem.update(diretos)
        diretos = collections.Counter()
    diretos = sorted(diretos)
    alerta = []
    # lote/loja/torre de outro conjunto encostado entra junto com os vizinhos ("Lotes Q04.L011 e Q04.L012")
    partes = agrupa(vizinhos + [d for d in diretos if d.partition(' ')[0] in PLURAL])
    diretos = [d for d in diretos if d.partition(' ')[0] not in PLURAL]
    if alem:
        frente = alem.most_common(1)[0][0]      # o que predomina do outro lado; outra quadra = nada a dizer
        partes.append('via interna' + (f' (do outro lado: {frente})' if frente and not frente.startswith('quadra:') else ''))
    partes += diretos
    if any(t in ('?',) for (t, _) in fica):
        alerta.append(f'{NOME_RUMO[rumo]}: trecho sem identificação')
    if any(t == 'lote' and v.startswith('quadra:') for (t, v) in fica):
        alerta.append(f'{NOME_RUMO[rumo]}: encosta em quadra vizinha sem lote mapeado')
    s = junta(partes) if partes else ''
    return (s[:1].upper() + s[1:]), alerta


OPOSTO = {'N': 'S', 'S': 'N', 'L': 'O', 'O': 'L'}


def confronta(pl):
    """Confrontações de todas as unidades da planta: ({id: {rumo: Counter}}, {id: {rumo: texto}}, avisos)."""
    lados_de = {u['id']: pl.confrontacoes(u)[0] for u in pl.unidades}
    # Reciprocidade: se A tem B ao Norte, B tem A ao Sul — uma divisa curta (2,8 m entre Q01.L001 e
    # Q01.L005) passa no lado curto de um e cai no corte de quina do lado comprido do outro.
    for a, lados in lados_de.items():
        for r in RUMOS:
            for (t, b) in filtra(lados[r]):
                if t == 'lote' and b in lados_de and ('lote', a) not in filtra(lados_de[b][OPOSTO[r]]):
                    lados_de[b][OPOSTO[r]][('lote', a)] = max(lados_de[b][OPOSTO[r]][('lote', a)], TRECHO_MIN)
    textos, avisos = {}, []
    for u in pl.unidades:
        textos[u['id']] = {}
        for r in RUMOS:
            t, al = texto(lados_de[u['id']][r], r, pl.rot, pl.faixa)
            textos[u['id']][r] = t
            avisos += [f"{u['id']} — {a}" for a in al]
            if not t:
                avisos.append(f"{u['id']} — {NOME_RUMO[r]}: sem lado nesse rumo")
    return lados_de, textos, avisos


def frentes_do_nome(nome):
    fr = nome.split('.')[-1]
    return set(fr.split('+'))


# ------------------------------------------------------------------------------------- CSV
def br(n, casas=2):
    return '' if n is None or n == '' else f'{n:.{casas}f}'.replace('.', ',')


def janela_vigente(precos, hoje):
    for j in precos['janelas']:
        if hoje <= j.get('ate', '9999-12-31'):
            return j
    return precos['janelas'][-1]


def cod_lote(q, l):                       # Q07.L014 → 3020714 (padrão de códigos do build_unidades.py)
    assert 1 <= q <= 99 and 1 <= l <= 99
    return f'302{q * 100 + l:04d}'


def acha_site(arg):
    if arg:
        return arg
    raiz = os.path.abspath(os.path.join(AQUI, '..', '..', '..'))
    for nome in ('BracerumPark', 'bracerumpark'):
        if os.path.isdir(os.path.join(raiz, nome, '3dmasterplan')):
            return os.path.join(raiz, nome)
    sys.exit('Não achei o repositório do site: passe --site /caminho/para/BracerumPark')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--site', help='checkout do mate337/BracerumPark (padrão: pasta irmã deste repositório)')
    ap.add_argument('--hoje', default=datetime.date.today().isoformat())
    args = ap.parse_args()
    site = acha_site(args.site)

    pl = Planta(site)
    P = json.load(open(os.path.join(site, '3dmasterplan', 'data', 'precos.json'), encoding='utf-8'))
    jan = janela_vigente(P, args.hoje)
    cats = P['categorias']

    cab = open(MODELO, encoding='utf-8-sig').read().strip().split(';')
    assert len(cab) == 126, len(cab)
    col = {n: i for i, n in enumerate(cab + COLUNAS_NOVAS)}
    comum = {
        'Empresa (Empreendimento)': 'QATAR S.A. (Bracerum Park)', 'Região (Empreendimento)': 'Grande Assunção',
        'Logradouro (Empreendimento)': 'Rodovia PY-19', 'Estado (Empreendimento)': 'Central',
        'Cidade (Empreendimento)': 'Villeta', 'Empreendimento Legado/Novo (Empreendimento)': 'Novo',
        'Nome (Empreendimento)': 'Bracerum Park — Lotes industriais', 'Sigla (Empreendimento)': 'LTIND',
        'Situação Comercial (Empreendimento)': 'Em vendas', 'Situação da Obra (Empreendimento)': 'Não iniciada',
        'Segmento (Empreendimento)': 'Industrial', 'Tipo (Empreendimento)': 'Loteamento industrial',
        'Código interno (Empreendimento)': '302', 'Código interno (Etapa)': '302', 'Nome (Etapa)': 'Fase 1',
        'Tipo (Unidade)': 'Lote', 'Ativo no painel (Unidade)': 'Sim',
    }

    lados_de, textos, avisos = confronta(pl)

    vert = vertices(pl, pl.lotes)
    assert all(len(v) == len(CANTOS) for v in vert.values()), 'lote que não é quadrilátero'
    razao = sorted(area_m2(vert[l['id']]) / l['a'] for l in pl.lotes)

    linhas, conf = [], []
    for l in sorted(pl.lotes, key=lambda l: l['id']):
        txt = textos[l['id']]
        # conferência com as frentes do nome oficial
        ruas = {r for r in RUMOS if 'via interna' in txt[r].lower()}
        nome_fr = frentes_do_nome(l['nome'])
        if ruas != nome_fr:
            conf.append([l['id'], l['nome'], '+'.join(sorted(nome_fr, key=RUMOS.index)),
                         '+'.join(sorted(ruas, key=RUMOS.index))])

        pm = P['precos'][jan['id']][l['cat']][0][0]
        valor = pm * l['a']
        lat, lon = pl.latlon(*centro(l['p']))
        q, n = l['id'].split('.L')
        c7 = cod_lote(int(q[1:]), int(n))
        nome_cat = cats[l['cat']]['nome']['pt']
        r = [''] * len(col)
        campos = dict(comum, **{
            'Nome (Bloco)': f"Quadra {l['q']}", 'Código interno (Bloco)': c7[:5],
            'Nome (Unidade)': 'LTIND.' + l['id'], 'Tipologia (Unidade)': nome_cat,
            'Área do terreno (Unidade)': br(l['a']), 'Área total (Unidade)': br(l['a']),
            'Valor (Unidade)': br(valor), 'Valor VGV (Unidade)': br(valor),
            'Código interno (Unidade)': c7, 'Referência Ordenação (Unidade)': l['id'],
            'Descrição do Lote (Unidade)': (f"{l['nome']} · {nome_cat} (×{cats[l['cat']]['fator']}) · "
                                            f"US$ {pm}/m² — janela {jan['curto']['pt']}, 1 a 8 lotes, 20% + 12x"),
            'Latitude (Unidade)': f'{lat:.6f}', 'Longitude (Unidade)': f'{lon:.6f}',
            **{f'{NOME_RUMO[rr]} (Confrontação)': txt[rr] for rr in RUMOS},
            **{f'Vértice {c} (Coordenada)': '{:.6f}, {:.6f}'.format(*pl.latlon(*v))
               for c, v in zip(CANTOS, vert[l['id']])},
        })
        for k, v in campos.items():
            r[col[k]] = v
        linhas.append(r)

    with open(SAIDA, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f, delimiter=';', lineterminator='\r\n')
        w.writerow(cab + COLUNAS_NOVAS)
        w.writerows(linhas)
    with open(SAIDA_CONF, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f, delimiter=';', lineterminator='\r\n')
        w.writerow(['Lote', 'Nome oficial (V14)', 'Frentes no nome', 'Frentes na planta (ruas)'])
        w.writerows(conf)

    print(f'Fonte: {pl.fonte}')
    print(f'{len(linhas)} lotes, {sum(l["a"] for l in pl.lotes):,} m², janela {jan["id"]} → {os.path.relpath(SAIDA)}')
    print(f'Frentes do nome ≠ ruas da planta: {len(conf)} lotes → {os.path.relpath(SAIDA_CONF)}')
    print(f'Área pelos vértices ÷ área de contrato: mediana {razao[len(razao) // 2]:.3f}, '
          f'de {razao[0]:.3f} a {razao[-1]:.3f}')
    print(f'Avisos: {len(avisos)}')
    for a in avisos:
        print('  ' + a)


if __name__ == '__main__':
    main()
