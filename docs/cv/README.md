# Cadastro dos lotes para o CV — com as confrontações da cláusula 6.2 (2026-11-10)

`unidades_3_loteamento_confrontacoes.csv` é a mesma tabela de cadastro do `unidades_3_loteamento.csv`
(pasta "Lotes + Categorias" do Drive), refeita com o **Masterplan V14 rev. 02/11/2026** e com oito
colunas a mais no fim, para preencher o contrato:

> **6.1.** … conforme croqui e **coordenadas preliminares** constantes do Anexo III.
> **6.2.** Confrontações preliminares: ao Norte, [___]; ao Sul, [___]; ao Leste, [___]; ao Oeste, [___].

| Coluna nova | Exemplo (Q07.L014) |
|---|---|
| `Norte (Confrontação)` | Lote Q07.L015 |
| `Sul (Confrontação)` | Lote Q07.L013 |
| `Leste (Confrontação)` | Via interna |
| `Oeste (Confrontação)` | Lote Q07.L006 |
| `Vértice NO (Coordenada)` | -25.783358, -57.728569 |
| `Vértice NE (Coordenada)` | -25.783271, -57.728080 |
| `Vértice SE (Coordenada)` | -25.783491, -57.728033 |
| `Vértice SO (Coordenada)` | -25.783577, -57.728521 |

As colunas `Latitude (Unidade)` / `Longitude (Unidade)` do modelo do CV continuam como estavam: são o
**centro** do lote, iguais às do cadastro anterior.

**O que não mudou:** o formato (modelo de importação do CV, 126 colunas, `;`, UTF-8 com BOM, vírgula
decimal), o empreendimento/etapa/bloco, e os **códigos internos** — `302` + quadra + lote
(`Q07.L014` → `3020714`), bloco `302QQ`. Preço pela mesma regra (janela vigente, categoria, 1 a 8
lotes, 20% + 12x — hoje, janela Expo).

**Só os 614 lotes à venda.** Hub de serviços, hangares, Q37 e Q11 ficam fora, como nos CSVs de
importação de 2026-11-10 (`docs/cv/` do repositório do site): só vai para o CV o que está à venda.

## Os textos

| Texto | Quando |
|---|---|
| `Lote Q07.L015` · `Lotes Q40.L015, Q40.L016 e Q40.L017` | divisa com outro(s) lote(s) |
| `Via interna` | rua do parque; do outro lado, outra quadra de lotes |
| `Via interna (do outro lado: …)` | rua, e do outro lado algo que não é lote: `faixa verde e Rodovia PY-19` (Q01–Q03), `faixa verde e pista de pouso` (Q38–Q40), `divisa do parque` (diagonal da Q01/Q05/Q12/Q18), `Hub de serviços`, `Refeitório e Grêmio`, `recinto alfandegado (Q37)`, `aeroporto`, `Administração`, `posto e portaria`, `Supermercado`, `Bracerum Outlet Premium`, `Bracerum Resort`, `Bracerum Residence`, `galpões de manutenção do Park`, `área verde` |
| `Bracerum Outlet Premium` | sem rua no meio: os fundos da Q04 encostam no Outlet |

As ruas não têm nome no V14, por isso "via interna". Quando o loteamento tiver nomes de rua, basta trocar o texto.

## Os vértices (coordenadas do Anexo III)

Os quatro cantos de cada lote, em **latitude, longitude (WGS 84, graus decimais)**, na ordem do
sentido horário no mapa a partir do canto noroeste: NO → NE → SE → SO. Nos 573 lotes retangulares
cada rótulo é o canto daquele quadrante; nos 41 poligonais (esquinas da diagonal, Q31, Q38–Q40) é o
mais próximo dele — conferido: todos os rótulos caem no quadrante certo em relação ao centro do lote.

- **O canto fica no eixo da linha de divisa.** O desenho deixa 0,6 m entre dois lotes; cada polígono é
  afastado 0,3 m para fora, e os cantos que caem no mesmo ponto (até 1,0 m) viram um ponto só. Resultado:
  **lotes vizinhos têm exatamente a mesma coordenada no canto comum** (253 pontos servem a 4 lotes, 644
  a 2, 156 são canto externo de quadra) — dá para desenhar o croqui do Anexo III direto da tabela.
