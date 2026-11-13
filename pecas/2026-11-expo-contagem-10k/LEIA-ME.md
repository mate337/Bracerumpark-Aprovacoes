# Story EXPO Paraguai-Brasil — contagem até 10.000

Animação da página 2 do `posts.ai` (“Já são mais de **10.000** participantes
ativos no evento”), **com fundo transparente**, para colocar por cima de outro
vídeo ou fundo no editor.

1080 × 1920 · 30 fps · 6 s

| Tempo | O que acontece |
|---|---|
| 0,15 s | “Já são mais de” sobe para o lugar |
| 0,40 s | o número entra e começa a contar de 0 |
| 0,95 s / 1,10 s | “participantes” e “ativos no evento” sobem |
| 3,00 s | chega em **10.000** e dá um respiro (cresce 3,5% e volta) |
| 3,5 → 6 s | arte parada, igual ao .ai — dá para esticar o último quadro no editor |

## Arquivos

| Arquivo | Para quê |
|---|---|
| `contagem-10k-transparente.mov` | **ProRes 4444 com alfa.** Premiere, After Effects, Final Cut, DaVinci, CapCut no computador. ~30 MB, fica fora do git (regere com o script). |
| `contagem-10k-transparente.webm` | **VP9 com alfa.** Navegador, Canva e editores web. |
| `contagem-10k-previa.mp4` | Sobre fundo branco, só para conferir. **Não tem transparência.** |

O texto é **preto** e o número **dourado (#b3924f)**, como na arte: o fundo por
baixo precisa ser claro.

O Instagram não aceita vídeo transparente direto no story. A transparência serve
para montar no editor e exportar o story pronto.

## Versão com o vídeo do estande

O vídeo gravado no estande (WhatsApp, 12/11, 24 s, retrato 480 × 848) entra
**emoldurado na parte branca, acima do texto**:

- no tamanho nativo do vídeo (480 × 848), sem ampliar, centrado no eixo do
  número; o pé da moldura fica a ~70 px de “Já são mais de” e o topo abaixo
  da faixa que o Instagram cobre com a barra do perfil;
- **moldura**: filete dourado de 8 px na cor do número (#b3924f), cantos retos
  e uma sombra leve para descolar do branco;
- a moldura sobe e aparece primeiro (0 → 0,8 s); o texto e a contagem vêm
  0,35 s depois; a peça dura o vídeo inteiro (24,1 s) e **leva o som dele**.

| Arquivo | Para quê |
|---|---|
| `story-10k-video.mp4` | **Pronto para o story**: fundo branco, H.264 + som. |
| `story-10k-video-transparente.mov` | ProRes 4444 com alfa + som, para editar (~190 MB). |
| `story-10k-video-transparente.webm` | VP9 com alfa + som. |

**Esses três ficam fora do git:** o repositório é público e a filmagem mostra
pessoas identificáveis. Regere com:

```bash
node renderizar.js --video caminho/para/o/video.mp4
```

## Fidelidade

- O texto não é fonte digitada. São os **contornos tirados do próprio .ai**
  (Helvetica LT Pro), letra por letra, na posição original. O último quadro foi
  comparado pixel a pixel com a página 2 renderizada a partir do .ai: só muda a
  suavização das bordas.
- A Helvetica Bold embutida no .ai só traz 0, 1, 2, 7 e o ponto. Durante a
  contagem, 3, 4, 5, 6, 8 e 9 vêm da **Nimbus Sans Bold** (clone métrico da
  Helvetica, mesma largura por dígito). O “10.000” final usa só glifos do .ai.
- O número cresce alinhado pela direita e termina exatamente onde termina na arte.

## Regerar

```bash
cd pecas/2026-11-expo-contagem-10k/fonte
python3 extrair.py caminho/para/posts.ai caminho/para/NimbusSans-Bold.otf   # só se a arte mudar
node renderizar.js
```

- `extrair.py` precisa de `pdfplumber`, `pypdf` e `fonttools`. A Nimbus Sans vem
  do pacote `fonts-urw-base35` (Debian/Ubuntu). O `glifos.js` gerado já está
  aqui, então só precisa rodar de novo se a arte mudar.
- `renderizar.js` precisa do Playwright (Chromium) e do ffmpeg.
- Tempos, meta e duração ficam no topo de `fonte/animacao.html` (`T`, `META`,
  `DURACAO`). Aberto no navegador, o arquivo toca a animação em loop (espaço pausa).
