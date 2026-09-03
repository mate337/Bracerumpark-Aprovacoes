/* ==========================================================================
   APROVA — para onde o aplicativo grava

   Projeto "BracerumParkAprova" no Supabase. Estes valores ligam o site ao
   servidor da equipe: as peças, os comentários e as imagens ficam lá, e todo
   mundo que abrir o site vê o mesmo.

   Não existe modo local. Sem estes valores o aplicativo não abre — mostra a
   tela de instalação. Conteúdo preso no navegador de uma pessoa não serve
   para aprovar nada.

   A chave abaixo é a PUBLICÁVEL (sb_publishable_…): ela é feita para ficar no
   navegador de quem abre o site, e por isso vive aqui. Quem protege os dados
   são as políticas (RLS) criadas por supabase/instalacao.sql, não o sigilo da
   chave. NUNCA coloque aqui a chave secreta (sb_secret_… / service_role).
   ========================================================================== */
window.APROVA_CONFIG = {
  url: 'https://kddungxbtibpzcphmtna.supabase.co',
  key: 'sb_publishable_GgEmKfVchIl0Rj_jfcBkLw_MMq9I8ew',
  table: 'aprova_docs',
  bucket: 'aprova',
  workspace: 'bracerum',
};
