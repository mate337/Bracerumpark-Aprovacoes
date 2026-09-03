/* ==========================================================================
   APROVA — sincronização
   O aplicativo guarda tudo em localStorage, que é por navegador: o que você
   cria não aparece para mais ninguém, nem para você em uma janela anônima.
   Este módulo dá ao aplicativo um lugar comum — um projeto Supabase — e é
   opcional: sem configuração, nada muda e o app segue local.

   Fala com a API REST direto por fetch, sem SDK, para não trazer dependência.
   ========================================================================== */
(function (global) {
  'use strict';

  const LS_KEY = 'aprova.cloud.v1';
  const PADRAO = { url: '', key: '', table: 'aprova_docs', bucket: 'aprova', workspace: 'bracerum' };

  let cfg = ler();
  let timer = null;
  let ultimoPull = null;   // updated_at que já conhecemos
  const est = { ligado: false, puxando: false, enviando: false, erro: null, em: null };

  /** Configuração: o arquivo config.js do repositório, ou o que a pessoa
      colou nos Ajustes (fica só neste navegador). */
  function ler() {
    let base = { ...PADRAO, ...(global.APROVA_CONFIG || {}) };
    try {
      const local = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (local) base = { ...base, ...local };
    } catch (e) { /* configuração local ilegível: fica só a do arquivo */ }
    return base;
  }

  const isOn = () => !!(cfg.url && cfg.key);
  const config = () => ({ ...cfg });

  function setConfig(parcial) {
    cfg = { ...cfg, ...parcial };
    localStorage.setItem(LS_KEY, JSON.stringify({
      url: cfg.url, key: cfg.key, table: cfg.table, bucket: cfg.bucket, workspace: cfg.workspace,
    }));
    ultimoPull = null;
    return cfg;
  }
  function clearConfig() {
    localStorage.removeItem(LS_KEY);
    cfg = ler();
    ultimoPull = null;
  }

  const cabecalhos = () => ({
    apikey: cfg.key,
    Authorization: `Bearer ${cfg.key}`,
    'Content-Type': 'application/json',
  });

  const base = () => String(cfg.url).replace(/\/+$/, '');

  async function req(caminho, opts = {}) {
    const r = await fetch(base() + caminho, { ...opts, headers: { ...cabecalhos(), ...(opts.headers || {}) } });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      throw new Error(`${r.status} ${r.statusText}${txt ? ' — ' + txt.slice(0, 200) : ''}`);
    }
    return r;
  }

  /* ------------------------------------------------------------ leitura -- */
  /** Devolve { doc, updatedAt } ou null quando ainda não há nada gravado. */
  async function pull() {
    if (!isOn()) return null;
    est.puxando = true;
    try {
      const r = await req(`/rest/v1/${cfg.table}?id=eq.${encodeURIComponent(cfg.workspace)}&select=doc,updated_at`);
      const linhas = await r.json();
      est.erro = null;
      est.em = new Date().toISOString();
      if (!linhas.length) return null;
      ultimoPull = linhas[0].updated_at;
      return { doc: linhas[0].doc, updatedAt: linhas[0].updated_at };
    } catch (e) {
      est.erro = e.message;
      throw e;
    } finally {
      est.puxando = false;
    }
  }

  /* ------------------------------------------------------------- escrita - */
  async function push(doc) {
    if (!isOn()) return null;
    est.enviando = true;
    try {
      const r = await req(`/rest/v1/${cfg.table}`, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify([{ id: cfg.workspace, doc, updated_at: new Date().toISOString() }]),
      });
      const linhas = await r.json();
      ultimoPull = linhas?.[0]?.updated_at || ultimoPull;
      est.erro = null;
      est.em = new Date().toISOString();
      return ultimoPull;
    } catch (e) {
      est.erro = e.message;
      throw e;
    } finally {
      est.enviando = false;
    }
  }

  /* -------------------------------------------------------------- mídia -- */
  const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/quicktime': 'mov' };

  function dataUrlParaBlob(dataUrl) {
    const [cabeca, corpo] = String(dataUrl).split(',');
    const tipo = (cabeca.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
    const bin = atob(corpo);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return new Blob([buf], { type: tipo });
  }

  /**
   * Sobe uma imagem que hoje só existe como data: URL no navegador e devolve
   * a URL pública. É isso que tira as mídias do cache local sem ninguém
   * precisar enviar arquivo de novo.
   */
  async function uploadMedia(dataUrl, nomeBase = 'midia') {
    if (!isOn()) throw new Error('sincronização não configurada');
    const blob = dataUrlParaBlob(dataUrl);
    const ext = EXT[blob.type] || 'bin';
    const nome = `${cfg.workspace}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${String(nomeBase).replace(/[^\w.-]+/g, '_').slice(0, 40)}.${ext}`;
    const r = await fetch(`${base()}/storage/v1/object/${encodeURIComponent(cfg.bucket)}/${nome}`, {
      method: 'POST',
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, 'Content-Type': blob.type, 'x-upsert': 'true' },
      body: blob,
    });
    if (!r.ok) throw new Error(`upload falhou: ${r.status} ${await r.text().catch(() => '')}`.slice(0, 200));
    return `${base()}/storage/v1/object/public/${cfg.bucket}/${nome}`;
  }

  /* ------------------------------------------------------------- ronda --- */
  /** Verifica a cada N segundos se alguém gravou algo novo. */
  function start(aoMudar, segundos = 10) {
    stop();
    if (!isOn()) return;
    est.ligado = true;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const r = await req(`/rest/v1/${cfg.table}?id=eq.${encodeURIComponent(cfg.workspace)}&select=updated_at`);
        const linhas = await r.json();
        const remoto = linhas?.[0]?.updated_at;
        if (remoto && remoto !== ultimoPull) {
          const novo = await pull();
          if (novo) aoMudar?.(novo);
        }
      } catch (e) { /* rede caiu: a próxima volta tenta de novo */ }
    };
    timer = setInterval(tick, segundos * 1000);
    global.addEventListener('focus', tick);
    tick();
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    est.ligado = false;
  }

  const status = () => ({ ...est, on: isOn(), url: cfg.url, workspace: cfg.workspace });

  /** Testa a configuração antes de gravar qualquer coisa. */
  async function testar() {
    if (!isOn()) throw new Error('Preencha a URL e a chave.');
    await req(`/rest/v1/${cfg.table}?select=id&limit=1`);
    return true;
  }

  global.Cloud = { isOn, config, setConfig, clearConfig, pull, push, uploadMedia, start, stop, status, testar, dataUrlParaBlob };
})(window);
