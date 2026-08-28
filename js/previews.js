/* ==========================================================================
   APROVA — pré-visualizações
   Reconstrói a moldura de cada rede para que a aprovação aconteça sobre algo
   parecido com o que o público vai ver: Feed e Perfil, no celular e no
   desktop. É simulação de layout, não a rede real.

   O nó devolvido é interativo por conta própria: o carrossel anda no clique,
   no arrasto e nas setas do teclado, e o “… mais” abre a legenda inteira.
   Quem chama não precisa ligar nada — funciona igual no compositor e na tela
   de aprovação.
   ========================================================================== */
(function (global) {
  'use strict';
  const { esc, icon, iconFilled, richText, nfmt, ago } = global.U;

  const NETS = () => global.SEED.NETWORKS;
  const FORMATS = () => global.SEED.FORMATS;
  const brand = () => global.Store.get().brand;

  /** Redes de uma peça — sempre uma lista, mesmo que só tenha uma. */
  const netsOf = (p) => (p.networks?.length ? p.networks : ['instagram']);
  const mainNet = (p) => netsOf(p)[0];

  function ratioOf(p, net) {
    const f = FORMATS()[p.format] || FORMATS().single;
    return f.ratio[net || mainNet(p)] || f.ratio.instagram || '1';
  }

  function captionOf(p) {
    if (p.chosenCaption !== null && p.captions?.[p.chosenCaption]) return p.captions[p.chosenCaption].text;
    return p.captions?.[0]?.text || '';
  }

  /* ---------------------------------------------------------- retalhos -- */
  const avatar = (cls = '') =>
    `<div class="np-av ${cls}"><img src="${esc(brand().avatar)}" alt="" loading="lazy"></div>`;
  const ringAvatar = () =>
    `<div class="np-av np-av--ring"><div><img src="${esc(brand().avatar)}" alt="" loading="lazy"></div></div>`;

  const VERIFIED = '<svg class="verified" viewBox="0 0 24 24"><path d="M12 1.5 14.6 4l3.5-.4 1 3.4 3 1.9-1.4 3.2 1.4 3.2-3 1.9-1 3.4-3.5-.4L12 22.5 9.4 20l-3.5.4-1-3.4-3-1.9L3.3 12 1.9 8.8l3-1.9 1-3.4L9.4 4z"/><path d="m8.4 12.2 2.4 2.4 4.8-5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /** Bloco de mídia com carrossel, vídeo e camada de marcadores. */
  function mediaBlock(p, o) {
    const media = p.media?.length ? p.media : [{ type: 'image', src: '', alt: 'sem mídia' }];
    const ratio = ratioOf(p, o.net);
    const slide = Math.min(o.slide || 0, media.length - 1);
    const multi = media.length > 1;

    const slides = media.map((m) => {
      if (m.type === 'video') {
        return `<div class="np-slide">
          <img src="${esc(m.poster || m.src)}" alt="${esc(m.alt || '')}" loading="lazy" draggable="false">
          <div class="np-play"><div class="np-play__btn">${iconFilled('play')}</div></div>
          ${m.duration ? `<div class="np-dur">0:${String(m.duration % 60).padStart(2, '0')}</div>` : ''}
          <div class="np-sound">${icon('volume')}</div>
        </div>`;
      }
      return m.src
        ? `<img src="${esc(m.src)}" alt="${esc(m.alt || '')}" loading="lazy" draggable="false">`
        : `<div class="np-slide np-slide--vazio">sem mídia</div>`;
    }).join('');

    return `<div class="np-media" data-ratio="${ratio}" data-media>
      <div class="np-track" data-track style="transform:translateX(-${slide * 100}%)">${slides}</div>
      ${multi ? `<div class="np-count" data-count>${slide + 1}/${media.length}</div>` : ''}
      ${multi ? `<button class="np-nav np-nav--prev" data-slide="-1" ${slide === 0 ? 'disabled' : ''} aria-label="Mídia anterior">${icon('chevL')}</button>
                 <button class="np-nav np-nav--next" data-slide="1" ${slide === media.length - 1 ? 'disabled' : ''} aria-label="Próxima mídia">${icon('chevR')}</button>
                 <div class="np-dots" data-dots>${media.map((_, i) =>
                   `<button class="${i === slide ? 'is-on' : ''}" data-goto="${i}" aria-label="Ir para a mídia ${i + 1}"></button>`).join('')}</div>` : ''}
      <div class="pin-layer${o.arming ? ' is-arming' : ''}" data-pinlayer>${pinsHTML(o, slide)}</div>
    </div>`;
  }

  function pinsHTML(o, slide) {
    return (o.pins || [])
      .filter((c) => (c.pin?.mediaIndex ?? 0) === slide)
      .map((c, i) => `<button class="pin${o.activePin === c.id ? ' is-on' : ''}" data-pin="${c.id}"
        style="left:${c.pin.x}%;top:${c.pin.y}%" title="${esc(c.text.slice(0, 60))}"><span>${i + 1}</span></button>`)
      .join('');
  }

  /**
   * Legenda com o corte real da rede. O texto inteiro já vai no DOM, escondido:
   * o “… mais” só troca qual metade aparece — é o que torna o clique instantâneo
   * e mantém a legenda inteira acessível a leitor de tela.
   */
  function captionBlock(p, net, o = {}) {
    const text = captionOf(p);
    if (!text) return '';
    const limite = NETS()[net]?.cut || 125;
    const corta = text.length > limite;
    const curto = corta ? text.slice(0, limite).trimEnd() : text;
    const rotulo = net === 'instagram' ? 'mais' : 'ver mais';
    const aberto = !!o.expanded;

    const miolo = corta
      ? `<span data-cap-short ${aberto ? 'hidden' : ''}>${richText(curto)}` +
        `<button class="np-cap__more" data-more>… ${rotulo}</button></span>` +
        `<span data-cap-full ${aberto ? '' : 'hidden'}>${richText(text)}` +
        `<button class="np-cap__more" data-less> menos</button></span>`
      : richText(text);

    if (net === 'instagram') {
      return `<div class="np-cap" data-cap><span class="np-cap__user">${esc(brand().handles.instagram)}</span>${miolo}</div>`;
    }
    return `<div class="np-body" data-cap>${miolo}</div>`;
  }

  /* ==========================================================================
     INSTAGRAM
     ========================================================================== */
  function igPost(p, o) {
    const b = brand();
    const likes = 180 + ((p.code || 'BP-000').charCodeAt(4) || 5) * 41;
    return `<article class="np-post${o.focus ? ' is-focus' : ''}">
      <header class="np-post__head">
        ${ringAvatar()}
        <div class="np-post__id">
          <div class="np-post__name">${esc(b.handles.instagram)}${VERIFIED}</div>
          <div class="np-post__meta">${p.sponsored ? 'Patrocinado' : 'Villeta, Paraguay'}</div>
        </div>
        <button class="np-post__more" tabindex="-1">${icon('more')}</button>
      </header>
      ${mediaBlock(p, o)}
      ${p.sponsored ? `<div class="np-cta-bar"><span>${esc(p.ad?.cta || 'Saiba mais')}</span>${icon('chevR')}</div>` : ''}
      <div class="np-acts">${icon('heart')}${icon('msg')}${icon('send')}<span class="spacer"></span>${icon('bookmark')}</div>
      <div class="np-likes">${nfmt(likes)} curtidas</div>
      ${captionBlock(p, 'instagram', o)}
      <div class="np-sub">Ver todos os 24 comentários</div>
      <div class="np-sub" style="padding-top:0">${p.scheduledAt ? esc(ago(p.scheduledAt)) : 'agora'}</div>
    </article>`;
  }

  function igProfile(p, o) {
    const b = brand();
    const outras = outrosPosts(p, 'instagram', 8);
    const preencher = global.Store.get().library
      .filter((m) => !outras.some((x) => x.media?.[0]?.src === m.src) && m.src !== p.media?.[0]?.src)
      .slice(0, Math.max(0, 11 - outras.length))
      .map((m) => ({ media: [m], format: 'single' }));

    const cell = (post, novo) => {
      const m = post.media?.[0];
      const ic = post.format === 'carousel' ? 'layers'
        : (post.format === 'reels' || post.format === 'video') ? 'reels' : null;
      return `<div class="np-grid__it${novo ? ' is-new' : ''}">
        ${m?.src ? `<img src="${esc(m.src)}" alt="${esc(m.alt || '')}" loading="lazy">` : ''}
        ${ic ? `<span class="ic">${icon(ic)}</span>` : ''}</div>`;
    };

    const publicadas = global.Store.get().posts.filter((x) => x.status === 'publicado').length;
    return `<div class="np-profile">
      <div class="np-prof-head">
        ${ringAvatar()}
        <div style="flex:1">
          <div class="np-prof-stats">
            <div><b>${nfmt(publicadas + 128)}</b>publicações</div>
            <div><b>${nfmt(b.followers.instagram)}</b>seguidores</div>
            <div><b>412</b>seguindo</div>
          </div>
        </div>
      </div>
      <div class="np-prof-bio"><b>${esc(b.name)}</b><br>${esc(b.headline)}<br><span style="color:var(--n-accent)">${esc(b.site)}</span></div>
      <div class="np-prof-actions"><button class="primary">Seguir</button><button>Mensagem</button><button style="flex:0 0 40px">${icon('user')}</button></div>
      <div class="np-prof-tabs"><button class="is-on">${icon('grid')}</button><button>${icon('reels')}</button><button>${icon('user')}</button></div>
      <div class="np-grid">${cell(p, true)}${[...outras, ...preencher].map((x) => cell(x, false)).join('')}</div>
    </div>`;
  }

  /* ==========================================================================
     FACEBOOK
     ========================================================================== */
  function fbPost(p, o) {
    const b = brand();
    return `<article class="np-post${o.focus ? ' is-focus' : ''}">
      <header class="np-post__head">
        ${avatar()}
        <div class="np-post__id">
          <div class="np-post__name">${esc(b.handles.facebook)}${VERIFIED}</div>
          <div class="np-post__meta">${p.sponsored ? 'Patrocinado' : (p.scheduledAt ? esc(ago(p.scheduledAt)) : 'agora')} · ${icon('globe')}</div>
        </div>
        <button class="np-post__more" tabindex="-1">${icon('more')}</button>
      </header>
      ${captionBlock(p, 'facebook', o)}
      ${mediaBlock(p, o)}
      ${p.sponsored ? adCard(p) : ''}
      <div class="np-stats">
        <span class="np-reactions"><i class="like">${iconFilled('thumbUp')}</i><i class="love">${iconFilled('heart')}</i><i class="care">★</i></span>
        <span>1,2 mil</span><span class="spacer"></span><span>84 comentários</span><span>19 compart.</span>
      </div>
      <div class="np-bar">
        <button tabindex="-1">${icon('thumbUp')} Curtir</button>
        <button tabindex="-1">${icon('msg')} Comentar</button>
        <button tabindex="-1">${icon('share')} Compartilhar</button>
      </div>
    </article>`;
  }

  const adCard = (p) => `<div class="np-adcard">
    <div class="np-adcard__txt">
      <div class="np-adcard__dom">${esc(p.ad?.domain || 'bracerumpark.com')}</div>
      <div class="np-adcard__t">${esc(p.ad?.headline || p.title)}</div>
      <div class="np-adcard__d">${esc(p.ad?.description || '')}</div>
    </div>
    <button class="np-cta" tabindex="-1">${esc(p.ad?.cta || 'Saiba mais')}</button>
  </div>`;

  function fbProfile(p, o) {
    const b = brand();
    return `<div class="np-profile">
      <div class="np-cover"><img src="${esc(b.cover)}" alt="" loading="lazy"></div>
      <div class="np-page-head" style="background:var(--n-surface)">
        ${avatar()}
        <div class="np-page-name">${esc(b.name)}</div>
        <div class="np-page-sub">${nfmt(b.followers.facebook)} seguidores · ${esc(b.headline)}</div>
        <div class="np-page-actions"><button class="primary">Curtir</button><button>Seguir</button><button>Enviar mensagem</button></div>
      </div>
      ${fbPost(p, { ...o, focus: true })}
    </div>`;
  }

  /* ==========================================================================
     LINKEDIN
     ========================================================================== */
  function liPost(p, o) {
    const b = brand();
    return `<article class="np-post${o.focus ? ' is-focus' : ''}">
      <header class="np-post__head">
        ${avatar('np-av--sq')}
        <div class="np-post__id">
          <div class="np-post__name">${esc(b.handles.linkedin)}</div>
          <div class="np-headline">${esc(b.headline)}</div>
          <div class="np-post__meta">${p.sponsored ? '<span class="np-promoted">Promovido</span>' : `${p.scheduledAt ? esc(ago(p.scheduledAt)) : 'agora'} · ${icon('globe')}`}</div>
        </div>
        <button class="np-post__more" tabindex="-1">${icon('more')}</button>
      </header>
      ${captionBlock(p, 'linkedin', o)}
      ${mediaBlock(p, o)}
      ${p.sponsored ? adCard(p) : ''}
      <div class="np-stats">
        <span class="np-reactions"><i class="like">${iconFilled('thumbUp')}</i><i class="love">${iconFilled('heart')}</i></span>
        <span>218</span><span style="margin-left:auto">37 comentários · 12 republicações</span>
      </div>
      <div class="np-bar">
        <button tabindex="-1">${icon('thumbUp')} Gostei</button>
        <button tabindex="-1">${icon('msg')} Comentar</button>
        <button tabindex="-1">${icon('repeat')} Republicar</button>
        <button tabindex="-1">${icon('send')} Enviar</button>
      </div>
    </article>`;
  }

  function liProfile(p, o) {
    const b = brand();
    return `<div class="np-profile">
      <div class="np-cover"><img src="${esc(b.cover)}" alt="" loading="lazy"></div>
      <div class="np-page-head" style="background:var(--n-surface)">
        ${avatar('np-av--sq')}
        <div class="np-page-name">${esc(b.name)}</div>
        <div class="np-page-sub">${esc(b.headline)}</div>
        <div class="np-page-sub">Villeta, Paraguai · ${nfmt(b.followers.linkedin)} seguidores</div>
        <div class="np-page-actions"><button class="primary">+ Seguir</button><button>Visitar site</button></div>
      </div>
      ${liPost(p, { ...o, focus: true })}
    </div>`;
  }

  /* ==========================================================================
     MOLDURAS
     ========================================================================== */
  function outrosPosts(p, net, n) {
    return global.Store.get().posts
      .filter((x) => x.id !== p.id && x.media?.length && netsOf(x).includes(net))
      .slice(0, n);
  }

  const STATUS_BAR = `<div class="phone__status">
    <span>9:41</span>
    <span class="sig">${icon('trend')}${icon('volume')}<b style="font-size:11px">100%</b></span>
  </div>`;

  function igChrome(inner) {
    return `<header class="np-topbar"><span class="np-topbar__logo">Instagram</span>
      <span class="np-topbar__acts">${icon('heart')}${icon('send')}</span></header>
      <div class="np__scroll">${inner}</div>
      <nav class="np-tabbar">${icon('home')}${icon('search')}${icon('reels')}${icon('bookmark')}${avatar()}</nav>`;
  }
  function fbChrome(inner) {
    return `<header class="np-topbar"><span class="np-topbar__logo" style="color:#1877f2">facebook</span>
      <span class="np-topbar__acts">${icon('plus')}${icon('search')}${icon('msg')}</span></header>
      <div class="np__scroll">${inner}</div>
      <nav class="np-tabbar">${icon('home')}${icon('users')}${icon('video')}${icon('bell')}${icon('menu')}</nav>`;
  }
  function liChrome(inner) {
    return `<header class="np-topbar">${avatar('np-av--sq')}
      <span style="flex:1;background:var(--n-sunken);border-radius:6px;padding:6px 10px;font-size:12px;color:var(--n-txt2)">Pesquisar</span>
      ${icon('msg')}</header>
      <div class="np__scroll">${inner}</div>
      <nav class="np-tabbar">${icon('home')}${icon('users')}${icon('plus')}${icon('bell')}${icon('inbox')}</nav>`;
  }

  const CHROME = { instagram: igChrome, facebook: fbChrome, linkedin: liChrome };
  const POST_OF = { instagram: igPost, facebook: fbPost, linkedin: liPost };
  const PROFILE_OF = { instagram: igProfile, facebook: fbProfile, linkedin: liProfile };

  const fakeAside = (rows = 3) => `<div class="np-fake">${Array.from({ length: rows }, () => `
    <div class="np-fake__row">${avatar()}<div style="flex:1"><div class="np-fake__bar" style="width:70%"></div>
    <div class="np-fake__bar" style="width:45%;margin-top:6px;height:7px"></div></div></div>`).join('')}</div>`;

  function desktopLayout(net, main, context) {
    if (context === 'profile') {
      return `<div class="np-desk" style="grid-template-columns:minmax(0,1fr);max-width:960px;margin:0 auto">
        <div class="np-desk__main" style="max-width:none">${main}</div></div>`;
    }
    if (net === 'instagram') {
      return `<div class="np-desk">
        <div class="np-desk__main">${main}</div>
        <aside class="np-desk__aside">
          <div class="np-fake__row" style="margin-bottom:8px">${avatar()}<div>
            <div class="np-fake__t">${esc(brand().handles.instagram)}</div>
            <div style="font-size:11px;color:var(--n-txt2)">${esc(brand().name)}</div></div></div>
          <div class="np-fake__t">Sugestões para você</div>${fakeAside(4)}
        </aside></div>`;
    }
    return `<div class="np-desk">
      <aside class="np-desk__aside np-desk__aside--l">${fakeAside(4)}</aside>
      <div class="np-desk__main">${main}</div>
      <aside class="np-desk__aside">${fakeAside(3)}</aside>
    </div>`;
  }

  /* ==========================================================================
     INTERAÇÃO
     ========================================================================== */
  /** Liga carrossel e “ver mais” no nó já montado. */
  function bind(node, p, o) {
    const total = Math.max(1, p.media?.length || 1);
    let slide = Math.min(o.slide || 0, total - 1);

    const media = node.querySelector('[data-media]');
    const track = node.querySelector('[data-track]');

    function pintarSlide() {
      if (track) track.style.transform = `translateX(-${slide * 100}%)`;
      const cont = node.querySelector('[data-count]');
      if (cont) cont.textContent = `${slide + 1}/${total}`;
      node.querySelectorAll('[data-dots] button').forEach((d, i) => d.classList.toggle('is-on', i === slide));
      const prev = node.querySelector('[data-slide="-1"]'), next = node.querySelector('[data-slide="1"]');
      if (prev) prev.disabled = slide === 0;
      if (next) next.disabled = slide === total - 1;
      const layer = node.querySelector('[data-pinlayer]');
      if (layer) layer.innerHTML = pinsHTML(o, slide);
    }

    function irPara(i, avisar = true) {
      const n = Math.max(0, Math.min(total - 1, i));
      if (n === slide) return;
      slide = n;
      pintarSlide();
      if (avisar) o.onSlide?.(slide);
    }

    node.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-slide]');
      if (nav) { e.preventDefault(); e.stopPropagation(); return irPara(slide + Number(nav.dataset.slide)); }
      const dot = e.target.closest('[data-goto]');
      if (dot) { e.preventDefault(); e.stopPropagation(); return irPara(Number(dot.dataset.goto)); }
      const mais = e.target.closest('[data-more], [data-less]');
      if (mais) {
        e.preventDefault(); e.stopPropagation();
        const abrir = mais.hasAttribute('data-more');
        const cap = mais.closest('[data-cap]');
        cap.querySelector('[data-cap-short]').hidden = abrir;
        cap.querySelector('[data-cap-full]').hidden = !abrir;
        o.onExpand?.(abrir);
      }
    });

    /* arrastar para o lado, como no aplicativo de verdade */
    if (media && total > 1) {
      let x0 = null, arrastou = false;
      media.addEventListener('pointerdown', (e) => {
        if (e.target.closest('[data-pinlayer].is-arming, .np-nav, [data-goto]')) return;
        x0 = e.clientX; arrastou = false;
      });
      media.addEventListener('pointermove', (e) => {
        if (x0 === null) return;
        if (Math.abs(e.clientX - x0) > 8) arrastou = true;
      });
      const soltar = (e) => {
        if (x0 === null) return;
        const dx = e.clientX - x0;
        x0 = null;
        if (Math.abs(dx) > 40) irPara(slide + (dx < 0 ? 1 : -1));
      };
      media.addEventListener('pointerup', soltar);
      media.addEventListener('pointercancel', () => { x0 = null; });
      media.addEventListener('click', (e) => { if (arrastou) { e.stopPropagation(); arrastou = false; } }, true);
    }

    node.__preview = { goTo: (i) => irPara(i, false), get slide() { return slide; } };
  }

  /* ==========================================================================
     API
     ========================================================================== */
  /**
   * @param {object} p  postagem
   * @param {object} o  { net, context:'feed'|'profile', device:'mobile'|'desktop',
   *                      mode:'light'|'dark', slide, pins, activePin, arming,
   *                      expanded, onSlide, onExpand }
   */
  function render(p, o = {}) {
    const opts = { context: 'feed', device: 'mobile', mode: 'light', slide: 0, focus: true, ...o };
    const net = NETS()[opts.net] ? opts.net : mainNet(p);
    opts.net = net;
    const netClass = { instagram: 'np--ig', facebook: 'np--fb', linkedin: 'np--li' }[net];

    const body = opts.context === 'profile' ? PROFILE_OF[net](p, opts) : POST_OF[net](p, opts);

    const wrap = document.createElement('div');
    wrap.className = 'frame frame--' + opts.device;

    if (opts.device === 'mobile') {
      wrap.innerHTML = `<div class="phone">
        <div class="phone__notch"></div>
        <div class="phone__screen np ${netClass}" data-mode="${opts.mode}">
          ${STATUS_BAR}${CHROME[net](body)}
        </div>
        <div class="phone__home"></div></div>`;
    } else {
      const url = { instagram: 'instagram.com/', facebook: 'facebook.com/', linkedin: 'linkedin.com/company/' }[net]
        + (opts.context === 'profile' ? (brand().handles[net] || '').toLowerCase().replace(/\s+/g, '') : '');
      wrap.innerHTML = `<div class="browser">
        <div class="browser__bar">
          <span class="browser__dots"><i></i><i></i><i></i></span>
          <span class="browser__url">${icon('lock')} ${esc(url)}</span>
        </div>
        <div class="browser__view np ${netClass}" data-mode="${opts.mode}">
          ${desktopLayout(net, body, opts.context)}
        </div></div>`;
    }

    wrap.dataset.postId = p.id || '';
    wrap.dataset.net = net;
    bind(wrap, p, opts);
    return wrap;
  }

  global.Preview = { render, netsOf, mainNet, ratioOf, captionOf };
})(window);
