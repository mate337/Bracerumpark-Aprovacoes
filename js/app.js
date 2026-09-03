/* ==========================================================================
   APROVA — casca do aplicativo
   Roteador simples por hash, navegação, atalhos e a porta de entrada.
   ========================================================================== */
(function (global) {
  'use strict';
  const { $, $$, el, esc, icon, fmtDate, ago, debounce, animate, moveThumb } = global.U;
  const S = () => global.SEED;
  const St = () => global.Store;

  const App = { state: null };
  global.App = App;

  const INICIAL = {
    view: 'dashboard', postId: null,
    /* no celular o quadro em colunas obriga a arrastar de lado; a grade
       de cartões é a leitura natural */
    mode: matchMedia('(max-width: 900px)').matches ? 'grid' : 'board',
    filters: {}, query: '',
    tab: 'legendas', context: 'feed', device: 'mobile', slide: 0, net: null, expanded: false,
    arming: false, activePin: null, onlyOpen: true, calRef: null, draft: null,
  };
  App.state = { ...INICIAL };
  const historico = [];

  /* ========================================================== roteamento = */
  function toHash(s) {
    if (s.view === 'post') return `#/peca/${s.postId}`;
    if (s.view === 'compose') return s.postId ? `#/editar/${s.postId}` : '#/nova';
    return { dashboard: '#/', posts: '#/postagens', calendar: '#/calendario', settings: '#/ajustes' }[s.view] || '#/';
  }
  function fromHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [a, b] = h.split('/');
    if (a === 'peca' && b) return { view: 'post', postId: b };
    if (a === 'editar' && b) return { view: 'compose', postId: b };
    if (a === 'nova') return { view: 'compose', postId: null };
    if (a === 'postagens') return { view: 'posts' };
    if (a === 'calendario') return { view: 'calendar' };
    if (a === 'ajustes') return { view: 'settings' };
    return { view: 'dashboard' };
  }

  /**
   * Navega. `shallow` = só ajusta estado local da tela (aba, dispositivo…),
   * sem entrar no histórico.
   */
  App.go = function (patch, shallow = false) {
    const antes = App.state.view + ':' + App.state.postId;
    if (!shallow && patch.view) {
      historico.push({ ...App.state });
      // trocar de peça zera o estado local da tela
      Object.assign(App.state, { slide: 0, net: null, expanded: false, arming: false, activePin: null, tab: 'legendas', context: 'feed' });
      if (patch.view !== 'compose') App.state.draft = null;
    }
    Object.assign(App.state, patch);
    if (patch.filterStatus) { App.state.filters = { status: patch.filterStatus }; App.state.view = 'posts'; }
    const novo = App.state.view + ':' + App.state.postId;
    if (!shallow && antes !== novo) {
      const h = toHash(App.state);
      if (location.hash !== h) history.pushState(null, '', h);
    }
    App.render();
  };

  App.back = function () {
    const prev = historico.pop();
    if (prev) { App.state = prev; history.replaceState(null, '', toHash(prev)); App.render(); }
    else App.go({ view: 'posts' });
  };

  App.setFilters = function (f) { App.state.filters = f; App.render(); };

  /* ============================================================== render = */
  let raf = 0;
  App.render = function () {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(desenhar);
  };

  /* enquanto a instalação está na tela, nada redesenha por cima dela — a
     própria conexão dispara um "aprova:change" no meio do caminho */
  let instalando = false;

  function desenhar() {
    /* Não existe mais "modo local": sem um lugar comum, não há aplicativo —
       só a tela que o instala. */
    if (!global.Cloud.isOn()) return telaInstalacao();
    if (instalando) return;
    $('#setup')?.remove();

    const me = St().me();
    if (!me) return portao();

    const app = $('#app');
    app.hidden = false;
    $('#gate')?.remove();

    desenharRail();
    desenharTopbar();
    desenharTabbar();

    const host = $('#view');
    const s = App.state;
    let node;
    try {
      node = ({
        dashboard: global.Views.dashboard,
        posts: global.Views.posts,
        post: global.Views.post,
        compose: global.Views.compose,
        calendar: global.Views.calendar,
        settings: global.Views.settings,
      }[s.view] || global.Views.dashboard)(s);
    } catch (err) {
      console.error(err);
      node = global.UI.empty('alert', 'Algo quebrou nesta tela', String(err.message || err));
    }
    host.classList.toggle('view--flush', s.view === 'post');
    host.replaceChildren(node);
    host.scrollTop = 0;
    document.title = ({
      dashboard: 'Painel', posts: 'Postagens', post: St().post(s.postId)?.code || 'Peça',
      compose: 'Nova postagem', calendar: 'Calendário', settings: 'Ajustes',
    }[s.view]) + ' · APROVA';
  }

  /* ---------------------------------------------------------- barra ---- */
  const NAV = [
    { id: 'dashboard', label: 'Painel', icon: 'home' },
    { id: 'posts', label: 'Postagens', icon: 'board' },
    { id: 'calendar', label: 'Calendário', icon: 'calendar' },
    { id: 'settings', label: 'Ajustes', icon: 'settings' },
  ];

  function desenharRail() {
    const rail = $('#rail');
    const me = St().me();
    const pend = St().pendingForMe().length;
    rail.replaceChildren();

    rail.append(el('div', { class: 'brand', html: `
      <span class="brand__mark">${icon('checkCircle')}</span>
      <span class="brand__txt"><span class="brand__name">APROVA</span>
      <span class="brand__sub">${esc(St().get().brand.name)}</span></span>` }));

    const nav = el('nav', { class: 'nav', 'aria-label': 'Navegação principal' });
    NAV.forEach((n) => {
      const ativo = App.state.view === n.id || (n.id === 'posts' && ['post', 'compose'].includes(App.state.view));
      const conta = n.id === 'posts' ? pend : 0;
      nav.append(el('button', {
        class: `nav__item${ativo ? ' is-active' : ''}${conta ? ' has-alert' : ''}`,
        'aria-current': ativo ? 'page' : null,
        html: `${icon(n.icon)}<span class="nav__label">${esc(n.label)}</span>${conta ? `<span class="nav__count">${conta}</span>` : ''}`,
        onclick: () => { App.go({ view: n.id }); fecharMenu(); },
      }));
    });

    if (St().isAdmin()) {
      nav.append(el('div', { class: 'nav__group' }, [
        el('div', { class: 'nav__title', text: 'Criar' }),
        el('button', {
          class: 'nav__item', html: `${icon('plus')}<span class="nav__label">Nova postagem</span>`,
          onclick: () => { App.go({ view: 'compose', postId: null }); fecharMenu(); },
        }),
      ]));
    }

    const c = St().counts();
    nav.append(el('div', { class: 'nav__group' }, [
      el('div', { class: 'nav__title', text: 'Estados' }),
      ...S().STATUS_ORDER.filter((k) => c[k]).map((k) => el('button', {
        class: 'nav__item', 'data-status': k,
        html: `<span class="chip__dot" style="background:var(--sc);margin:0 3px"></span><span class="nav__label">${esc(S().STATUSES[k].short)}</span><span class="nav__count">${c[k]}</span>`,
        onclick: () => { App.go({ view: 'posts', filterStatus: k }); fecharMenu(); },
      })),
    ]));
    rail.append(nav);

    const foot = el('div', { class: 'rail__foot' });
    foot.append(el('button', {
      class: 'who', title: 'Trocar de perfil',
      html: `${global.UI.avatarHTML(me, 'md')}
        <span class="who__txt"><span class="who__name truncate">${esc(me.name)}</span>
        <span class="who__role">${me.role === 'admin' ? 'Administrador' : 'Aprovador'}</span></span>
        ${icon('logout')}`,
      onclick: () => trocarPerfil(),
    }));
    rail.append(foot);
  }

  function desenharTopbar() {
    const bar = $('#topbar');
    bar.replaceChildren();

    bar.append(el('button', {
      class: 'btn btn--ghost btn--icon rail__close', html: icon('menu'), 'aria-label': 'Menu',
      onclick: () => $('#app').dataset.menu = $('#app').dataset.menu === 'open' ? '' : 'open',
    }));

    const titulo = { dashboard: 'Painel', posts: 'Postagens', post: 'Aprovação', compose: 'Compositor', calendar: 'Calendário', settings: 'Ajustes' }[App.state.view];
    bar.append(el('span', { class: 'topbar__title', text: titulo }));

    bar.append(el('span', { class: 'spacer' }));

    const busca = el('div', { class: 'search' });
    busca.innerHTML = `${icon('search')}<input type="search" placeholder="Buscar peça, legenda, etiqueta…" aria-label="Buscar" value="${esc(App.state.query)}"><kbd>/</kbd>`;
    const inp = busca.querySelector('input');
    inp.addEventListener('input', debounce(() => {
      App.state.query = inp.value;
      if (App.state.view !== 'posts') App.state.view = 'posts';
      App.render();
      setTimeout(() => { const n = $('#topbar input'); n?.focus(); n?.setSelectionRange(n.value.length, n.value.length); }, 0);
    }, 260));
    bar.append(busca);

    /* notificações */
    const n = St().unreadCount();
    bar.append(el('button', {
      class: 'btn btn--ghost btn--icon bell', 'aria-label': `Notificações${n ? `, ${n} nova(s)` : ''}`,
      html: `${icon('bell')}${n ? `<span class="bell__dot">${n}</span>` : ''}`,
      onclick: () => painelNotificacoes(),
    }));

    /* estado da conexão com a equipe — verde quando tudo trafega */
    const est = global.Cloud.status();
    const falha = !!est.erro;
    bar.append(el('button', {
      class: 'chip chip--sm' + (falha ? ' chip--alerta' : ' chip--ok'),
      title: falha
        ? `Sem falar com o servidor: ${est.erro}. As mudanças ficam guardadas e sobem quando voltar.`
        : `Em equipe · ${global.Cloud.config().url.replace(/^https?:\/\//, '')}${est.em ? ' · última troca ' + ago(est.em) : ''}`,
      html: `${icon(falha ? 'alert' : 'globe')}<span class="sync-lbl">${falha ? 'reconectando' : 'em equipe'}</span>`,
      onclick: () => App.go({ view: 'settings' }),
    }));

    bar.append(el('button', {
      class: 'btn btn--ghost btn--icon', 'aria-label': 'Comandos', title: 'Comandos (Ctrl+K)',
      html: icon('zap'), onclick: () => paleta(),
    }));

    if (St().isAdmin() && App.state.view !== 'compose') {
      bar.append(el('button', { class: 'btn btn--primary btn--sm', html: `${icon('plus')}Nova`, onclick: () => App.go({ view: 'compose', postId: null }) }));
    }
  }

  function desenharTabbar() {
    let tb = $('#tabbar');
    if (!tb) { tb = el('nav', { id: 'tabbar', class: 'tabbar', 'aria-label': 'Navegação' }); $('#app').append(tb); }
    tb.replaceChildren();
    const pend = St().pendingForMe().length;
    const itens = [
      { id: 'dashboard', label: 'Painel', icon: 'home' },
      { id: 'posts', label: 'Postagens', icon: 'board', n: pend },
      St().isAdmin() ? { id: 'compose', label: 'Criar', icon: 'plus', fab: true } : null,
      { id: 'calendar', label: 'Agenda', icon: 'calendar' },
      { id: 'settings', label: 'Ajustes', icon: 'settings' },
    ].filter(Boolean);
    itens.forEach((i) => {
      const ativo = App.state.view === i.id || (i.id === 'posts' && App.state.view === 'post');
      tb.append(el('button', {
        class: `tabbar__it${ativo ? ' is-active' : ''}${i.fab ? ' tabbar__it--fab' : ''}`,
        html: i.fab ? `<span class="ic">${icon(i.icon)}</span><span>${esc(i.label)}</span>`
          : `${icon(i.icon)}${i.n ? `<span class="n">${i.n}</span>` : ''}<span>${esc(i.label)}</span>`,
        onclick: () => App.go({ view: i.id, postId: i.id === 'compose' ? null : App.state.postId }),
      }));
    });
  }

  const fecharMenu = () => { $('#app').dataset.menu = ''; };

  /* ==================================================== notificações ==== */
  function painelNotificacoes() {
    const lista = St().get().notifications.slice(0, 20);
    global.UI.modal({
      title: 'Notificações', icon: 'bell',
      build: (b) => {
        if (!lista.length) return b.append(global.UI.empty('bell', 'Tudo em dia', 'Nenhum aviso novo.'));
        const feed = el('div', { class: 'feed-list' });
        lista.forEach((n) => {
          const u = St().user(n.userId);
          const p = St().post(n.postId);
          feed.append(el('button', {
            class: 'feed-item', style: n.read ? 'opacity:.55' : '',
            onclick: () => { if (p) { App.go({ view: 'post', postId: p.id }); } b.closest('.scrim').remove(); },
            html: `${global.UI.avatarHTML(u, 'sm')}
              <span class="feed-item__body">
                <span class="feed-item__txt"><b>${esc(u.name.split(' ')[0])}</b> ${esc(n.text)} <b>${esc(p?.code || '—')}</b></span>
                <span class="feed-item__time">${esc(ago(n.at))}</span></span>`,
          }));
        });
        b.append(feed);
      },
      foot: (close) => [
        el('button', { class: 'btn', text: 'Marcar tudo como lido', onclick: () => { St().markAllRead(); close(); } }),
        el('button', { class: 'btn btn--primary', text: 'Fechar', onclick: close }),
      ],
    });
  }

  /* ======================================================= paleta ======= */
  function paleta() {
    const comandos = [
      { t: 'Ir para o painel', ic: 'home', run: () => App.go({ view: 'dashboard' }) },
      { t: 'Ver postagens', ic: 'board', run: () => App.go({ view: 'posts' }) },
      { t: 'Abrir calendário', ic: 'calendar', run: () => App.go({ view: 'calendar' }) },
      { t: 'Ajustes', ic: 'settings', run: () => App.go({ view: 'settings' }) },
      St().isAdmin() && { t: 'Criar nova postagem', ic: 'plus', run: () => App.go({ view: 'compose', postId: null }) },
      { t: 'Só o que espera por mim', ic: 'target', run: () => { App.state.view = 'posts'; App.setFilters({ mine: true }); } },
      { t: 'Alternar tema do painel', ic: 'moon', run: () => { const t = St().settings().theme === 'dark' ? 'light' : 'dark'; St().setSetting('theme', t); document.documentElement.dataset.theme = t; } },
      { t: 'Trocar de perfil', ic: 'users', run: () => trocarPerfil() },
      { t: 'Exportar plano de conteúdo', ic: 'download', run: () => App.exportAll() },
    ].filter(Boolean);

    const posts = St().visiblePosts().map((p) => ({
      t: `${p.code} · ${p.title}`, ic: 'image', hint: S().STATUSES[p.status].short,
      run: () => App.go({ view: 'post', postId: p.id }),
    }));

    const todos = [...comandos, ...posts];
    let i = 0, filtrados = todos;

    const m = global.UI.modal({
      title: 'Comandos', icon: 'zap',
      build: (b) => {
        b.parentElement.classList.add('palette');
        b.previousElementSibling.remove(); // usa a própria caixa de busca
        b.replaceChildren();
        b.style.padding = '0';
        const inWrap = el('div', { class: 'palette__in', html: icon('search') });
        const inp = el('input', { placeholder: 'Buscar comando ou peça…', 'aria-label': 'Buscar comando' });
        inWrap.append(inp);
        const list = el('div', { class: 'palette__list', role: 'listbox' });
        b.append(inWrap, list);

        function pintar() {
          list.replaceChildren();
          filtrados.slice(0, 40).forEach((c, k) => list.append(el('button', {
            class: 'palette__it', role: 'option', 'aria-selected': k === i ? 'true' : 'false',
            html: `${icon(c.ic)}<span>${esc(c.t)}</span>${c.hint ? `<span class="palette__hint">${esc(c.hint)}</span>` : ''}`,
            onclick: () => { m.close(); c.run(); },
          })));
        }
        inp.addEventListener('input', () => {
          const q = inp.value.toLowerCase();
          filtrados = todos.filter((c) => c.t.toLowerCase().includes(q));
          i = 0; pintar();
        });
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowDown') { i = Math.min(filtrados.length - 1, i + 1); pintar(); e.preventDefault(); }
          if (e.key === 'ArrowUp') { i = Math.max(0, i - 1); pintar(); e.preventDefault(); }
          if (e.key === 'Enter') { const c = filtrados[i]; if (c) { m.close(); c.run(); } }
        });
        pintar();
        setTimeout(() => inp.focus(), 40);
      },
    });
  }

  /* ================================================ tela de instalação == */
  /**
   * Aparece quando o aplicativo ainda não tem para onde gravar. Não é um "modo"
   * — é a instalação. Enquanto não terminar, ninguém entra, porque conteúdo
   * preso num navegador só é problema adiado.
   */
  function telaInstalacao() {
    $('#app').hidden = true;
    $('#gate')?.remove();
    if ($('#setup')) return;
    instalando = true;

    const box = el('div', { class: 'gate__box setup' });
    const tela = el('div', { id: 'setup', class: 'gate' }, [box]);

    box.append(el('span', { class: 'gate__mark', html: icon('globe') }));
    const temUrl = !!global.Cloud.config().url;
    const intro = el('div', {
      class: 'stack stack--sm', html: `
      <h1 class="h1">Ligar o APROVA à sua equipe</h1>
      <p class="muted" style="max-width:60ch;margin:0 auto">Falta o lugar onde as peças, os comentários
      e as imagens vão morar. ${temUrl
        ? 'O projeto já está apontado — falta a chave.'
        : 'São dois valores, colados uma vez.'}
      Sem isso o aplicativo não abre — de propósito: conteúdo preso no navegador de uma pessoa
      não serve para aprovar nada.</p>`,
    });
    box.append(intro);

    const jaTemUrl = temUrl;
    const passos = el('ol', { class: 'passos passos--grande' });
    passos.innerHTML = jaTemUrl
      ? `<li>No projeto, abra <b>SQL Editor</b> → <b>New query</b>, cole o SQL do botão abaixo e clique em <b>Run</b>.</li>
         <li>Abra <b>Project Settings → API</b> e copie a chave <b>publishable</b> (<code>sb_publishable_…</code>) — em projetos mais antigos ela se chama <b>anon public</b> e começa com <code>eyJ</code>.</li>
         <li>Cole a chave aqui embaixo. O endereço do projeto já veio configurado.</li>`
      : `<li>Crie um projeto gratuito em <b><a href="https://supabase.com/dashboard/new" target="_blank" rel="noopener">supabase.com</a></b> (leva ~2 minutos, inclui o e-mail de confirmação).</li>
         <li>No projeto, abra <b>SQL Editor</b> → <b>New query</b>, cole o SQL do botão abaixo e clique em <b>Run</b>.</li>
         <li>Abra <b>Project Settings → API</b> e copie a <b>Project URL</b> e a chave <b>publishable</b> (ou <b>anon public</b>, nos projetos mais antigos).</li>
         <li>Cole as duas aqui embaixo.</li>`;
    box.append(passos);

    const antes = el('div', { class: 'stack', style: 'width:100%;justify-items:center' });
    antes.append(el('button', {
      class: 'btn', html: `${icon('copy')}Copiar o SQL da instalação`,
      onclick: () => {
        navigator.clipboard?.writeText(App.SQL_SUPABASE);
        global.UI.toast('SQL copiado. Cole no SQL Editor do Supabase e rode.', 'ok', 6000);
      },
    }));
    box.append(antes);

    const form = el('form', { class: 'gate__form', novalidate: true });
    const c = global.Cloud.config();
    form.append(el('div', { class: 'field' }, [
      el('label', { class: 'label', for: 'su-url', text: 'Project URL' }),
      el('input', { class: 'input', id: 'su-url', value: c.url, placeholder: 'https://xxxxxxxx.supabase.co', autocapitalize: 'off', spellcheck: 'false' }),
    ]));
    form.append(el('div', { class: 'field' }, [
      el('label', { class: 'label', for: 'su-key', text: 'Chave pública (publishable / anon)' }),
      el('input', { class: 'input', id: 'su-key', value: c.key, placeholder: 'sb_publishable_…  ou  eyJhbGciOiJIUzI1NiIs…', autocapitalize: 'off', spellcheck: 'false' }),
      el('span', { class: 'hint', text: 'É a chave feita para ficar no navegador. Nunca a secreta (sb_secret_… / service_role).' }),
    ]));
    const erro = el('p', { class: 'gate__erro', role: 'alert', hidden: true });
    const prog = el('div', { class: 'setup__prog', hidden: true }, [
      el('div', { class: 'prog', html: '<div class="prog__bar" style="width:0"></div>' }),
      el('p', { class: 'tiny dim', id: 'su-prog-txt', text: '' }),
    ]);
    const enviar = el('button', { class: 'btn btn--primary btn--lg btn--block', type: 'submit', html: `${icon('check')}Conectar` });
    form.append(erro, enviar, prog);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = $('#su-url', form).value.trim().replace(/\/+$/, '');
      const key = $('#su-key', form).value.trim();
      if (!url) return falhar('Falta o endereço do projeto.');
      const ver = global.Cloud.checarChave(key);
      if (!ver.ok) return falhar(ver.motivo);
      erro.hidden = true;
      enviar.disabled = true;
      enviar.innerHTML = 'Conectando…';
      global.Cloud.setConfig({ url, key });
      try {
        await global.Cloud.testar();
        await St().startSync();
        /* o que já existia neste navegador sobe junto, inclusive as imagens */
        const pendentes = St().contarMidiaLocal();
        if (pendentes) {
          prog.hidden = false;
          await St().migrarMidias((i, t, nome) => {
            $('.prog__bar', prog).style.width = `${Math.round((i / t) * 100)}%`;
            $('#su-prog-txt', prog).textContent = `Enviando as imagens deste navegador: ${i + 1} de ${t} — ${nome}`;
          });
        }
        /* Não entra sozinho: este é o único momento em que a configuração
           aparece por inteiro, e é ela que faz o resto da equipe entrar
           ligada. Sair daqui sem copiar seria voltar ao problema. */
        /* a partir daqui só interessa o que falta fazer */
        passos.remove();
        form.remove();
        antes.remove();
        resgate?.remove();
        intro.remove();
        box.append(el('div', {
          class: 'setup__ok', html: `
          <div class="verdict" data-status="aprovado" style="margin-bottom:var(--s-4)">
            <span class="verdict__icon">${icon('checkCircle')}</span>
            <span><b>Conectado${pendentes ? ` — ${global.U.plural(pendentes, 'imagem enviada', 'imagens enviadas')}` : ''}.</b><br>
            <span class="tiny dim">Falta um passo para a equipe: publicar esta configuração no site.</span></span>
          </div>`,
        }));
        mostrarConfigJs(box);
        box.append(el('p', {
          class: 'hint', style: 'text-align:left',
          html: 'No repositório <b>Bracerumpark-Aprovacoes</b>, abra <b>config.js</b>, substitua o conteúdo pelo bloco acima e salve. Quem abrir o site depois disso entra direto — sem ver esta tela.',
        }));
        box.append(el('button', {
          class: 'btn btn--primary btn--lg btn--block',
          html: `${icon('arrowR')}Já copiei — entrar no aplicativo`,
          onclick: () => { instalando = false; App.render(); },
        }));
      } catch (err) {
        enviar.disabled = false;
        enviar.innerHTML = `${icon('check')}Conectar`;
        prog.hidden = true;
        falhar(err.message);
      }
    });

    function falhar(msg) {
      erro.textContent = msg;
      erro.hidden = false;
      global.U.animate(form, [
        { transform: 'translateX(0)' }, { transform: 'translateX(-7px)' },
        { transform: 'translateX(6px)' }, { transform: 'translateX(0)' },
      ], { duration: 260 });
    }

    /* digitar limpa o aviso anterior — senão a mensagem velha confunde */
    form.addEventListener('input', () => { erro.hidden = true; });
    box.append(form);

    /* nada do que já existe aqui pode se perder por causa da instalação */
    const guardado = St().get().posts.length;
    let resgate = null;
    if (guardado) {
      resgate = el('div', { class: 'row', style: 'justify-content:center' }, [
        el('button', {
          class: 'btn btn--ghost btn--sm',
          html: `${icon('download')}Baixar ${global.U.plural(guardado, 'peça guardada', 'peças guardadas')} neste navegador`,
          onclick: () => App.exportAll(),
        }),
      ]);
      box.append(resgate);
    }
    document.body.append(tela);
    setTimeout(() => (jaTemUrl ? $('#su-key', form) : $('#su-url', form))?.focus(), 120);
  }

  /** O trecho pronto para colar no config.js do repositório. */
  function mostrarConfigJs(onde) {
    const c = global.Cloud.config();
    const texto = `window.APROVA_CONFIG = {\n`
      + `  url: '${c.url}',\n`
      + `  key: '${c.key}',\n`
      + `  table: '${c.table}',\n`
      + `  bucket: '${c.bucket}',\n`
      + `  workspace: '${c.workspace}',\n};\n`;
    const bloco = el('div', { class: 'stack stack--sm', style: 'width:100%;text-align:left' });
    bloco.append(el('span', { class: 'label', text: 'Cole isto em config.js e publique — é o que faz todo mundo entrar já conectado' }));
    bloco.append(el('pre', { class: 'code-bloco', text: texto }));
    bloco.append(el('button', {
      class: 'btn btn--sm', html: `${icon('copy')}Copiar o config.js`,
      onclick: () => { navigator.clipboard?.writeText(texto); global.UI.toast('Copiado.', 'ok'); },
    }));
    onde.append(bloco);
    return bloco;
  }
  App.mostrarConfigJs = mostrarConfigJs;

  /* ================================================== porta de entrada == */
  function portao() {
    $('#app').hidden = true;
    if ($('#gate')) return;

    const gate = el('div', { id: 'gate', class: 'gate' });
    const box = el('div', { class: 'gate__box' });

    box.append(el('span', { class: 'gate__mark', html: icon('checkCircle') }));
    box.append(el('div', {
      class: 'stack stack--sm', html: `
      <h1 class="display grad-text">APROVA</h1>
      <p class="muted" style="max-width:52ch;margin:0 auto">Aprovação de conteúdo para Instagram,
      Facebook e LinkedIn. Entre com o e-mail cadastrado — o que você pode fazer depende do seu papel.</p>`,
    }));

    const form = el('form', { class: 'gate__form', novalidate: true });
    const campo = el('div', { class: 'field' });
    campo.append(el('label', { class: 'label', for: 'gate-email', text: 'E-mail' }));
    const input = el('input', {
      class: 'input input--lg', id: 'gate-email', type: 'email', name: 'email',
      placeholder: 'voce@empresa.com', autocomplete: 'email', autocapitalize: 'off', spellcheck: 'false',
      'aria-describedby': 'gate-erro',
    });
    campo.append(input);
    const erro = el('p', { class: 'gate__erro', id: 'gate-erro', role: 'alert', hidden: true });
    campo.append(erro);
    form.append(campo);
    form.append(el('button', { class: 'btn btn--primary btn--lg btn--block', type: 'submit', html: `${icon('arrowR')}Entrar` }));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const valor = input.value.trim();
      if (!valor) { return falhar('Digite o seu e-mail.'); }
      const u = St().userByEmail(valor);
      if (!u) return falhar('Este e-mail não está cadastrado. Fale com o administrador.');
      erro.hidden = true;
      entrar(u.id, gate);
    });
    input.addEventListener('input', () => { erro.hidden = true; input.classList.remove('is-erro'); });

    function falhar(msg) {
      erro.textContent = msg;
      erro.hidden = false;
      input.classList.add('is-erro');
      input.focus();
      global.U.animate(form, [
        { transform: 'translateX(0)' }, { transform: 'translateX(-7px)' },
        { transform: 'translateX(6px)' }, { transform: 'translateX(0)' },
      ], { duration: 260 });
    }
    box.append(form);

    /* Sem senha: isto identifica quem está revisando, não autentica ninguém.
       Como o acesso é por e-mail cadastrado, as contas ficam à vista — é uma
       ferramenta interna rodando no navegador de quem abre. */
    const contas = el('div', { class: 'gate__contas' });
    contas.append(el('span', { class: 'eyebrow', text: 'Contas cadastradas' }));
    const linha = el('div', { class: 'row row--wrap', style: 'justify-content:center' });
    St().get().users.forEach((u) => linha.append(el('button', {
      class: 'pill', type: 'button', title: `Entrar como ${u.name}`,
      html: `${global.UI.avatarHTML(u, 'xs')}${esc(u.email)}<span class="pill__n">${u.role === 'admin' ? 'adm' : 'aprovador'}</span>`,
      onclick: () => { input.value = u.email; erro.hidden = true; form.requestSubmit(); },
    })));
    contas.append(linha);
    box.append(contas);

    box.append(el('p', { class: 'tiny dim', style: 'max-width:56ch',
      text: 'Acesso sem senha: o e-mail identifica quem está revisando, não autentica. O trabalho fica no servidor da equipe — todo mundo vê o mesmo.' }));

    gate.append(box);
    document.body.append(gate);
    setTimeout(() => input.focus(), 120);
  }

  function entrar(userId, gate) {
    gate.classList.add('is-out');
    setTimeout(() => { St().login(userId); }, 320);
  }

  function trocarPerfil() {
    const users = St().get().users;
    global.UI.modal({
      title: 'Trocar de conta', icon: 'users',
      build: (b) => {
        b.append(el('p', { class: 'hint', text: 'As contas cadastradas nesta instalação.' }));
        users.forEach((u) => b.append(el('button', {
          class: 'who', html: `${global.UI.avatarHTML(u, 'md')}
            <span class="who__txt"><span class="who__name">${esc(u.name)}</span>
            <span class="who__role">${esc(u.email)} · ${u.role === 'admin' ? 'Administrador' : 'Aprovador'}</span></span>
            ${u.id === St().me()?.id ? icon('check') : ''}`,
          onclick: () => {
            St().login(u.id);
            App.state = { ...INICIAL };
            b.closest('.scrim').remove();
            global.UI.toast(`Agora você é ${u.name}.`, 'ok');
          },
        })));
      },
      foot: (close) => [el('button', { class: 'btn btn--danger', html: `${icon('logout')}Sair`, onclick: () => { close(); St().logout(); } })],
    });
  }

  /* ===================================================== exportações ==== */
  function baixar(nome, conteudo, tipo = 'application/json') {
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    const a = el('a', { href: url, download: nome });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  App.exportAll = () => { baixar(`plano-conteudo-${global.U.isoDay(new Date())}.json`, St().exportJSON()); global.UI.toast('Arquivo gerado.', 'ok'); };
  App.exportPost = (p) => { baixar(`${p.code}.json`, JSON.stringify(p, null, 2)); global.UI.toast(`${p.code} exportada.`, 'ok'); };
  App.copySummary = () => {
    const linhas = St().visiblePosts().map((p) =>
      `${p.code}\t${(p.networks || []).map((n) => S().NETWORKS[n].name).join(' + ')}${p.sponsored ? ' (patrocinado)' : ''}\t${S().FORMATS[p.format].name}\t${S().STATUSES[p.status].short}\t${p.scheduledAt ? fmtDate(p.scheduledAt, 'full') : '—'}\t${p.title}`);
    navigator.clipboard?.writeText(['Código\tRede\tFormato\tEstado\tAgenda\tTítulo', ...linhas].join('\n'));
    global.UI.toast('Resumo copiado — cole na planilha.', 'ok');
  };

  /* ===================================================== SQL de apoio === */
  /* Cola no SQL Editor do Supabase: cria a tabela do documento da equipe, o
     bucket de mídias e as permissões. A chave anon fica pública no navegador,
     então quem controla o acesso são estas políticas. */
  App.SQL_SUPABASE = `-- APROVA — instalação (rode uma vez no SQL Editor do Supabase)

create table if not exists public.aprova_docs (
  id          text primary key,
  doc         jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.aprova_docs enable row level security;

-- Equipe pequena com link compartilhado: quem tem a chave anon lê e grava.
-- Para restringir de verdade, troque por políticas com auth.uid().
drop policy if exists "aprova leitura" on public.aprova_docs;
create policy "aprova leitura" on public.aprova_docs for select using (true);

drop policy if exists "aprova escrita" on public.aprova_docs;
create policy "aprova escrita" on public.aprova_docs for insert with check (true);

drop policy if exists "aprova atualizacao" on public.aprova_docs;
create policy "aprova atualizacao" on public.aprova_docs for update using (true) with check (true);

-- Bucket das mídias, leitura pública (as imagens aparecem no <img>)
insert into storage.buckets (id, name, public)
values ('aprova', 'aprova', true)
on conflict (id) do update set public = true;

drop policy if exists "aprova midia leitura" on storage.objects;
create policy "aprova midia leitura" on storage.objects
  for select using (bucket_id = 'aprova');

drop policy if exists "aprova midia envio" on storage.objects;
create policy "aprova midia envio" on storage.objects
  for insert with check (bucket_id = 'aprova');

drop policy if exists "aprova midia troca" on storage.objects;
create policy "aprova midia troca" on storage.objects
  for update using (bucket_id = 'aprova') with check (bucket_id = 'aprova');
`;

  /* ========================================================= atalhos ==== */
  function atalhos(e) {
    const digitando = /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); return paleta(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !digitando) {
      e.preventDefault();
      const l = St().undo();
      global.UI.toast(l ? `Desfeito: ${l}.` : 'Nada para desfazer.', l ? 'ok' : 'warn');
      return;
    }
    if (digitando) return;
    if (e.key === '/') { e.preventDefault(); $('#topbar input')?.focus(); return; }
    if (e.key === 'n' && St().isAdmin()) { App.go({ view: 'compose', postId: null }); return; }
    if (e.key === 'g') { App.go({ view: 'dashboard' }); return; }
    if (e.key === 'p') { App.go({ view: 'posts' }); return; }
    if (e.key === 'Escape' && App.state.arming) { App.go({ arming: false }, true); return; }
    /* na tela de aprovação: setas trocam a mídia, A aprova, R pede ajuste */
    if (App.state.view === 'post') {
      const p = St().post(App.state.postId);
      if (!p) return;
      if (e.key === 'ArrowRight') App.go({ slide: Math.min((p.media?.length || 1) - 1, App.state.slide + 1) }, true);
      if (e.key === 'ArrowLeft') App.go({ slide: Math.max(0, App.state.slide - 1) }, true);
    }
  }

  /* ============================================================ início == */
  function iniciar() {
    document.documentElement.dataset.theme = St().settings().theme;
    Object.assign(App.state, fromHash());

    global.addEventListener('aprova:change', (e) => {
      if (e.detail?.silent) return;
      App.render();
    });
    global.addEventListener('aprova:quota', () => {
      global.UI.toast('Espaço do navegador cheio — remova mídias pesadas ou restaure a demonstração.', 'err', 7000);
    });
    global.addEventListener('popstate', () => { Object.assign(App.state, fromHash()); App.render(); });
    global.addEventListener('resize', debounce(() => $$('.seg').forEach(moveThumb), 140));
    document.addEventListener('keydown', atalhos);

    /* brilho que segue o cursor nos botões principais */
    document.addEventListener('pointermove', (e) => {
      const b = e.target.closest?.('.btn--primary');
      if (!b) return;
      const r = b.getBoundingClientRect();
      b.style.setProperty('--mx', `${e.clientX - r.left}px`);
      b.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });

    /* puxa o que a equipe já tem antes de desenhar qualquer coisa */
    if (global.Cloud.isOn()) St().startSync().then(() => App.render());
    global.addEventListener('aprova:sync', (e) => {
      if (e.detail?.erro) global.UI.toast('Sincronização falhou: ' + e.detail.erro, 'err', 7000);
    });

    App.render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})(window);
