# Arquitetura — convite (O livro de Vicente Mateus)
> Camada semântica. Fatos estruturais exatos (arquivos, símbolos, dependentes, testes) → agentmap.

## Visão geral
Convite mobile em forma de livro noturno (Next.js App Router 16, React 19, TS, CSS puro). Uma única experiência client-side (`components/book/Book.tsx`) com capa, 7 páginas, virada de página por CSS (3D no desktop, 2D abaixo de 500px por causa do Safari/iOS), música de fundo e RSVP. Persistência opcional em Supabase (conteúdo editável, RSVPs, trilha no Storage). Sem credenciais, roda com o conteúdo de `lib/content.ts`. Dev: `npm run dev`; deploy: Docker standalone (`Dockerfile`, `docker-compose.yml`).

## Módulos
| Módulo | Faz | Entrada/hub | Consulta útil |
|---|---|---|---|
| `components/book` | livro: estado de página, gestos, áudio, carregamento, RSVP, cenas | `Book.tsx` | `--relates components/book/Book.tsx` |
| `components/admin` | painel /admin (login, conteúdo, trilha, RSVPs) | `Admin.tsx` | `--relates components/admin/Admin.tsx` |
| `lib` | conteúdo padrão/tipos, cliente Supabase, helpers de áudio | `content.ts` | `--find defaults --json` |
| `app` | rotas (`/`, `/admin`), layout/fonte (Poppins), OG image, **todo o CSS** | `globals.css` | — |
| `public/illustrations` | 3 PNGs grandes (~1,5 MB cada), servidos por `next/image` | — | — |
| `tests` | unit (`tsx --test`), PGlite p/ RLS, e2e Playwright | `*.spec.ts`, `*.test.ts` | `--affected <arquivo>` |

## Fronteiras
- Dados: `lib/supabase.ts` (chave publishable, `null` sem env). `site_settings.content` (JSON mesclado com `defaults`), `rsvps` (INSERT público, UUID idempotente), `admins`, bucket `soundtracks` público. Migrations em `supabase/migrations`. Sem env → modo local, sem áudio.
- Áudio: um único `<audio>` fora das folhas (`useBookAudio`); trilha de `content.audioPath` (Storage público) é pré-baixada como Blob e só toca por gesto: `play()` síncrono no clique de "Abrir o livro", sem esperar a promessa.
- Carregamento: `bookLoad()` (`lib/loading.ts`) decide quando o livro pode abrir (texto via `useInvitationContent`, arte, fontes, trilha); falha no texto = estado de erro com retry.
- UI: todo o estilo em `app/globals.css` (arquivo único, ~1,5k linhas; blocos adicionados por camadas, o último vence). Folha ativa (`.active-page`) + folha de baixo (`.under-page`) + `settlingPage` evitam piscar no Safari.
- Rotas: `/` (livro), `/admin` (protegido por `admins`).

## Fora do alcance do agentmap
- `app/globals.css` — CSS/animações (virada: `turnNext/turnPrev` desktop, `turnNextMobile/turnPrevMobile` ≤500px).
- `supabase/` — SQL, RLS, config.
- `docs/`, `Dockerfile`, `.github/workflows/ci.yml` (lint, typecheck, unit, e2e em chromium+webkit).

## Convenções que o código não mostra
- Safari/iOS: nada de 3D/backface no mobile; a mesma `<article>` ativa permanece montada entre viradas (teste guarda isso); `onAnimationEnd` da folha encerra a virada (timer de 1 s é só rede de segurança).
- `play()` do áudio precisa ocorrer síncrono dentro do clique (iOS). `HTMLMediaElement.volume` é somente leitura no iOS.
- Next.js 16 tem breaking changes: consultar `node_modules/next/dist/docs/` antes de usar APIs novas.
- Testes e2e não têm Supabase: o caminho de áudio só é exercitado com env configurada (teste WebKit é pulado sem ela).
