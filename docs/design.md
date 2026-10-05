# O livro de Vicente

Referências: usar a sequência de capa, convite, narrativa, data, encontro e encerramento dos prints. Não reutilizar ilustrações, fontes ou identidade. A galeria da referência é omitida.

Direção: azul quase preto #091421, azul de capa #162940, dourado #d3b77d, creme #f1e6cd, verde do asteroide #70838a. Cormorant Garamond para narrativa e títulos, DM Sans para controles. A assinatura é um livro físico noturno com lombada, borda de ouro e pequeno viajante autoral sobre um asteroide, em SVG separado do texto.

Arquitetura: Next App Router; experiência client-side com estado central de página, gesto e áudio; Supabase Auth, PostgreSQL e Storage para persistência. Um documento JSON de conteúdo atende este convite específico; RSVPs em tabela própria com UUID idempotente. Admins explicitamente autorizados por tabela restrita. Nenhum sucesso fictício quando o backend não estiver configurado.

Página atual e próxima usam a mesma arte vetorial leve; a folha ativa gira em perspectiva. Swipe curto volta à posição original. Links e formulários não disparam navegação. Folhas mantêm toda a narrativa na primeira versão, com ajustes por altura de tela. Música permanece fora da árvore das folhas. A primeira interação inicia o arquivo enviado pelo admin, sem arquivo padrão provisório.

Limitações iniciais: ausência de backend e dados reais não bloqueia a leitura. Datas, endereço, frases e música ficam editáveis. RSVP e administração requerem ambiente configurado. SVG de Open Graph preparado; trocar por PNG em produção para compatibilidade com redes sociais.

## Movimento, abertura e carregamento

Princípio: a abertura é o momento mais importante. O livro só abre quando está inteiro (texto, arte, fontes, música), e o toque que o abre dispara a música e a capa no mesmo instante. A capa mostra o carregamento na própria barra do botão; pronto, o botão respira (anel de brilho) e um reflexo atravessa a capa de tempos em tempos.

- Capa: entrada em cascata, estrela da capa desenhada como nanquim (`pathLength` + `stroke-dashoffset`), reflexo diagonal (`.cover-sheen`) só enquanto está pronto. Ao abrir, poeira de estrelas sai da lombada.
- Cenário: nebulosa lenta, estrelas com brilhos/durações variados, duas estrelas cadentes raras. Tudo atrás do livro, sem eventos, desligado em `prefers-reduced-motion`.
- Virada: a folha segue o dedo (`--drag-x/--drag-r` definidos por ref, sem re-render a cada movimento), a página de baixo já mostra o destino e escurece como sombra projetada (`.under-page:before`). A virada herda a posição (`--turn-from-*`) e a duração proporcional ao que falta (`--turn-ms`). Soltar curto devolve a folha com uma mola (Web Animations API).
- Música: botão com equalizador (barras animadas quando toca) e convite "Toque para ouvir a música" se o navegador recusar o `play()`.

Regras de segurança para o Safari/iOS (não quebrar): sem 3D/backface no celular; só `transform`/`opacity` animam dentro das folhas; nenhuma animação de entrada nos filhos da folha ativa (ela substitui a folha de baixo por uma "janela" de dois quadros, e um fade de entrada piscaria); animações infinitas no botão usam `box-shadow` ou pseudo-elementos para não mudar a caixa do botão (o Playwright espera a posição estabilizar antes de clicar).

## Ilustrações em movimento

As três artes (capa/fim, rosa na redoma, avião) respiram de forma sutil, sem tirar a atenção do texto nem da virada. Cada PNG é fatiado em camadas (`scripts/slice_art.py`): estrelas, lua, planeta, nuvem, hélice, rosa e o cachecol em três fatias encadeadas que balançam uma depois da outra (onda). Empilhadas em repouso, as camadas dão de volta a arte original (o script confere), então nada muda para quem usa movimento reduzido.

- Movimento: o corpo flutua numa figura de oito (poucos pixels), a lua e o planeta embalam, as estrelas piscam uma de cada vez, a nuvem passa devagar, a hélice "gira" (escala e opacidade), a rosa balança na haste. Luzes por cima da arte (halo da lua, brilhos, riscos de vento no avião, vaga-lumes na redoma) ficam invisíveis até animar.
- Um relógio só: todas as animações (Web Animations API) começam em `startTime = 0`, então duas cópias da mesma cena (a página de baixo e a nova folha, capa e primeira página) estão sempre na mesma fase e a figura não pula quando muda de mãos.
- Folhas: a página que o dedo arrasta ou que vira fica parada (`live={false}`: o trabalho é da virada) e a de baixo já se move; a decoração atrás da capa fica parada. `prefers-reduced-motion` desliga tudo (as animações da API não obedecem ao CSS, o `Scene` checa a mídia).
- Medidas em `cqw` (1% da largura da cena): o mesmo balanço proporcional no celular e no desktop. Só `translate`, `rotate`, `scale` e `opacity` (propriedades individuais, compostas na GPU).
- Peso: ~0,9 MB de WebP no total (antes ~4,7 MB de PNG). Os nomes levam hash do conteúdo e saem com `Cache-Control: immutable` (`next.config.ts`).

Para mudar uma arte: troque o PNG em `public/illustrations/`, rode `python3 scripts/slice_art.py` (precisa de `pillow numpy scipy`; `--debug` grava sobreposições em `.slice-debug/`) e ajuste `components/book/art.ts` se uma camada nova precisar de movimento. `tests/art.test.ts` falha se o manifesto e o movimento descasarem.

## Confirmação de presença em modal e iPhone

A intenção final do convite é a família digitar o nome e confirmar. Por isso o RSVP não é uma folha: a última página do livro ("Até as estrelas") termina com "Falta só um passo" e o botão de próxima página vira "Confirmar presença" (com anel de brilho), abrindo o modal. O capítulo continua contado como "07" para a conta fechar.

Regras para o iPhone: o modal acompanha `visualViewport` (o iOS não redimensiona o layout com o teclado, só a área visível) e não é ancorado embaixo; inputs com 16px (sem zoom), `enterkeyhint="send"`, alvos de toque de 44px ou mais, `inert` no livro enquanto está aberto, foco devolvido ao botão ao fechar (o Safari não foca botões ao toque). Telefone deitado mostra um pedido para girar em vez de cortar o livro. `theme-color` igual ao céu do livro para a barra do Safari não destoar.

## Painel e links

Princípio do painel: quem abre sabe o que fazer em cinco segundos. A primeira tela responde "como está o convite e o que falta"; as seções seguem a ordem do livro (Capa, Textos, Data e local, Presentes, Música) e depois a lista de confirmações; cada campo diz onde aparece ("Página 3", "Capa"). Alterações não salvas ficam sempre visíveis numa barra fixa. Ações de risco (remover) são vermelhas e perguntam o nome da família.

Links e ícones: nenhum "↗", seta ou emoji em texto (o iOS desenha esses caracteres como emoji colorido). Tudo vem de `components/ui/Icon.tsx` (traço de 1,8, `currentColor`), e `tests/icons.test.ts` falha se um componente voltar a usar esses caracteres. No livro, Google Maps e Waze são botões de contorno com pino/rota e o ícone de link externo, com 44px de altura; no painel, links externos são botões com ícone e `target="_blank"`.
