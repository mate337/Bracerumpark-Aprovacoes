/* ==========================================================================
   APROVA — pré-visualizações
   Reconstrói a moldura de cada rede para que a aprovação aconteça sobre algo
   parecido com o que o público vai ver: Feed e Perfil, no celular e no
   desktop. É simulação de layout, não a rede real.
   ========================================================================== */
(function (global) {
  'use strict';
  const { esc, icon, iconFilled, richText, nfmt, ago } = global.U;

  const NETS = () => global.SEED.NETWORKS;
  const FORMATS = () => global.SEED.FORMATS;

  /* Qual rede desenha a peça: em anúncio, é a plataforma de veiculação. */
  const surfaceOf = (p) => (p.network === 'ads' ? (p.adPlatform || 'instagram') : p.network);

  function ratioOf(p) {
    const f = FORMATS()[p.format] || FORMATS().single;
    return f.ratio[surfaceOf(p)] || f.ratio.instagram || '1';
  }

  function captionOf(p) {
    if (p.chosenCaption !== null && p.captions?.[p.chosenCaption]) return p.captions[p.chosenCaption].text;
    return p.captions?.[0]?.text || '';
  }

  const brand = () => global.Store.get().brand;

  /* ---------------------------------------------------------- retalhos -- */
  function avatar(cls = '') {
    const b = brand();
    return `<div class="np-av ${cls}"><img src="${esc(b.avatar)}" alt="" loading="lazy"></div>`;
  }
  function ringAvatar() {
    const b = brand();
    return `<div class="np-av np-av--ring"><div><img src="${esc(b.avatar)}" alt="" loading="lazy"></div></div>`;
  }

  const VERIFIED = '<svg class="verified" viewBox="0 0 24 24"><path d="M12 1.5 14.6 4l3.5-.4 1 3.4 3 1.9-1.4 3.2 1.4 3.2-3 1.9-1 3.4-3.5-.4L12 22.5 9.4 20l-3.5.4-1-3.4-3-1.9L3.3 12 1.9 8.8l3-1.9 1-3.4L9.4 4z"/><path d="m8.4 12.2 2.4 2.4 4.8-5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /** Bloco de mídia com carrossel, vídeo e camada de marcadores. */
  function mediaBlock(p, o) {
    const media = p.media?.length ? p.media : [{ type: 'image', src: '', alt: 'sem mídia' }];
    const ratio = ratioOf(p);
    const slide = Math.min(o.slide || 0, media.length - 1);
    const multi = media.length > 1;

    const slides = media.map((m) => {
      if (m.type === 'video') {
        return `<div style="position:relative;height:100%">
          <img src="${esc(m.poster || m.src)}" alt="${esc(m.alt || '')}" loading="lazy">
          <div class="np-play"><div class="np-play__btn">${iconFilled('play')}</div></div>
          ${m.duration ? `<div class="np-dur">0:${String(m.duration % 60).padStart(2, '0')}</div>` : ''}
          <div class="np-sound">${icon('volume')}</div>
        </div>`;
      }
      return m.src
        ? `<img src="${esc(m.src)}" alt="${esc(m.alt || '')}" loading="lazy">`
        : `<div style="height:100%;display:grid;place-items:center;background:#15100c;color:#5b5048;font-size:12px">sem mídia</div>`;
    }).join('');

    const pins = (o.pins || []).filter((c) => (c.pin?.mediaIndex ?? 0) === slide).map((c, i) => `
      <button class="pin${o.activePin === c.id ? ' is-on' : ''}" data-pin="${c.id}"
        style="left:${c.pin.x}%;top:${c.pin.y}%" title="${esc(c.text.slice(0, 60))}">
        <span>${i + 1}</span></button>`).join('');

    return `<div class="np-media" data-ratio="${ratio}" data-media>
      <div class="np-track" style="transform:translateX(-${slide * 100}%)">${slides}</div>
      ${multi ? `<div class="np-count">${slide + 1}/${media.length}</div>` : ''}
      ${multi ? `<button class="np-nav np-nav--prev" data-slide="-1" ${slide === 0 ? 'disabled' : ''} aria-label="Anterior">${icon('chevL')}</button>
                 <button class="np-nav np-nav--next" data-slide="1" ${slide === media.length - 1 ? 'disabled' : ''} aria-label="Próximo">${icon('chevR')}</button>
                 <div class="np-dots">${media.map((_, i) => `<i class="${i === slide ? 'is-on' : ''}"></i>`).join('')}</div>` : ''}
      <div class="pin-layer${o.arming ? ' is-arming' : ''}" data-pinlayer>${pins}</div>
    </div>`;
  }

  /** Legenda com o corte real de cada rede ("... mais" / "ver mais"). */
  function captionBlock(p, surface, opts = {}) {
    const text = captionOf(p);
    if (!text) return '';
    const limit = surface === 'instagram' ? 125 : surface === 'facebook' ? 280 : 210;
    const cut = text.length > limit && !opts.full;
    const shown = cut ? text.slice(0, limit).trimEnd() : text;
    const more = cut ? `<span class="np-cap__more"> … ${surface === 'instagram' ? 'mais' : 'ver mais'}</span>` : '';
    const handle = brand().handles[surface] || brand().name;
    if (surface === 'instagram') {
      return `<div class="np-cap"><span class="np-cap__user">${esc(handle)}</span>${richText(shown)}${more}</div>`;
    }
    return `<div class="np-body">${richText(shown)}${more}</div>`;
  }

  /* ==========================================================================
     INSTAGRAM
     ========================================================================== */
  function igPost(p, o) {
    const isAd = p.network === 'ads';
    const b = brand();
    const likes = 200 + ((p.code || '').charCodeAt(3) || 5) * 37;
    return `<article class="np-post${o.focus ? ' is-focus' : ''}">
      <header class="np-post__head">
        ${ringAvatar()}
        <div class="np-post__id">
          <div class="np-post__name">${esc(b.handles.instagram)}${VERIFIED}</div>
          <div class="np-post__meta">${isAd ? 'Patrocinado' : 'Villeta, Paraguay'}</div>
        </div>
        <button class="np-post__more">${icon('more')}</button>
      </header>
      ${mediaBlock(p, o)}
      ${isAd ? `<div class="np-cta-bar"><span>${esc(p.ad?.cta || 'Saiba mais')}</span>${icon('chevR')}</div>` : ''}
      <div class="np-acts">
        ${icon('heart')}${icon('msg')}${icon('send')}<span class="spacer"></span>${icon('bookmark')}
      </div>
      <div class="np-likes">${nfmt(likes)} curtidas</div>
      ${captionBlock(p, 'instagram', o)}
      <div class="np-sub">Ver todos os 24 comentários</div>
      <div class="np-sub" style="padding-top:0">${p.scheduledAt ? esc(ago(p.scheduledAt)) : 'agora'}</div>
    </article>`;
  }

  function igProfile(p, o) {
    const b = brand();
    const others = otherPosts(p, 8);
    /* completa a grade com o acervo: um perfil com 3 quadros não dá a
       sensação de feed — e é o feed inteiro que o cliente está julgando */
    const preencher = global.Store.get().library
      .filter((m) => !others.some((o) => o.media?.[0]?.src === m.src) && m.src !== p.media?.[0]?.src)
      .slice(0, Math.max(0, 11 - others.length))
      .map((m) => ({ media: [m], format: 'single' }));
    const cell = (post, isNew) => {
      const m = post.media?.[0];
      const ic = post.format === 'carousel' ? 'layers' : (post.format === 'reels' || post.format === 'video') ? 'reels' : null;
      return `<div class="np-grid__it${isNew ? ' is-new' : ''}">
        ${m?.src ? `<img src="${esc(m.src)}" alt="${esc(m.alt || '')}" loading="lazy">` : ''}
        ${ic ? `<span class="ic">${icon(ic)}</span>` : ''}
      </div>`;
    };
    return `<div class="np-profile">
      <div class="np-prof-head">
        ${ringAvatar().replace('np-av--ring', 'np-av--ring np-prof-av')}
        <div style="flex:1">
          <div class="np-prof-stats">
            <div><b>${nfmt(global.Store.get().posts.filter((x) => x.status === 'publicado').length + 128)}</b>publicações</div>
            <div><b>${nfmt(b.followers.instagram)}</b>seguidores</div>
            <div><b>412</b>seguindo</div>
          </div>
        </div>
      </div>
      <div class="np-prof-bio"><b>${esc(b.name)}</b><br>${esc(b.headline)}<br><span style="color:var(--n-accent)">${esc(b.site)}</span></div>
      <div class="np-prof-actions">
        <button class="primary">Seguir</button><button>Mensagem</button><button style="flex:0 0 40px">${icon('user')}</button>
      </div>
      <div class="np-prof-tabs">
        <button class="is-on">${icon('grid')}</button><button>${icon('reels')}</button><button>${icon('user')}</button>
      </div>
      <div class="np-grid">
        ${cell(p, true)}
        ${[...others, ...preencher].map((x) => cell(x, false)).join('')}
      </div>
    </div>`;
  }

  /* ==========================================================================
     FACEBOOK
     ========================================================================== */
  function fbPost(p, o) {
    const isAd = p.network === 'ads';
    const b = brand();
    return `<article class="np-post${o.focus ? ' is-focus' : ''}">
      <header class="np-post__head">
        ${avatar()}
        <div class="np-post__id">
          <div class="np-post__name">${esc(b.handles.facebook)}${VERIFIED}</div>
          <div class="np-post__meta">${isAd ? 'Patrocinado' : (p.scheduledAt ? esc(ago(p.scheduledAt)) : 'agora')} · ${icon('globe')}</div>
        </div>
        <button class="np-post__more">${icon('more')}</button>
      </header>
      ${captionBlock(p, 'facebook', o)}
      ${mediaBlock(p, o)}
      ${isAd ? `<div class="np-adcard">
        <div class="np-adcard__txt">
          <div class="np-adcard__dom">${esc(p.ad?.domain || 'bracerumpark.com')}</div>
          <div class="np-adcard__t">${esc(p.ad?.headline || p.title)}</div>
          <div class="np-adcard__d">${esc(p.ad?.description || '')}</div>
        </div>
        <button class="np-cta">${esc(p.ad?.cta || 'Saiba mais')}</button>
      </div>` : ''}
      <div class="np-stats">
        <span class="np-reactions"><i class="like">${iconFilled('thumbUp')}</i><i class="love">${iconFilled('heart')}</i><i class="care">★</i></span>
        <span>1,2 mil</span><span class="spacer"></span><span>84 comentários</span><span>19 compart.</span>
      </div>
      <div class="np-bar">
        <button>${icon('thumbUp')} Curtir</button>
        <button>${icon('msg')} Comentar</button>
        <button>${icon('share')} Compartilhar</button>
      </div>
    </article>`;
  }

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
      ${otherPosts(p, 1).map((x) => fbPost(x, { slide: 0 })).join('')}
    </div>`;
  }

  /* ==========================================================================
     LINKEDIN
     ========================================================================== */
  function liPost(p, o) {
    const isAd = p.network === 'ads';
    const b = brand();
    return `<article class="np-post${o.focus ? ' is-focus' : ''}">
      <header class="np-post__head">
        ${avatar('np-av--sq')}
        <div class="np-post__id">
          <div class="np-post__name">${esc(b.handles.linkedin)}</div>
          <div class="np-headline">${esc(b.headline)}</div>
          <div class="np-post__meta">${isAd ? '<span class="np-promoted">Promovido</span>' : `${p.scheduledAt ? esc(ago(p.scheduledAt)) : 'agora'} · ${icon('globe')}`}</div>
        </div>
        <button class="np-post__more">${icon('more')}</button>
      </header>
      ${captionBlock(p, 'linkedin', o)}
      ${mediaBlock(p, o)}
      ${isAd ? `<div class="np-adcard">
        <div class="np-adcard__txt">
          <div class="np-adcard__t">${esc(p.ad?.headline || p.title)}</div>
          <div class="np-adcard__dom">${esc(p.ad?.domain || 'bracerumpark.com')}</div>
        </div>
        <button class="np-cta">${esc(p.ad?.cta || 'Saiba mais')}</button>
      </div>` : ''}
      <div class="np-stats">
        <span class="np-reactions"><i class="like">${iconFilled('thumbUp')}</i><i class="love">${iconFilled('heart')}</i></span>
        <span>218</span><span style="margin-left:auto">37 comentários · 12 republicações</span>
      </div>
      <div class="np-bar">
        <button>${icon('thumbUp')} Gostei</button>
        <button>${icon('msg')} Comentar</button>
        <button>${icon('repeat')} Republicar</button>
        <button>${icon('send')} Enviar</button>
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
      ${otherPosts(p, 1).map((x) => liPost(x, { slide: 0 })).join('')}
    </div>`;
  }

  /* ==========================================================================
     MOLDURAS
     ========================================================================== */
  function otherPosts(p, n) {
    return global.Store.get().posts
      .filter((x) => x.id !== p.id && x.media?.length && surfaceOf(x) === surfaceOf(p))
      .slice(0, n);
  }

  const STATUS_BAR = `<div class="phone__status">
    <span>9:41</span>
    <span class="sig">${icon('trend')}${icon('volume')}<b style="font-size:11px">100%</b></span>
  </div>`;

  function igChrome(inner, ctx) {
    return `<header class="np-topbar"><span class="np-topbar__logo">Instagram</span>
      <span class="np-topbar__acts">${icon('heart')}${icon('send')}</span></header>
      <div class="np__scroll">${inner}</div>
      <nav class="np-tabbar">${icon('home')}${icon('search')}${icon('reels')}${icon('bookmark')}${avatar().replace('np-av', 'np-av av')}</nav>`;
  }
  function fbChrome(inner) {
    return `<header class="np-topbar"><span class="np-topbar__logo" style="color:#1877f2">facebook</span>
      <span class="np-topbar__acts">${icon('plus')}${icon('search')}${icon('msg')}</span></header>
      <div class="np__scroll">${inner}</div>
      <nav class="np-tabbar">${icon('home')}${icon('users')}${icon('video')}${icon('bell')}${icon('menu')}</nav>`;
  }
  function liChrome(inner) {
    return `<header class="np-topbar">${avatar('np-av--sq').replace('np-av', 'np-av')}
      <span style="flex:1;background:var(--n-sunken);border-radius:6px;padding:6px 10px;font-size:12px;color:var(--n-txt2)">Pesquisar</span>
      ${icon('msg')}</header>
      <div class="np__scroll">${inner}</div>
      <nav class="np-tabbar">${icon('home')}${icon('users')}${icon('plus')}${icon('bell')}${icon('inbox')}</nav>`;
  }

  const CHROME = { instagram: igChrome, facebook: fbChrome, linkedin: liChrome };
  const POST_OF = { instagram: igPost, facebook: fbPost, linkedin: liPost };
  const PROFILE_OF = { instagram: igProfile, facebook: fbProfile, linkedin: liProfile };

  /** Colunas laterais falsas — dão a escala real do desktop sem distrair. */
  function fakeAside(rows = 3) {
    return `<div class="np-fake">${Array.from({ length: rows }, () => `
      <div class="np-fake__row">${avatar()}<div style="flex:1"><div class="np-fake__bar" style="width:70%"></div><div class="np-fake__bar" style="width:45%;margin-top:6px;height:7px"></div></div></div>`).join('')}</div>`;
  }

  function desktopLayout(surface, main, context) {
    if (context === 'profile') {
      return `<div class="np-desk" style="grid-template-columns:minmax(0,1fr);max-width:960px;margin:0 auto">
        <div class="np-desk__main" style="max-width:none">${main}</div></div>`;
    }
    if (surface === 'instagram') {
      return `<div class="np-desk">
        <div class="np-desk__main">${main}</div>
        <aside class="np-desk__aside">
          <div class="np-fake__row" style="margin-bottom:8px">${avatar()}<div><div class="np-fake__t">${esc(brand().handles.instagram)}</div><div style="font-size:11px;color:var(--n-txt2)">${esc(brand().name)}</div></div></div>
          <div class="np-fake__t">Sugestões para você</div>
          ${fakeAside(4)}
        </aside>
      </div>`;
    }
    return `<div class="np-desk">
      <aside class="np-desk__aside np-desk__aside--l">${fakeAside(4)}</aside>
      <div class="np-desk__main">${main}</div>
      <aside class="np-desk__aside">${fakeAside(3)}</aside>
    </div>`;
  }

  /* ==========================================================================
     API
     ========================================================================== */
  /**
   * @param {object} p    postagem
   * @param {object} o    { context:'feed'|'profile', device:'mobile'|'desktop',
   *                        mode:'light'|'dark', slide, pins, activePin, arming, full }
   */
  function render(p, o = {}) {
    const opts = { context: 'feed', device: 'mobile', mode: 'light', slide: 0, focus: true, ...o };
    const surface = surfaceOf(p);
    const netClass = { instagram: 'np--ig', facebook: 'np--fb', linkedin: 'np--li' }[surface];

    const body = opts.context === 'profile'
      ? PROFILE_OF[surface](p, opts)
      : POST_OF[surface](p, opts) + (opts.device === 'desktop' || surface !== 'instagram'
          ? otherPosts(p, 1).map((x) => POST_OF[surface](x, { slide: 0 })).join('')
          : '');

    const wrap = document.createElement('div');
    wrap.className = 'frame frame--' + opts.device;

    if (opts.device === 'mobile') {
      wrap.innerHTML = `<div class="phone">
        <div class="phone__notch"></div>
        <div class="phone__screen np ${netClass}" data-mode="${opts.mode}">
          ${STATUS_BAR}
          ${CHROME[surface](body, opts.context)}
        </div>
        <div class="phone__home"></div>
      </div>`;
      // a moldura do celular tem 3 faixas: status, conteúdo, tabbar
      const screen = wrap.querySelector('.phone__screen');
      screen.style.gridTemplateRows = 'auto 1fr auto';
    } else {
      const url = { instagram: 'instagram.com/', facebook: 'facebook.com/', linkedin: 'linkedin.com/company/' }[surface]
        + (opts.context === 'profile' ? (brand().handles[surface] || '').toLowerCase().replace(/\s+/g, '') : '');
      wrap.innerHTML = `<div class="browser">
        <div class="browser__bar">
          <span class="browser__dots"><i></i><i></i><i></i></span>
          <span class="browser__url">${icon('lock')} ${esc(url)}</span>
        </div>
        <div class="browser__view np ${netClass}" data-mode="${opts.mode}">
          ${desktopLayout(surface, body, opts.context)}
        </div>
      </div>`;
    }

    wrap.dataset.postId = p.id;
    return wrap;
  }

  /** Miniatura estática para os cartões do quadro. */
  function thumb(p) {
    const m = p.media?.[0];
    return m?.src || '';
  }

  global.Preview = { render, surfaceOf, ratioOf, captionOf, thumb };
})(window);
