/* ==========================================================================
   APROVA — peças de interface reutilizáveis
   ========================================================================== */
(function (global) {
  'use strict';
  const { $, $$, el, esc, icon, uid, ago, fmtDate, initials, animate } = global.U;
  const S = () => global.SEED;

  /* ------------------------------------------------------------ toasts -- */
  function toast(msg, kind = 'info', ms = 3600) {
    let host = $('.toasts');
    if (!host) { host = el('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }); document.body.append(host); }
    const ic = { ok: 'checkCircle', warn: 'alert', err: 'xCircle', info: 'sparkles' }[kind] || 'sparkles';
    const node = el('div', { class: `toast toast--${kind}`, html: `<span class="toast__ic">${icon(ic)}</span><span class="toast__txt">${esc(msg)}</span>` });
    host.append(node);
    const kill = () => { node.classList.add('is-out'); setTimeout(() => node.remove(), 220); };
    setTimeout(kill, ms);
    node.addEventListener('click', kill);
    return node;
  }

  /* ------------------------------------------------------------- modal -- */
  /** Abre um modal. `build` recebe (body, close) e monta o conteúdo. */
  function modal({ title, icon: ic = 'sparkles', wide = false, build, foot }) {
    const scrim = el('div', { class: 'scrim', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
    const box = el('div', { class: 'modal' + (wide ? ' modal--wide' : '') });
    const head = el('div', { class: 'modal__head', html: `
      <span class="net-badge" style="--nc:var(--brand)">${icon(ic)}</span>
      <span class="h3" style="flex:1">${esc(title)}</span>` });
    const closeBtn = el('button', { class: 'btn btn--ghost btn--icon btn--sm', html: icon('x'), 'aria-label': 'Fechar' });
    head.append(closeBtn);
    const body = el('div', { class: 'modal__body' });
    const footer = el('div', { class: 'modal__foot' });
    box.append(head, body, footer);
    scrim.append(box);

    const close = () => {
      animate(box, [{ opacity: 1 }, { opacity: 0, transform: 'translateY(14px) scale(.97)' }], { duration: 180 });
      animate(scrim, [{ opacity: 1 }, { opacity: 0 }], { duration: 180 }).finished?.then(() => scrim.remove());
      setTimeout(() => scrim.remove(), 200);
      document.removeEventListener('keydown', onKey);
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', onKey);
    closeBtn.onclick = close;
    scrim.addEventListener('mousedown', (e) => { if (e.target === scrim) close(); });

    build?.(body, close);
    (foot?.(close) || []).forEach((b) => footer.append(b));
    if (!footer.children.length) footer.remove();

    document.body.append(scrim);
    setTimeout(() => (body.querySelector('input, textarea, select, button') || closeBtn).focus(), 60);
    return { scrim, body, footer, close };
  }

  function confirm({ title = 'Tem certeza?', text = '', ok = 'Confirmar', danger = false, onOk }) {
    return modal({
      title, icon: danger ? 'alert' : 'checkCircle',
      build: (body) => { body.append(el('p', { class: 'muted', text })); },
      foot: (close) => [
        el('button', { class: 'btn', text: 'Cancelar', onclick: close }),
        el('button', { class: 'btn ' + (danger ? 'btn--danger' : 'btn--primary'), text: ok, onclick: () => { close(); onOk?.(); } }),
      ],
    });
  }

  /* ---------------------------------------------------------- avatares -- */
  function avatarHTML(user, size = '') {
    const u = typeof user === 'string' ? global.Store.user(user) : user;
    if (!u) return '';
    const cls = `av ${size ? 'av--' + size : ''}`;
    if (u.photo) return `<span class="${cls}" title="${esc(u.name)}"><img src="${esc(u.photo)}" alt="${esc(u.name)}"></span>`;
    return `<span class="${cls}" style="--av-bg:${u.color || 'var(--grad-brand)'}" title="${esc(u.name)}">${esc(initials(u.name))}</span>`;
  }

  /* ------------------------------------------------------------ chips --- */
  const statusChip = (st) => `<span class="status" data-status="${st}">${esc(S().STATUSES[st].short)}</span>`;
  /** Selo de uma rede. Recebe o id da rede, não a peça. */
  const netBadge = (net, lg = false) => {
    const cfg = S().NETWORKS[net];
    if (!cfg) return '';
    return `<span class="net-badge${lg ? ' net-badge--lg' : ''}" data-net="${net}" title="${esc(cfg.name)}">${icon(cfg.icon)}</span>`;
  };
  /** Selos de todas as redes da peça, mais o de patrocinado quando for o caso. */
  const netBadges = (p, lg = false) =>
    (p.networks || []).map((n) => netBadge(n, lg)).join('') +
    (p.sponsored ? `<span class="net-badge${lg ? ' net-badge--lg' : ''}" data-net="ads" title="${esc(S().SPONSOR.name)}">${icon(S().SPONSOR.icon)}</span>` : '');
  const fmtBadge = (p) => {
    const f = S().FORMATS[p.format];
    const n = p.media?.length || 0;
    return `<span class="fmt-badge">${icon(f.icon)}${esc(f.name)}${p.format === 'carousel' && n ? ` · ${n}` : ''}</span>`;
  };

  /* ------------------------------------------------- quem sugeriu / pediu */
  /** O pedido mais recente que ainda está aberto — foto, nome e o comentário. */
  function lastOpenNote(p) {
    const open = (p.activity || []).filter((a) => ['comment', 'change', 'suggestion'].includes(a.kind) && !a.resolved);
    return open[open.length - 1] || null;
  }

  function suggesterChip(p) {
    const a = lastOpenNote(p);
    if (!a) return '';
    const u = global.Store.user(a.authorId);
    return `<span class="sugg" title="${esc(u.name)}: ${esc(a.text)}">
      ${avatarHTML(u, 'xs')}
      <span class="sugg__txt truncate"><b>${esc(u.name.split(' ')[0])}</b> ${esc(a.text)}</span>
    </span>`;
  }

  /* ------------------------------------------------------------ cartão -- */
  function postCard(p, { draggable = false } = {}) {
    const m = p.media?.[0];
    const cap = global.Preview.captionOf(p);
    const open = (p.activity || []).filter((a) => ['comment', 'change', 'suggestion'].includes(a.kind));
    const unresolved = open.filter((a) => !a.resolved).length;
    const capCount = p.captions?.length || 0;

    /* div com papel de botão: um <button> não pode conter blocos, e o cartão
       tem estrutura. O teclado continua funcionando (Enter/Espaço). */
    const node = el('div', {
      class: 'card', 'data-post': p.id, 'data-status': p.status,
      role: 'button', tabindex: '0',
      'aria-label': `${p.title} — ${(p.networks || []).map((n) => S().NETWORKS[n]?.name).join(', ')} — ${S().STATUSES[p.status].name}`,
      draggable: draggable ? 'true' : null,
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); node.click(); } },
      html: `
      <div class="card__media">
        ${m?.src ? `<img src="${esc(m.src)}" alt="${esc(m.alt || '')}" loading="lazy">` : '<div style="height:100%"></div>'}
        <div class="card__topline">
          ${netBadges(p)}
          <span class="spacer" style="flex:1"></span>
          ${statusChip(p.status)}
        </div>
        <div class="card__botline">${fmtBadge(p)}${p.priority === 'alta' ? `<span class="fmt-badge" style="color:#ffb9a0">${icon('flame')}Prioridade</span>` : ''}</div>
      </div>
      <div class="card__body">
        <div class="card__title clamp-2">${esc(p.title)}</div>
        <div class="card__cap clamp-2">${esc(cap.slice(0, 130))}</div>
        ${suggesterChip(p)}
        <div class="card__foot">
          <span class="tiny dim">${esc(p.code)}</span>
          ${p.scheduledAt ? `<span class="tiny dim">· ${esc(fmtDate(p.scheduledAt, 'day'))} ${esc(fmtDate(p.scheduledAt, 'time'))}</span>` : ''}
          <span style="flex:1"></span>
          ${capCount > 1 ? `<span class="chip chip--sm" title="${capCount} opções de legenda">${icon('split')}${capCount}</span>` : ''}
          ${unresolved ? `<span class="chip chip--sm chip--brand" title="${unresolved} pendência(s)">${icon('msg')}${unresolved}</span>` : ''}
        </div>
      </div>`,
    });
    return node;
  }

  /* ------------------------------------------------- seletor segmentado -- */
  /** items: [{id,label,icon}] · onPick(id) */
  function segmented(items, active, onPick, { brand = false, name = '' } = {}) {
    const seg = el('div', { class: 'seg' + (brand ? ' seg--brand' : ''), role: 'tablist', 'aria-label': name });
    seg.append(el('span', { class: 'seg__thumb' }));
    items.forEach((it) => {
      const b = el('button', {
        class: 'seg__btn' + (it.id === active ? ' is-on' : ''), role: 'tab',
        'aria-selected': it.id === active ? 'true' : 'false',
        html: `${it.icon ? icon(it.icon) : ''}<span>${esc(it.label)}</span>`,
        onclick: () => {
          $$('.seg__btn', seg).forEach((x) => { x.classList.remove('is-on'); x.setAttribute('aria-selected', 'false'); });
          b.classList.add('is-on'); b.setAttribute('aria-selected', 'true');
          global.U.moveThumb(seg);
          onPick(it.id);
        },
      });
      seg.append(b);
    });
    requestAnimationFrame(() => global.U.moveThumb(seg));
    return seg;
  }

  /* ------------------------------------------------------------- vazio -- */
  const empty = (ic, title, text, action) => el('div', {
    class: 'empty', html: `
      <span class="empty__ic">${icon(ic)}</span>
      <div class="h3">${esc(title)}</div>
      <p class="muted tiny" style="max-width:38ch">${esc(text)}</p>`,
  }, action ? [action] : []);

  /* -------------------------------------------------------- contadores -- */
  /** Contador de caracteres com os limites reais da rede. */
  /**
   * Contador de caracteres e hashtags. Aceita uma rede ou várias — com mais de
   * uma, o limite que vale é o mais apertado, e o título diz qual rede aperta.
   */
  function counter(text, nets) {
    const lista = [].concat(nets || 'instagram').filter((n) => S().NETWORKS[n]);
    const cfgs = (lista.length ? lista : ['instagram']).map((n) => S().NETWORKS[n]);
    const apertada = cfgs.reduce((a, b) => (b.capMax < a.capMax ? b : a));
    const tagCfg = cfgs.reduce((a, b) => (b.hashSoft < a.hashSoft ? b : a));
    const n = text.length;
    const tags = global.U.countHashtags(text);
    const over = n > apertada.capMax;
    const near = n > apertada.capMax * 0.9;
    return `<span class="counter ${over ? 'is-over' : near ? 'is-warn' : ''}" title="Limite do ${esc(apertada.name)}">${n}/${apertada.capMax}</span>
      ${tags ? `<span class="counter ${tags > tagCfg.hashMax ? 'is-over' : tags > tagCfg.hashSoft ? 'is-warn' : ''}" title="${esc(tagCfg.name)} recomenda até ${tagCfg.hashSoft}">#${tags}</span>` : ''}`;
  }

  global.UI = { toast, modal, confirm, avatarHTML, statusChip, netBadge, netBadges, fmtBadge, postCard, segmented, empty, counter, suggesterChip, lastOpenNote };
})(window);
