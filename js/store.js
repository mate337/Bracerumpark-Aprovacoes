/* ==========================================================================
   APROVA — estado
   Fonte única de verdade. Persiste em localStorage e avisa a interface por
   evento ("aprova:change"). Toda mutação passa por uma ação nomeada, o que
   deixa o histórico auditável — e é o que permite desfazer.
   ========================================================================== */
(function (global) {
  'use strict';
  const { uid } = global.U;
  const KEY = 'aprova.state.v2';

  const DEFAULT_SETTINGS = {
    theme: 'dark',
    railCollapsed: false,
    previewMode: 'light',        // tema do preview da rede (light | dark)
    approvalMode: 'todos',       // 'todos' = todo aprovador assina · 'qualquer' = o primeiro libera
    lockApproved: true,          // travar edição depois de aprovado
    notifyOnComment: true,
  };

  function fresh() {
    return {
      users: structuredClone(global.SEED.USERS),
      brand: structuredClone(global.SEED.BRAND),
      library: structuredClone(global.SEED.LIBRARY),
      posts: structuredClone(global.SEED.POSTS),
      notifications: structuredClone(global.SEED.NOTIFICATIONS),
      settings: { ...DEFAULT_SETTINGS },
      currentUserId: null,
      seq: global.SEED.POSTS.length,
      /* o que foi apagado, para a exclusão não "ressuscitar" na sincronização */
      deleted: {},
    };
  }

  let state = load();
  let undoStack = [];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return fresh();
      const parsed = JSON.parse(raw);
      // mescla defaults novos sem apagar o que o usuário já tem
      parsed.settings = { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) };
      parsed.deleted = parsed.deleted || {};
      return parsed;
    } catch (e) {
      console.warn('[aprova] estado ilegível, recomeçando', e);
      return fresh();
    }
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      // cota estourada — quase sempre por mídia em base64
      console.warn('[aprova] não deu para salvar', e);
      global.dispatchEvent(new CustomEvent('aprova:quota'));
    }
  }

  function emit(reason, detail = {}) {
    persist();
    if (reason !== 'sync') pushSoon();
    global.dispatchEvent(new CustomEvent('aprova:change', { detail: { reason, ...detail } }));
  }

  /* ==========================================================================
     SINCRONIZAÇÃO
     O que é da equipe sobe; o que é de cada pessoa fica. Tema, dispositivo e
     quem está logado são preferências locais e não viajam.
     ========================================================================== */
  const PESSOAL = ['settings', 'currentUserId'];

  /** O recorte do estado que a equipe compartilha. */
  function syncDoc() {
    const { settings: _s, currentUserId: _u, ...resto } = state;
    return { v: 2, ...resto };
  }

  let pushTimer = null;
  let pushErro = null;
  function pushSoon() {
    if (!global.Cloud?.isOn()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(async () => {
      try {
        await global.Cloud.push(syncDoc());
        pushErro = null;
      } catch (e) {
        pushErro = e.message;
        console.warn('[aprova] não deu para enviar', e);
      }
      global.dispatchEvent(new CustomEvent('aprova:sync', { detail: { erro: pushErro } }));
    }, 1200);
  }

  /**
   * Junta o que veio do servidor com o que existe aqui. A regra é por peça:
   * vence a versão editada por último. Assim duas pessoas podem trabalhar em
   * postagens diferentes ao mesmo tempo sem uma apagar a outra.
   */
  function mergeRemote(doc) {
    if (!doc) return false;
    const antes = JSON.stringify(syncDoc());

    state.deleted = { ...(doc.deleted || {}), ...(state.deleted || {}) };

    const porId = new Map();
    (doc.posts || []).forEach((p) => porId.set(p.id, p));
    (state.posts || []).forEach((p) => {
      const r = porId.get(p.id);
      if (!r) return porId.set(p.id, p);
      porId.set(p.id, new Date(p.updatedAt || 0) >= new Date(r.updatedAt || 0) ? p : r);
    });
    state.posts = [...porId.values()]
      .filter((p) => !state.deleted[p.id])
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const srcs = new Set();
    state.library = [...(doc.library || []), ...(state.library || [])]
      .filter((m) => (srcs.has(m.src) ? false : srcs.add(m.src)));

    const nIds = new Set();
    state.notifications = [...(state.notifications || []), ...(doc.notifications || [])]
      .filter((n) => (nIds.has(n.id) ? false : nIds.add(n.id)))
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 60);

    if (doc.users?.length) state.users = doc.users;
    if (doc.brand) state.brand = doc.brand;
    state.seq = Math.max(state.seq || 0, doc.seq || 0);

    const mudou = antes !== JSON.stringify(syncDoc());
    if (mudou) emit('sync');
    else persist();
    return mudou;
  }

  /** Primeira carga: puxa o que já existe e começa a ouvir mudanças. */
  async function startSync() {
    if (!global.Cloud?.isOn()) return;
    try {
      const r = await global.Cloud.pull();
      if (r) mergeRemote(r.doc);
      else await global.Cloud.push(syncDoc()); // servidor vazio: semeia com o que há aqui
    } catch (e) {
      console.warn('[aprova] sincronização indisponível', e);
      global.dispatchEvent(new CustomEvent('aprova:sync', { detail: { erro: e.message } }));
    }
    global.Cloud.start((novo) => mergeRemote(novo.doc));
  }

  /* ---------------------------------------------------- mídia para a nuvem */
  const ehDataUrl = (s) => typeof s === 'string' && s.startsWith('data:');

  /** Quantos arquivos ainda existem só como base64 neste navegador. */
  function contarMidiaLocal() {
    let n = 0;
    (state.posts || []).forEach((p) => (p.media || []).forEach((m) => {
      if (ehDataUrl(m.src)) n++;
      if (ehDataUrl(m.poster)) n++;
    }));
    (state.library || []).forEach((m) => { if (ehDataUrl(m.src)) n++; });
    if (ehDataUrl(state.brand?.avatar)) n++;
    if (ehDataUrl(state.brand?.cover)) n++;
    return n;
  }

  /**
   * Sobe para o armazenamento compartilhado tudo o que hoje é base64 e troca
   * o endereço no estado. É o que resolve “as imagens só aparecem para mim”
   * sem ninguém reenviar arquivo.
   */
  async function migrarMidias(aoAndar) {
    if (!global.Cloud?.isOn()) throw new Error('Configure a sincronização antes.');
    const alvos = [];
    (state.posts || []).forEach((p) => (p.media || []).forEach((m) => {
      if (ehDataUrl(m.src)) alvos.push({ obj: m, campo: 'src', nome: m.alt || p.code });
      if (ehDataUrl(m.poster)) alvos.push({ obj: m, campo: 'poster', nome: (m.alt || p.code) + '-capa' });
    }));
    (state.library || []).forEach((m) => { if (ehDataUrl(m.src)) alvos.push({ obj: m, campo: 'src', nome: m.alt || 'acervo' }); });
    if (ehDataUrl(state.brand?.avatar)) alvos.push({ obj: state.brand, campo: 'avatar', nome: 'marca-avatar' });
    if (ehDataUrl(state.brand?.cover)) alvos.push({ obj: state.brand, campo: 'cover', nome: 'marca-capa' });

    const falhas = [];
    for (let i = 0; i < alvos.length; i++) {
      const a = alvos[i];
      aoAndar?.(i, alvos.length, a.nome);
      try {
        a.obj[a.campo] = await global.Cloud.uploadMedia(a.obj[a.campo], a.nome);
      } catch (e) {
        falhas.push(`${a.nome}: ${e.message}`);
      }
    }
    persist();
    try { await global.Cloud.push(syncDoc()); } catch (e) { falhas.push('envio final: ' + e.message); }
    emit('sync');
    return { total: alvos.length, falhas };
  }

  /** Guarda um retrato do estado antes de uma ação destrutiva. */
  function snapshot(label) {
    undoStack.push({ label, data: JSON.stringify(state) });
    if (undoStack.length > 24) undoStack.shift();
  }

  /* ---------------------------------------------------------- leitura --- */
  const get = () => state;
  const settings = () => state.settings;
  const me = () => state.users.find((u) => u.id === state.currentUserId) || null;
  const user = (id) => state.users.find((u) => u.id === id) || { id, name: 'Alguém', role: 'admin', title: '', color: 'var(--grad-brand)' };
  const post = (id) => state.posts.find((p) => p.id === id) || null;
  const isAdmin = () => me()?.role === 'admin';

  /** Postagens visíveis para o perfil atual: aprovador não vê rascunho. */
  function visiblePosts() {
    const admin = isAdmin();
    return state.posts.filter((p) => admin || p.status !== 'rascunho');
  }

  function unreadCount() {
    const my = me();
    if (!my) return 0;
    return state.notifications.filter((n) => !n.read && n.userId !== my.id).length;
  }

  /** Quantas postagens esperam decisão de quem está logado. */
  function pendingForMe() {
    const my = me();
    if (!my) return [];
    return state.posts.filter((p) => canDecide(p, my.id) || (my.role === 'admin' && p.status === 'revisao'));
  }

  /** O primeiro nível ainda aberto — usado para “aguardando fulano”. */
  function currentLevel(p) {
    return (p.levels || []).find((l) => l.status === 'pendente') || null;
  }

  /** O nível desta pessoa, se ela ainda não decidiu. */
  function myLevel(p, userId = state.currentUserId) {
    return (p.levels || []).find((l) => l.approverId === userId && l.status !== 'aprovado') || null;
  }

  /** Os níveis correm em paralelo: quem for aprovador pode decidir quando quiser. */
  function canDecide(p, userId = state.currentUserId) {
    return p.status === 'revisao' && !!myLevel(p, userId);
  }

  function counts() {
    const c = {};
    for (const s of global.SEED.STATUS_ORDER) c[s] = 0;
    for (const p of visiblePosts()) c[p.status] = (c[p.status] || 0) + 1;
    return c;
  }

  /* ----------------------------------------------------------- sessão --- */
  /** Conta cadastrada com este e-mail (sem diferenciar maiúsculas). */
  function userByEmail(email) {
    const alvo = String(email || '').trim().toLowerCase();
    return state.users.find((u) => u.email.toLowerCase() === alvo) || null;
  }

  function login(userId) {
    state.currentUserId = userId;
    emit('login');
  }
  function logout() {
    state.currentUserId = null;
    emit('logout');
  }
  function setSetting(k, v) {
    state.settings[k] = v;
    emit('settings', { key: k });
  }

  /* -------------------------------------------------------- postagens --- */
  function nextCode() {
    state.seq = (state.seq || 0) + 1;
    return `BP-${String(state.seq).padStart(3, '0')}`;
  }

  function createPost(data) {
    const my = me();
    const p = {
      networks: ['instagram'],
      sponsored: false,
      ad: null,
      format: 'single',
      title: 'Nova postagem',
      media: [],
      captions: [],
      chosenCaption: null,
      firstComment: '',
      link: '',
      status: 'rascunho',
      priority: 'normal',
      tags: [],
      scheduledAt: null,
      note: '',
      createdBy: my?.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      levels: defaultLevels(data?.approvers),
      activity: [{ id: uid('a'), kind: 'system', authorId: my?.id, at: new Date().toISOString(), text: 'criou a postagem' }],
      ...data,
    };
    /* depois do spread: um `code: undefined` vindo do compositor não pode
       apagar o código da peça, e o contador só anda quando é realmente novo */
    p.id = p.id || uid('p');
    p.code = p.code || nextCode();
    state.posts.unshift(p);
    emit('post:create', { postId: p.id });
    return p;
  }

  /** Revisão interna é revisão de par: quem criou não revisa a si mesmo. */
  /** Uma trilha de aprovação a partir dos aprovadores escolhidos. */
  function defaultLevels(approverIds) {
    const ids = (approverIds?.length ? approverIds : state.users.filter((u) => u.role === 'approver').map((u) => u.id));
    return ids.map((id) => ({ name: 'Aprovação', approverId: id, status: 'pendente', at: null }));
  }

  function updatePost(id, patch, reason = 'post:update') {
    const p = post(id);
    if (!p) return null;
    Object.assign(p, patch, { updatedAt: new Date().toISOString() });
    emit(reason, { postId: id });
    return p;
  }

  function deletePost(id) {
    snapshot('excluir postagem');
    (state.deleted ||= {})[id] = new Date().toISOString();
    state.posts = state.posts.filter((p) => p.id !== id);
    state.notifications = state.notifications.filter((n) => n.postId !== id);
    emit('post:delete', { postId: id });
  }

  function duplicatePost(id) {
    const src = post(id);
    if (!src) return null;
    const copy = structuredClone(src);
    copy.id = uid('p');
    copy.code = nextCode();
    copy.title = src.title + ' (cópia)';
    copy.status = 'rascunho';
    copy.scheduledAt = null;
    copy.createdAt = copy.updatedAt = new Date().toISOString();
    copy.levels = defaultLevels(src.levels?.map((l) => l.approverId));
    copy.activity = [{ id: uid('a'), kind: 'system', authorId: state.currentUserId, at: new Date().toISOString(), text: `duplicou de ${src.code}` }];
    copy.metrics = undefined;
    state.posts.unshift(copy);
    emit('post:duplicate', { postId: copy.id });
    return copy;
  }

  /** Muda o estado e registra na linha do tempo. */
  function setStatus(id, status, note = '') {
    const p = post(id);
    if (!p) return;
    if (p.status === status) return;
    const from = p.status;
    p.status = status;
    p.updatedAt = new Date().toISOString();
    p.activity.push({
      id: uid('a'), kind: 'status', authorId: state.currentUserId, at: new Date().toISOString(),
      text: `moveu de “${global.SEED.STATUSES[from].short}” para “${global.SEED.STATUSES[status].short}”${note ? ' — ' + note : ''}`,
    });
    if (status === 'revisao') {
      // reabre os níveis para nova rodada
      p.levels.forEach((l) => { if (l.status !== 'aprovado') { l.status = 'pendente'; l.at = null; } });
    }
    emit('post:status', { postId: id, from, to: status });
  }

  /* ----------------------------------------------------------- mídias --- */
  function addMedia(id, items) {
    const p = post(id);
    if (!p) return;
    p.media.push(...items);
    p.updatedAt = new Date().toISOString();
    emit('post:media', { postId: id });
  }
  function removeMedia(id, mediaId) {
    const p = post(id);
    if (!p) return;
    p.media = p.media.filter((m) => m.id !== mediaId);
    emit('post:media', { postId: id });
  }
  function reorderMedia(id, from, to) {
    const p = post(id);
    if (!p) return;
    const [m] = p.media.splice(from, 1);
    p.media.splice(to, 0, m);
    emit('post:media', { postId: id });
  }

  /* ---------------------------------------------------------- legendas -- */
  function addCaption(id, text = '', label) {
    const p = post(id);
    if (!p) return;
    const letra = String.fromCharCode(65 + p.captions.length);
    p.captions.push({ id: uid('cap'), label: label || `Opção ${letra}`, text, author: state.currentUserId, createdAt: new Date().toISOString() });
    emit('post:caption', { postId: id });
  }
  function updateCaption(id, capId, text) {
    const p = post(id);
    const c = p?.captions.find((x) => x.id === capId);
    if (!c) return;
    c.text = text;
    p.updatedAt = new Date().toISOString();
    emit('post:caption', { postId: id, silent: true });
  }
  function removeCaption(id, capId) {
    const p = post(id);
    if (!p || p.captions.length <= 1) return;
    const idx = p.captions.findIndex((c) => c.id === capId);
    p.captions.splice(idx, 1);
    if (p.chosenCaption === idx) p.chosenCaption = null;
    else if (p.chosenCaption > idx) p.chosenCaption--;
    emit('post:caption', { postId: id });
  }
  /** O aprovador escolhe qual legenda vai ao ar — e isso fica registrado. */
  function chooseCaption(id, index) {
    const p = post(id);
    if (!p) return;
    p.chosenCaption = index;
    p.activity.push({
      id: uid('a'), kind: 'caption', authorId: state.currentUserId, at: new Date().toISOString(),
      text: `escolheu a legenda “${p.captions[index]?.label || '—'}”`,
    });
    emit('post:caption', { postId: id });
  }
  /** Sugestão de texto do aprovador — o admin aceita ou não. */
  function suggestCaption(id, capIndex, newText, comment) {
    const p = post(id);
    if (!p) return;
    p.activity.push({
      id: uid('a'), kind: 'suggestion', authorId: state.currentUserId, at: new Date().toISOString(),
      text: comment || 'sugeriu uma nova redação',
      suggestion: { capIndex, text: newText, applied: false },
      resolved: false, replies: [],
    });
    emit('post:suggestion', { postId: id });
  }
  function applySuggestion(id, activityId) {
    const p = post(id);
    const a = p?.activity.find((x) => x.id === activityId);
    if (!a?.suggestion) return;
    const cap = p.captions[a.suggestion.capIndex];
    if (cap) cap.text = a.suggestion.text;
    a.suggestion.applied = true;
    a.resolved = true;
    p.activity.push({ id: uid('a'), kind: 'system', authorId: state.currentUserId, at: new Date().toISOString(), text: 'aplicou a redação sugerida' });
    emit('post:caption', { postId: id });
  }

  /* ------------------------------------------------------- comentários -- */
  function comment(id, text, opts = {}) {
    const p = post(id);
    if (!p || !text.trim()) return;
    const item = {
      id: uid('a'), kind: opts.kind || 'comment', authorId: state.currentUserId,
      at: new Date().toISOString(), text: text.trim(),
      internal: !!opts.internal, resolved: false, replies: [],
      pin: opts.pin || null,
    };
    p.activity.push(item);
    p.updatedAt = new Date().toISOString();
    notify(p.id, opts.kind === 'change' ? 'solicitou alterações em' : 'comentou em');
    emit('post:comment', { postId: id, activityId: item.id });
    return item;
  }

  function reply(id, activityId, text) {
    const p = post(id);
    const a = p?.activity.find((x) => x.id === activityId);
    if (!a || !text.trim()) return;
    (a.replies ||= []).push({ id: uid('r'), authorId: state.currentUserId, at: new Date().toISOString(), text: text.trim() });
    notify(p.id, 'respondeu em');
    emit('post:comment', { postId: id });
  }

  function toggleResolved(id, activityId) {
    const p = post(id);
    const a = p?.activity.find((x) => x.id === activityId);
    if (!a) return;
    a.resolved = !a.resolved;
    emit('post:comment', { postId: id });
  }

  function deleteActivity(id, activityId) {
    const p = post(id);
    if (!p) return;
    p.activity = p.activity.filter((x) => x.id !== activityId);
    emit('post:comment', { postId: id });
  }

  /* --------------------------------------------------------- decisões --- */
  /** Aprova o nível aberto. Se era o último, a postagem vira "aprovado". */
  function approve(id, note = '') {
    const p = post(id);
    const my = me();
    if (!p || !my) return;
    const agora = new Date().toISOString();
    const lvl = myLevel(p, my.id) || currentLevel(p);
    if (lvl) { lvl.status = 'aprovado'; lvl.at = agora; }
    /* “basta um aprovar”: a assinatura de quem decidiu fecha os outros níveis */
    if (state.settings.approvalMode === 'qualquer') {
      p.levels.forEach((l) => { if (l.status !== 'aprovado') { l.status = 'aprovado'; l.at = agora; l.byProxy = my.id; } });
    }
    p.activity.push({ id: uid('a'), kind: 'approve', authorId: my.id, at: agora, text: note || 'aprovou esta postagem.' });
    const pend = p.levels.some((l) => l.status !== 'aprovado');
    p.status = pend ? 'revisao' : (p.scheduledAt ? 'agendado' : 'aprovado');
    p.updatedAt = new Date().toISOString();
    notify(p.id, 'aprovou');
    emit('post:approve', { postId: id });
  }

  function requestChanges(id, text) {
    const p = post(id);
    const my = me();
    if (!p || !my) return;
    const lvl = myLevel(p, my.id) || currentLevel(p) || p.levels[p.levels.length - 1];
    if (lvl) { lvl.status = 'alteracoes'; lvl.at = new Date().toISOString(); }
    p.activity.push({ id: uid('a'), kind: 'change', authorId: my.id, at: new Date().toISOString(), text: text || 'solicitou alterações.', resolved: false, replies: [] });
    p.status = 'alteracoes';
    p.updatedAt = new Date().toISOString();
    notify(p.id, 'solicitou alterações em');
    emit('post:changes', { postId: id });
  }

  function submitForApproval(id) {
    const p = post(id);
    if (!p) return;
    if (!p.levels?.length) p.levels = defaultLevels();
    p.levels.forEach((l) => { l.status = 'pendente'; l.at = null; });
    setStatus(id, 'revisao');
    notify(id, 'enviou para aprovação');
  }

  function schedule(id, isoDateTime) {
    const p = post(id);
    if (!p) return;
    p.scheduledAt = isoDateTime;
    if (p.status === 'aprovado') p.status = 'agendado';
    p.activity.push({ id: uid('a'), kind: 'system', authorId: state.currentUserId, at: new Date().toISOString(), text: `agendou para ${new Date(isoDateTime).toLocaleString('pt-BR')}` });
    emit('post:schedule', { postId: id });
  }

  /* ----------------------------------------------------- notificações --- */
  function notify(postId, text) {
    state.notifications.unshift({ id: uid('n'), postId, userId: state.currentUserId, at: new Date().toISOString(), text, read: false });
    state.notifications = state.notifications.slice(0, 60);
  }
  function markAllRead() {
    state.notifications.forEach((n) => { n.read = true; });
    emit('notifications');
  }

  /* ---------------------------------------------------------- acervo ---- */
  function addToLibrary(items) {
    state.library.unshift(...items);
    emit('library');
  }

  /* ------------------------------------------------------------ undo ---- */
  function canUndo() { return undoStack.length > 0; }
  function undo() {
    const s = undoStack.pop();
    if (!s) return false;
    state = JSON.parse(s.data);
    emit('undo');
    return s.label;
  }

  function reset() {
    state = fresh();
    undoStack = [];
    localStorage.removeItem(KEY);
    emit('reset');
  }

  /**
   * Cópia completa e reimportável: leva as mídias embutidas, então serve tanto
   * de backup quanto de mudança de navegador sem reenviar arquivo.
   */
  function exportJSON() {
    return JSON.stringify({
      aplicativo: 'APROVA', formato: 2,
      exportadoEm: new Date().toISOString(),
      marca: state.brand?.name,
      dados: syncDoc(),
    }, null, 2);
  }

  /** @param {'substituir'|'mesclar'} modo */
  function importState(texto, modo = 'mesclar') {
    let entrada;
    try { entrada = typeof texto === 'string' ? JSON.parse(texto) : texto; }
    catch (e) { throw new Error('Arquivo inválido: não é um JSON.'); }

    /* aceita a cópia nova e também o formato antigo, que era só a lista */
    const doc = entrada.dados
      || (Array.isArray(entrada.postagens) ? { posts: entrada.postagens } : null)
      || (Array.isArray(entrada.posts) ? entrada : null);
    if (!doc?.posts) throw new Error('Não encontrei postagens neste arquivo.');

    snapshot('importar dados');
    if (modo === 'substituir') {
      const s = state.settings, u = state.currentUserId;
      state = { ...fresh(), ...doc, settings: s, currentUserId: u };
      emit('import');
    } else {
      mergeRemote(doc);
      emit('import');
    }
    return doc.posts.length;
  }

  global.Store = {
    get, settings, me, user, post, isAdmin, visiblePosts, counts, unreadCount, pendingForMe,
    currentLevel, myLevel, canDecide, defaultLevels, userByEmail,
    login, logout, setSetting,
    createPost, updatePost, deletePost, duplicatePost, setStatus, submitForApproval, schedule,
    addMedia, removeMedia, reorderMedia,
    addCaption, updateCaption, removeCaption, chooseCaption, suggestCaption, applySuggestion,
    comment, reply, toggleResolved, deleteActivity,
    approve, requestChanges,
    markAllRead, addToLibrary, snapshot, canUndo, undo, reset, exportJSON, importState,
    syncDoc, mergeRemote, startSync, migrarMidias, contarMidiaLocal, pushSoon,
  };
})(window);
