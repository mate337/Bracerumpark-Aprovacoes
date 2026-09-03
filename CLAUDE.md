# APROVA — aprovação de mídias sociais

Aplicativo web para o fluxo **criar → revisar → aprovar → agendar** de postagens de
Instagram, Facebook, LinkedIn e mídia paga. Cliente: **Bracerum Park** (cidade
industrial multiuso em Villeta, Paraguai) — mas a ferramenta é genérica; a marca
está isolada em `js/seed.js` (`BRAND`) e nos tokens de cor.

Nasceu dentro do repositório do site (`mate337/BracerumPark`, pasta `aprovacoes/`)
e foi separado para cá. **Não é o site institucional** — as regras de design daquele
projeto (paleta bege/marrom, cantos quadrados, zero vermelho) **não valem aqui**.

## Regras de design desta ferramenta

Referências que o cliente passou: painéis escuros com laranja incandescente,
degradês, vidro (glass), cantos arredondados, sensação futurista.

- Paleta: preto profundo (`--bg-base #0d0906`) + laranja (`--brand #ff6a1a`).
  Verde/âmbar/rosa aparecem **só como semântica de estado** (aprovado, em revisão,
  alterações) — não como cor decorativa.
- Tipografia: **Inter** (interface) + **Sora** (títulos), via Google Fonts.
- Cantos arredondados, sombras longas, brilho volumétrico de fundo (`.atmos`).
- Todo o sistema vive em `css/tokens.css`. Trocar de marca é trocar `--brand` e
  derivados — nada de cor solta no CSS de componente.
- Movimento em CSS/WAAPI, sempre sob `prefers-reduced-motion`.

## Stack

Sem framework e sem build, de propósito: HTML + CSS + JS de navegador. Nenhuma
dependência em runtime além das fontes.

```
index.html
assets/          renders do parque usados na demonstração
css/tokens.css   design system (cor, tipo, espaço, raio, sombra, motion)
css/app.css      casca, componentes e telas
css/previews.css molduras de celular/navegador + o visual de cada rede social
js/util.js       DOM, ícones SVG, datas, animação, redimensionamento de imagem
js/seed.js       catálogo (redes, formatos, estados) + massa de demonstração
js/store.js      estado único, persistência em localStorage, ações nomeadas
js/previews.js   renderização fiel de Instagram / Facebook / LinkedIn / Ads
js/ui.js         peças reutilizáveis (cartão, modal, toast, segmentado)
js/views.js      painel, postagens, calendário, aprovação, compositor, ajustes
js/app.js        roteador por hash, navegação, atalhos, paleta de comandos
```

## Arquitetura — o que não quebrar

- **Toda mutação passa por uma ação de `js/store.js`**, que persiste e emite
  `aprova:change`; a interface se redesenha a partir do estado. É isso que mantém o
  histórico auditável e permite o desfazer. Não altere `state` de dentro de uma view.
- O **compositor** guarda o rascunho em `App.state.draft` (não no store) para o
  texto não se perder a cada redesenho. Ao salvar, limpe as chaves `__for` e
  `__libOpen`.
- `js/previews.js` reconstrói a **moldura** de cada rede — não é a rede real. Os
  cortes de legenda (125 / 280 / 210 caracteres) e as proporções são de propósito:
  é o que o aprovador está julgando.
- Ícones: `U.icon(nome)` devolve SVG **com `width`/`height` como atributo**. Isso
  evita ícone gigante onde não há regra de CSS; qualquer regra de CSS continua
  vencendo. Ao adicionar um ícone novo, siga o traçado 24×24, stroke 1.8.
- Em grades CSS use `minmax(0, 1fr)` nas linhas/colunas que precisam encolher —
  `auto` mede o conteúdo e estoura o painel (foi a origem de vários defeitos).

## Decisões que já foram tomadas

- **Uma peça vai para N redes** (`post.networks: []`), com uma aprovação só. Não
  existe `post.network` no singular — o preview desenha uma rede por vez via
  `Preview.render(p, { net })`.
