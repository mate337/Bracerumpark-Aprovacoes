/* ==========================================================================
   APROVA — catálogo fixo (redes, estados) + massa de demonstração
   ========================================================================== */
(function (global) {
  'use strict';

  /* --------------------------------------------------------- as redes --- */
  const NETWORKS = {
    instagram: {
      id: 'instagram', name: 'Instagram', handle: '@bracerumpark', icon: 'instagram',
      capMax: 2200, hashSoft: 10, hashMax: 30, firstComment: true,
      formats: ['single', 'carousel', 'reels', 'story'],
      note: 'Legenda corta em ~125 caracteres na primeira linha do feed.',
    },
    facebook: {
      id: 'facebook', name: 'Facebook', handle: 'Bracerum Park', icon: 'facebook',
      capMax: 63206, hashSoft: 3, hashMax: 30, firstComment: false,
      formats: ['single', 'carousel', 'video'],
      note: 'Texto corta em ~280 caracteres com “Ver mais”.',
    },
    linkedin: {
      id: 'linkedin', name: 'LinkedIn', handle: 'Bracerum Park', icon: 'linkedin',
      capMax: 3000, hashSoft: 5, hashMax: 20, firstComment: false,
      formats: ['single', 'carousel', 'video'],
      note: 'Texto corta em ~210 caracteres. Tom institucional, sem excesso de hashtag.',
    },
    ads: {
      id: 'ads', name: 'Patrocinado', handle: 'Campanha', icon: 'megaphone',
      capMax: 2200, hashSoft: 3, hashMax: 10, firstComment: false,
      formats: ['single', 'carousel', 'video'],
      note: 'Peça paga: exige título, descrição, CTA, objetivo, público e verba.',
    },
  };

  const FORMATS = {
    single:   { id: 'single',   name: 'Imagem única', icon: 'image',  ratio: { instagram: '4:5', facebook: '1.91', linkedin: '1.91', ads: '1.91' } },
    carousel: { id: 'carousel', name: 'Carrossel',    icon: 'layers', ratio: { instagram: '1',   facebook: '1',    linkedin: '1',    ads: '1' } },
    video:    { id: 'video',    name: 'Vídeo',        icon: 'video',  ratio: { instagram: '4:5', facebook: '16:9', linkedin: '16:9', ads: '16:9' } },
    reels:    { id: 'reels',    name: 'Reels',        icon: 'reels',  ratio: { instagram: '9:16', facebook: '9:16', linkedin: '9:16', ads: '9:16' } },
    story:    { id: 'story',    name: 'Story',        icon: 'story',  ratio: { instagram: '9:16', facebook: '9:16', linkedin: '9:16', ads: '9:16' } },
  };

  const STATUSES = {
    rascunho:   { id: 'rascunho',   name: 'Rascunho',              short: 'Rascunho',   icon: 'edit' },
    revisao:    { id: 'revisao',    name: 'Aguardando aprovação',  short: 'Em revisão', icon: 'clock' },
    alteracoes: { id: 'alteracoes', name: 'Alterações solicitadas',short: 'Alterações', icon: 'refresh' },
    aprovado:   { id: 'aprovado',   name: 'Aprovado',              short: 'Aprovado',   icon: 'checkCircle' },
    agendado:   { id: 'agendado',   name: 'Agendado',              short: 'Agendado',   icon: 'calendar' },
    publicado:  { id: 'publicado',  name: 'Publicado',             short: 'Publicado',  icon: 'globe' },
  };
  const STATUS_ORDER = ['rascunho', 'revisao', 'alteracoes', 'aprovado', 'agendado', 'publicado'];

  const OBJECTIVES = ['Reconhecimento', 'Alcance', 'Tráfego', 'Engajamento', 'Geração de leads', 'Conversão', 'Mensagens'];
  const CTAS = ['Saiba mais', 'Fale conosco', 'Cadastre-se', 'Baixar', 'Ver oferta', 'Enviar mensagem', 'Solicitar proposta'];

  /* ------------------------------------------------------------ gente --- */
  const USERS = [
    { id: 'u_ana',   name: 'Ana Ribeiro',    role: 'admin',    title: 'Social media · Bracerum', color: 'linear-gradient(135deg,#ff8a3d,#d2440a)', photo: '' },
    { id: 'u_caio',  name: 'Caio Nunes',     role: 'admin',    title: 'Designer',                color: 'linear-gradient(135deg,#7c5cff,#3b1fa8)', photo: '' },
    { id: 'u_marta', name: 'Marta Vilalba',  role: 'approver', title: 'Diretora de Marketing',   color: 'linear-gradient(135deg,#2fd39a,#0e7a5a)', photo: '' },
    { id: 'u_paulo', name: 'Paulo D. Souza', role: 'approver', title: 'Conselho · Bracerum',     color: 'linear-gradient(135deg,#6aa6ff,#1a49b8)', photo: '' },
  ];

  /* ------------------------------------------------------------ marca --- */
  const BRAND = {
    name: 'Bracerum Park',
    avatar: 'assets/renders/masterplan-implantacao.jpg',
    cover: 'assets/web/vista-aerea-park.jpg',
    handles: { instagram: 'bracerumpark', facebook: 'Bracerum Park', linkedin: 'Bracerum Park' },
    headline: 'Cidade industrial multiuso · Villeta, Paraguai',
    followers: { instagram: 18400, facebook: 9260, linkedin: 12730 },
    site: 'bracerumpark.com',
  };

  /* ---------------------------------------------------------- acervo ---- */
  const R = 'assets/renders/';
  const LIBRARY = [
    { id: 'm1',  src: R + 'hotel-convencoes-noturna.jpg', alt: 'Hotel e centro de convenções à noite' },
    { id: 'm2',  src: R + 'fabrica-bracerum-noturna.jpg',  alt: 'Galpão industrial iluminado à noite' },
    { id: 'm3',  src: R + 'centro-empresarial-1.jpg',      alt: 'Centro empresarial do parque' },
    { id: 'm4',  src: R + 'centro-empresarial-2.jpg',      alt: 'Centro empresarial, vista lateral' },
    { id: 'm5',  src: R + 'escritorios-1.jpg',             alt: 'Torre de escritórios' },
    { id: 'm6',  src: R + 'escritorios-2.jpg',             alt: 'Escritórios, praça de acesso' },
    { id: 'm7',  src: R + 'clube-bracerum-1.jpg',          alt: 'Clube do parque' },
    { id: 'm8',  src: R + 'clube-bracerum-2.jpg',          alt: 'Clube, área de piscina' },
    { id: 'm9',  src: R + 'condominio-casa-fachada.jpg',   alt: 'Fachada de casa do condomínio' },
    { id: 'm10', src: R + 'eventos-gastronomia-1.jpg',     alt: 'Praça de eventos e gastronomia' },
    { id: 'm11', src: R + 'eventos-gastronomia-2.jpg',     alt: 'Restaurantes do parque' },
    { id: 'm12', src: R + 'comercial-servicos-1.jpg',      alt: 'Área comercial e de serviços' },
    { id: 'm13', src: R + 'pavilhao-eventos-1.jpg',        alt: 'Pavilhão de eventos' },
    { id: 'm14', src: R + 'rodovia-acesso.jpg',            alt: 'Rodovia de acesso ao parque' },
    { id: 'm15', src: R + 'masterplan-implantacao.jpg',    alt: 'Masterplan de implantação' },
    { id: 'm16', src: 'assets/web/vista-aerea-park.jpg',alt: 'Vista aérea do parque' },
    { id: 'm17', src: 'assets/web/hero-hotel-noturno.jpg', alt: 'Render noturno do hotel' },
    { id: 'm18', src: 'assets/pois/terport-villeta.jpg',alt: 'Terminal portuário de Villeta' },
    { id: 'm19', src: 'assets/pois/porto-assuncao.jpg', alt: 'Porto de Assunção' },
    { id: 'm20', src: 'assets/pois/itaipu.jpg',         alt: 'Usina de Itaipu' },
  ];
  const byId = (id) => LIBRARY.find((m) => m.id === id) || LIBRARY[0];
  const img = (id) => ({ id: 'md_' + id, type: 'image', src: byId(id).src, alt: byId(id).alt });
  const vid = (id, dur) => ({ id: 'md_v' + id, type: 'video', src: byId(id).src, alt: byId(id).alt, duration: dur, poster: byId(id).src });

  /* ------------------------------------------------------------ tempo --- */
  const DAY = 864e5;
  const now = Date.now();
  const t = (d, h = 10, m = 0) => {
    const x = new Date(now + d * DAY);
    x.setHours(h, m, 0, 0);
    return x.toISOString();
  };

  let seq = 0;
  const code = () => `BP-${String(++seq).padStart(3, '0')}`;

  const cap = (label, text, author = 'u_ana') => ({
    id: 'cap_' + Math.random().toString(36).slice(2, 8), label, text, author, createdAt: t(-3, 9),
  });

  /* --------------------------------------------------------- postagens -- */
  const POSTS = [
    {
      id: 'p1', code: code(), network: 'instagram', format: 'carousel',
      title: 'Carrossel — Centro empresarial em obras',
      media: [img('m3'), img('m4'), img('m5'), img('m12')],
      captions: [
        cap('Opção A', 'O centro empresarial do Bracerum Park já tem contorno.\n\nQuatro lajes corporativas, praça técnica e estacionamento integrado ao eixo logístico do parque — a 23 km do porto de Villeta.\n\nQuem opera no Mercosul sabe o que isso significa em frete.\n\n#BracerumPark #Paraguai #Mercosul #ZonaIndustrial'),
        cap('Opção B', 'Não é maquete. É cronograma.\n\nO centro empresarial do Bracerum Park entra na fase de estrutura — e com ele, o endereço corporativo mais bem conectado de Villeta.\n\n📍 23 km do porto · 45 min de Assunção\n\n#BracerumPark #Villeta #Investimento'),
      ],
      chosenCaption: null, firstComment: '#Villeta #Assuncao #IndustriaParaguai #Logistica',
      status: 'revisao', priority: 'alta', tags: ['Institucional', 'Obras'],
      scheduledAt: t(2, 9, 30), createdBy: 'u_ana', createdAt: t(-2, 14), updatedAt: t(-0.2, 16),
      note: 'Marta, precisamos definir a legenda até quinta — o carrossel entra na campanha de setembro.',
      levels: [
        { name: 'Revisão interna', approverId: 'u_ana', status: 'aprovado', at: t(-2, 15) },
        { name: 'Aprovação do cliente', approverId: 'u_marta', status: 'pendente', at: null },
      ],
      activity: [
        { id: 'a1', kind: 'system', authorId: 'u_ana', at: t(-2, 14), text: 'criou a postagem' },
        { id: 'a2', kind: 'comment', authorId: 'u_ana', at: t(-2, 14, 20), text: 'Subi duas opções de legenda. A “B” é mais curta e testa o gancho “Não é maquete. É cronograma.” Qual vocês preferem?', internal: false, resolved: false, replies: [] },
        { id: 'a3', kind: 'change', authorId: 'u_marta', at: t(-1, 11), text: 'A terceira imagem está com a fachada muito escura — dá para clarear? No feed vai sumir ao lado das outras.', internal: false, resolved: false, pin: { mediaIndex: 2, x: 52, y: 61 }, replies: [{ id: 'r1', authorId: 'u_caio', at: t(-1, 12), text: 'Refaço o render com +1 stop de exposição hoje ainda.' }] },
        { id: 'a4', kind: 'comment', authorId: 'u_paulo', at: t(-0.4, 9), text: 'Gosto da B. Só tirem o emoji do pin — nosso tom no institucional é mais sóbrio.', internal: false, resolved: false, replies: [] },
      ],
    },
    {
      id: 'p2', code: code(), network: 'linkedin', format: 'single',
      title: 'Artigo — Regime maquila e carga tributária',
      media: [img('m2')],
      captions: [
        cap('Única', 'Por que uma indústria brasileira instala operação no Paraguai?\n\nA resposta curta é 10%. A longa envolve o regime de maquila, o acesso ao Mercosul sem tarifa e um custo de energia que, no Bracerum Park, chega direto da linha de Itaipu.\n\nPublicamos um comparativo completo de carga tributária entre operar no Brasil e operar em Villeta. Link nos comentários.\n\n#Maquila #Mercosul #IndustriaParaguai'),
      ],
      chosenCaption: 0, link: 'https://bracerumpark.com/tributacao',
      status: 'aprovado', priority: 'normal', tags: ['Tributação', 'Conteúdo'],
      scheduledAt: t(1, 8, 0), createdBy: 'u_ana', createdAt: t(-5, 10), updatedAt: t(-1, 18),
      note: '',
      levels: [
        { name: 'Revisão interna', approverId: 'u_ana', status: 'aprovado', at: t(-4, 9) },
        { name: 'Aprovação do cliente', approverId: 'u_marta', status: 'aprovado', at: t(-1, 18) },
      ],
      activity: [
        { id: 'b1', kind: 'system', authorId: 'u_ana', at: t(-5, 10), text: 'criou a postagem' },
        { id: 'b2', kind: 'comment', authorId: 'u_marta', at: t(-2, 15), text: 'Texto excelente. Só confirmem com o jurídico que podemos citar o número de 10% sem ressalva.', internal: false, resolved: true, replies: [{ id: 'b2r', authorId: 'u_ana', at: t(-2, 16), text: 'Confirmado — é a alíquota nominal do regime, já com a nota de rodapé no artigo.' }] },
        { id: 'b3', kind: 'approve', authorId: 'u_marta', at: t(-1, 18), text: 'Aprovado. Pode subir na terça, 8h.' },
      ],
    },
    {
      id: 'p3', code: code(), network: 'ads', adPlatform: 'instagram', format: 'single',
      title: 'Campanha Setembro — Lotes industriais',
      media: [img('m16')],
      captions: [
        cap('Opção A', 'Seu galpão no Mercosul começa aqui.\n\nLotes industriais a partir de 5.000 m² em Villeta, Paraguai — energia de Itaipu, porto a 23 km e regime de maquila.'),
        cap('Opção B', '10% de carga tributária. 23 km do porto. Energia de Itaipu.\n\nO Bracerum Park está com lotes industriais disponíveis. Fale com nosso time.'),
      ],
      chosenCaption: null,
      ad: { objective: 'Geração de leads', audience: 'Indústria BR · decisores · 35-60 · SP/PR/SC/RS', budget: 12000, period: '01/09 → 30/09', headline: 'Lotes industriais em Villeta', description: 'Regime de maquila · Porto a 23 km', domain: 'bracerumpark.com', cta: 'Saiba mais' },
      status: 'alteracoes', priority: 'alta', tags: ['Performance', 'Setembro'],
      scheduledAt: t(4, 7, 0), createdBy: 'u_caio', createdAt: t(-3, 11), updatedAt: t(-0.5, 10),
      note: 'Verba de setembro já aprovada pelo financeiro. Falta o ok criativo.',
      levels: [
        { name: 'Revisão interna', approverId: 'u_ana', status: 'aprovado', at: t(-3, 12) },
        { name: 'Aprovação do cliente', approverId: 'u_paulo', status: 'alteracoes', at: t(-0.5, 10) },
      ],
      activity: [
        { id: 'c1', kind: 'system', authorId: 'u_caio', at: t(-3, 11), text: 'criou a postagem' },
        { id: 'c2', kind: 'change', authorId: 'u_paulo', at: t(-0.5, 10), text: 'A foto aérea não vende. Nessa campanha o comprador quer ver galpão pronto, não terreno. Trocar pelo render da fábrica noturna e refazer o título: “Galpão pronto para operar em 2027”.', internal: false, resolved: false, pin: { mediaIndex: 0, x: 44, y: 48 }, replies: [] },
        { id: 'c3', kind: 'comment', authorId: 'u_ana', at: t(-0.3, 11), text: 'Faz sentido. Caio, sobe a variação com a fábrica e mantém esta como B para teste A/B.', internal: true, resolved: false, replies: [] },
      ],
    },
    {
      id: 'p4', code: code(), network: 'instagram', format: 'reels',
      title: 'Reels — Sobrevoo do masterplan',
      media: [vid('m16', 28)],
      captions: [
        cap('Opção A', '1.200 hectares vistos de cima. 🛩️\n\nO Bracerum Park em 28 segundos: eixo logístico, área industrial, centro empresarial, clube e o condomínio residencial.\n\n#BracerumPark #Villeta #Paraguai'),
        cap('Opção B', 'Do porto ao galpão, sem sair do parque.\n\nSobrevoo do Bracerum Park: 1.200 hectares de cidade industrial multiuso a 45 minutos de Assunção.\n\n#Mercosul #Logistica #Industria'),
      ],
      chosenCaption: null,
      status: 'revisao', priority: 'normal', tags: ['Vídeo', 'Institucional'],
      scheduledAt: t(3, 18, 30), createdBy: 'u_caio', createdAt: t(-1, 16), updatedAt: t(-1, 16),
      note: 'Trilha ainda provisória — se aprovarem o corte, licencio a definitiva.',
      levels: [
        { name: 'Revisão interna', approverId: 'u_ana', status: 'aprovado', at: t(-1, 17) },
        { name: 'Aprovação do cliente', approverId: 'u_marta', status: 'pendente', at: null },
      ],
      activity: [
        { id: 'd1', kind: 'system', authorId: 'u_caio', at: t(-1, 16), text: 'criou a postagem' },
        { id: 'd2', kind: 'comment', authorId: 'u_caio', at: t(-1, 16, 10), text: 'Corte de 28s. Os 3 primeiros segundos são o gancho — se acharem lento, corto para 22s.', internal: false, resolved: false, replies: [] },
      ],
    },
    {
      id: 'p5', code: code(), network: 'facebook', format: 'single',
      title: 'Post — Clube e qualidade de vida',
      media: [img('m7')],
      captions: [cap('Única', 'Quem trabalha no parque também mora no parque.\n\nO clube do Bracerum Park tem piscina, quadras, academia e restaurante — a 5 minutos das áreas industriais. Porque produtividade também se mede fora do turno.')],
      chosenCaption: 0,
      status: 'agendado', priority: 'baixa', tags: ['Lifestyle'],
      scheduledAt: t(5, 12, 0), createdBy: 'u_ana', createdAt: t(-6, 9), updatedAt: t(-3, 14),
      levels: [
        { name: 'Revisão interna', approverId: 'u_ana', status: 'aprovado', at: t(-6, 10) },
        { name: 'Aprovação do cliente', approverId: 'u_marta', status: 'aprovado', at: t(-3, 14) },
      ],
      activity: [
        { id: 'e1', kind: 'system', authorId: 'u_ana', at: t(-6, 9), text: 'criou a postagem' },
        { id: 'e2', kind: 'approve', authorId: 'u_marta', at: t(-3, 14), text: 'Aprovado sem alterações.' },
      ],
    },
    {
      id: 'p6', code: code(), network: 'linkedin', format: 'carousel',
      title: 'Carrossel — 5 razões para operar em Villeta',
      media: [img('m14'), img('m18'), img('m20'), img('m2'), img('m15')],
      captions: [cap('Única', '5 razões pelas quais indústrias brasileiras estão escolhendo Villeta:\n\n1. Regime de maquila — 10% sobre o valor agregado\n2. Porto próprio a 23 km, com saída pela Hidrovia Paraguai-Paraná\n3. Energia de Itaipu, entre as mais baratas do continente\n4. Livre circulação no Mercosul\n5. Mão de obra jovem e custo competitivo\n\nO Bracerum Park reúne as cinco no mesmo endereço.\n\n#Mercosul #Maquila #Industria')],
      chosenCaption: 0,
      status: 'rascunho', priority: 'normal', tags: ['Conteúdo', 'Educativo'],
      scheduledAt: null, createdBy: 'u_ana', createdAt: t(-0.3, 15), updatedAt: t(-0.3, 15),
      levels: [
        { name: 'Revisão interna', approverId: 'u_ana', status: 'pendente', at: null },
        { name: 'Aprovação do cliente', approverId: 'u_marta', status: 'pendente', at: null },
      ],
      activity: [{ id: 'f1', kind: 'system', authorId: 'u_ana', at: t(-0.3, 15), text: 'criou a postagem' }],
    },
    {
      id: 'p7', code: code(), network: 'instagram', format: 'single',
      title: 'Post — Pavilhão de eventos entregue',
      media: [img('m13')],
      captions: [cap('Única', 'O pavilhão de eventos do Bracerum Park está entregue.\n\n2.400 m² livres de coluna para feiras, convenções e lançamentos — no meio da maior cidade industrial multiuso do Paraguai.\n\n#BracerumPark #Eventos #Villeta')],
      chosenCaption: 0,
      status: 'publicado', priority: 'normal', tags: ['Obras', 'Institucional'],
      scheduledAt: t(-4, 10, 0), createdBy: 'u_ana', createdAt: t(-9, 11), updatedAt: t(-4, 10),
      levels: [
        { name: 'Revisão interna', approverId: 'u_ana', status: 'aprovado', at: t(-8, 9) },
        { name: 'Aprovação do cliente', approverId: 'u_marta', status: 'aprovado', at: t(-6, 15) },
      ],
      activity: [
        { id: 'g1', kind: 'system', authorId: 'u_ana', at: t(-9, 11), text: 'criou a postagem' },
        { id: 'g2', kind: 'approve', authorId: 'u_marta', at: t(-6, 15), text: 'Aprovado.' },
      ],
      metrics: { reach: 41200, likes: 1870, comments: 63, saves: 214 },
    },
    {
      id: 'p8', code: code(), network: 'ads', adPlatform: 'linkedin', format: 'carousel',
      title: 'Campanha B2B — Decisores industriais',
      media: [img('m3'), img('m5'), img('m12')],
      captions: [
        cap('Opção A', 'Sua próxima planta industrial pode custar 40% menos em impostos.\n\nO Bracerum Park recebe indústrias brasileiras sob o regime de maquila paraguaio. Fale com nosso time de implantação.'),
        cap('Opção B', 'Instalar no Paraguai não é sobre imposto barato. É sobre estar dentro do Mercosul com custo de operação competitivo.\n\nConheça o Bracerum Park.'),
      ],
      chosenCaption: null,
      ad: { objective: 'Geração de leads', audience: 'Diretores industriais · BR · empresas 200+ func.', budget: 24000, period: '10/09 → 10/10', headline: 'Instale sua planta no Mercosul', description: 'Regime de maquila · Villeta, Paraguai', domain: 'bracerumpark.com', cta: 'Solicitar proposta' },
      status: 'revisao', priority: 'alta', tags: ['Performance', 'B2B'],
      scheduledAt: t(6, 8, 0), createdBy: 'u_caio', createdAt: t(-0.8, 17), updatedAt: t(-0.8, 17),
      note: 'Precisa do aval do Paulo antes de subir — verba acima de R$ 20 mil.',
      levels: [
        { name: 'Revisão interna', approverId: 'u_ana', status: 'aprovado', at: t(-0.7, 18) },
        { name: 'Aprovação do cliente', approverId: 'u_paulo', status: 'pendente', at: null },
      ],
      activity: [
        { id: 'h1', kind: 'system', authorId: 'u_caio', at: t(-0.8, 17), text: 'criou a postagem' },
        { id: 'h2', kind: 'comment', authorId: 'u_ana', at: t(-0.7, 18), text: 'Paulo, é a campanha que conversamos na reunião. Verba de R$ 24 mil, 30 dias, foco em lead qualificado.', internal: false, resolved: false, replies: [] },
      ],
    },
    {
      id: 'p9', code: code(), network: 'facebook', format: 'carousel',
      title: 'Carrossel — Condomínio residencial',
      media: [img('m9'), img('m8'), img('m10')],
      captions: [cap('Única', 'Morar a 5 minutos do trabalho, dentro de um parque de 1.200 hectares.\n\nO condomínio residencial do Bracerum Park tem casas prontas e lotes, com clube, escola e comércio no mesmo perímetro.')],
      chosenCaption: 0,
      status: 'alteracoes', priority: 'normal', tags: ['Residencial'],
      scheduledAt: t(7, 11, 0), createdBy: 'u_ana', createdAt: t(-4, 13), updatedAt: t(-2, 9),
      levels: [
        { name: 'Revisão interna', approverId: 'u_ana', status: 'aprovado', at: t(-4, 14) },
        { name: 'Aprovação do cliente', approverId: 'u_marta', status: 'alteracoes', at: t(-2, 9) },
      ],
      activity: [
        { id: 'i1', kind: 'system', authorId: 'u_ana', at: t(-4, 13), text: 'criou a postagem' },
        { id: 'i2', kind: 'change', authorId: 'u_marta', at: t(-2, 9), text: 'Não temos escola no perímetro ainda — está previsto na fase 2. Precisa sair da legenda, é informação que pode gerar problema comercial.', internal: false, resolved: false, replies: [] },
      ],
    },
    {
      id: 'p10', code: code(), network: 'instagram', format: 'story',
      title: 'Story — Bastidores da obra',
      media: [img('m2')],
      captions: [cap('Única', 'Segunda-feira, 6h47. A obra não para. 🏗️')],
      chosenCaption: 0,
      status: 'aprovado', priority: 'baixa', tags: ['Bastidores'],
      scheduledAt: t(0.4, 7, 0), createdBy: 'u_caio', createdAt: t(-1, 8), updatedAt: t(-0.6, 12),
      levels: [
        { name: 'Revisão interna', approverId: 'u_ana', status: 'aprovado', at: t(-1, 9) },
        { name: 'Aprovação do cliente', approverId: 'u_marta', status: 'aprovado', at: t(-0.6, 12) },
      ],
      activity: [
        { id: 'j1', kind: 'system', authorId: 'u_caio', at: t(-1, 8), text: 'criou a postagem' },
        { id: 'j2', kind: 'approve', authorId: 'u_marta', at: t(-0.6, 12), text: 'Adorei. Faz disso uma série semanal.' },
      ],
    },
    {
      id: 'p11', code: code(), network: 'linkedin', format: 'single',
      title: 'Post — Vaga: engenheiro de implantação',
      media: [img('m6')],
      captions: [cap('Única', 'Estamos contratando: Engenheiro(a) de Implantação para o Bracerum Park, em Villeta (PY).\n\nVocê vai acompanhar a chegada de indústrias brasileiras ao parque, do estudo de viabilidade à entrega do galpão.\n\nCandidaturas pelo link.')],
      chosenCaption: 0, link: 'https://bracerumpark.com/vagas',
      status: 'revisao', priority: 'normal', tags: ['RH'],
      scheduledAt: t(2, 14, 0), createdBy: 'u_ana', createdAt: t(-0.6, 10), updatedAt: t(-0.6, 10),
      levels: [
        { name: 'Revisão interna', approverId: 'u_ana', status: 'aprovado', at: t(-0.6, 11) },
        { name: 'Aprovação do cliente', approverId: 'u_marta', status: 'pendente', at: null },
      ],
      activity: [{ id: 'k1', kind: 'system', authorId: 'u_ana', at: t(-0.6, 10), text: 'criou a postagem' }],
    },
    {
      id: 'p12', code: code(), network: 'facebook', format: 'video',
      title: 'Vídeo — Depoimento de indústria instalada',
      media: [vid('m11', 96)],
      captions: [cap('Única', '“Reduzimos 38% do custo logístico no primeiro ano.”\n\nO depoimento de quem já opera dentro do Bracerum Park.')],
      chosenCaption: 0,
      status: 'publicado', priority: 'normal', tags: ['Prova social'],
      scheduledAt: t(-8, 19, 0), createdBy: 'u_caio', createdAt: t(-14, 10), updatedAt: t(-8, 19),
      levels: [
        { name: 'Revisão interna', approverId: 'u_ana', status: 'aprovado', at: t(-13, 9) },
        { name: 'Aprovação do cliente', approverId: 'u_paulo', status: 'aprovado', at: t(-10, 16) },
      ],
      activity: [{ id: 'l1', kind: 'system', authorId: 'u_caio', at: t(-14, 10), text: 'criou a postagem' }],
      metrics: { reach: 88400, likes: 2410, comments: 187, saves: 96 },
    },
  ];

  const NOTIFICATIONS = [
    { id: 'n1', postId: 'p1', userId: 'u_marta', at: t(-1, 11), text: 'solicitou alterações em', read: false },
    { id: 'n2', postId: 'p3', userId: 'u_paulo', at: t(-0.5, 10), text: 'solicitou alterações em', read: false },
    { id: 'n3', postId: 'p1', userId: 'u_paulo', at: t(-0.4, 9), text: 'comentou em', read: false },
    { id: 'n4', postId: 'p2', userId: 'u_marta', at: t(-1, 18), text: 'aprovou', read: true },
  ];

  global.SEED = { NETWORKS, FORMATS, STATUSES, STATUS_ORDER, OBJECTIVES, CTAS, USERS, BRAND, LIBRARY, POSTS, NOTIFICATIONS };
})(window);
