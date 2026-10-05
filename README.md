# O livro de Vicente Mateus

Convite mobile em formato de livro noturno, inspirado apenas no ritmo narrativo das referências. Ilustrações originais de linguagem manual, ornamentos SVG, capa física em CSS 3D, sete capítulos, navegação por swipe, bordas e teclado. Não inclui fotos ou reserva de presentes.

## Executar

Node 22+.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Abra http://localhost:3000 e http://localhost:3000/admin. Sem credenciais, o convite usa conteúdo inicial editável no código e a administração permanece fechada. O formulário informa que as confirmações ainda não abriram; não registra nem simula sucesso.

## Supabase

1. Crie um projeto Supabase próprio (nenhum projeto remoto é criado automaticamente).
2. Preencha `.env.local` (tem prioridade sobre `.env`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SITE_URL` (URL final do convite). Não use service-role no navegador.
3. Autentique e vincule a CLI:

```sh
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

A migration `supabase/migrations/20261005131122_invitation.sql` cria `site_settings`, `rsvps`, `admins`, RLS, índice de data e bucket `soundtracks` (áudio público, upload somente admin, limite 20 MB). O registro inicial `{}` é mesclado com `lib/content.ts`; salvar no painel persiste todo o documento. Presentes e capítulos ficam no documento de conteúdo, evitando tabelas de CMS desnecessárias.

Para desenvolvimento com backend local, inicie Docker e rode `npx supabase start`; configure as variáveis com URL e chave pública locais. O arquivo `supabase/config.toml` já está presente.

## Primeiro administrador

No dashboard Supabase, Authentication → Users → Add user: crie e confirme um usuário com e-mail e senha. Desative cadastro público em Authentication para este projeto. No SQL Editor, autorize o UUID desse usuário:

```sql
insert into public.admins(user_id) values ('UUID-DO-USUARIO');
```

Somente a tabela `admins` autoriza administração; uma conta autenticada sem associação não tem acesso. Abra `/admin`, entre com e-mail e senha. Para revogar, remova a linha de `admins` no SQL Editor: a RLS consulta associação atual, sem depender de metadados editáveis ou JWT com permissões antigas.

O painel permite editar identidade, textos, frase e autoria, data, formato, horário, endereço, sugestões ordenadas e sua visibilidade; enviar/substituir/remover música, ouvir prévia e ajustar volume; pesquisar, ordenar, remover e exportar RSVPs. Google Maps e Waze são gerados pelo endereço, sem APIs pagas ou iframe.

RSVP registra família, UUID, data/hora do banco e status. Público tem INSERT, sem SELECT/UPDATE/DELETE. O UUID do navegador torna reenvio idempotente. Contatos da família não são coletados. Em produção de grande alcance, considerar limitação de requisições/CAPTCHA para evitar spam.

## Música e conteúdo pendentes

Definir pelo painel: data, horário, local/endereço, textos/citações finais, sugestões definitivas e música com direito de uso. Nenhuma trilha é incluída: ela inicia após abrir o livro quando um arquivo estiver configurado, persiste entre páginas e tem pausa discreta. O áudio não é armazenado no repositório.

Não há atribuição automática das frases provisórias a Saint-Exupéry. O campo de autoria fica vazio até a citação definitiva ser fornecida.

## Verificação

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

Testes unitários cobrem geração de links e data. Testes de navegador cobrem leitura, abertura, bordas, swipe/cancelamento, teclado, RSVP sem backend e proteção do admin, em Chromium mobile/desktop e WebKit mobile. Login, edição, upload, áudio e persistência em Supabase real exigem configurar um projeto; não são declarados validados por estes testes de interface.

## Deploy

### VPS com Docker

O Dockerfile faz um build multi-stage do Next.js em modo standalone. A imagem final contém apenas o servidor e os arquivos necessários, roda como usuário sem privilégios e inclui healthcheck. O Compose mantém o container ativo após reinícios e publica a porta somente em `127.0.0.1`, para receber tráfego de um proxy reverso com HTTPS.

Na VPS, instale Docker Engine com o plugin Compose, clone este repositório e configure o ambiente de produção:

```sh
cp .env.production.example .env.production
nano .env.production
docker compose --env-file .env.production up -d --build
```

Preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SITE_URL` com os valores de produção. `HOST_PORT` pode permanecer em `3000`; use o host `127.0.0.1:3000` como upstream no Nginx ou Caddy. As variáveis públicas do Supabase são incorporadas ao bundle durante o build. Não coloque uma chave `service_role` nesse arquivo. Execute as migrations Supabase antes de receber confirmações.

Confira o estado e os logs:

```sh
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs -f web
curl -I http://127.0.0.1:3000
```

Para publicar atualizações, faça `git pull` e rode novamente `docker compose --env-file .env.production up -d --build`. O Docker reconstrói a imagem e recria o container. O `.dockerignore` exclui `.env*`, credenciais, dependências locais e artefatos de desenvolvimento do contexto enviado ao build.

Também é possível hospedar como aplicação Next.js em Vercel ou em outro host Node. Configure as mesmas variáveis públicas no build e a URL de produção. Em Node: `npm run build` e `npm start`.

Metadados e imagem de compartilhamento estão em `app/layout.tsx` e `public/og.svg`; substitua SVG por PNG/JPEG para compatibilidade ampla dos previews sociais. A metadata padrão corresponde à identidade inicial; atualize-a se mudar nome/idade. Indexação está desativada por privacidade; ajuste se desejar tornar o convite pesquisável.

## Áreas principais

- `components/book/Book.tsx`: estado, gestos, capítulos e RSVP.
- `components/book/Scene.tsx`: cenas, imagens otimizadas e planeta em SVG.
- `public/illustrations/`: três artes com transparência.
- `docs/art-direction/`: direção de arte e prompts usados na geração integrada de imagens.
- `components/admin/Admin.tsx`: autenticação e edição.
- `app/globals.css`: identidade, livro 3D, responsividade e movimento reduzido.
- `lib/content.ts`: conteúdo inicial, datas e mapas.
- `lib/supabase.ts`: cliente com chave pública.
- `supabase/migrations/`: estrutura, RLS e storage.
- `docs/design.md`: direção visual e decisões.

A virada usa CSS 3D sem biblioteca pesada. Gestos acompanham rotação parcial; curto retorna à posição inicial. Não é uma simulação de papel com malha/deformação, mantendo fluidez mobile.

A suíte também executa a migration em PostgreSQL embarcado (PGlite), com schemas Auth/Storage mínimos para verificar RLS: público não lê famílias nem altera conteúdo/áudio; contas comuns não acessam RSVPs; admins podem editar e remover. Isto valida SQL e permissões, não substitui um teste ponta a ponta com os serviços Supabase reais.

O reenvio de RSVP usa INSERT com o mesmo UUID e trata violação da chave primária como confirmação já registrada. Não concede leitura pública nem usa UPSERT que exigiria política SELECT. Ao revisitar no mesmo navegador, o estado confirmado é restaurado.

Auditoria de dependências: `npm audit --omit=dev` não encontrou vulnerabilidades. A ferramenta de lint tem 5 alertas transitivos relacionados a `braces` (stack exhaustion em padrões profundamente aninhados), sem atualização corrigida disponível nesta instalação; não faz parte do runtime público. Não foi aplicado downgrade incompatível sugerido automaticamente pelo npm.

## Variáveis de ambiente e Git

`.env` contém a configuração base; `.env.local` contém os valores locais e credenciais. Ambos são ignorados pelo Git, assim como outros arquivos `.env*` e `.vercel/`. Apenas `.env.example`, sem credenciais, deve ser versionado. Nesta pasta ainda não existe um repositório Git; as regras passam a valer ao inicializá-lo. Se um arquivo já estiver versionado, o `.gitignore` não o remove do histórico.

`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` são públicas por necessidade do cliente no navegador. A chave publishable depende das políticas RLS para limitar o acesso. `SITE_URL` é lida pelo servidor para metadados; a URL aparecerá nos metadados públicos. Segredos devem ter nomes sem `NEXT_PUBLIC_`, ser acessados somente no servidor e nunca ser retornados em respostas ou enviados como props ao cliente. As variáveis opcionais comentadas são espaços para futuras integrações e ainda não são consumidas pelo site. Não coloque a senha do administrador em arquivos de ambiente.

Reinicie `npm run dev` após alterações. No deploy, configure as variáveis no provedor antes do build; as variáveis públicas são incorporadas ao JavaScript durante o build.
