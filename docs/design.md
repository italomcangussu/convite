# O livro de Vicente

Referências: usar a sequência de capa, convite, narrativa, data, encontro e encerramento dos prints. Não reutilizar ilustrações, fontes ou identidade. A galeria da referência é omitida.

Direção: azul quase preto #091421, azul de capa #162940, dourado #d3b77d, creme #f1e6cd, verde do asteroide #70838a. Cormorant Garamond para narrativa e títulos, DM Sans para controles. A assinatura é um livro físico noturno com lombada, borda de ouro e pequeno viajante autoral sobre um asteroide, em SVG separado do texto.

Arquitetura: Next App Router; experiência client-side com estado central de página, gesto e áudio; Supabase Auth, PostgreSQL e Storage para persistência. Um documento JSON de conteúdo atende este convite específico; RSVPs em tabela própria com UUID idempotente. Admins explicitamente autorizados por tabela restrita. Nenhum sucesso fictício quando o backend não estiver configurado.

Página atual e próxima usam a mesma arte vetorial leve; a folha ativa gira em perspectiva. Swipe curto volta à posição original. Links e formulários não disparam navegação. Folhas mantêm toda a narrativa na primeira versão, com ajustes por altura de tela. Música permanece fora da árvore das folhas. A primeira interação inicia o arquivo enviado pelo admin, sem arquivo padrão provisório.

Limitações iniciais: ausência de backend e dados reais não bloqueia a leitura. Datas, endereço, frases e música ficam editáveis. RSVP e administração requerem ambiente configurado. SVG de Open Graph preparado; trocar por PNG em produção para compatibilidade com redes sociais.
