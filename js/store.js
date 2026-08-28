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
    global.dispatchEvent(new CustomEvent('aprova:change', { detail: { reason, ...detail } }));
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

  /** Exporta o plano de conteúdo — o que o cliente costuma pedir por e-mail. */
  function exportJSON() {
    return JSON.stringify({ exportadoEm: new Date().toISOString(), marca: state.brand.name, postagens: state.posts }, null, 2);
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
    markAllRead, addToLibrary, snapshot, canUndo, undo, reset, exportJSON,
  };
})(window);
