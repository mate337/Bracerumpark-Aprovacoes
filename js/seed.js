/* ==========================================================================
   APROVA — catálogo fixo (redes, formatos, estados) + contas e acervo
   ========================================================================== */
(function (global) {
  'use strict';

  /* --------------------------------------------------------- as redes --- */
  const NETWORKS = {
    instagram: {
      id: 'instagram', name: 'Instagram', icon: 'instagram',
      capMax: 2200, hashSoft: 10, hashMax: 30, firstComment: true, cut: 125,
      formats: ['single', 'carousel', 'video', 'reels', 'story'],
      note: 'Legenda corta em ~125 caracteres na primeira linha do feed.',
    },
    facebook: {
      id: 'facebook', name: 'Facebook', icon: 'facebook',
      capMax: 63206, hashSoft: 3, hashMax: 30, firstComment: false, cut: 280,
      formats: ['single', 'carousel', 'video'],
      note: 'Texto corta em ~280 caracteres com “Ver mais”.',
    },
    linkedin: {
      id: 'linkedin', name: 'LinkedIn', icon: 'linkedin',
      capMax: 3000, hashSoft: 5, hashMax: 20, firstComment: false, cut: 210,
      formats: ['single', 'carousel', 'video'],
      note: 'Texto corta em ~210 caracteres. Tom institucional, sem excesso de hashtag.',
    },
  };
  const NET_IDS = Object.keys(NETWORKS);

  const FORMATS = {
    single:   { id: 'single',   name: 'Imagem única', icon: 'image',  ratio: { instagram: '4:5',  facebook: '1.91', linkedin: '1.91' } },
    carousel: { id: 'carousel', name: 'Carrossel',    icon: 'layers', ratio: { instagram: '1',    facebook: '1',    linkedin: '1' } },
    video:    { id: 'video',    name: 'Vídeo',        icon: 'video',  ratio: { instagram: '4:5',  facebook: '16:9', linkedin: '16:9' } },
    reels:    { id: 'reels',    name: 'Reels',        icon: 'reels',  ratio: { instagram: '9:16', facebook: '9:16', linkedin: '9:16' } },
    story:    { id: 'story',    name: 'Story',        icon: 'story',  ratio: { instagram: '9:16', facebook: '9:16', linkedin: '9:16' } },
  };

  const STATUSES = {
    rascunho:   { id: 'rascunho',   name: 'Rascunho',               short: 'Rascunho',   icon: 'edit' },
    revisao:    { id: 'revisao',    name: 'Aguardando aprovação',   short: 'Em revisão', icon: 'clock' },
    alteracoes: { id: 'alteracoes', name: 'Alterações solicitadas', short: 'Alterações', icon: 'refresh' },
    aprovado:   { id: 'aprovado',   name: 'Aprovado',               short: 'Aprovado',   icon: 'checkCircle' },
    agendado:   { id: 'agendado',   name: 'Agendado',               short: 'Agendado',   icon: 'calendar' },
    publicado:  { id: 'publicado',  name: 'Publicado',              short: 'Publicado',  icon: 'globe' },
  };
  const STATUS_ORDER = ['rascunho', 'revisao', 'alteracoes', 'aprovado', 'agendado', 'publicado'];

  /* Mídia paga é uma marcação da peça, não uma rede: uma publicação pode ir
     para três redes e ser impulsionada em todas elas. */
  const SPONSOR = {
    id: 'sponsored', name: 'Patrocinado', icon: 'megaphone',
    note: 'Peça paga: exige título, descrição, CTA, objetivo, público e verba.',
  };
  const OBJECTIVES = ['Reconhecimento', 'Alcance', 'Tráfego', 'Engajamento', 'Geração de leads', 'Conversão', 'Mensagens'];
  const CTAS = ['Saiba mais', 'Fale conosco', 'Cadastre-se', 'Baixar', 'Ver oferta', 'Enviar mensagem', 'Solicitar proposta'];

  /* ------------------------------------------------------------ contas -- */
  /* Acesso por e-mail cadastrado. Não há senha: isto identifica quem está
     revisando, não autentica ninguém. Ver a ressalva no README. */
  const USERS = [
    {
      id: 'u_matheus', email: 'matheus337.martins@gmail.com',
      name: 'Matheus Martins', role: 'admin', title: 'Administrador',
      color: 'linear-gradient(135deg,#ff8a3d,#d2440a)', photo: '',
    },
    {
      id: 'u_sydney', email: 'sydney@bracerum.com',
      name: 'Sydney', role: 'approver', title: 'Aprovador · Bracerum',
      color: 'linear-gradient(135deg,#2fd39a,#0e7a5a)', photo: '',
    },
    {
      id: 'u_cleber', email: 'cleber@bracerum.com',
      name: 'Cleber', role: 'approver', title: 'Aprovador · Bracerum',
      color: 'linear-gradient(135deg,#6aa6ff,#1a49b8)', photo: '',
    },
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
    { id: 'm16', src: 'assets/web/vista-aerea-park.jpg',   alt: 'Vista aérea do parque' },
    { id: 'm17', src: 'assets/web/hero-hotel-noturno.jpg', alt: 'Render noturno do hotel' },
    { id: 'm18', src: 'assets/pois/terport-villeta.jpg',   alt: 'Terminal portuário de Villeta' },
    { id: 'm19', src: 'assets/pois/porto-assuncao.jpg',    alt: 'Porto de Assunção' },
    { id: 'm20', src: 'assets/pois/itaipu.jpg',            alt: 'Usina de Itaipu' },
  ];

  /* A ferramenta começa vazia: as peças são as que a equipe criar. */
  const POSTS = [];
  const NOTIFICATIONS = [];

  global.SEED = {
    NETWORKS, NET_IDS, FORMATS, STATUSES, STATUS_ORDER, SPONSOR,
    OBJECTIVES, CTAS, USERS, BRAND, LIBRARY, POSTS, NOTIFICATIONS,
  };
})(window);
