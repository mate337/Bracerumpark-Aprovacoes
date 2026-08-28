/* ==========================================================================
   APROVA — telas
   ========================================================================== */
(function (global) {
  'use strict';
  const { $, $$, el, esc, icon, fmtDate, ago, nfmt, money, countUp, plural, isoDay, MESES, DOW, pad } = global.U;
  const S = () => global.SEED;
  const St = () => global.Store;

  const Views = {};

  /* ==========================================================================
     PAINEL
     ========================================================================== */
  Views.dashboard = function () {
    const me = St().me();
    const posts = St().visiblePosts();
    const c = St().counts();
    const pend = St().pendingForMe();
    const admin = St().isAdmin();

    const semana = posts.filter((p) => ['aprovado', 'agendado'].includes(p.status) &&
      p.updatedAt && Date.now() - new Date(p.updatedAt) < 7 * 864e5).length;
    const proximos = posts
      .filter((p) => p.scheduledAt && new Date(p.scheduledAt) > new Date())
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)).slice(0, 5);

    const hora = new Date().getHours();
    const saud = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

    const root = el('div', { class: 'view__inner view-enter' });

    root.append(el('div', { class: 'page-head', html: `
      <div class="page-head__txt">
        <div class="eyebrow">${esc(fmtDate(new Date(), 'long'))}</div>
        <h1 class="h1">${esc(saud)}, <span class="grad-text">${esc(me.name.split(' ')[0])}</span>.</h1>
        <p class="muted">${pend.length
          ? `${plural(pend.length, 'postagem espera', 'postagens esperam')} a sua decisão.`
          : 'Nada parado esperando você. A fila está limpa.'}</p>
      </div>` },
      admin ? [el('button', { class: 'btn btn--primary', html: `${icon('plus')}Nova postagem`, onclick: () => global.App.go({ view: 'compose' }) })] : []
    ));

    /* KPIs */
    const kpis = [
      { k: 'revisao', label: 'Aguardando aprovação', val: c.revisao, color: 'var(--st-review)', ic: 'clock', meta: pend.length ? `${pend.length} com você` : 'nenhuma com você' },
      { k: 'alteracoes', label: 'Alterações pedidas', val: c.alteracoes, color: 'var(--st-changes)', ic: 'refresh', meta: 'voltaram para ajuste' },
      { k: 'aprovado', label: 'Aprovadas · 7 dias', val: semana, color: 'var(--st-approved)', ic: 'checkCircle', meta: 'prontas para agendar' },
      { k: 'agendado', label: 'Na fila', val: c.agendado, color: 'var(--st-scheduled)', ic: 'calendar', meta: proximos[0] ? `próxima ${ago(proximos[0].scheduledAt)}` : 'nada agendado' },
    ];
    const kpiWrap = el('div', { class: 'kpis stagger' });
    kpis.forEach((x, i) => {
      const node = el('button', {
        class: 'kpi', style: `--kc:${x.color};--i:${i}`,
        onclick: () => global.App.go({ view: 'posts', filterStatus: x.k }),
        html: `<div class="kpi__label">${icon(x.ic)}${esc(x.label)}</div>
               <div class="kpi__val" data-count="${x.val}">0</div>
               <div class="kpi__meta">${esc(x.meta)}</div>`,
      });
      kpiWrap.append(node);
    });
    root.append(kpiWrap);

    /* Duas colunas */
    const grid = el('div', { class: 'dash-grid' });

    /* — fila de decisão / pipeline — */
    const left = el('section', { class: 'panel' });
    left.append(el('div', { class: 'panel__head', html: `
      <span class="h3">${pend.length ? 'Esperando você' : 'Fluxo de conteúdo'}</span>` },
      [el('button', { class: 'btn btn--ghost btn--sm', html: `Ver tudo ${icon('arrowR')}`, onclick: () => global.App.go({ view: 'posts' }) })]));

    const lbody = el('div', { class: 'panel__body stack' });

    /* barra de pipeline */
    const total = Math.max(1, S().STATUS_ORDER.reduce((s, k) => s + c[k], 0));
    lbody.append(el('div', { class: 'pipe', html: `
      <div class="pipe__bar">${S().STATUS_ORDER.map((k) => c[k]
        ? `<span class="pipe__seg" data-status="${k}" style="flex:${c[k]};" title="${esc(S().STATUSES[k].name)}: ${c[k]}"></span>` : '').join('')}</div>
      <div class="pipe__legend">${S().STATUS_ORDER.map((k) =>
        `<span class="pipe__key" data-status="${k}"><i></i>${esc(S().STATUSES[k].short)} <b>${c[k]}</b></span>`).join('')}</div>
      <p class="tiny dim">${total} ${total === 1 ? 'postagem no fluxo' : 'postagens no fluxo'}.</p>` }));

    lbody.append(el('hr', { class: 'divider' }));

    const fila = (pend.length ? pend : posts.filter((p) => p.status === 'revisao')).slice(0, 4);
    if (fila.length) {
      const cards = el('div', { class: 'cards stagger' });
      fila.forEach((p, i) => {
        const card = global.UI.postCard(p);
        card.style.setProperty('--i', i);
        card.onclick = () => global.App.go({ view: 'post', postId: p.id });
        cards.append(card);
      });
      lbody.append(cards);
    } else {
      lbody.append(global.UI.empty('checkCircle', 'Fila vazia', 'Nada aguardando aprovação neste momento.'));
    }
    left.append(lbody);

    /* — coluna direita — */
    const right = el('div', { class: 'stack' });

    /* atividade */
    const act = el('section', { class: 'panel' });
    act.append(el('div', { class: 'panel__head', html: '<span class="h3">Atividade</span>' }));
    const abody = el('div', { class: 'panel__body' });
    const feed = el('div', { class: 'feed-list' });
    const eventos = [];
    posts.forEach((p) => (p.activity || []).forEach((a) => eventos.push({ ...a, post: p })));
    eventos.sort((a, b) => new Date(b.at) - new Date(a.at));
    eventos.slice(0, 8).forEach((e) => {
      const u = St().user(e.authorId);
      const verbo = { comment: 'comentou em', change: 'pediu alterações em', approve: 'aprovou', status: '', caption: 'escolheu legenda em', suggestion: 'sugeriu texto em', system: '' }[e.kind];
      feed.append(el('button', {
        class: 'feed-item', onclick: () => global.App.go({ view: 'post', postId: e.post.id }),
        html: `${global.UI.avatarHTML(u, 'sm')}
          <span class="feed-item__body">
            <span class="feed-item__txt"><b>${esc(u.name.split(' ')[0])}</b> ${esc(verbo || e.text)} <b>${esc(e.post.code)}</b>${verbo && e.kind !== 'system' && e.kind !== 'status' ? ` — “${esc(e.text.slice(0, 70))}${e.text.length > 70 ? '…' : ''}”` : ''}</span>
            <span class="feed-item__time">${esc(ago(e.at))}</span>
          </span>`,
      }));
    });
    abody.append(eventos.length ? feed : global.UI.empty('history', 'Sem movimento', 'A atividade da equipe aparece aqui.'));
    act.append(abody);
    right.append(act);

    /* próximos */
    const nx = el('section', { class: 'panel' });
    nx.append(el('div', { class: 'panel__head', html: '<span class="h3">Próximas publicações</span>' },
      [el('button', { class: 'btn btn--ghost btn--sm', html: icon('calendar'), onclick: () => global.App.go({ view: 'calendar' }), 'aria-label': 'Abrir calendário' })]));
    const nbody = el('div', { class: 'panel__body' });
    if (proximos.length) {
      const list = el('div', { class: 'feed-list' });
      proximos.forEach((p) => list.append(el('button', {
        class: 'feed-item', 'data-status': p.status, onclick: () => global.App.go({ view: 'post', postId: p.id }),
        html: `${global.UI.netBadge(p)}
          <span class="feed-item__body">
            <span class="feed-item__txt"><b>${esc(p.title)}</b></span>
            <span class="feed-item__time">${esc(fmtDate(p.scheduledAt, 'full'))} · ${esc(S().STATUSES[p.status].short)}</span>
          </span>`,
      })));
      nbody.append(list);
    } else {
      nbody.append(global.UI.empty('calendar', 'Agenda livre', 'Nenhuma postagem agendada.'));
    }
    nx.append(nbody);
    right.append(nx);

    grid.append(left, right);
    root.append(grid);

    requestAnimationFrame(() => $$('[data-count]', root).forEach((n) => countUp(n, +n.dataset.count)));
    return root;
  };

  /* ==========================================================================
     POSTAGENS — quadro / grade / lista
     ========================================================================== */
  Views.posts = function (st) {
    const root = el('div', { class: 'view__inner view-enter' });
    const filtros = st.filters || {};
    let lista = St().visiblePosts();

    if (filtros.net) lista = lista.filter((p) => p.network === filtros.net);
    if (filtros.status) lista = lista.filter((p) => p.status === filtros.status);
    if (filtros.mine) lista = lista.filter((p) => St().currentLevel(p)?.approverId === St().me().id && p.status === 'revisao');
    if (st.query) {
      const q = st.query.toLowerCase();
      lista = lista.filter((p) => (p.title + ' ' + p.code + ' ' + (p.captions || []).map((c) => c.text).join(' ') + ' ' + (p.tags || []).join(' ')).toLowerCase().includes(q));
    }

    /* cabeçalho */
    const head = el('div', { class: 'page-head' });
    head.append(el('div', {
      class: 'page-head__txt', html: `
      <div class="eyebrow">Conteúdo</div>
      <h1 class="h1">Postagens</h1>
      <p class="muted">${lista.length} ${lista.length === 1 ? 'peça' : 'peças'}${st.query ? ` para “${esc(st.query)}”` : ''}.</p>`,
    }));
    const modeSeg = global.UI.segmented([
      { id: 'board', label: 'Quadro', icon: 'board' },
      { id: 'grid', label: 'Grade', icon: 'grid' },
      { id: 'list', label: 'Lista', icon: 'list' },
    ], st.mode || 'board', (id) => global.App.go({ mode: id }, true), { name: 'Modo de visualização' });
    head.append(modeSeg);
    if (St().isAdmin()) head.append(el('button', { class: 'btn btn--primary', html: `${icon('plus')}Nova`, onclick: () => global.App.go({ view: 'compose' }) }));
    root.append(head);

    /* filtros */
    const bar = el('div', { class: 'toolbar' });
    const pills = el('div', { class: 'filter-pills' });
    const mk = (label, on, onclick, ic, n) => el('button', {
      class: 'pill' + (on ? ' is-on' : ''), onclick,
      html: `${ic ? icon(ic) : ''}${esc(label)}${n !== undefined ? `<span class="pill__n">${n}</span>` : ''}`,
    });
    pills.append(mk('Todas', !filtros.net && !filtros.status && !filtros.mine, () => global.App.setFilters({})));
    Object.values(S().NETWORKS).forEach((n) => {
      const q = St().visiblePosts().filter((p) => p.network === n.id).length;
      pills.append(mk(n.name, filtros.net === n.id, () => global.App.setFilters({ ...filtros, net: filtros.net === n.id ? null : n.id }), n.icon, q));
    });
    bar.append(pills);
    bar.append(el('span', { class: 'spacer' }));
    const statusSel = el('select', { class: 'select', style: 'width:auto', onchange: (e) => global.App.setFilters({ ...filtros, status: e.target.value || null }) });
    statusSel.append(el('option', { value: '', text: 'Todos os estados' }));
    S().STATUS_ORDER.forEach((k) => statusSel.append(el('option', { value: k, text: S().STATUSES[k].name, selected: filtros.status === k })));
    bar.append(statusSel);
    if (St().me().role === 'approver') {
      bar.append(mk('Só o que espera por mim', !!filtros.mine, () => global.App.setFilters({ ...filtros, mine: !filtros.mine }), 'target'));
    }
    root.append(bar);

    /* conteúdo */
    const mode = st.mode || 'board';
    if (!lista.length) {
      root.append(global.UI.empty('inbox', 'Nada por aqui', 'Ajuste os filtros ou crie uma nova postagem.',
        St().isAdmin() ? el('button', { class: 'btn btn--primary', html: `${icon('plus')}Nova postagem`, onclick: () => global.App.go({ view: 'compose' }) }) : null));
      return root;
    }
    if (mode === 'board') root.append(boardView(lista));
    else if (mode === 'grid') root.append(gridView(lista));
    else root.append(listView(lista));
    return root;
  };

  function gridView(lista) {
    const wrap = el('div', { class: 'cards stagger' });
    lista.forEach((p, i) => {
      const c = global.UI.postCard(p);
      c.style.setProperty('--i', i);
      c.onclick = () => global.App.go({ view: 'post', postId: p.id });
      wrap.append(c);
    });
    return wrap;
  }

  function boardView(lista) {
    const board = el('div', { class: 'board' });
    const admin = St().isAdmin();
    /* quem não arrasta não precisa de coluna vazia ocupando a tela */
    const colunas = admin ? S().STATUS_ORDER : S().STATUS_ORDER.filter((k) => lista.some((p) => p.status === k));
    colunas.forEach((k) => {
      const doStatus = lista.filter((p) => p.status === k);
      const col = el('div', { class: 'board__col', 'data-status': k, 'data-col': k });
      col.append(el('div', {
        class: 'board__head', html: `<span class="dot"></span>
          <span class="board__name">${esc(S().STATUSES[k].short)}</span>
          <span class="board__n">${doStatus.length}</span>`,
      }));
      const list = el('div', { class: 'board__list stagger' });
      if (!doStatus.length) list.append(el('div', { class: 'board__empty', text: admin ? 'Arraste uma peça para cá' : 'Vazio' }));
      doStatus.forEach((p, i) => {
        const c = global.UI.postCard(p, { draggable: admin });
        c.style.setProperty('--i', i);
        c.onclick = () => global.App.go({ view: 'post', postId: p.id });
        if (admin) {
          c.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', p.id);
            e.dataTransfer.effectAllowed = 'move';
            c.classList.add('is-dragging');
          });
          c.addEventListener('dragend', () => c.classList.remove('is-dragging'));
        }
        list.append(c);
      });
      col.append(list);

      if (admin) {
        col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('is-drop'); });
        col.addEventListener('dragleave', () => col.classList.remove('is-drop'));
        col.addEventListener('drop', (e) => {
          e.preventDefault();
          col.classList.remove('is-drop');
          const id = e.dataTransfer.getData('text/plain');
          if (!id) return;
          St().setStatus(id, k);
          global.UI.toast(`Movida para “${S().STATUSES[k].short}”.`, 'ok');
        });
      }
      board.append(col);
    });
    return board;
  }

  function listView(lista) {
    const wrap = el('div', { class: 'panel', style: 'padding:var(--s-4) var(--s-5) var(--s-5)' });
    const t = el('table', { class: 'tbl' });
    t.innerHTML = `<thead><tr>
      <th style="width:60px"></th><th>Postagem</th><th class="opt">Rede</th><th>Estado</th>
      <th class="opt">Agenda</th><th class="opt">Pendências</th><th class="opt">Autor</th></tr></thead>`;
    const tb = el('tbody');
    lista.forEach((p) => {
      const open = (p.activity || []).filter((a) => ['comment', 'change', 'suggestion'].includes(a.kind) && !a.resolved).length;
      const tr = el('tr', {
        onclick: () => global.App.go({ view: 'post', postId: p.id }),
        html: `
        <td>${p.media?.[0]?.src ? `<img class="tbl__thumb" src="${esc(p.media[0].src)}" alt="" loading="lazy">` : '<span class="tbl__thumb" style="display:block"></span>'}</td>
        <td><div style="font-weight:600">${esc(p.title)}</div><div class="tiny dim">${esc(p.code)} · ${esc(S().FORMATS[p.format].name)}</div></td>
        <td class="opt">${global.UI.netBadge(p)}</td>
        <td>${global.UI.statusChip(p.status)}</td>
        <td class="opt tiny muted">${p.scheduledAt ? esc(fmtDate(p.scheduledAt, 'full')) : '—'}</td>
        <td class="opt">${open ? `<span class="chip chip--sm chip--brand">${icon('msg')}${open}</span>` : '<span class="tiny dim">—</span>'}</td>
        <td class="opt">${global.UI.avatarHTML(p.createdBy, 'sm')}</td>`,
      });
      tb.append(tr);
    });
    t.append(tb);
    wrap.append(t);
    return wrap;
  }

  /* ==========================================================================
     CALENDÁRIO
     ========================================================================== */
  Views.calendar = function (st) {
    const root = el('div', { class: 'view__inner view-enter' });
    const ref = st.calRef ? new Date(st.calRef) : new Date();
    const y = ref.getFullYear(), m = ref.getMonth();

    const head = el('div', { class: 'page-head' });
    head.append(el('div', {
      class: 'page-head__txt', html: `
      <div class="eyebrow">Planejamento</div>
      <h1 class="h1">${esc(MESES[m])} <span class="dim">${y}</span></h1>
      <p class="muted">Arraste uma peça de outro dia para reagendar.</p>`,
    }));
    const nav = el('div', { class: 'row row--tight' });
    nav.append(
      el('button', { class: 'btn btn--icon', html: icon('chevL'), 'aria-label': 'Mês anterior', onclick: () => global.App.go({ calRef: new Date(y, m - 1, 1).toISOString() }, true) }),
      el('button', { class: 'btn btn--sm', text: 'Hoje', onclick: () => global.App.go({ calRef: new Date().toISOString() }, true) }),
      el('button', { class: 'btn btn--icon', html: icon('chevR'), 'aria-label': 'Próximo mês', onclick: () => global.App.go({ calRef: new Date(y, m + 1, 1).toISOString() }, true) }),
    );
    head.append(nav);
    root.append(head);

    const first = new Date(y, m, 1);
    const start = new Date(first); start.setDate(1 - first.getDay());
    const posts = St().visiblePosts().filter((p) => p.scheduledAt);
    const porDia = {};
    posts.forEach((p) => { (porDia[isoDay(p.scheduledAt)] ||= []).push(p); });

    const cal = el('div', { class: 'cal' });
    DOW.forEach((d) => cal.append(el('div', { class: 'cal__dow', text: d })));
    const hoje = isoDay(new Date());
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const key = isoDay(d);
      const fora = d.getMonth() !== m;
      const cell = el('div', { class: `cal__day${fora ? ' is-out' : ''}${key === hoje ? ' is-today' : ''}`, 'data-day': key });
      cell.append(el('div', { class: 'cal__num', text: d.getDate() }));
      const items = el('div', { class: 'cal__items' });
      (porDia[key] || []).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)).forEach((p) => {
        const ev = el('button', {
          class: 'cal__ev', 'data-status': p.status, draggable: St().isAdmin() ? 'true' : null,
          'data-net': p.network === 'ads' ? 'ads' : p.network,
          html: `<i></i><span>${esc(fmtDate(p.scheduledAt, 'time'))} ${esc(p.title)}</span>`,
          onclick: () => global.App.go({ view: 'post', postId: p.id }),
        });
        ev.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', p.id));
        items.append(ev);
      });
      cell.append(items);
      if (St().isAdmin()) {
        cell.addEventListener('dragover', (e) => { e.preventDefault(); cell.style.background = 'var(--brand-tint)'; });
        cell.addEventListener('dragleave', () => { cell.style.background = ''; });
        cell.addEventListener('drop', (e) => {
          e.preventDefault(); cell.style.background = '';
          const id = e.dataTransfer.getData('text/plain');
          const p = St().post(id);
          if (!p) return;
          const old = p.scheduledAt ? new Date(p.scheduledAt) : new Date();
          const nd = new Date(d); nd.setHours(old.getHours(), old.getMinutes(), 0, 0);
          St().schedule(id, nd.toISOString());
          global.UI.toast(`${p.code} reagendada para ${fmtDate(nd, 'full')}.`, 'ok');
        });
      }
      cal.append(cell);
    }
    root.append(cal);
    return root;
  };

  global.Views = Views;
})(window);

