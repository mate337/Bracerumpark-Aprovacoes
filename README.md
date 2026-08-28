# APROVA — aprovação de mídias sociais

Aplicativo web para o ciclo **criar → revisar → aprovar → agendar** de postagens de
Instagram, Facebook e LinkedIn, com ou sem impulsionamento. Roda sem servidor, sem
build e sem dependência externa.

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

## Entrar

O acesso é por **e-mail cadastrado**. As contas desta instalação estão em
`js/seed.js` (`USERS`):

| E-mail | Papel |
|---|---|
| `matheus337.martins@gmail.com` | Administrador |
| `sydney@bracerum.com` | Aprovador |
| `cleber@bracerum.com` | Aprovador |

**Não há senha.** O e-mail diz *quem* está revisando, para assinar as decisões e
os comentários — ele não autentica ninguém, e qualquer pessoa com o link e um
e-mail da lista entra. Para uso fora de uma equipe de confiança, o passo é o
mesmo já citado nos limites: uma API com autenticação de verdade.

Para mudar a lista, edite `USERS` em `js/seed.js` e, no navegador, use
**Ajustes → Restaurar demonstração** (o estado guardado tem uma cópia das contas).

## Os dois lados

| | **Administrador** | **Aprovador** |
|---|---|---|
| Cria peças, escolhe as redes, sobe mídia | ✓ | — |
| Escreve variações de legenda | ✓ | sugere redação |
| Vê rascunhos | ✓ | — |
| Escolhe a legenda que vai ao ar | ✓ | ✓ |
| Comenta e marca pontos na peça | ✓ | ✓ |
| Notas internas (invisíveis ao cliente) | ✓ | — |
| Aprova / pede alterações | quando é seu nível | ✓ |
| Arrasta no quadro e no calendário | ✓ | — |

Dá para trocar de conta pelo rodapé do menu — é o jeito de ver a mesma peça pelos
dois lados.

## Uma peça, várias redes

No compositor você marca **quantas redes quiser**: a mesma publicação vai para
Instagram, Facebook e LinkedIn com **uma aprovação só**. A pré-visualização traz um
seletor para ver cada rede separadamente, e a lista de formatos mostra apenas o que
existe em todas as redes marcadas — Reels e Story, por exemplo, só aparecem quando
o Instagram está sozinho. Os contadores de caractere e hashtag passam a valer pelo
**limite mais apertado** entre as redes escolhidas, e dizem qual delas aperta.

**Patrocinado** deixou de ser uma rede e virou uma marcação da peça: uma chave que
abre objetivo, público, verba, período, título, descrição e CTA — e vale para todas
as redes marcadas.

## O fluxo

```
Rascunho → Em revisão → (Alterações solicitadas ⟲) → Aprovado → Agendado → Publicado
```

Ao criar a peça o administrador escolhe **quem precisa aprovar**. Os níveis correm
em paralelo: cada aprovador decide quando quiser, sem esperar a vez. Em
**Ajustes → Fluxo de aprovação** você define quando a peça está aprovada:

- **Todos assinam** — a peça só fica aprovada quando todos os escolhidos aprovarem.
- **Basta um** — a primeira aprovação libera a peça e fecha os outros níveis.

## A tela de aprovação

O centro do produto. À esquerda, a peça renderizada como vai aparecer:

- **Rede:** quando a peça vai para mais de uma, um seletor troca qual está sendo
  revisada — a mesma legenda dentro da moldura de cada plataforma.
- **Contexto:** `Feed` (o post na timeline) ou `Perfil`
  (a grade do Instagram, a página do Facebook/LinkedIn — para julgar o conjunto,
  não só a peça isolada).
- **Dispositivo:** `Mobile` (moldura de celular, 390×844) ou `Desktop` (janela de
  navegador com as colunas reais de cada rede).
- **Tema da rede:** claro ou escuro, porque o feed do leitor pode ser qualquer um.

**A moldura é funcional, não uma imagem.** O carrossel anda de verdade: setas,
pontinhos clicáveis, contador, e arrasto lateral no dedo ou no mouse. O "… mais"
abre a legenda inteira ali dentro (e "menos" fecha). Os cortes são os reais —
~125 caracteres no Instagram, ~280 no Facebook, ~210 no LinkedIn. Vídeo tem play,
duração e ícone de som. Peça patrocinada ganha o cartão de CTA da rede e o rótulo
"Patrocinado"/"Promovido".

À direita, quatro abas:

- **Legendas** — as variações lado a lado, cada uma com contador de caracteres e
  de hashtags no limite mais apertado entre as redes da peça. O aprovador clica na que prefere; a escolha fica
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
  as próximas publicações. Numa instalação nova ele convida a criar a primeira peça.
- **Postagens** — três leituras dos mesmos dados: **Quadro** (kanban, arrastável
  para mudar de estado), **Grade** e **Lista**. Filtros por rede, por estado e
  "só o que espera por mim".
- **Calendário** — mês inteiro; arraste uma peça de um dia para outro para
  reagendar.
- **Compositor** — redes (uma ou várias), chave de patrocinado, formato, mídias
  (arrastar-e-soltar, acervo do projeto, reordenação do carrossel), variações de
  legenda, primeiro comentário, campos de anúncio, quem precisa aprovar, agenda,
  etiquetas e um recado para quem vai aprovar. A pré-visualização
  ao lado acompanha o que você digita.
- **Ajustes** — modo de aprovação, temas, contas, exportação e restauração.

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
  colaboração entre máquinas, e o e-mail identifica sem autenticar. É o passo
  natural seguinte: uma API e autenticação de verdade, com link de convidado
  para o aprovador (sem exigir conta).
- **A ferramenta começa vazia.** Não há conteúdo de demonstração: as peças são as
  que a equipe criar. O acervo de renders do parque continua disponível no
  compositor.
- Mídia enviada é reduzida para caber no `localStorage`; vídeos grandes podem
  estourar a cota (o app avisa).
