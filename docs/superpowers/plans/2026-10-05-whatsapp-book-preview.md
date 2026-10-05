# WhatsApp Book Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make shared invitation links display a readable panoramic preview image of Vicente Mateus's book cover in WhatsApp.

**Architecture:** Use the Next.js App Router `opengraph-image.tsx` convention and `ImageResponse` to render a 1200 × 630 PNG. Embed the existing prince illustration from the local filesystem, then rely on `SITE_URL` as the public metadata base.

**Tech Stack:** Next.js 16.3 App Router, `next/og`, TypeScript, Node.js runtime.

## Global Constraints

- Keep the approved option B composition: enlarged illustration on the left, title and invitation text on the right, midnight blue and restrained gold.
- Use the existing `public/illustrations/prince-telescope.png`; do not alter the source illustration or call an external image-generation service.
- The Open Graph image must be 1200 × 630 px, PNG, with an alt description.
- Production `SITE_URL` must resolve to the public HTTPS invitation domain, never localhost.
- Do not change the Supabase data model or make metadata dependent on editable invitation content.

---

### Task 1: Render the Open Graph image

**Files:**
- Create: `app/opengraph-image.tsx`
- Read: `public/illustrations/prince-telescope.png`

**Interfaces:**
- Produces Next.js file-based image metadata through `alt`, `size`, `contentType`, and a default `Image()` export.

- [ ] Create a Node.js `opengraph-image.tsx` route. Read the local PNG with `readFile(join(process.cwd(), "public/illustrations/prince-telescope.png"), "base64")`, prefix it with `data:image/png;base64,`, and render it in `ImageResponse` at 1200 × 630. Add a dark navy background, subtle gold stars, an accessible alt description, and the approved Portuguese copy.
- [ ] Run `npm run typecheck` and `npm run build`. The build must discover and generate the Open Graph route without asset or runtime errors.

### Task 2: Point sharing metadata at the generated image

**Files:**
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: the metadata image exported by `app/opengraph-image.tsx`.
- Produces: public Open Graph title, description, and image metadata for the root route.

- [ ] Update `openGraph.title` to `O Pequeno Príncipe — Vicente Mateus · 1 ano` and keep the description `Uma pequena grande aventura sob as estrelas.`. Remove `openGraph.images: ["/og.svg"]`; the file convention supplies the PNG URL, dimensions, media type, and alt.
- [ ] Run `npm run typecheck` and `npm run build`, then inspect generated HTML metadata and confirm that `og:image` resolves against the configured public `SITE_URL` and includes 1200 × 630 PNG metadata.

### Task 3: Verify the generated preview

**Files:**
- Verify: built application root route and generated `opengraph-image` route.

- [ ] Request the root HTML from the production build and confirm it contains the Open Graph title, description, image URL, image type, dimensions, and alt text.
- [ ] Request the generated image URL and confirm the response is PNG at 1200 × 630; inspect the rendered image for legibility at thumbnail scale.