/* ==========================================================================
   APROVA — tela de aprovação (detalhe)
   ========================================================================== */
(function (global) {
  'use strict';
  const { $, $$, el, esc, icon, fmtDate, ago, nfmt, money, richText, plural } = global.U;
  const S = () => global.SEED;
  const St = () => global.Store;

  global.Views.post = function (st) {
    const p = St().post(st.postId);
    if (!p) return global.UI.empty('alert', 'Postagem não encontrada', 'Ela pode ter sido excluída.');

    const admin = St().isAdmin();
    const me = St().me();
    const lvl = St().currentLevel(p);
    const minhaVez = p.status === 'revisao' && (!lvl || lvl.approverId === me.id || admin);

    const root = el('div', { class: 'detail' });

    /* ----------------------------------------------------------- palco -- */
    const stage = el('div', { class: 'stage' });
    const bar = el('div', { class: 'stage__bar' });

    bar.append(el('button', {
      class: 'btn btn--ghost btn--sm', html: `${icon('arrowL')}Voltar`,
      onclick: () => global.App.back(),
    }));
    bar.append(el('span', { class: 'chip chip--sm', text: p.code }));

    bar.append(global.UI.segmented([
      { id: 'feed', label: 'Feed', icon: 'list' },
      { id: 'profile', label: 'Perfil', icon: 'grid' },
    ], st.context || 'feed', (id) => global.App.go({ context: id }, true), { name: 'Contexto' }));

    bar.append(global.UI.segmented([
      { id: 'mobile', label: 'Mobile', icon: 'phone' },
      { id: 'desktop', label: 'Desktop', icon: 'monitor' },
    ], st.device || 'mobile', (id) => global.App.go({ device: id }, true), { name: 'Dispositivo' }));

    bar.append(el('span', { class: 'spacer' }));

    const modo = St().settings().previewMode;
    bar.append(el('button', {
      class: 'btn btn--sm btn--icon', 'aria-label': 'Alternar tema da rede', title: 'Tema da rede (claro/escuro)',
      html: icon(modo === 'dark' ? 'sun' : 'moon'),
      onclick: () => { St().setSetting('previewMode', modo === 'dark' ? 'light' : 'dark'); },
    }));

    if (!admin || true) {
      bar.append(el('button', {
        class: 'btn btn--sm' + (st.arming ? ' btn--primary' : ''),
        html: `${icon('pin')}${st.arming ? 'Clique na peça' : 'Comentar no ponto'}`,
        onclick: () => global.App.go({ arming: !st.arming }, true),
      }));
    }
    if (admin) {
      bar.append(el('button', { class: 'btn btn--sm', html: `${icon('edit')}Editar`, onclick: () => global.App.go({ view: 'compose', postId: p.id }) }));
    }
    stage.append(bar);

    /* preview */
    const canvas = el('div', { class: 'stage__canvas' });
    const pins = (p.activity || []).filter((a) => a.pin && !a.resolved);
    const preview = global.Preview.render(p, {
      context: st.context || 'feed',
      device: st.device || 'mobile',
      mode: St().settings().previewMode,
      slide: st.slide || 0,
      pins, activePin: st.activePin, arming: st.arming,
    });
    preview.append(el('span', { class: 'sim-tag', text: 'simulação' }));
    canvas.append(preview);
    canvas.append(el('p', {
      class: 'ctx-note', html: `${icon('eye')}Simulação de layout — cortes de legenda e proporções seguem as regras de ${esc(S().NETWORKS[p.network].name)}.`,
    }));
    stage.append(canvas);

    /* carrossel + marcadores */
    global.U.on(canvas, 'click', '[data-slide]', (e, t) => {
      e.stopPropagation();
      const n = (st.slide || 0) + Number(t.dataset.slide);
      global.App.go({ slide: Math.max(0, Math.min(p.media.length - 1, n)) }, true);
    });
    global.U.on(canvas, 'click', '[data-pin]', (e, t) => {
      e.stopPropagation();
      global.App.go({ activePin: t.dataset.pin, tab: 'conversa' }, true);
    });
    if (st.arming) {
      global.U.on(canvas, 'click', '[data-pinlayer]', (e, t) => {
        const r = t.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        abrirComentarioComPino(p, { mediaIndex: st.slide || 0, x: +x.toFixed(1), y: +y.toFixed(1) });
      });
    }

    /* --------------------------------------------------------- lateral -- */
    const side = el('aside', { class: 'side' });

    /* cabeçalho */
    const shead = el('div', { class: 'side__head' });
    shead.append(el('div', { class: 'row row--tight', html: `${global.UI.netBadge(p, true)}
      <span style="flex:1;min-width:0">
        <span class="h3 truncate" style="display:block">${esc(p.title)}</span>
        <span class="tiny dim">${esc(S().NETWORKS[p.network].name)} · ${esc(S().FORMATS[p.format].name)}${p.network === 'ads' ? ` em ${esc(S().NETWORKS[p.adPlatform || 'instagram'].name)}` : ''}</span>
      </span>
      ${global.UI.statusChip(p.status)}` }));

    if (p.note) {
      shead.append(el('div', {
        class: 'cmt__pin', style: 'width:auto',
        html: `${icon('sparkles')}<span>${esc(p.note)}</span>`,
      }));
    }

    /* trilha de níveis */
    if (p.levels?.length) {
      const levels = el('div', { class: 'levels' });
      p.levels.forEach((l, i) => {
        const u = St().user(l.approverId);
        const done = l.status === 'aprovado';
        const now = !done && p.levels.slice(0, i).every((x) => x.status === 'aprovado');
        levels.append(el('div', {
          class: `level${done ? ' is-done' : ''}${now && p.status === 'revisao' ? ' is-now' : ''}`,
          html: `<span class="level__i">${done ? icon('check') : i + 1}</span>
            <span class="level__n"><b>${esc(l.name)}</b> · ${esc(u.name)}</span>
            <span class="tiny dim">${l.at ? esc(ago(l.at)) : (l.status === 'alteracoes' ? 'devolveu' : 'pendente')}</span>`,
        }));
      });
      shead.append(levels);
    }
    side.append(shead);

    /* abas */
    const abertos = (p.activity || []).filter((a) => ['comment', 'change', 'suggestion'].includes(a.kind) && !a.resolved).length;
    const tabAtual = st.tab || 'legendas';
    const tabs = el('div', { class: 'side__tabs', role: 'tablist' });
    [
      { id: 'legendas', label: 'Legendas', n: p.captions?.length },
      { id: 'conversa', label: 'Conversa', n: abertos || null },
      { id: 'detalhes', label: 'Detalhes' },
      { id: 'historico', label: 'Histórico' },
    ].forEach((t) => tabs.append(el('button', {
      class: 'tab' + (tabAtual === t.id ? ' is-on' : ''), role: 'tab',
      'aria-selected': tabAtual === t.id ? 'true' : 'false',
      html: `${esc(t.label)}${t.n ? `<span class="tab__n">${t.n}</span>` : ''}`,
      onclick: () => global.App.go({ tab: t.id }, true),
    })));
    side.append(tabs);

    const body = el('div', { class: 'side__body' });
    if (tabAtual === 'legendas') painelLegendas(body, p, admin);
    else if (tabAtual === 'conversa') painelConversa(body, p, st);
    else if (tabAtual === 'detalhes') painelDetalhes(body, p, admin);
    else painelHistorico(body, p);
    side.append(body);

    /* rodapé de decisão */
    side.append(rodape(p, { admin, minhaVez, lvl }));

    root.append(stage, side);
    return root;
  };

  /* ==========================================================================
     ABA — LEGENDAS
     ========================================================================== */
  function painelLegendas(body, p, admin) {
    const cfg = S().NETWORKS[p.network];

    body.append(el('div', {
      class: 'row', html: `<span class="eyebrow" style="flex:1">Opções de legenda</span>
        <span class="tiny dim">${p.chosenCaption !== null ? 'escolhida' : 'nenhuma escolhida'}</span>`,
    }));

    if (!p.captions?.length) {
      body.append(global.UI.empty('edit', 'Sem legenda', 'O criador ainda não escreveu o texto desta peça.'));
    }

    (p.captions || []).forEach((c, i) => {
      const escolhida = p.chosenCaption === i;
      const autor = St().user(c.author);
      const card = el('div', {
        class: 'cap-opt' + (escolhida ? ' is-chosen' : ''), role: 'button', tabindex: '0',
        html: `
        <div class="cap-opt__head">
          <span class="cap-opt__pick"></span>
          <span class="cap-opt__tag">${esc(c.label)}</span>
          <span style="flex:1"></span>
          ${global.UI.counter(c.text, p.network)}
        </div>
        <div class="cap-opt__txt">${richText(c.text)}</div>
        <div class="cap-opt__meta">${global.UI.avatarHTML(autor, 'xs')}<span>${esc(autor.name.split(' ')[0])} · ${esc(ago(c.createdAt))}</span></div>`,
      });
      const escolher = () => {
        St().chooseCaption(p.id, i);
        global.UI.toast(`Legenda “${c.label}” marcada como a escolhida.`, 'ok');
      };
      card.onclick = escolher;
      card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); escolher(); } };

      const acts = el('div', { class: 'row row--tight', style: 'margin-top:4px' });
      acts.append(el('button', {
        class: 'btn btn--ghost btn--sm', html: `${icon('msgPlus')}Sugerir texto`,
        onclick: (e) => { e.stopPropagation(); abrirSugestao(p, i, c); },
      }));
      acts.append(el('button', {
        class: 'btn btn--ghost btn--sm', html: icon('copy'), title: 'Copiar legenda',
        onclick: (e) => { e.stopPropagation(); navigator.clipboard?.writeText(c.text); global.UI.toast('Legenda copiada.', 'ok'); },
      }));
      if (admin) {
        acts.append(el('button', {
          class: 'btn btn--ghost btn--sm', html: icon('edit'), title: 'Editar',
          onclick: (e) => { e.stopPropagation(); editarLegenda(p, c); },
        }));
        if (p.captions.length > 1) acts.append(el('button', {
          class: 'btn btn--ghost btn--sm', html: icon('trash'), title: 'Remover',
          onclick: (e) => { e.stopPropagation(); St().removeCaption(p.id, c.id); },
        }));
      }
      card.append(acts);
      body.append(card);
    });

    if (admin) {
      body.append(el('button', {
        class: 'btn btn--block', html: `${icon('plus')}Adicionar variação de legenda`,
        onclick: () => { St().addCaption(p.id, ''); global.UI.toast('Nova variação criada — escreva o texto.', 'info'); },
      }));
    }

    if (cfg.firstComment) {
      body.append(el('hr', { class: 'divider' }));
      const f = el('div', { class: 'field' });
      f.append(el('label', { class: 'label', html: `${icon('hash')} Primeiro comentário` }));
      const ta = el('textarea', { class: 'textarea', style: 'min-height:64px', placeholder: 'Hashtags que não cabem na legenda…', text: p.firstComment || '', disabled: !admin });
      ta.addEventListener('input', global.U.debounce(() => St().updatePost(p.id, { firstComment: ta.value }, 'post:silent'), 400));
      f.append(ta, el('span', { class: 'hint', text: cfg.note }));
      body.append(f);
    }
  }

  function editarLegenda(p, c) {
    global.UI.modal({
      title: `Editar ${c.label}`, icon: 'edit',
      build: (b) => {
        const ta = el('textarea', { class: 'textarea', style: 'min-height:220px', text: c.text });
        const info = el('div', { class: 'row', html: `<span style="flex:1"></span>${global.UI.counter(c.text, p.network)}` });
        ta.addEventListener('input', () => { info.innerHTML = `<span style="flex:1"></span>${global.UI.counter(ta.value, p.network)}`; });
        b.append(ta, info, el('p', { class: 'hint', text: S().NETWORKS[p.network].note }));
        b._ta = ta;
      },
      foot: (close) => [
        el('button', { class: 'btn', text: 'Cancelar', onclick: close }),
        el('button', {
          class: 'btn btn--primary', text: 'Salvar', onclick: (e) => {
            const ta = e.target.closest('.modal').querySelector('textarea');
            St().updateCaption(p.id, c.id, ta.value);
            close(); global.App.render();
            global.UI.toast('Legenda atualizada.', 'ok');
          },
        }),
      ],
    });
  }

  function abrirSugestao(p, index, c) {
    global.UI.modal({
      title: `Sugerir nova redação · ${c.label}`, icon: 'msgPlus',
      build: (b) => {
        b.append(el('p', { class: 'hint', text: 'Reescreva do seu jeito. O criador recebe a sugestão e decide se aplica — o texto original não é sobrescrito agora.' }));
        b.append(el('textarea', { class: 'textarea', style: 'min-height:180px', text: c.text, id: 'sug-txt' }));
        b.append(el('input', { class: 'input', placeholder: 'Por que essa mudança? (opcional)', id: 'sug-nota' }));
      },
      foot: (close) => [
        el('button', { class: 'btn', text: 'Cancelar', onclick: close }),
        el('button', {
          class: 'btn btn--primary', html: `${icon('send')}Enviar sugestão`, onclick: (e) => {
            const m = e.target.closest('.modal');
            St().suggestCaption(p.id, index, m.querySelector('#sug-txt').value, m.querySelector('#sug-nota').value);
            close();
            global.App.go({ tab: 'conversa' }, true);
            global.UI.toast('Sugestão enviada para o criador.', 'ok');
          },
        }),
      ],
    });
  }

  /* ==========================================================================
     ABA — CONVERSA
     ========================================================================== */
  function painelConversa(body, p, st) {
    const itens = (p.activity || []).filter((a) => ['comment', 'change', 'approve', 'suggestion'].includes(a.kind));
    const admin = St().isAdmin();

    const filtroAbertos = st.onlyOpen !== false;
    body.append(el('div', {
      class: 'row', html: `<span class="eyebrow" style="flex:1">Conversa</span>`,
    }, [el('button', {
      class: 'pill' + (filtroAbertos ? ' is-on' : ''), html: `${icon('filter')}Só pendentes`,
      onclick: () => global.App.go({ onlyOpen: !filtroAbertos }, true),
    })]));

    const visiveis = itens.filter((a) => !filtroAbertos || !a.resolved || a.kind === 'approve');
    if (!visiveis.length) {
      body.append(global.UI.empty('msg', 'Sem pendências', 'Nada em aberto nesta peça.'));
    }

    const thread = el('div', { class: 'thread' });
    visiveis.forEach((a) => thread.append(comentario(p, a, st, admin)));
    body.append(thread);

    /* caixa de novo comentário */
    const box = el('div', { class: 'composer-box' });
    const ta = el('textarea', { class: 'textarea', placeholder: 'Escreva um comentário, aponte um ajuste…', id: 'novo-cmt' });
    const kinds = el('div', { class: 'composer-row' });
    let kind = 'comment';
    let internal = false;
    const kb = global.UI.segmented([
      { id: 'comment', label: 'Comentário', icon: 'msg' },
      { id: 'change', label: 'Pedir ajuste', icon: 'refresh' },
    ], 'comment', (id) => { kind = id; }, { name: 'Tipo' });
    kinds.append(kb);
    if (admin) {
      const sw = el('label', { class: 'switch', html: `<input type="checkbox"><span class="switch__track"></span><span class="tiny muted">Nota interna</span>` });
      sw.querySelector('input').onchange = (e) => { internal = e.target.checked; };
      kinds.append(sw);
    }
    kinds.append(el('span', { class: 'spacer' }));
    kinds.append(el('button', {
      class: 'btn btn--sm', html: `${icon('pin')}No ponto`, title: 'Marcar um ponto na peça',
      onclick: () => global.App.go({ arming: true }, true),
    }));
    const send = el('button', {
      class: 'btn btn--primary btn--sm', html: `${icon('send')}Enviar`,
      onclick: () => {
        if (!ta.value.trim()) { ta.focus(); return; }
        St().comment(p.id, ta.value, { kind, internal });
        ta.value = '';
        global.UI.toast(kind === 'change' ? 'Ajuste solicitado.' : 'Comentário publicado.', 'ok');
      },
    });
    kinds.append(send);
    ta.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send.click(); });
    box.append(ta, kinds);
    box.append(el('span', { class: 'hint', text: 'Ctrl/⌘ + Enter envia.' }));
    body.append(box);
  }

  function comentario(p, a, st, admin) {
    const u = St().user(a.authorId);
    const eu = St().me();
    const kindTag = {
      change: `<span class="cmt__kind cmt__kind--change">${icon('refresh')}ajuste</span>`,
      approve: `<span class="cmt__kind cmt__kind--approve">${icon('check')}aprovou</span>`,
      suggestion: `<span class="cmt__kind">${icon('msgPlus')}sugestão</span>`,
    }[a.kind] || '';
    const interno = a.internal ? `<span class="cmt__kind cmt__kind--internal">${icon('lock')}interno</span>` : '';

    const node = el('div', {
      class: `cmt${a.resolved ? ' is-resolved' : ''}${st.activePin === a.id ? ' is-highlight' : ''}`,
      html: `${global.UI.avatarHTML(u, 'md')}
        <div class="cmt__body">
          <div class="cmt__head">
            <span class="cmt__name">${esc(u.name)}</span>
            <span class="cmt__role">${esc(u.title)}</span>
            ${kindTag}${interno}
            <span class="cmt__time">${esc(ago(a.at))}</span>
          </div>
          <div class="cmt__txt">${richText(a.text)}</div>
        </div>`,
    });
    const bodyEl = node.querySelector('.cmt__body');

    if (a.pin) {
      bodyEl.append(el('button', {
        class: 'cmt__pin', html: `${icon('pin')}mídia ${a.pin.mediaIndex + 1} · ${Math.round(a.pin.x)}% / ${Math.round(a.pin.y)}%`,
        onclick: () => global.App.go({ slide: a.pin.mediaIndex, activePin: a.id }, true),
      }));
    }

    if (a.suggestion) {
      const sug = el('div', {
        class: 'cap-opt', style: 'cursor:default',
        html: `<div class="cap-opt__head"><span class="cap-opt__tag">Redação sugerida</span>
          <span style="flex:1"></span>${global.UI.counter(a.suggestion.text, p.network)}</div>
        <div class="cap-opt__txt">${richText(a.suggestion.text)}</div>`,
      });
      if (admin && !a.suggestion.applied) {
        sug.append(el('button', {
          class: 'btn btn--primary btn--sm', html: `${icon('check')}Aplicar na legenda`,
          onclick: () => { St().applySuggestion(p.id, a.id); global.UI.toast('Redação aplicada.', 'ok'); },
        }));
      } else if (a.suggestion.applied) {
        sug.append(el('span', { class: 'chip chip--sm', html: `${icon('check')}aplicada` }));
      }
      bodyEl.append(sug);
    }

    /* respostas */
    if (a.replies?.length) {
      const rr = el('div', { class: 'cmt__replies' });
      a.replies.forEach((r) => {
        const ru = St().user(r.authorId);
        rr.append(el('div', {
          class: 'cmt', style: 'padding:6px 0', html: `${global.UI.avatarHTML(ru, 'sm')}
            <div class="cmt__body">
              <div class="cmt__head"><span class="cmt__name" style="font-size:var(--t-xs)">${esc(ru.name)}</span>
              <span class="cmt__time">${esc(ago(r.at))}</span></div>
              <div class="cmt__txt" style="font-size:var(--t-xs)">${richText(r.text)}</div>
            </div>`,
        }));
      });
      bodyEl.append(rr);
    }

    /* ações */
    if (a.kind !== 'approve') {
      const acts = el('div', { class: 'cmt__acts' });
      acts.append(el('button', {
        class: 'cmt__act', text: 'Responder',
        onclick: () => {
          if (bodyEl.querySelector('.reply-box')) return;
          const rb = el('div', { class: 'reply-box composer-box', style: 'margin-top:6px' });
          const ta = el('textarea', { class: 'textarea', style: 'min-height:56px', placeholder: `Responder a ${u.name.split(' ')[0]}…` });
          const ok = el('button', {
            class: 'btn btn--primary btn--sm', text: 'Responder',
            onclick: () => { St().reply(p.id, a.id, ta.value); },
          });
          ta.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') ok.click(); });
          rb.append(ta, el('div', { class: 'composer-row' }, [ok, el('button', { class: 'btn btn--ghost btn--sm', text: 'Cancelar', onclick: () => rb.remove() })]));
          bodyEl.append(rb);
          ta.focus();
        },
      }));
      acts.append(el('button', {
        class: 'cmt__act', text: a.resolved ? 'Reabrir' : 'Marcar resolvido',
        onclick: () => St().toggleResolved(p.id, a.id),
      }));
      if (a.authorId === eu.id) {
        acts.append(el('button', { class: 'cmt__act', text: 'Excluir', onclick: () => St().deleteActivity(p.id, a.id) }));
      }
      bodyEl.append(acts);
    }
    return node;
  }

  function abrirComentarioComPino(p, pin) {
    global.UI.modal({
      title: 'Comentar neste ponto', icon: 'pin',
      build: (b) => {
        b.append(el('p', { class: 'hint', html: `Marcador na mídia <b>${pin.mediaIndex + 1}</b>, em ${Math.round(pin.x)}% / ${Math.round(pin.y)}%.` }));
        b.append(el('textarea', { class: 'textarea', id: 'pin-txt', placeholder: 'O que precisa mudar aqui?' }));
      },
      foot: (close) => [
        el('button', { class: 'btn', text: 'Cancelar', onclick: () => { close(); global.App.go({ arming: false }, true); } }),
        el('button', {
          class: 'btn btn--primary', html: `${icon('send')}Comentar`, onclick: (e) => {
            const v = e.target.closest('.modal').querySelector('#pin-txt').value;
            if (!v.trim()) return;
            St().comment(p.id, v, { kind: 'change', pin });
            close();
            global.App.go({ arming: false, tab: 'conversa' }, true);
            global.UI.toast('Marcador criado.', 'ok');
          },
        }),
      ],
    });
  }

  /* ==========================================================================
     ABA — DETALHES
     ========================================================================== */
  function painelDetalhes(body, p, admin) {
    const dl = (pairs) => `<dl class="meta-grid">${pairs.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`;

    body.append(el('div', {
      class: 'stack stack--sm', html: `<span class="eyebrow">Peça</span>` + dl([
        ['Código', esc(p.code)],
        ['Rede', esc(S().NETWORKS[p.network].name) + (p.network === 'ads' ? ` · ${esc(S().NETWORKS[p.adPlatform || 'instagram'].name)}` : '')],
        ['Formato', esc(S().FORMATS[p.format].name)],
        ['Mídias', `${p.media?.length || 0} ${p.media?.length === 1 ? 'arquivo' : 'arquivos'}`],
        ['Proporção', esc(global.Preview.ratioOf(p))],
        ['Prioridade', esc(p.priority || 'normal')],
        ['Agenda', p.scheduledAt ? esc(fmtDate(p.scheduledAt, 'full')) : '<span class="dim">sem data</span>'],
        ['Criada por', esc(St().user(p.createdBy).name) + ' · ' + esc(ago(p.createdAt))],
        ['Atualizada', esc(ago(p.updatedAt))],
        ['Etiquetas', (p.tags || []).map((t) => `<span class="chip chip--sm">${esc(t)}</span>`).join(' ') || '<span class="dim">—</span>'],
        ...(p.link ? [['Link', `<a href="${esc(p.link)}" target="_blank" rel="noopener" style="color:var(--brand-lift)">${esc(p.link)}</a>`]] : []),
      ]),
    }));

    if (p.network === 'ads' && p.ad) {
      body.append(el('hr', { class: 'divider' }));
      body.append(el('div', {
        class: 'stack stack--sm', html: `<span class="eyebrow">Mídia paga</span>` + dl([
          ['Objetivo', esc(p.ad.objective)],
          ['Público', esc(p.ad.audience)],
          ['Verba', `<b>${esc(money(p.ad.budget))}</b>`],
          ['Período', esc(p.ad.period)],
          ['Título', esc(p.ad.headline)],
          ['Descrição', esc(p.ad.description)],
          ['CTA', `<span class="chip chip--sm chip--brand">${esc(p.ad.cta)}</span>`],
          ['Domínio', esc(p.ad.domain)],
        ]),
      }));
    }

    if (p.metrics) {
      body.append(el('hr', { class: 'divider' }));
      body.append(el('div', {
        class: 'stack stack--sm', html: `<span class="eyebrow">Resultado</span>` + dl([
          ['Alcance', `<b>${nfmt(p.metrics.reach)}</b>`],
          ['Curtidas', nfmt(p.metrics.likes)],
          ['Comentários', nfmt(p.metrics.comments)],
          ['Salvos', nfmt(p.metrics.saves)],
        ]),
      }));
    }

    /* mídias */
    body.append(el('hr', { class: 'divider' }));
    body.append(el('span', { class: 'eyebrow', text: 'Mídias' }));
    const strip = el('div', { class: 'media-strip' });
    (p.media || []).forEach((m, i) => strip.append(el('div', {
      class: 'media-thumb', onclick: () => global.App.go({ slide: i }, true),
      html: `${m.src ? `<img src="${esc(m.src)}" alt="${esc(m.alt || '')}">` : ''}
        <span class="media-thumb__n">${i + 1}</span>
        ${m.type === 'video' ? `<span class="media-thumb__type">${icon('play')}</span>` : ''}`,
    })));
    body.append(strip);

    if (admin) {
      body.append(el('div', { class: 'row row--wrap' }, [
        el('button', { class: 'btn btn--sm', html: `${icon('copy')}Duplicar`, onclick: () => { const c = St().duplicatePost(p.id); global.App.go({ view: 'post', postId: c.id }); global.UI.toast('Cópia criada como rascunho.', 'ok'); } }),
        el('button', { class: 'btn btn--sm', html: `${icon('download')}Exportar`, onclick: () => global.App.exportPost(p) }),
        el('button', {
          class: 'btn btn--sm btn--danger', html: `${icon('trash')}Excluir`, onclick: () => global.UI.confirm({
            title: 'Excluir postagem?', text: `${p.code} — ${p.title}. Dá para desfazer logo em seguida.`, ok: 'Excluir', danger: true,
            onOk: () => { St().deletePost(p.id); global.App.go({ view: 'posts' }); global.UI.toast('Postagem excluída. Ctrl+Z desfaz.', 'warn'); },
          }),
        }),
      ]));
    }
  }

  /* ==========================================================================
     ABA — HISTÓRICO
     ========================================================================== */
  function painelHistorico(body, p) {
    body.append(el('span', { class: 'eyebrow', text: 'Linha do tempo' }));
    const feed = el('div', { class: 'feed-list' });
    [...(p.activity || [])].reverse().forEach((a) => {
      const u = St().user(a.authorId);
      const verbo = { comment: 'comentou', change: 'pediu alterações', approve: 'aprovou', caption: '', suggestion: 'sugeriu texto', status: '', system: '' }[a.kind];
      feed.append(el('div', {
        class: 'feed-item', html: `${global.UI.avatarHTML(u, 'sm')}
          <span class="feed-item__body">
            <span class="feed-item__txt"><b>${esc(u.name)}</b> ${esc(verbo)}${verbo ? ' — ' : ' '}${esc(a.text)}</span>
            <span class="feed-item__time">${esc(fmtDate(a.at, 'full'))} · ${esc(ago(a.at))}</span>
          </span>`,
      }));
    });
    body.append(feed);
  }

  /* ==========================================================================
     RODAPÉ DE DECISÃO
     ========================================================================== */
  function rodape(p, { admin, minhaVez, lvl }) {
    const foot = el('div', { class: 'side__foot' });

    if (p.status === 'aprovado' || p.status === 'agendado' || p.status === 'publicado') {
      const quem = [...(p.levels || [])].reverse().find((l) => l.status === 'aprovado');
      foot.append(el('div', {
        class: 'verdict', 'data-status': p.status, html: `
        <span class="verdict__icon">${icon(S().STATUSES[p.status].icon)}</span>
        <span style="min-width:0">
          <span class="h3" style="display:block">${esc(S().STATUSES[p.status].name)}</span>
          <span class="tiny dim">${quem ? `por ${esc(St().user(quem.approverId).name)} · ${esc(ago(quem.at))}` : ''}</span>
        </span>`,
      }));
      if (admin && p.status === 'aprovado') {
        foot.append(el('button', { class: 'btn btn--primary btn--block', html: `${icon('calendar')}Agendar publicação`, onclick: () => agendar(p) }));
      }
      if (admin && p.status !== 'publicado') {
        foot.append(el('button', { class: 'btn btn--ghost btn--block', html: `${icon('undo')}Reabrir para edição`, onclick: () => St().setStatus(p.id, 'rascunho') }));
      }
      return foot;
    }

    if (p.status === 'rascunho') {
      foot.append(el('div', { class: 'row', html: `<span class="tiny dim" style="flex:1">Rascunho — ninguém foi notificado ainda.</span>` }));
      if (admin) {
        foot.append(el('button', {
          class: 'btn btn--primary btn--block', html: `${icon('send')}Enviar para aprovação`,
          onclick: () => {
            if (!p.media?.length) return global.UI.toast('Adicione ao menos uma mídia antes de enviar.', 'warn');
            if (!p.captions?.length || !p.captions.some((c) => c.text.trim())) return global.UI.toast('Escreva ao menos uma legenda.', 'warn');
            St().submitForApproval(p.id);
            global.UI.toast('Enviada. Os aprovadores foram avisados.', 'ok');
          },
        }));
      }
      return foot;
    }

    if (p.status === 'alteracoes') {
      const pedido = [...(p.activity || [])].reverse().find((a) => a.kind === 'change' && !a.resolved);
      if (pedido) {
        const u = St().user(pedido.authorId);
        foot.append(el('div', {
          class: 'verdict', 'data-status': 'alteracoes', html: `
          <span class="verdict__icon">${icon('refresh')}</span>
          <span style="min-width:0">
            <span class="tiny" style="display:block"><b>${esc(u.name)}</b> pediu ajustes</span>
            <span class="tiny dim clamp-2">${esc(pedido.text)}</span>
          </span>`,
        }));
      }
      if (admin) {
        foot.append(el('button', {
          class: 'btn btn--primary btn--block', html: `${icon('send')}Reenviar para aprovação`,
          onclick: () => { St().submitForApproval(p.id); global.UI.toast('Reenviada para aprovação.', 'ok'); },
        }));
      } else {
        foot.append(el('p', { class: 'tiny dim', text: 'Aguardando o time ajustar a peça.' }));
      }
      return foot;
    }

    /* em revisão */
    if (minhaVez) {
      foot.append(el('div', { class: 'row', html: `<span class="tiny dim" style="flex:1">${lvl ? esc(lvl.name) : 'Decisão'} — sua vez.</span>` }));
      const dec = el('div', { class: 'decision' });
      dec.append(el('button', {
        class: 'btn btn--danger', html: `${icon('refresh')}Pedir alterações`,
        onclick: () => pedirAlteracoes(p),
      }));
      dec.append(el('button', {
        class: 'btn btn--ok', html: `${icon('check')}Aprovar`,
        onclick: () => aprovar(p),
      }));
      foot.append(dec);
    } else {
      const u = lvl ? St().user(lvl.approverId) : null;
      foot.append(el('div', {
        class: 'row', html: `${u ? global.UI.avatarHTML(u, 'sm') : ''}
        <span class="tiny dim" style="flex:1">${u ? `Aguardando ${esc(u.name)} · ${esc(lvl.name)}` : 'Aguardando aprovação.'}</span>`,
      }));
      if (St().isAdmin()) {
        foot.append(el('button', {
          class: 'btn btn--block btn--sm', html: `${icon('bell')}Lembrar aprovador`,
          onclick: () => global.UI.toast(`Lembrete enviado para ${u?.name || 'o aprovador'}.`, 'ok'),
        }));
      }
    }
    return foot;
  }

  function aprovar(p) {
    const semLegenda = p.captions?.length > 1 && p.chosenCaption === null;
    global.UI.modal({
      title: 'Aprovar postagem', icon: 'checkCircle',
      build: (b) => {
        b.append(el('p', { class: 'muted', html: `<b>${esc(p.code)}</b> — ${esc(p.title)}` }));
        if (semLegenda) {
          b.append(el('div', {
            class: 'verdict', 'data-status': 'alteracoes',
            html: `<span class="verdict__icon">${icon('alert')}</span><span class="tiny">Há ${p.captions.length} opções de legenda e nenhuma escolhida. Escolha uma antes de aprovar.</span>`,
          }));
          const sel = el('select', { class: 'select', id: 'cap-sel' });
          sel.append(el('option', { value: '', text: 'Escolher legenda…' }));
          p.captions.forEach((c, i) => sel.append(el('option', { value: i, text: `${c.label} — ${c.text.slice(0, 60)}…` })));
          b.append(sel);
        }
        b.append(el('textarea', { class: 'textarea', id: 'apr-nota', placeholder: 'Observação para o time (opcional)', style: 'min-height:80px' }));
      },
      foot: (close) => [
        el('button', { class: 'btn', text: 'Cancelar', onclick: close }),
        el('button', {
          class: 'btn btn--ok', html: `${icon('check')}Aprovar`, onclick: (e) => {
            const m = e.target.closest('.modal');
            const sel = m.querySelector('#cap-sel');
            if (sel && sel.value === '') return global.UI.toast('Escolha uma legenda para aprovar.', 'warn');
            if (sel) St().chooseCaption(p.id, +sel.value);
            St().approve(p.id, m.querySelector('#apr-nota').value);
            close();
            global.UI.toast('Aprovada. 🎉', 'ok');
          },
        }),
      ],
    });
  }

  function pedirAlteracoes(p) {
    global.UI.modal({
      title: 'Pedir alterações', icon: 'refresh',
      build: (b) => {
        b.append(el('p', { class: 'hint', text: 'Seja específico: o que muda, em qual mídia, e por quê. O time recebe isso como pendência.' }));
        b.append(el('textarea', { class: 'textarea', id: 'alt-txt', style: 'min-height:140px', placeholder: 'Ex.: trocar a terceira imagem, o render está escuro demais para o feed.' }));
      },
      foot: (close) => [
        el('button', { class: 'btn', text: 'Cancelar', onclick: close }),
        el('button', {
          class: 'btn btn--danger', html: `${icon('send')}Enviar pedido`, onclick: (e) => {
            const v = e.target.closest('.modal').querySelector('#alt-txt').value;
            if (!v.trim()) return global.UI.toast('Escreva o que precisa mudar.', 'warn');
            St().requestChanges(p.id, v);
            close();
            global.UI.toast('Pedido enviado ao time.', 'ok');
          },
        }),
      ],
    });
  }

  function agendar(p) {
    const base = p.scheduledAt ? new Date(p.scheduledAt) : new Date(Date.now() + 864e5);
    global.UI.modal({
      title: 'Agendar publicação', icon: 'calendar',
      build: (b) => {
        b.append(el('div', {
          class: 'field', html: `<label class="label" for="ag-dt">Data e hora</label>
          <input class="input" type="datetime-local" id="ag-dt" value="${base.getFullYear()}-${global.U.pad(base.getMonth() + 1)}-${global.U.pad(base.getDate())}T${global.U.pad(base.getHours())}:${global.U.pad(base.getMinutes())}">`,
        }));
        b.append(el('p', { class: 'hint', text: 'A publicação de fato acontece na ferramenta de postagem — aqui fica o compromisso combinado com o cliente.' }));
      },
      foot: (close) => [
        el('button', { class: 'btn', text: 'Cancelar', onclick: close }),
        el('button', {
          class: 'btn btn--primary', text: 'Agendar', onclick: (e) => {
            const v = e.target.closest('.modal').querySelector('#ag-dt').value;
            if (!v) return;
            St().schedule(p.id, new Date(v).toISOString());
            close(); global.UI.toast('Agendada.', 'ok');
          },
        }),
      ],
    });
  }

  global.Views._agendar = agendar;
})(window);

