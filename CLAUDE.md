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

## Idioma

Interface e código em **português do Brasil**, incluindo nomes de funções internas
e comentários. Não há i18n nesta ferramenta (o site institucional tem; aqui não).

## Limites conhecidos

- Não publica de fato: o agendamento registra o compromisso combinado.
- Dados locais por navegador, sem colaboração entre máquinas. O passo seguinte
  natural é uma API com autenticação e link de convidado para o aprovador.
- Mídia enviada é reduzida para caber na cota do `localStorage`; vídeo grande
  ainda estoura (o app avisa em `aprova:quota`).
