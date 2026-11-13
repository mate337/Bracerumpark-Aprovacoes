# Feed — Paraguai, EXPO Paraguai-Brasil e Stand A 175

Vídeo de feed que junta os três stories do `posts.ai` e acrescenta os números
do Paraguai. **1080 × 1920 (9:16) · 30 fps · 30 s · H.264 + som.**

A arte é desenhada em 4:5 (1080 × 1350) e fica centralizada na tela vertical:
no feed, o Instagram recorta o centro em 4:5 e mostra a arte inteira; no Reels,
o resto da tela é branco. Na cena 4 o fundo é a foto da estrada, que se
estende até as bordas.

| Cena | Tempo | Conteúdo |
|---|---|---|
| 1 | 0 – 5,3 s | “O Paraguai se tornou uma gigante potência para negócios e indústria” + render do saguão (página 1 do .ai), com zoom lento |
| 2 | 5,3 – 13,4 s | **Por que o Paraguai? Os números explicam.** 1% (conta de 35% até 1%) · 10% · −60% · 0% (conta de 35% até 0%) · Baa3 · 100% |
| 3 | 13,4 – 22 s | “E a presença do Bracerum Park na EXPO Paraguai-Brasil só comprova isso” + vídeo do estande emoldurado + contagem até **10.000** (página 2) |
| 4 | 22 – 30 s | A foto da estrada sobe por cima; “Hoje é o último dia…”, “Venha conhecer o Bracerum Park”, bloco dourado **STAND A 175**, logo (página 3) |

O som é o do próprio vídeo do estande, só durante a cena 3, com entrada e saída
suaves. No feed o vídeo começa mudo; a peça foi feita para funcionar sem som.

Visual dos stories: Helvetica (aqui a **Nimbus Sans**, clone métrico com todos
os glifos, já que o texto novo pede letras que o .ai não embute), preto, branco
e o dourado **#b3924f**, cantos retos.

## Arquivos

- `feed-expo-paraguai.mp4`: o post. **Fora do git:** tem a filmagem do estande
  e o repositório é público.
- `capa.jpg`: o quadro final (Stand A 175), 1080 × 1920, para escolher como capa.
- `fonte/`: `animacao.html` (abre no navegador e toca em loop; espaço pausa,
  ←/→ andam 1 s, `?t=14` começa no segundo 14) e `renderizar.js`.

```bash
cd pecas/2026-11-expo-feed-paraguai/fonte
node renderizar.js caminho/do/video-do-estande.mp4
```

## Os números do Paraguai — de onde vêm

Todos da página **/tributacao** do site do parque (`mate337/BracerumPark`,
`tributacao.html`), que o cliente já publica:

| No vídeo | No site |
|---|---|
| **1%** tributo único na Maquila, contra 25% a 35% nos vizinhos | “Regime de Maquila · Lei 7.547/2025 … frente a alíquotas de 25% a 35% nos países vizinhos” |
| **10%** de IR, IVA e imposto pessoal — 10·10·10 | “10·10·10 · Regime fiscal do Paraguai” |
| **−60%** na tarifa de energia industrial, matriz 100% hidrelétrica | “Matriz 100% hidrelétrica com tarifas industriais **~60%** menores” |
| **0%** de tarifa no Mercosul, 270 milhões de consumidores | “0% Tarifa intra-Mercosul” · “+270 milhões de consumidores no bloco” |
| **Baa3**, grau de investimento Moody’s | “Baa3 · Grau de investimento Moody’s” |
| **100%** de capital estrangeiro permitido | “100% de capital estrangeiro permitido” (Maquila) |

## Ajustes em relação ao .ai

- **Stand A 175**, como na imagem enviada e na placa do estande no vídeo — o
  .ai ainda diz A 172.
- Tirei a vírgula de “EXPO Paraguai-Brasil**,** só comprova isso”: ela separava
  o sujeito do verbo.

## Legenda sugerida

A primeira frase tem 114 caracteres e cabe antes do “… mais”.

```text
O Paraguai virou potência para negócios e indústria. Na EXPO Paraguai-Brasil, já são mais de 10.000 participantes.

Hoje é o último dia: venha conhecer o Bracerum Park no Stand A 175.

Por que o Paraguai:
• 1% de tributo único no regime de Maquila
• 10% de imposto de renda, de IVA e de imposto pessoal
• Energia industrial cerca de 60% mais barata, 100% hidrelétrica
• 0% de tarifa para vender a 270 milhões de consumidores no Mercosul
• Grau de investimento pela Moody’s (Baa3)

Villeta, Paraguai · PY-19 · bracerumpark.com
```

Primeiro comentário:

```text
#BracerumPark #ExpoParaguaiBrasil #Paraguai #Maquila #InvestirNoParaguai #ParqueIndustrial #Mercosul #Villeta #Negocios #Industria
```
