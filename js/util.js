/* ==========================================================================
   APROVA — utilitários
   ========================================================================== */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------ DOM ----- */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children)) {
      if (c === null || c === undefined || c === false) continue;
      node.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return node;
  }

  /** Escapa texto vindo do usuário antes de entrar em innerHTML. */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  /** Delegação de eventos: um listener no container serve a N alvos. */
  function on(root, evt, sel, fn) {
    root.addEventListener(evt, (e) => {
      const t = e.target.closest(sel);
      if (t && root.contains(t)) fn(e, t);
    });
  }

  const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

  /* ---------------------------------------------------------- ícones ---- */
  /* Traçado 24×24, stroke-width 1.8 — coerente em toda a interface. */
  const ICON = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    board: '<rect x="3" y="3" width="6" height="18" rx="1.5"/><rect x="10.5" y="3" width="6" height="12" rx="1.5"/><rect x="18" y="3" width="3" height="8" rx="1.5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.6 1.6 0 0 0 15 19.4a1.6 1.6 0 0 0-1 1.47V21a2 2 0 1 1-4 0v-.09A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-1.47-1H3a2 2 0 1 1 0-4h.09A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 9 4.6a1.6 1.6 0 0 0 1-1.47V3a2 2 0 1 1 4 0v.09A1.6 1.6 0 0 0 15 4.6a1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.6 1.6 0 0 0 19.4 9v0a1.6 1.6 0 0 0 1.47 1H21a2 2 0 1 1 0 4h-.09a1.6 1.6 0 0 0-1.47 1z"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="3.6"/><path d="M2.5 21a6.5 6.5 0 0 1 13 0"/><path d="M16.5 5.2a3.6 3.6 0 0 1 0 6.9"/><path d="M18 14.4a6.5 6.5 0 0 1 3.5 5.8"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12.2 2.7 2.7L16 9.4"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    xCircle: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
    chevL: '<path d="m14 6-6 6 6 6"/>',
    chevR: '<path d="m10 6 6 6-6 6"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    chevU: '<path d="m6 15 6-6 6 6"/>',
    arrowR: '<path d="M4 12h15M13 6l6 6-6 6"/>',
    arrowL: '<path d="M20 12H5M11 6l-6 6 6 6"/>',
    edit: '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M14 6.5 17.5 10"/>',
    trash: '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="m4 17 4.8-4.8a2 2 0 0 1 2.8 0L20 20"/>',
    video: '<rect x="2.5" y="5.5" width="14" height="13" rx="2.5"/><path d="m16.5 10 5-3v10l-5-3z"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3.5 12.5 8.5 4.7 8.5-4.7"/><path d="m3.5 16.8 8.5 4.7 8.5-4.7"/>',
    send: '<path d="M21 3 10.5 13.5"/><path d="M21 3 14.5 21l-4-7.5L3 9.5 21 3z"/>',
    msg: '<path d="M20 15.5a2.5 2.5 0 0 1-2.5 2.5H8l-4 3.5V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5z"/>',
    msgPlus: '<path d="M20 15.5a2.5 2.5 0 0 1-2.5 2.5H8l-4 3.5V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5z"/><path d="M12 8.5v5M9.5 11h5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.4l3.4 2"/>',
    filter: '<path d="M3.5 5.5h17l-6.6 7.8V20l-3.8-2.2v-4.5z"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    phone: '<rect x="6" y="2.5" width="12" height="19" rx="2.6"/><path d="M10.5 18.5h3"/>',
    monitor: '<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8.5 21h7M12 17v4"/>',
    zap: '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z"/>',
    sparkles: '<path d="m12 3 1.9 4.9L19 9.8l-5.1 1.9L12 16.6l-1.9-4.9L5 9.8l5.1-1.9z"/><path d="m18.5 15.5.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z"/>',
    link: '<path d="M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.4 1.4"/><path d="M14 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.4-1.4"/>',
    hash: '<path d="M5 9h15M4 15h15M10 3.5 8 20.5M16 3.5l-2 17"/>',
    upload: '<path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"/><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/>',
    download: '<path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"/><path d="M12 3.5V15M7.5 10.5 12 15l4.5-4.5"/>',
    copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 5.5A2 2 0 0 0 13.5 3.5h-8A2 2 0 0 0 3.5 5.5v8a2 2 0 0 0 2 2"/>',
    more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    alert: '<path d="M12 4.5 21 19.5H3z"/><path d="M12 10v4M12 17h.01"/>',
    refresh: '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/><path d="M20.5 4v5h-5"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3.2 9h17.6M3.2 15h17.6"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>',
    play: '<path d="M7 4.5v15l13-7.5z"/>',
    heart: '<path d="M12 20.5S3.5 15.2 3.5 9.4A4.9 4.9 0 0 1 12 6.3a4.9 4.9 0 0 1 8.5 3.1c0 5.8-8.5 11.1-8.5 11.1z"/>',
    share: '<path d="M21 3 10.5 13.5"/><path d="M21 3 14.5 21l-4-7.5L3 9.5 21 3z"/>',
    bookmark: '<path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.4L5 21V4.5a1 1 0 0 1 1-1z"/>',
    thumbUp: '<path d="M7 10.5 11 3a2.4 2.4 0 0 1 2.4 2.4V9.5h4.7a2 2 0 0 1 2 2.4l-1.3 6.4a2 2 0 0 1-2 1.7H7z"/><rect x="2.5" y="10.5" width="4.5" height="9.5" rx="1"/>',
    repeat: '<path d="M4 9V7.5A2.5 2.5 0 0 1 6.5 5H18"/><path d="m15 2 3 3-3 3"/><path d="M20 15v1.5a2.5 2.5 0 0 1-2.5 2.5H6"/><path d="m9 22-3-3 3-3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>',
    moon: '<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/>',
    menu: '<path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17"/>',
    logout: '<path d="M14 4.5h4A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5h-4"/><path d="M10 8.5 13.5 12 10 15.5M13 12H3.5"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    money: '<path d="M12 2.5v19"/><path d="M16.5 6.5H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H7"/>',
    trend: '<path d="M3 17.5 9.5 11l4 4L21 7.5"/><path d="M15.5 7.5H21v5.5"/>',
    pin: '<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    undo: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4v5h5"/>',
    history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4v5h5"/><path d="M12 7.5V12l3 1.8"/>',
    folder: '<path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z"/>',
    inbox: '<path d="M3.5 13h4l1.5 3h6l1.5-3h4"/><path d="M5.6 5.4 3.5 13v5A1.5 1.5 0 0 0 5 19.5h14a1.5 1.5 0 0 0 1.5-1.5v-5l-2.1-7.6A1.5 1.5 0 0 0 16.9 4.3H7.1a1.5 1.5 0 0 0-1.5 1.1z"/>',
    flame: '<path d="M12 22c4 0 6.5-2.6 6.5-6 0-4.5-4.5-6-4-11-3 1.5-5 4.5-5 7 0 0-2-1-2-3.5-1.5 1.8-2 3.7-2 5.5 0 4 2.5 8 6.5 8z"/>',
    volume: '<path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5.4"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.3" cy="6.7" r="1.05" fill="currentColor" stroke="none"/>',
    facebook: '<path d="M14.5 21v-8h2.7l.5-3.2h-3.2V7.7c0-.9.3-1.6 1.7-1.6h1.7V3.2A22 22 0 0 0 15.3 3c-2.6 0-4.3 1.5-4.3 4.4v2.4H8.2V13H11v8z"/>',
    linkedin: '<rect x="3" y="3" width="18" height="18" rx="2.4"/><path d="M7.3 10.2v7M7.3 7.1v.01M11.3 17.2v-4a2 2 0 0 1 4 0v4M11.3 10.2v7"/>',
    megaphone: '<path d="M3.5 10v4a1.5 1.5 0 0 0 1.5 1.5h2L14 20V4L7 8.5H5A1.5 1.5 0 0 0 3.5 10z"/><path d="M17.5 9a4 4 0 0 1 0 6"/><path d="M7 15.5V20h3"/>',
    reels: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="m3.5 8.5h17M9 3.2 12.3 8.5M15 3.2l3.3 5.3"/><path d="m10.5 12.5 4.5 2.5-4.5 2.5z"/>',
    story: '<circle cx="12" cy="12" r="9" stroke-dasharray="3.2 2.6"/><path d="M12 8v8M8 12h8"/>',
    split: '<path d="M4 5h5l6 14h5"/><path d="M20 5h-5"/><path d="m17.5 2.5 2.5 2.5-2.5 2.5"/><path d="m17.5 16.5 2.5 2.5-2.5 2.5"/>',
  };

  function icon(name, cls = '') {
    const p = ICON[name] || ICON.more;
    /* width/height como atributo: garante um tamanho sensato mesmo onde não
       há regra de CSS — e qualquer regra de CSS continua vencendo. */
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"${cls ? ` class="${cls}"` : ''} aria-hidden="true">${p}</svg>`;
  }
  const iconFilled = (name, cls = '') =>
    `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="none"${cls ? ` class="${cls}"` : ''} aria-hidden="true">${ICON[name] || ''}</svg>`;

  /* ------------------------------------------------------------ datas --- */
  const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const MESES_ABR = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const DOW = ['dom','seg','ter','qua','qui','sex','sáb'];

  const pad = (n) => String(n).padStart(2, '0');
  const toDate = (v) => (v instanceof Date ? v : new Date(v));
  const isoDay = (d) => { const x = toDate(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };

  function fmtDate(v, style = 'short') {
    const d = toDate(v);
    if (Number.isNaN(+d)) return '—';
    if (style === 'long') return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
    if (style === 'day') return `${pad(d.getDate())} ${MESES_ABR[d.getMonth()]}`;
    if (style === 'full') return `${DOW[d.getDay()]}, ${pad(d.getDate())} ${MESES_ABR[d.getMonth()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    if (style === 'time') return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  /** "há 3 h", "em 2 d" — o relógio social. */
  function ago(v) {
    const d = toDate(v), diff = Date.now() - d.getTime();
    const fut = diff < 0, s = Math.abs(diff) / 1000;
    const step = (n, u) => (fut ? `em ${n} ${u}` : `há ${n} ${u}`);
    if (s < 45) return fut ? 'em instantes' : 'agora';
    if (s < 3600) return step(Math.round(s / 60), 'min');
    if (s < 86400) return step(Math.round(s / 3600), 'h');
    if (s < 604800) return step(Math.round(s / 86400), 'd');
    return fmtDate(d, 'day');
  }

  const plural = (n, sing, plur) => `${n} ${n === 1 ? sing : plur}`;
  const nfmt = (n) => new Intl.NumberFormat('pt-BR').format(n);
  const money = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);

  /* ------------------------------------------------------------ texto --- */
  /** Realça #hashtags e @menções dentro de uma legenda (já escapada). */
  function richText(s) {
    return esc(s)
      .replace(/(^|\s)(#[\wÀ-ÿ]+)/g, '$1<span class="tag">$2</span>')
      .replace(/(^|\s)(@[\w.]+)/g, '$1<span class="mention">$2</span>')
      .replace(/\n/g, '<br>');
  }
  const countHashtags = (s) => (String(s).match(/#[\wÀ-ÿ]+/g) || []).length;
  const initials = (name) => String(name).trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  /* --------------------------------------------------------- animação --- */
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** WAAPI com respeito a prefers-reduced-motion. */
  function animate(node, frames, opts = {}) {
    if (!node || reduced()) return { finished: Promise.resolve() };
    return node.animate(frames, { duration: 300, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both', ...opts });
  }

  /** Conta um número de 0 até o alvo — usado nos KPIs. */
  function countUp(node, to, dur = 900) {
    if (reduced()) { node.textContent = nfmt(to); return; }
    const t0 = performance.now(), from = 0;
    (function tick(t) {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      node.textContent = nfmt(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /** Move o "polegar" de um seletor segmentado por baixo do item ativo. */
  function moveThumb(seg) {
    const thumb = $('.seg__thumb', seg), active = $('.seg__btn.is-on', seg);
    if (!thumb || !active) return;
    thumb.style.width = `${active.offsetWidth}px`;
    thumb.style.transform = `translateX(${active.offsetLeft - 3}px)`;
  }

  const debounce = (fn, ms = 180) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  /* ---------------------------------------------------------- imagens --- */
  /** Reduz a imagem antes de guardar — localStorage é pequeno. */
  function shrinkImage(file, max = 1400, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = reject;
      fr.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          const cv = Object.assign(document.createElement('canvas'), { width: w, height: h });
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve({ src: cv.toDataURL('image/jpeg', quality), w, h });
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  const readAsURL = (file) => new Promise((res, rej) => {
    const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file);
  });

  global.U = {
    $, $$, el, esc, on, uid, icon, iconFilled, ICON,
    fmtDate, ago, isoDay, pad, MESES, MESES_ABR, DOW,
    plural, nfmt, money, richText, countHashtags, initials,
    animate, countUp, moveThumb, debounce, reduced,
    shrinkImage, readAsURL,
  };
})(window);
