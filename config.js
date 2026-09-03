/* ==========================================================================
   APROVA — configuração de compartilhamento (opcional)

   Sem isto preenchido, o aplicativo funciona normalmente, mas cada navegador
   tem a sua própria cópia: o que você cria não aparece para mais ninguém.

   Para todos verem as mesmas postagens, crie um projeto gratuito no Supabase
   (supabase.com), rode o SQL que está no README e cole aqui os dois valores
   de Project Settings → API.

   A chave "anon" é pública de propósito — ela vai para o navegador de quem
   abrir o site. Quem protege os dados são as políticas (RLS) do SQL do README,
   não o segredo da chave. NÃO cole aqui a chave "service_role".
   ========================================================================== */
window.APROVA_CONFIG = {
  url: '',              // https://xxxxxxxx.supabase.co
  key: '',              // chave anon (public)
  table: 'aprova_docs', // tabela criada pelo SQL do README
  bucket: 'aprova',     // bucket de mídias, público para leitura
  workspace: 'bracerum',// permite mais de uma equipe no mesmo projeto
};
