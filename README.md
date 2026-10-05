# O livro de Vicente Mateus

Convite mobile em formato de livro noturno, inspirado apenas no ritmo narrativo das referências. Ilustrações originais de linguagem manual, ornamentos SVG, capa física em CSS 3D, seis páginas e um modal de confirmação de presença, navegação por swipe, bordas e teclado. Não inclui fotos ou reserva de presentes.

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

O painel permite editar identidade, textos, frase e autoria, data, formato, horário, endereço, sugestões ordenadas e sua visibilidade; enviar/substituir/remover música, ouvir prévia e ajustar volume; pesquisar, ordenar, remover e exportar RSVPs (CSV ou uma lista numerada pronta para enviar por WhatsApp). Google Maps e Waze são gerados pelo endereço, sem APIs pagas ou iframe.

RSVP registra família, UUID, data/hora do banco e status. Público tem INSERT, sem SELECT/UPDATE/DELETE. O UUID do navegador torna reenvio idempotente. Contatos da família não são coletados. Em produção de grande alcance, considerar limitação de requisições/CAPTCHA para evitar spam.

## Música e conteúdo pendentes

Definir pelo painel: data, horário, local/endereço, textos/citações finais, sugestões definitivas e música com direito de uso. Nenhuma trilha é incluída. O áudio não é armazenado no repositório.

Como a música toca:

- Assim que o convite carrega, a trilha é baixada para a memória do aparelho (com progresso na própria barra do botão). O iOS/Safari não pré-carrega mídia remota antes de um toque; baixando antes, o `play()` do toque em "Abrir o livro" já encontra o arquivo pronto e a música começa junto com a capa.
- `play()` roda de forma síncrona dentro do toque (exigência do iOS) e o livro abre no mesmo instante, sem esperar a promessa de reprodução. O volume sobe aos poucos (onde o aparelho permite; o iOS ignora `volume`).
- Se o download falhar ou passar de 12 s, a trilha é tocada por streaming a partir do toque; se o arquivo for inválido, o botão passa a dizer "Abrir sem música". Se o navegador recusar o `play()`, o botão de música pulsa com o convite "Toque para ouvir a música".
- A música pausa quando a aba/o app vai para segundo plano e retorna se estava tocando.

Não há atribuição automática das frases provisórias a Saint-Exupéry. O campo de autoria fica vazio até a citação definitiva ser fornecida.

## Confirmação de presença

O livro tem seis páginas; o sétimo capítulo, a confirmação, abre como modal quando se aperta "Confirmar presença" (o "Próxima página" da última página), puxa a folha para frente, toca a borda direita ou usa a seta para a direita nela. A família digita o nome e confirma; depois aparece o agradecimento e, ao reabrir, o modal já mostra a presença confirmada (o UUID/nome ficam em `localStorage`). O modal segue a área visível do iPhone (`visualViewport`), então o cartão fica acima do teclado; Esc, o X e o toque fora fecham.

### Exportar por WhatsApp

Na aba "Confirmações" do painel, "Exportar por WhatsApp" monta uma mensagem com a lista que está na tela (mesma pesquisa e ordem do CSV): título, quantas famílias, data/hora da leitura e as famílias numeradas. Ele abre `wa.me` sem número, então o WhatsApp deixa escolher a conversa ou o grupo. Listas grandes demais para o link (mais de uns 6 mil caracteres) são copiadas para a área de transferência, e o painel avisa para colar na conversa. Só os nomes das famílias saem do painel; contatos não são coletados.

## Quando o livro abre

O botão da capa só fica ativo quando o livro carregou: texto do convite (Supabase), ilustrações, fontes e, se houver, a trilha. A própria barra do botão mostra o progresso. Se o texto não puder ser buscado (3 tentativas), o livro **não** abre com o conteúdo de rascunho, para não mostrar dados errados aos convidados: aparece "Tentar novamente". Ilustrações, fontes e música lentas deixam de bloquear após 14 s para que um único pedido travado não impeça o acesso. Sem credenciais do Supabase o convite usa `lib/content.ts` e abre assim que a arte carrega.

## Verificação

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

Testes unitários cobrem geração de links e data, o download/fade da trilha e a regra de quando o livro pode abrir. Testes de navegador cobrem leitura, abertura só depois do carregamento, bordas, swipe que acompanha o dedo/cancelamento, teclado, RSVP sem backend e proteção do admin, em Chromium mobile/desktop e WebKit mobile.

