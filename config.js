/* ==========================================================================
   APROVA — para onde o aplicativo grava

   Estes dois valores ligam o site ao servidor da equipe. Enquanto estiverem
   vazios, o aplicativo NÃO abre: mostra a tela de instalação, que guia o passo
   a passo e devolve este mesmo bloco pronto para colar aqui.

   Não existe modo local. Conteúdo preso no navegador de uma pessoa não serve
   para aprovar nada — foi o que motivou esta decisão.

   Como preencher: crie um projeto gratuito no Supabase (supabase.com), rode o
   SQL que a tela de instalação entrega e copie, em Project Settings → API, a
   Project URL e a chave "anon public".

   A chave "anon" é pública de propósito — ela vai para o navegador de quem
   abrir o site. Quem protege os dados são as políticas (RLS) criadas pelo SQL,
   não o sigilo da chave. NUNCA cole aqui a chave "service_role".
   ========================================================================== */
window.APROVA_CONFIG = {
  // Projeto "BracerumParkAprova" (ref kddungxbtibpzcphmtna)
  url: 'https://kddungxbtibpzcphmtna.supabase.co',
  key: '',              // FALTA: chave anon (public), em Project Settings → API
  table: 'aprova_docs', // criada pelo SQL da instalação
  bucket: 'aprova',     // bucket de mídias, público para leitura
  workspace: 'bracerum',// permite mais de uma equipe no mesmo projeto
};
