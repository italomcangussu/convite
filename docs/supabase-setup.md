# Supabase configurado

Projeto: Convites (`atjenukyphuqmzxjfqot`).
API: https://atjenukyphuqmzxjfqot.supabase.co

As migrations locais foram aplicadas ao projeto remoto. O conteúdo inicial de `lib/content.ts` foi registrado em `public.site_settings` (id 1). Presentes e textos ficam nesse documento. Confirmações ficam em `public.rsvps`; autorização administrativa em `public.admins`; músicas no bucket público `soundtracks`, com escrita exclusiva de administradores e limite de 20 MB.

`.env.local` conecta o site ao projeto usando somente a chave publishable. A URL do site permanece `http://localhost:3000` até existir um endereço de publicação. Supabase fornece o backend; a aplicação Next.js precisa de hospedagem própria.

Ainda não há usuário administrador. Crie um usuário com e-mail confirmado em Authentication e autorize seu UUID conforme a seção Primeiro administrador do README. Nenhuma senha foi criada automaticamente.

Validação: leitura real pela Data API, bloqueio de leitura pública de confirmações, RPC administrativo falso para visitante, INSERT de confirmação em transação revertida, testes locais e TypeScript. A auditoria de segurança foi executada após as migrations.
