# Histórico do contexto (fabuloso)

Uma entrada por sessão: data, o que mudou no contexto e por quê.

## 2026-10-05 — bootstrap completo (perfil nuvem)
- Orquestrador: Sonnet 5.5 (sessão), sem subagentes a pedido do usuário.
- Modo agentmap (16 arquivos TS/JS). Mapa do banco: modo conector, sem `project_ref`; não gerado (tarefa não toca o banco).
- Skills obrigatórias ausentes: refatorar-ui, uncle-bob, performance-profile, supabase (skill), hig.
- Riscos/observações: (1) `globals.css` único de ~1,5k linhas, empilhado em camadas; (2) comportamento Safari/iOS frágil (vários commits de fix) e sem WebKit nesta máquina; (3) e2e sem Supabase não exercita o caminho de áudio; (4) PNGs de ~1,5 MB cada servidos via next/image; (5) `docs/design.md` cita fontes (Cormorant/DM Sans) diferentes do código (Poppins).

## 2026-10-05 — sessão: abertura do livro (áudio, carregamento, movimento)
- Orquestrador: Sonnet 5.5, sem subagentes (pedido do usuário).
- Contexto: `CLAUDE.md` ganhou "Convenções do projeto"; `arquitetura.md` ganhou as fronteiras de áudio e de carregamento; `.gitignore` ignora `.claude/agentmap/`.
- Commits: 75f3a2c (helpers de áudio/gate), b79bc5b (gate de carregamento, áudio no toque, virada que segue o dedo, capa), d59d1dc (vinheta do planeta, docs) + commit de contexto.
- Integração: sessão em nuvem restrita à branch `claude/fabuloso-design-animations-audio-fezvmm`; não houve merge na principal, o trabalho segue em PR (rascunho).
- Observação: áudio/virada 2D não foram validados em iPhone real nem em WebKit (sem WebKit nesta máquina).

## 2026-10-05 — sessão (cont.): iPhone + RSVP em modal
- PR #1 foi mergeado pelo usuário antes do CI terminar; o CI (WebKit móvel, `book.spec.ts` "abre o livro, navega pelas bordas…") já falhava no commit base 38d4e94 (esperas fixas de 720 ms entre viradas).
- Mudança estrutural: o RSVP deixou de ser folha do livro e virou modal (`RsvpDialog`, `SparkBurst`); o livro passou a ter 6 folhas. `arquitetura.md` e `CLAUDE.md` atualizados.
- iPhone: `viewport` (theme-color), aviso de telefone deitado, alvo de toque de 48 px no botão de música, fallback `100vh` antes de `svh/dvh`.
