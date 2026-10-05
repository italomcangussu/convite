@AGENTS.md

## Convenções do projeto (convite do livro)

- Todo o estilo está em `app/globals.css`, em camadas empilhadas (a última vence). As folhas animam só `transform`/`opacity`; no celular (≤500px) nada de 3D/backface, porque o Safari/iOS perde o conteúdo da folha.
- A folha ativa permanece montada entre viradas e `onAnimationEnd` encerra a virada: os nomes `turnNext`, `turnPrev`, `turnNextMobile` e `turnPrevMobile` são lidos em `Book.tsx` e nos testes.
- Música: `useBookAudio` baixa a trilha como Blob; `play()` precisa rodar síncrono dentro do clique de "Abrir o livro" e o livro abre sem esperar a promessa.
- O livro só abre quando `bookLoad()` (`lib/loading.ts`) diz `ready`: texto + arte + fontes + trilha. Falha ao buscar o texto é estado de erro, nunca conteúdo de rascunho.
- Testes: `npm test` (unit), `npm run test:e2e` (Chromium + WebKit). `tests/audio.spec.ts` só roda com `NEXT_PUBLIC_SUPABASE_URL` definido (ver o topo do arquivo).
- Não validado em iPhone real: reprodução de áudio e a virada 2D.