- **Conferência pela área:** a área fechada pelos quatro cantos fica entre **−1,9% e +0,8%** da área de
  contrato em 613 lotes (mediana 0,0%) — ex.: Q07.L014 sai com 50,0 × 24,8 m. A exceção é a **Q04.L017**:
  o desenho tem **1.639 m²** e o nome oficial diz 1.410 — reforça os 1.650 m² da pendência abaixo.
- **Precisão: são preliminares, como diz o contrato.** A posição *relativa* (um lote em relação ao outro)
  é a do desenho, ~1 m. A posição *absoluta* não é levantamento: a planta foi posta no mapa encaixando a
  dobra da PY-19 do desenho na curva real do OpenStreetMap (`build_refs.py` do site). Pode estar deslocada
  de alguns metros a algumas dezenas de metros no terreno. As definitivas vêm do plano de mensura do
  agrimensor (no Paraguai, normalmente em UTM 21S).

## Como é calculado

`build_confrontacoes.py` lê do repositório do site (`mate337/BracerumPark`, conferido no commit
`24549a0`): `3dmasterplan/data/lotes.json` (os 614 lotes da rev. 02/11, com nome oficial, área de contrato
e polígono), `scene.json` (norte da prancha, prédios, contorno do parque) e `parque.webp` (a planta
renderizada, de onde sai o asfalto).

1. Cada lado do lote vai para o rumo mais próximo da sua normal externa, pelo **norte verdadeiro** da
   prancha (o norte aponta para a direita, girado 11°; topo = Oeste/PY-19, baixo = Leste/pista).
2. Ao longo do lado, a cada metro, olha-se 1,5 m para fora: se cai em outro lote, é o confrontante.
   Se não, anda-se para fora até achar asfalto (≥ 3 m contínuos = rua) ou um prédio encostado; depois da
   rua, vê-se o que fica em frente.
3. Trechos com menos de 3 m são encontro de quina e saem — a não ser que sejam o lado quase todo.
4. Reciprocidade: se A tem B ao Norte, B tem A ao Sul (conferido: nenhuma quebra; nenhuma célula vazia).

Rodar de novo (precisa de `pillow`):

```sh
python3 docs/cv/build_confrontacoes.py --site /caminho/para/BracerumPark
```

## Conferência com o nome oficial

O nome de cada lote no V14 já traz as frentes (`LTIND.Q07.L014.A01250.ESQNAO.RT.L` → frente Leste).
**605 dos 614 lotes batem** com as ruas achadas na planta. Os 9 que não batem estão em
`conferencia_frentes.csv`, e a planta está certa em todos:

- **Q38/Q39 (8 lotes):** na rev. 02/11 as duas são **uma quadra só, 38.194 m², sem rua no meio** (conferido
  no PDF original). Mesmo assim os rótulos de Q38.L008, Q38.L016, Q39.L001 e Q39.L009 dizem "esquina" com
  frente para essa rua que não existe, e Q38.L001–L003 dizem ter frente Leste, onde estão os lotes
  L009–L011. Q38.L009 é esquina (rua ao Sul) mas o rótulo diz que não. **Erro de rótulo no PDF do
  cliente** — vale avisar quem desenha.
- **Q04.L001:** o rótulo dá só frente Leste, mas ao Sul há a rua de acesso da portaria.

## Diferenças em relação ao cadastro anterior (V14 de 28/10)

- **Q38.L017 deixou de existir** (a Q38 tem 16 lotes na rev. 02/11). **Está no CV — desativar.**
- Áreas novas na Q38: L001 1.231 → 1.501 m², L002 e L003 1.250 → 872, L009 1.250 → 1.483,
  L010 509 → 962, L011 583 → 1.035, L012 656 → 730, L013 730 → 803, L014 803 → 877, L015 877 → 950,
  L016 950 → 1.024 (valores recalculados).
- **Q04.L017: 1.650 → 1.410 m²** (US$ 303.600 → 259.440).
- A Q38 inteira mudou de posição (lat/lon), e Q38.L008, Q39.L001 e Q39.L009 mudaram só o rótulo (a
  "Descrição do Lote" leva o nome oficial).