/* ==========================================================================
   APROVA — compositor (admin) e ajustes
   ========================================================================== */
(function (global) {
  'use strict';
  const { $, $$, el, esc, icon, uid, pad, debounce, shrinkImage } = global.U;
  const S = () => global.SEED;
  const St = () => global.Store;

  /* O compositor trabalha sobre um rascunho local: assim o que você digita
     não dispara um re-render do app inteiro e o cursor não pula. */
  global.Views.compose = function (st) {
    const editing = st.postId ? St().post(st.postId) : null;
    const chave = st.postId || 'novo';
    /* o rascunho vive no estado do app: sobrevive a um re-render sem perder
       o que já foi digitado */
    const draft = (st.draft && st.draft.__for === chave) ? st.draft : Object.assign({ __for: chave }, editing ? structuredClone(editing) : {
      id: null, code: '—', network: 'instagram', adPlatform: 'instagram', format: 'single',
      title: '', media: [], captions: [{ id: uid('cap'), label: 'Opção A', text: '', author: St().me().id, createdAt: new Date().toISOString() }],
      chosenCaption: null, firstComment: '', link: '', status: 'rascunho', priority: 'normal',
      tags: [], scheduledAt: null, note: '',
      ad: { objective: 'Geração de leads', audience: '', budget: 5000, period: '', headline: '', description: '', domain: 'bracerumpark.com', cta: 'Saiba mais' },
    });
    st.draft = draft;

    const root = el('div', { class: 'view__inner view-enter' });
    root.append(el('div', {
      class: 'page-head', html: `<div class="page-head__txt">
        <div class="eyebrow">${editing ? 'Editando ' + esc(editing.code) : 'Nova peça'}</div>
        <h1 class="h1">${editing ? 'Editar postagem' : 'Criar postagem'}</h1>
        <p class="muted">A pré-visualização à direita acompanha o que você escreve.</p>
      </div>`,
    }, [el('button', { class: 'btn btn--ghost', html: `${icon('arrowL')}Voltar`, onclick: () => global.App.back() })]));

    const wrap = el('div', { class: 'composer' });
    const form = el('div', { class: 'stack stack--lg' });
    const previewCol = el('div', { class: 'composer__preview' });
    wrap.append(form, previewCol);
    root.append(wrap);

    /* ------------------------------------------------------- preview -- */
    let previewCtx = { context: 'feed', device: 'mobile', slide: 0 };
    function refresh() {
      previewCol.replaceChildren();
      const bar = el('div', { class: 'row row--tight', style: 'flex-wrap:wrap;justify-content:center' });
      bar.append(global.UI.segmented([
        { id: 'feed', label: 'Feed', icon: 'list' }, { id: 'profile', label: 'Perfil', icon: 'grid' },
      ], previewCtx.context, (id) => { previewCtx.context = id; refresh(); }, { name: 'Contexto' }));
      bar.append(global.UI.segmented([
        { id: 'mobile', label: 'Mobile', icon: 'phone' }, { id: 'desktop', label: 'Desktop', icon: 'monitor' },
      ], previewCtx.device, (id) => { previewCtx.device = id; refresh(); }, { name: 'Dispositivo' }));
      previewCol.append(bar);

      const node = global.Preview.render(draft, {
        ...previewCtx, mode: St().settings().previewMode,
        slide: Math.min(previewCtx.slide, Math.max(0, draft.media.length - 1)),
      });
      global.U.on(node, 'click', '[data-slide]', (e, t) => {
        e.stopPropagation();
        previewCtx.slide = Math.max(0, Math.min(draft.media.length - 1, previewCtx.slide + Number(t.dataset.slide)));
        refresh();
      });
      previewCol.append(node);
      previewCol.append(el('p', { class: 'ctx-note', html: `${icon('eye')}Simulação de layout.` }));
    }
    const refreshSoon = debounce(refresh, 220);

    /* ------------------------------------------------------- 1. rede --- */
    const secRede = painel('Rede e formato', 'target');
    const picker = el('div', { class: 'picker' });
    Object.values(S().NETWORKS).forEach((n) => {
      const b = el('button', {
        class: 'pick' + (draft.network === n.id ? ' is-on' : ''),
        'data-net': n.id === 'ads' ? 'ads' : n.id,
        html: `<span class="pick__ic">${icon(n.icon)}</span><span class="pick__n">${esc(n.name)}</span>
          <span class="pick__d">${n.id === 'ads' ? 'peça paga' : '@' + esc(global.Store.get().brand.handles[n.id] || n.name)}</span>`,
        onclick: () => {
          draft.network = n.id;
          if (!n.formats.includes(draft.format)) draft.format = n.formats[0];
          rebuild();
        },
      });
      picker.append(b);
    });
    secRede.body.append(picker);

    if (draft.network === 'ads') {
      const sel = el('div', { class: 'field' });
      sel.append(el('label', { class: 'label', text: 'Veicular em' }));
      const seg = global.UI.segmented(
        ['instagram', 'facebook', 'linkedin'].map((k) => ({ id: k, label: S().NETWORKS[k].name, icon: S().NETWORKS[k].icon })),
        draft.adPlatform || 'instagram', (id) => { draft.adPlatform = id; refresh(); }, { brand: true, name: 'Plataforma' });
      sel.append(seg);
      secRede.body.append(sel);
    }

    const fmts = el('div', { class: 'picker' });
    S().NETWORKS[draft.network].formats.forEach((fid) => {
      const f = S().FORMATS[fid];
      fmts.append(el('button', {
        class: 'pick' + (draft.format === fid ? ' is-on' : ''),
        html: `<span class="pick__ic">${icon(f.icon)}</span><span class="pick__n">${esc(f.name)}</span>
          <span class="pick__d">${esc(proporcao(f.ratio[draft.network === 'ads' ? (draft.adPlatform || 'instagram') : draft.network]))}</span>`,
        onclick: () => { draft.format = fid; rebuild(); },
      }));
    });
    secRede.body.append(el('label', { class: 'label', text: 'Formato' }), fmts);
    form.append(secRede.panel);

    /* ------------------------------------------------------ 2. mídias -- */
    const secMedia = painel('Mídias', 'image');
    const drop = el('label', {
      class: 'drop', html: `<span class="drop__ic">${icon('upload')}</span>
        <span class="h3">Arraste arquivos aqui</span>
        <span class="hint">JPG, PNG ou MP4 · ou clique para escolher</span>
        <input type="file" multiple accept="image/*,video/*">`,
    });
    const input = drop.querySelector('input');
    async function receber(files) {
      const novos = [];
      for (const f of [...files]) {
        try {
          if (f.type.startsWith('video/')) {
            novos.push({ id: uid('md'), type: 'video', src: await global.U.readAsURL(f), alt: f.name, poster: '' });
          } else {
            const r = await shrinkImage(f);
            novos.push({ id: uid('md'), type: 'image', src: r.src, alt: f.name });
          }
        } catch (e) { global.UI.toast(`Não consegui ler ${f.name}.`, 'err'); }
      }
      if (!novos.length) return;
      draft.media.push(...novos);
      if (draft.format === 'single' && draft.media.length > 1) draft.format = 'carousel';
      global.UI.toast(`${novos.length} ${novos.length === 1 ? 'arquivo adicionado' : 'arquivos adicionados'}.`, 'ok');
      rebuild();
    }
    input.onchange = (e) => receber(e.target.files);
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
    drop.addEventListener('drop', (e) => receber(e.dataTransfer.files));
    secMedia.body.append(drop);

    if (draft.media.length) {
      const strip = el('div', { class: 'media-strip' });
      draft.media.forEach((m, i) => {
        const th = el('div', {
          class: 'media-thumb', draggable: 'true', 'data-i': i,
          html: `${m.src ? `<img src="${esc(m.src)}" alt="">` : ''}
            <span class="media-thumb__n">${i + 1}</span>
            ${m.type === 'video' ? `<span class="media-thumb__type">${icon('play')}</span>` : ''}
            <button class="media-thumb__x" title="Remover">${icon('x')}</button>`,
        });
        th.querySelector('.media-thumb__x').onclick = (e) => {
          e.stopPropagation();
          draft.media.splice(i, 1);
          rebuild();
        };
        th.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(i)); th.classList.add('is-dragging'); });
        th.addEventListener('dragend', () => th.classList.remove('is-dragging'));
        th.addEventListener('dragover', (e) => e.preventDefault());
        th.addEventListener('drop', (e) => {
          e.preventDefault();
          const from = Number(e.dataTransfer.getData('text/plain'));
          if (Number.isNaN(from) || from === i) return;
          const [mv] = draft.media.splice(from, 1);
          draft.media.splice(i, 0, mv);
          rebuild();
        });
        strip.append(th);
      });
      secMedia.body.append(el('label', { class: 'label', text: 'Ordem no carrossel — arraste para reordenar' }), strip);
    }

    /* acervo do projeto */
    /* o estado aberto/fechado vive no rascunho: escolher uma imagem redesenha
       a tela e a gaveta não pode fechar na cara de quem está escolhendo */
    const detAcervo = el('details', { style: 'margin-top:var(--s-2)', open: !!draft.__libOpen });
    detAcervo.addEventListener('toggle', () => { draft.__libOpen = detAcervo.open; });
    detAcervo.append(el('summary', { class: 'label', style: 'cursor:pointer', text: 'Usar imagem do acervo' }));
    const lib = el('div', { class: 'lib', style: 'margin-top:var(--s-3)' });
    St().get().library.forEach((m) => {
      const on = draft.media.some((x) => x.src === m.src);
      lib.append(el('button', {
        class: 'lib__it' + (on ? ' is-on' : ''), title: m.alt,
        html: `<img src="${esc(m.src)}" alt="${esc(m.alt)}" loading="lazy">`,
        onclick: () => {
          const idx = draft.media.findIndex((x) => x.src === m.src);
          if (idx >= 0) draft.media.splice(idx, 1);
          else draft.media.push({ id: uid('md'), type: 'image', src: m.src, alt: m.alt });
          if (draft.format === 'single' && draft.media.length > 1) draft.format = 'carousel';
          rebuild();
        },
      }));
    });
    detAcervo.append(lib);
    secMedia.body.append(detAcervo);
    form.append(secMedia.panel);

    /* ----------------------------------------------------- 3. legendas - */
    const secCap = painel('Legendas', 'edit');
    secCap.body.append(el('p', { class: 'hint', text: 'Escreva mais de uma versão quando quiser que o aprovador escolha. Ele marca a preferida e o histórico registra quem decidiu.' }));

    draft.captions.forEach((c, i) => {
      const f = el('div', { class: 'field' });
      const head = el('div', { class: 'row row--tight' });
      head.append(el('span', { class: 'label', text: c.label }));
      head.append(el('span', { class: 'spacer' }));
      const cnt = el('span', { class: 'row row--tight', html: global.UI.counter(c.text, draft.network) });
      head.append(cnt);
      if (draft.captions.length > 1) head.append(el('button', {
        class: 'btn btn--ghost btn--sm', html: icon('trash'), title: 'Remover variação',
        onclick: () => { draft.captions.splice(i, 1); rebuild(); },
      }));
      const ta = el('textarea', {
        class: 'textarea', style: 'min-height:130px', text: c.text,
        placeholder: i === 0 ? 'O texto que vai ao ar…' : 'Variação para teste…',
      });
      ta.addEventListener('input', () => {
        c.text = ta.value;
        cnt.innerHTML = global.UI.counter(c.text, draft.network);
        refreshSoon();
      });
      f.append(head, ta);
      secCap.body.append(f);
    });
    secCap.body.append(el('button', {
      class: 'btn btn--sm', html: `${icon('plus')}Nova variação`,
      onclick: () => {
        draft.captions.push({ id: uid('cap'), label: `Opção ${String.fromCharCode(65 + draft.captions.length)}`, text: '', author: St().me().id, createdAt: new Date().toISOString() });
        rebuild();
      },
    }));

    if (S().NETWORKS[draft.network].firstComment) {
      const f = el('div', { class: 'field' });
      f.append(el('label', { class: 'label', text: 'Primeiro comentário (hashtags)' }));
      const ta = el('textarea', { class: 'textarea', style: 'min-height:64px', text: draft.firstComment, placeholder: '#BracerumPark #Villeta…' });
      ta.addEventListener('input', () => { draft.firstComment = ta.value; });
      f.append(ta);
      secCap.body.append(f);
    }
    form.append(secCap.panel);

    /* ----------------------------------------------- 4. mídia paga ----- */
    if (draft.network === 'ads') {
      const secAd = painel('Mídia paga', 'megaphone');
      const g = el('div', { class: 'stack' });
      g.append(campo('Objetivo', selectDe(S().OBJECTIVES, draft.ad.objective, (v) => { draft.ad.objective = v; })));
      g.append(campo('Público-alvo', inputDe(draft.ad.audience, 'Ex.: diretores industriais · BR · 35-60', (v) => { draft.ad.audience = v; })));
      const dois = el('div', { class: 'row', style: 'align-items:flex-end;gap:var(--s-3)' });
      dois.append(campo('Verba (R$)', inputDe(draft.ad.budget, '5000', (v) => { draft.ad.budget = Number(v) || 0; }, 'number')));
      dois.append(campo('Período', inputDe(draft.ad.period, '01/09 → 30/09', (v) => { draft.ad.period = v; })));
      g.append(dois);
      g.append(campo('Título do anúncio', inputDe(draft.ad.headline, 'Até 40 caracteres', (v) => { draft.ad.headline = v; refreshSoon(); })));
      g.append(campo('Descrição', inputDe(draft.ad.description, 'Linha de apoio', (v) => { draft.ad.description = v; refreshSoon(); })));
      const dois2 = el('div', { class: 'row', style: 'align-items:flex-end;gap:var(--s-3)' });
      dois2.append(campo('Botão (CTA)', selectDe(S().CTAS, draft.ad.cta, (v) => { draft.ad.cta = v; refreshSoon(); })));
      dois2.append(campo('Domínio', inputDe(draft.ad.domain, 'bracerumpark.com', (v) => { draft.ad.domain = v; refreshSoon(); })));
      g.append(dois2);
      secAd.body.append(g);
      form.append(secAd.panel);
    }

    /* ------------------------------------------------- 5. organização -- */
    const secOrg = painel('Organização', 'folder');
    secOrg.body.append(campo('Título interno', inputDe(draft.title, 'Como o time chama esta peça', (v) => { draft.title = v; })));
    const linha = el('div', { class: 'row', style: 'align-items:flex-end;gap:var(--s-3);flex-wrap:wrap' });
    linha.append(campo('Prioridade', selectDe(['baixa', 'normal', 'alta'], draft.priority, (v) => { draft.priority = v; })));
    const dt = draft.scheduledAt ? new Date(draft.scheduledAt) : null;
    linha.append(campo('Agendar para', inputDe(
      dt ? `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}` : '',
      '', (v) => { draft.scheduledAt = v ? new Date(v).toISOString() : null; }, 'datetime-local')));
    secOrg.body.append(linha);
    secOrg.body.append(campo('Etiquetas (separadas por vírgula)', inputDe((draft.tags || []).join(', '), 'Institucional, Obras', (v) => { draft.tags = v.split(',').map((x) => x.trim()).filter(Boolean); })));
    secOrg.body.append(campo('Link', inputDe(draft.link, 'https://…', (v) => { draft.link = v; })));
    const notaF = el('div', { class: 'field' });
    notaF.append(el('label', { class: 'label', text: 'Recado para quem vai aprovar' }));
    const notaTa = el('textarea', { class: 'textarea', style: 'min-height:74px', text: draft.note, placeholder: 'O que você precisa que ele olhe com atenção?' });
    notaTa.addEventListener('input', () => { draft.note = notaTa.value; });
    notaF.append(notaTa);
    secOrg.body.append(notaF);
    form.append(secOrg.panel);

    /* ---------------------------------------------------------- salvar - */
    const acts = el('div', { class: 'row row--wrap composer__acts' });
    const salvar = (enviar) => {
      if (!draft.title.trim()) draft.title = draft.captions[0]?.text.slice(0, 48) || 'Postagem sem título';
      if (enviar) {
        if (!draft.media.length) return global.UI.toast('Adicione ao menos uma mídia.', 'warn');
        if (!draft.captions.some((c) => c.text.trim())) return global.UI.toast('Escreva ao menos uma legenda.', 'warn');
      }
      const limpo = { ...draft };
      delete limpo.__for; delete limpo.__libOpen;
      let id;
      if (editing) { St().updatePost(editing.id, limpo); id = editing.id; }
      else { id = St().createPost({ ...limpo, id: undefined, code: undefined }).id; }
      st.draft = null;
      if (enviar) St().submitForApproval(id);
      global.UI.toast(enviar ? 'Enviada para aprovação.' : 'Rascunho salvo.', 'ok');
      global.App.go({ view: 'post', postId: id, tab: 'legendas' });
    };
    acts.append(el('button', { class: 'btn', html: `${icon('folder')}Salvar rascunho`, onclick: () => salvar(false) }));
    acts.append(el('button', { class: 'btn btn--primary', html: `${icon('send')}Salvar e enviar para aprovação`, onclick: () => salvar(true) }));
    form.append(acts);

    refresh();
    return root;

    /* -------- fábricas locais -------- */
    function painel(titulo, ic) {
      const panel = el('section', { class: 'panel' });
      panel.append(el('div', { class: 'panel__head', html: `<span class="net-badge" style="--nc:var(--brand)">${icon(ic)}</span><span class="h3">${esc(titulo)}</span>` }));
      const body = el('div', { class: 'panel__body stack' });
      panel.append(body);
      return { panel, body };
    }
    function campo(label, control) {
      const f = el('div', { class: 'field', style: 'flex:1;min-width:150px' });
      f.append(el('label', { class: 'label', text: label }), control);
      return f;
    }
    function inputDe(val, ph, onInput, type = 'text') {
      const i = el('input', { class: 'input', type, value: val ?? '', placeholder: ph || '' });
      i.addEventListener('input', () => onInput(i.value));
      return i;
    }
    function selectDe(opts, val, onChange) {
      const s = el('select', { class: 'select' });
      opts.forEach((o) => s.append(el('option', { value: o, text: o, selected: o === val })));
      s.addEventListener('change', () => onChange(s.value));
      return s;
    }
    function rebuild() { global.App.render(); }
    function proporcao(r) { return ({ '1': '1:1', '1.91': '1,91:1' })[r] || r || ''; }
  };

  /* ==========================================================================
     AJUSTES
     ========================================================================== */
  global.Views.settings = function () {
    const root = el('div', { class: 'view__inner view-enter', style: 'max-width:860px' });
    const s = St().settings();

    root.append(el('div', {
      class: 'page-head', html: `<div class="page-head__txt">
        <div class="eyebrow">Configuração</div><h1 class="h1">Ajustes</h1>
        <p class="muted">Como o fluxo de aprovação se comporta.</p></div>`,
    }));

    /* fluxo */
    const f = painelSimples('Fluxo de aprovação', 'target');
    f.body.append(linhaSwitch('Aprovação em dois níveis',
      'Revisão interna antes do aval do cliente. Vale para peças novas.',
      s.requireTwoLevels, (v) => St().setSetting('requireTwoLevels', v)));
    f.body.append(linhaSwitch('Travar edição após aprovar',
      'Depois do aval, mudar a peça exige reabrir para edição — e isso fica no histórico.',
      s.lockApproved, (v) => St().setSetting('lockApproved', v)));
    f.body.append(linhaSwitch('Avisar em cada comentário',
      'Notificação a cada comentário, não só nas decisões.',
      s.notifyOnComment, (v) => St().setSetting('notifyOnComment', v)));
    root.append(f.panel);

    /* aparência */
    const a = painelSimples('Aparência', 'sun');
    a.body.append(el('div', { class: 'row' }, [
      el('span', { class: 'stack stack--sm', html: '<b>Tema do painel</b><span class="tiny dim">O preview das redes tem tema próprio.</span>' }),
      el('span', { class: 'spacer' }),
      global.UI.segmented([{ id: 'dark', label: 'Escuro', icon: 'moon' }, { id: 'light', label: 'Claro', icon: 'sun' }],
        s.theme, (v) => { St().setSetting('theme', v); document.documentElement.dataset.theme = v; }, { brand: true, name: 'Tema' }),
    ]));
    a.body.append(el('div', { class: 'row' }, [
      el('span', { class: 'stack stack--sm', html: '<b>Tema das redes no preview</b><span class="tiny dim">Simule o feed claro ou escuro do usuário final.</span>' }),
      el('span', { class: 'spacer' }),
      global.UI.segmented([{ id: 'light', label: 'Claro', icon: 'sun' }, { id: 'dark', label: 'Escuro', icon: 'moon' }],
        s.previewMode, (v) => St().setSetting('previewMode', v), { brand: true, name: 'Tema do preview' }),
    ]));
    root.append(a.panel);

    /* pessoas */
    const p = painelSimples('Pessoas', 'users');
    St().get().users.forEach((u) => {
      p.body.append(el('div', {
        class: 'row', html: `${global.UI.avatarHTML(u, 'md')}
        <span style="flex:1;min-width:0"><b>${esc(u.name)}</b><br><span class="tiny dim">${esc(u.title)}</span></span>
        <span class="chip chip--sm${u.role === 'approver' ? ' chip--brand' : ''}">${u.role === 'admin' ? 'Administrador' : 'Aprovador'}</span>`,
      }));
    });
    p.body.append(el('p', { class: 'hint', text: 'Nesta demonstração as contas são fixas. Em produção, entram convites por e-mail e link de acesso para convidado — o aprovador não precisa de conta paga.' }));
    root.append(p.panel);

    /* dados */
    const d = painelSimples('Dados', 'folder');
    d.body.append(el('p', { class: 'hint', text: 'Tudo fica no navegador (localStorage). Nada sai deste dispositivo.' }));
    d.body.append(el('div', { class: 'row row--wrap' }, [
      el('button', { class: 'btn', html: `${icon('download')}Exportar plano (JSON)`, onclick: () => global.App.exportAll() }),
      el('button', { class: 'btn', html: `${icon('copy')}Copiar resumo`, onclick: () => global.App.copySummary() }),
      el('button', {
        class: 'btn btn--danger', html: `${icon('refresh')}Restaurar demonstração`,
        onclick: () => global.UI.confirm({
          title: 'Restaurar dados de demonstração?', danger: true, ok: 'Restaurar',
          text: 'Todas as postagens, comentários e decisões criados por você serão apagados.',
          onOk: () => { St().reset(); global.UI.toast('Dados restaurados.', 'ok'); },
        }),
      }),
    ]));
    root.append(d.panel);

    return root;

    function painelSimples(t, ic) {
      const panel = el('section', { class: 'panel', style: 'margin-bottom:var(--s-4)' });
      panel.append(el('div', { class: 'panel__head', html: `<span class="net-badge" style="--nc:var(--brand)">${icon(ic)}</span><span class="h3">${esc(t)}</span>` }));
      const body = el('div', { class: 'panel__body stack' });
      panel.append(body);
      return { panel, body };
    }
    function linhaSwitch(titulo, desc, on, onChange) {
      const row = el('div', { class: 'row' });
      row.append(el('span', { class: 'stack stack--sm', html: `<b>${esc(titulo)}</b><span class="tiny dim">${esc(desc)}</span>` }));
      row.append(el('span', { class: 'spacer' }));
      const sw = el('label', { class: 'switch', html: `<input type="checkbox" ${on ? 'checked' : ''}><span class="switch__track"></span>` });
      sw.querySelector('input').onchange = (e) => onChange(e.target.checked);
      row.append(sw);
      return row;
    }
  };
})(window);
