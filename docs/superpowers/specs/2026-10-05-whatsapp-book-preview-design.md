# Preview do convite ao compartilhar no WhatsApp

## Objetivo

Ao colar o link público do convite no WhatsApp, mostrar uma imagem que identifique o livro de Vicente Mateus antes de a pessoa abrir a página. O resultado escolhido é a opção B da comparação visual: uma composição horizontal com a ilustração do príncipe ampliada, título legível e identidade noturna do convite.

## Design aprovado

- Imagem social horizontal de 1200 × 630 px, proporção recomendada para cartões de link.
- Fundo azul-noite com estrelas discretas e detalhes dourados já usados na capa.
- Ilustração existente `public/illustrations/prince-telescope.png` em destaque à esquerda.
- Texto à direita: “O Pequeno Príncipe”, “Vicente Mateus · 1 ano” e “Uma pequena grande aventura sob as estrelas.”
- A composição será legível também quando reduzida à miniatura do WhatsApp; não deve depender de texto miúdo ou ornamentos finos.

## Arquitetura e metadados

- Criar `app/opengraph-image.tsx` usando `ImageResponse` de `next/og` para renderizar PNG com tamanho e texto alternativo declarados. A imagem local será lida pelo runtime Node.js conforme o padrão documentado pelo Next.js.
- Usar a convenção `opengraph-image` do App Router para gerar as tags de imagem Open Graph automaticamente.
- Atualizar título, descrição e texto alternativo para identificar o convite. Remover a referência explícita a `/og.svg` para evitar manter uma segunda imagem divergente nos metadados.
- Manter `SITE_URL` como base dos metadados. Em produção, seu valor precisa ser a URL pública HTTPS do convite; `localhost` não pode gerar uma imagem acessível aos servidores do WhatsApp.
- O conteúdo da imagem é estático e corresponde ao convite de Vicente Mateus. Alterações de texto no Supabase não alteram o card automaticamente.

## Carregamento e falhas

A imagem será servida como recurso público gerado pelo Next.js. A própria página permanece acessível se um cliente social não buscar o preview; título e descrição continuam disponíveis como fallback textual. Não serão adicionados serviços externos para produzir ou hospedar a imagem.

## Verificação

- Executar build e typecheck.
- Conferir que a página publica `og:title`, `og:description`, `og:image`, dimensões, tipo e alt adequados.
- Abrir a imagem gerada e verificar composição, proporção e leitura em tamanho de miniatura.
- Conferir que a URL da imagem resolve para o host público configurado por `SITE_URL` em produção. A verificação visual no WhatsApp depende de o link estar publicado e pode usar cache próprio do aplicativo.

## Fora de escopo

- Gerar previews personalizados para cada alteração de conteúdo no painel.
- Criar uma rota pública adicional, mexer na autenticação, no Supabase ou no fluxo do convite.
- Alterar as ilustrações originais do livro.