- **Patrocinado é `post.sponsored`**, uma marcação da peça, não uma rede.
- **Aprovação em paralelo**: `post.levels` sai dos aprovadores escolhidos no
  compositor; `settings.approvalMode` (`'todos'` | `'qualquer'`) decide quando a
  peça fica aprovada. Use `Store.canDecide(p)` / `Store.myLevel(p)` — nunca
  compare `currentLevel().approverId` na mão.
- **Acesso por e-mail cadastrado** (`Store.userByEmail`), sem senha. Isso
  identifica, não autentica — não escreva nada que sugira o contrário.
- **Sem massa de demonstração**: `SEED.POSTS` é `[]` de propósito. As telas
  precisam ter estado vazio decente.
- O preview é **auto-suficiente**: `previews.js` liga o carrossel (setas, pontos,
  arrasto) e o “ver mais” no próprio nó, e avisa quem chamou por `onSlide` /
  `onExpand`. Não religue esses eventos de fora — foi assim que o carrossel
  funcionou no compositor sem código novo.
- `.pin-layer` fica com `pointer-events: none` e só recebe clique quando armada.
  Sem isso ela cobre a mídia e engole as setas do carrossel.

## Sincronização

`js/cloud.js` fala com um projeto Supabase por REST (sem SDK, sem dependência).
**Não é opcional e não existe modo local.** Com `config.js` vazio, `desenhar()`
mostra a tela de instalação (`telaInstalacao`) e nada mais roda — nem o login.
Se for mexer nisso, mantenha a rota de resgate: a tela oferece baixar o que já
existe no navegador antes de qualquer coisa, e a conexão migra as mídias em
base64 sozinha.

- O recorte compartilhado é `Store.syncDoc()` — tudo menos `settings` e
  `currentUserId`, que são preferências de cada pessoa.
- `Store.mergeRemote(doc)` junta **por peça**, pela `updatedAt` mais recente.
  Exclusões viram lápide em `state.deleted` para não ressuscitarem.
- Toda `emit()` agenda um envio (`pushSoon`, 1,2 s de folga). Não chame `push`
  direto de uma view.
- Mídia enviada pelo usuário nasce como `data:` URL. `Store.migrarMidias()` sobe
  para o Storage e troca o `src` — é o que resolve "a imagem só aparece para
  mim" sem ninguém reenviar arquivo. O bucket precisa ser **público para
  leitura**, senão o `<img>` não carrega (não dá para mandar header em `<img>`).
- O SQL de instalação vive em `App.SQL_SUPABASE`, em `js/app.js`, e é o mesmo
  texto que o botão "Copiar o SQL" entrega. Uma cópia fica em
  `supabase/instalacao.sql` — se mudar um, gere o outro a partir dele.
- O projeto é o **BracerumParkAprova** (`kddungxbtibpzcphmtna`). A URL já está em
  `config.js`; só a chave anon fica de fora, porque exige o painel do Supabase.
- `.mcp.json` registra o servidor MCP do Supabase para sessões locais do Claude
  Code. Ele exige autenticação por OAuth (`claude /mcp`), que não roda em sessão
  remota — não conte com ele aqui.
- A flag `instalando` em `js/app.js` impede que um `aprova:change` disparado
  pela própria conexão redesenhe por cima da tela de instalação antes de a
  pessoa copiar o `config.js`.
- Sem rede o aplicativo segue funcionando com o cache e sobe depois; isso é
  resiliência, não "modo local" — não reintroduza a ideia na interface.

## Idioma

Interface e código em **português do Brasil**, incluindo nomes de funções internas
e comentários. Não há i18n nesta ferramenta (o site institucional tem; aqui não).

## Limites conhecidos

- Não publica de fato: o agendamento registra o compromisso combinado.
- Dados locais por navegador, sem colaboração entre máquinas. O passo seguinte
  natural é uma API com autenticação e link de convidado para o aprovador.
- Mídia enviada é reduzida para caber na cota do `localStorage`; vídeo grande
  ainda estoura (o app avisa em `aprova:quota`).
