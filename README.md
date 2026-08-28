# APROVA — aprovação de mídias sociais

Aplicativo web para o ciclo **criar → revisar → aprovar → agendar** de postagens de
Instagram, Facebook, LinkedIn e mídia paga. Roda sem servidor, sem build e sem
dependência externa.

Os dados ficam no `localStorage` do navegador. Nada sai do dispositivo.

## Como abrir

```bash
git clone https://github.com/mate337/Bracerumpark-Aprovacoes
cd Bracerumpark-Aprovacoes
python3 -m http.server 8000     # e abra http://localhost:8000
```

Servir por HTTP é o caminho recomendado. Abrir o `index.html` direto do disco
(`file://`) também funciona nos navegadores atuais, mas alguns bloqueiam o
carregamento das imagens locais nesse modo.

Para publicar: **Settings → Pages → Deploy from branch → `main` / `(root)`**. O
projeto é estático, não precisa de build.

---

## Os dois lados

Ao entrar você escolhe o perfil. O fluxo muda conforme o papel:

| | **Administrador** (Ana, Caio) | **Aprovador** (Marta, Paulo) |
|---|---|---|
| Cria peças, sobe mídia | ✓ | — |
| Escreve variações de legenda | ✓ | sugere redação |
| Vê rascunhos | ✓ | — |
| Escolhe a legenda que vai ao ar | ✓ | ✓ |
| Comenta e marca pontos na peça | ✓ | ✓ |
| Notas internas (invisíveis ao cliente) | ✓ | — |
| Aprova / pede alterações | quando é seu nível | ✓ |
| Arrasta no quadro e no calendário | ✓ | — |

Dá para trocar de perfil a qualquer momento no rodapé do menu — é o jeito de ver
a mesma peça pelos dois lados.

## O fluxo

```
Rascunho → Em revisão → (Alterações solicitadas ⟲) → Aprovado → Agendado → Publicado
```

A revisão acontece em **níveis**. Por padrão são dois: *revisão interna* (outro
administrador — quem cria não revisa a si mesmo) e *aprovação do cliente*. Só
quando todos os níveis estão verdes a peça vira "Aprovado". Isso liga/desliga em
**Ajustes → Aprovação em dois níveis**.

## A tela de aprovação

O centro do produto. À esquerda, a peça renderizada como vai aparecer:

- **Contexto:** `Feed` (o post na timeline, com os posts vizinhos) ou `Perfil`
  (a grade do Instagram, a página do Facebook/LinkedIn — para julgar o conjunto,
  não só a peça isolada).
- **Dispositivo:** `Mobile` (moldura de celular, 390×844) ou `Desktop` (janela de
  navegador com as colunas reais de cada rede).
- **Tema da rede:** claro ou escuro, porque o feed do leitor pode ser qualquer um.

Os cortes de legenda são os reais: ~125 caracteres no Instagram, ~280 no Facebook,
~210 no LinkedIn, com o "… mais" no lugar certo. Carrossel tem setas, contador e
pontinhos. Vídeo tem play, duração e ícone de som. Anúncio ganha o cartão de CTA
da rede e o rótulo "Patrocinado"/"Promovido".

À direita, quatro abas:

- **Legendas** — as variações lado a lado, cada uma com contador de caracteres e
  de hashtags no limite da rede. O aprovador clica na que prefere; a escolha fica
  registrada com nome e horário. Também pode **sugerir uma redação** — o texto vai
  como sugestão e o criador decide se aplica (um clique aplica).
- **Conversa** — comentários, pedidos de ajuste e notas internas. Cada item traz
  **foto, nome, cargo e horário de quem escreveu**. Dá para responder, resolver e
  filtrar só o que está pendente.
- **Detalhes** — ficha da peça, campos de mídia paga (objetivo, público, verba,
  período, título, CTA), métricas quando já publicada, e as mídias na ordem.