- **592 lotes saem idênticos** ao cadastro anterior nas 126 colunas do CV (Q01.L002–L004 variam
  0,000001° na lat/lon, arredondamento).

## Pendências

- **Importação no CV não testada com as 4 colunas novas.** Se o CV recusar coluna desconhecida, apagar as
  quatro últimas antes de importar (ou criar campos adicionais no CV com esses nomes).
- **"Uso previsto" (fim do 6.2) não está na tabela**: depende do comprador (industrial / logístico /
  serviços); nada no masterplan diz isso por lote.
- **Medidas dos lados não têm coluna própria**: saem dos vértices (Q07.L014 → 50,0 × 24,8 m), mas são de
  desenho. Para o contrato, só com o plano de mensura.
- A soma das áreas é **766.449 m²**; o quadro da prancha diz 766.690 m² (a diferença é a Q04.L017 com
  1.650) — já anotado como "a confirmar" no repositório do site. O desenho da Q04.L017 mede 1.639 m², o
  que aponta para 1.650.

---

# Bracerum Residence e Bracerum Outlet — mesmas colunas (2026-11-10)

Quatro tabelas no mesmo formato, geradas por `build_confrontacoes_residence_outlet.py` a partir das tabelas de
importação do CV feitas em 2026-11-10 (`base_cv/`, do `build_tabela_cv.py` do branch
`claude/beautiful-babbage-imqfjx` do site): **mesmas linhas, ids do CV, nomes, áreas e valores**, com
`Latitude`/`Longitude (Unidade)` preenchidas (centro da unidade — estavam vazias) e as mesmas oito colunas dos
lotes (`Norte/Sul/Leste/Oeste (Confrontação)` e `Vértice NO/NE/SE/SO (Coordenada)`).

| Arquivo | Unidades | De onde vem a geometria |
|---|---|---|
| `unidades_residence_casas_confrontacoes.csv` | 31 lotes do Resort (Q01–Q04) | os lotes `LT.RES.Qxx.Lyy` separados no PDF do V14 rev. 02/11 (miolo branco entre os traços, afastado 0,25 m até o eixo do traço) |
| `unidades_residence_aptos_confrontacoes.csv` | 1.452 aptos em 67 torres | **a torre**: retângulo da projeção do volume do `scene.json`; todos os aptos da torre têm as mesmas oito colunas |
| `unidades_outlet_premium_1a_fase_confrontacoes.csv` | 57 lojas OUT-01…OUT-57 | o desenho de vendas do cliente encaixado no contorno da 1ª fase do V14 |
| `unidades_outlet_supermercado_lojas_confrontacoes.csv` | Supermercado + LJ1–LJ12 | as medidas do PDF vetorial do V14 |

`geometria_v14_residence.json` guarda o que foi lido do PDF (lotes do Resort e contorno dos condomínios), para a
geração normal levar segundos. Reler: `--extrair` (~5 min; precisa de pdftoppm, pdftotext, numpy, scipy,
opencv e pdfplumber).

## Exemplos

| Unidade | Norte | Sul | Leste | Oeste |
|---|---|---|---|---|
| Casa `Q04.L05` (Resort) | Divisa do parque | Via interna | Lote LT.RES.Q04.L06 | Lote LT.RES.Q04.L04 |
| Casa `Q03.L02` (Resort) | Via interna | Via interna | Simulador de Surf | Lote LT.RES.Q03.L01 |
| Apto da `Torre T24` | Área comum do condomínio, em frente: Torre T25 | Área comum do condomínio, em frente: via interna (do outro lado: condomínio das Torres T21 a T23, T30, T31 e T36 a T38) | Área comum do condomínio, em frente: Torre T32 | Área comum do condomínio, em frente: via interna (do outro lado: condomínio das Torres T13 a T20) |
| Loja `OUT-01` | Loja OUT-02 | Outlet Premium — 2ª fase (liberação futura) | Circulação do Outlet | Via interna (do outro lado: faixa verde e Rodovia PY-19) |
| Loja `OUT-25` | Loja OUT-26 | Loja OUT-24 | Lote Q04.L014 | Circulação do Outlet |
| `LJ6` | Via interna | Supermercado | Passagem entre LJ6 e LJ7 | Loja LJ5 |