`tests/audio.spec.ts` exercita o caminho com Supabase (trilha em memória, `play()` no toque, falha do texto com nova tentativa, trilha indisponível) interceptando todas as chamadas; ele só roda com as variáveis públicas definidas e, por isso, fica ignorado na suíte padrão:

```sh
NEXT_PUBLIC_SUPABASE_URL=https://exemplo.supabase.co \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=chave \
npm run test:e2e -- tests/audio.spec.ts
```

Login, edição, upload e persistência em Supabase real exigem configurar um projeto; não são declarados validados por estes testes. Reprodução de áudio em aparelho iOS real também não é coberta (só Chromium foi executado para o áudio).

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

- `components/book/Book.tsx`: estado, gestos e capítulos.
- `components/book/RsvpDialog.tsx`: confirmação de presença (sétimo capítulo) em modal, pensada para o iPhone.
- `components/book/useBookAudio.ts`: trilha (download em memória, play no toque, fade, pausa em segundo plano).
- `components/book/useInvitationContent.ts`: busca do texto com tentativas e estado de erro.
- `lib/audio.ts`, `lib/loading.ts`: helpers puros testados (download, fade, regra de abertura).
- `components/book/Scene.tsx`: cenas, imagens otimizadas e planeta em SVG.
- `public/illustrations/`: três artes com transparência.
- `docs/art-direction/`: direção de arte e prompts usados na geração integrada de imagens.
- `components/admin/Admin.tsx`: autenticação e edição.
- `app/globals.css`: identidade, livro 3D, responsividade e movimento reduzido.
- `lib/content.ts`: conteúdo inicial, datas e mapas.
- `lib/supabase.ts`: cliente com chave pública.
- `supabase/migrations/`: estrutura, RLS e storage.
- `docs/design.md`: direção visual e decisões.

A virada usa CSS 3D (desktop) ou deslize 2D (até 500 px, por causa do Safari/iOS) sem biblioteca pesada. A folha acompanha o dedo mostrando a próxima página por baixo, com sombra projetada; ao soltar além do limite a virada continua de onde o dedo parou, e ao soltar curto a folha volta com uma mola. Não é uma simulação de papel com malha/deformação, mantendo fluidez mobile.

A suíte também executa a migration em PostgreSQL embarcado (PGlite), com schemas Auth/Storage mínimos para verificar RLS: público não lê famílias nem altera conteúdo/áudio; contas comuns não acessam RSVPs; admins podem editar e remover. Isto valida SQL e permissões, não substitui um teste ponta a ponta com os serviços Supabase reais.

O reenvio de RSVP usa INSERT com o mesmo UUID e trata violação da chave primária como confirmação já registrada. Não concede leitura pública nem usa UPSERT que exigiria política SELECT. Ao revisitar no mesmo navegador, o estado confirmado é restaurado.

Auditoria de dependências: `npm audit --omit=dev` não encontrou vulnerabilidades. A ferramenta de lint tem 5 alertas transitivos relacionados a `braces` (stack exhaustion em padrões profundamente aninhados), sem atualização corrigida disponível nesta instalação; não faz parte do runtime público. Não foi aplicado downgrade incompatível sugerido automaticamente pelo npm.

## Variáveis de ambiente e Git

`.env` contém a configuração base; `.env.local` contém os valores locais e credenciais. Ambos são ignorados pelo Git, assim como outros arquivos `.env*` e `.vercel/`. Apenas `.env.example`, sem credenciais, deve ser versionado. Nesta pasta ainda não existe um repositório Git; as regras passam a valer ao inicializá-lo. Se um arquivo já estiver versionado, o `.gitignore` não o remove do histórico.

`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` são públicas por necessidade do cliente no navegador. A chave publishable depende das políticas RLS para limitar o acesso. `SITE_URL` é lida pelo servidor para metadados; a URL aparecerá nos metadados públicos. Segredos devem ter nomes sem `NEXT_PUBLIC_`, ser acessados somente no servidor e nunca ser retornados em respostas ou enviados como props ao cliente. As variáveis opcionais comentadas são espaços para futuras integrações e ainda não são consumidas pelo site. Não coloque a senha do administrador em arquivos de ambiente.

Reinicie `npm run dev` após alterações. No deploy, configure as variáveis no provedor antes do build; as variáveis públicas são incorporadas ao JavaScript durante o build.