- **Histórico** — a linha do tempo completa: quem criou, quem comentou, quem
  escolheu a legenda, quem aprovou e quando.

**Comentar no ponto:** clique no botão e depois em qualquer lugar da peça. O
marcador fica gravado nas coordenadas relativas da mídia — abre no mesmo lugar em
qualquer tela, e o comentário guarda em qual imagem do carrossel foi feito.

## Outras telas

- **Painel** — o que espera por você, o funil por estado, a atividade da equipe e
  as próximas publicações.
- **Postagens** — três leituras dos mesmos dados: **Quadro** (kanban, arrastável
  para mudar de estado), **Grade** e **Lista**. Filtros por rede, por estado e
  "só o que espera por mim".
- **Calendário** — mês inteiro; arraste uma peça de um dia para outro para
  reagendar.
- **Compositor** — rede, formato, mídias (arrastar-e-soltar, acervo do projeto,
  reordenação do carrossel), variações de legenda, primeiro comentário, campos de
  anúncio, agenda, etiquetas e um recado para quem vai aprovar. A pré-visualização
  ao lado acompanha o que você digita.
- **Ajustes** — níveis de aprovação, temas, pessoas, exportação e restauração.

## Atalhos

| Tecla | Ação |
|---|---|
| `Ctrl/⌘ + K` | paleta de comandos (navegar e abrir peças) |
| `/` | buscar |
| `N` | nova postagem (admin) |
| `G` / `P` | painel / postagens |
| `←` `→` | trocar a mídia do carrossel na tela de aprovação |
| `Ctrl/⌘ + Z` | desfazer exclusão |
| `Ctrl/⌘ + Enter` | enviar o comentário que está escrevendo |
| `Esc` | fechar modal / sair do modo marcador |

## Como está construído

Sem framework e sem build — a mesma stack do site do parque.

```
.
├── index.html
├── assets/             renders do parque usados na demonstração
├── css/
│   ├── tokens.css      design system: cor, tipo, espaço, raio, sombra, motion
│   ├── app.css         casca, componentes e telas
│   └── previews.css    molduras de celular/navegador e o visual de cada rede
└── js/
    ├── util.js         DOM, ícones, datas, animação, redimensionamento de imagem
    ├── seed.js         catálogo (redes, formatos, estados) + massa de demonstração
    ├── store.js        estado único, persistência e todas as ações nomeadas
    ├── previews.js     renderização fiel de Instagram / Facebook / LinkedIn / Ads
    ├── ui.js           peças reutilizáveis (cartão, modal, toast, segmentado)
    ├── views.js        painel, postagens, calendário, aprovação, compositor, ajustes
    └── app.js          roteador por hash, navegação, atalhos, paleta
```

Toda mutação passa por uma ação de `store.js`, que persiste e emite
`aprova:change`; a interface se redesenha a partir do estado. É o que mantém o
histórico auditável e permite o desfazer.

### Design

Preto profundo com laranja incandescente, degradês, vidro e brilho volumétrico.
Tokens em `css/tokens.css` — trocar a marca é trocar `--brand` e derivados.
Movimento com CSS/WAAPI, sempre sob `prefers-reduced-motion`. Alvos de toque de
no mínimo 40px, foco visível, `aria-*` nos controles, e uma barra inferior de
navegação no celular para o polegar alcançar.

## Limites desta versão

- **É uma simulação de layout**, não a rede real: as prévias reconstroem a
  moldura de cada plataforma, que muda com frequência.
- **Não publica.** O agendamento registra o compromisso combinado; a publicação
  em si continua na ferramenta de postagem.
- **Dados locais.** Sem servidor, cada navegador tem a sua cópia — não há
  colaboração entre máquinas. É o passo natural seguinte: uma API e autenticação
  de verdade, com link de convidado para o aprovador (sem exigir conta).
- Mídia enviada é reduzida para caber no `localStorage`; vídeos grandes podem
  estourar a cota (o app avisa).