## Regras de cada conjunto

**Casas (Resort).** Os 31 lotes são lidos do PDF: o miolo branco de cada lote, entre os traços, em volta do
rótulo `LT.RES. Qxx.Lyy`; o polígono é afastado 0,25 m (meio traço) e os cantos comuns a vizinhos são
unificados. A área fechada pelos vértices fica entre **−1,1% e +0,6%** da área do CV em 30 lotes. A
exceção é a **Q03.L04**: o desenho tem **838 m²** e o CV (e o rótulo do PDF) dizem 769 — é o trapézio
cortado pela diagonal; conferir com quem desenhou. Os lotes da Q04 encostam direto na **divisa do parque**
(a diagonal) e o L01 no paisagismo; o "Simulador de Surf" ocupa o vão da Q03 entre o L02 e o L03.
Nos lotes girados da Q04 (a ~45°) dois cantos caem no mesmo quadrante: a coluna NO leva o canto mais a
noroeste e os demais seguem no sentido horário — é a distribuição de menor desvio.

**Aptos (torres).** Apartamento não tem divisa própria no masterplan, então as oito colunas descrevem **a
torre**, iguais para todos os aptos dela: os vértices são o retângulo da projeção da torre (planta em H) e a
confrontação diz o que a torre tem **em frente**, atravessando a área comum: outra torre do mesmo condomínio
ou, saindo do condomínio, a rua e o que há do outro lado (outro condomínio, pelo nome das torres, o Resort,
o Club, a divisa…). A numeração T01–T67 é a **proposta** que está no CV (o kit comercial não numera as
torres): refeita na planta de 02/11, cada torre cai a 0,1 m de onde estava. Os 9 condomínios são os
contornos fechados do PDF; o das torres T01–T12 não é fechado no desenho e foi montado com os traços dele
(`CONDOMINIO_T01_T12` no script).

**Outlet Premium, 1ª fase.** As 57 lojas são as do desenho de vendas do cliente (numeração OUT-01…57 do
`build_tabela_cv.py`). O desenho está em escala com o V14: o contorno da 1ª fase cai no do V14 com
0,8093 e 0,8085 m/px nos dois eixos, e a Fase 2 horizontal do desenho cai a 0,1 m da do V14 — usado
0,8089 m/px. Partes comuns do desenho com nome: circulação (o corredor de 8,1 m entre as fileiras), acessos,
doca e sanitários. A fileira de trás encosta, sem rua, nos **lotes Q04.L011–L017** (e a tabela dos lotes diz
"Bracerum Outlet Premium" do lado deles).

**Supermercado + LJ1–LJ12.** Do PDF vetorial: bloco de 65,49 × 83,02 m, supermercado com 55,49 m (4.606,8 m²)
e a faixa de lojas com 10,00 m em módulos de 6,00 m — LJ1–LJ6, passagem de 11 m, LJ7–LJ12 (60 m² cada).
O lado oeste encosta na 2ª fase do Outlet.

## Pendências — Residence e Outlet

- **Outlet: 17.102 m² × 17.870 m².** Pelo encaixe no V14 as 57 lojas somam 17.102 m²; o CV traz 17.870 m²
  (o número "Área vendável 1ª fase" do desenho), 4,5% a mais. Para fechar 17.870 a escala do desenho teria
  de ser 2,2% maior e o Outlet passaria do contorno da 1ª fase do V14, entrando na Q04. Os vértices seguem
  o V14; as áreas do CV não foram mexidas. Confirmar com o cliente se os 17.870 m² incluem áreas comuns.
- **Casa Q03.L04: 838 m² no desenho × 769 m² no CV.**
- **Torres:** numeração ainda é proposta — trocar quando o cliente mandar a planta numerada (o script refaz
  tudo). As confrontações dos aptos são as da torre; a posição do apto no andar não está no masterplan.
- Coordenadas preliminares, pelos mesmos motivos dos lotes (encaixe na PY-19 do OpenStreetMap).
