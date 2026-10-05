import { test, expect, type Page } from "@playwright/test";

// Exercita o painel com um administrador simulado. Só roda com as variáveis
// públicas do Supabase definidas; toda chamada é interceptada aqui (veja o topo
// de tests/audio.spec.ts).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const cors = { "access-control-allow-origin": "*" };

const families = [
  { id: "1", family_name: "Família Silva", created_at: "2026-10-05T10:00:00Z", status: "confirmed" },
  { id: "2", family_name: "Família Souza", created_at: "2026-10-05T11:00:00Z", status: "confirmed" },
  { id: "3", family_name: "Lima", created_at: "2026-10-05T12:00:00Z", status: "confirmed" },
];

async function signInAsAdmin(
  page: Page,
  rsvps = families,
  content: Record<string, unknown> = { name: "Vicente Mateus" },
) {
  const ref = new URL(supabaseUrl).hostname.split(".")[0];
  const user = { id: "00000000-0000-0000-0000-000000000001", aud: "authenticated", role: "authenticated", email: "admin@example.com" };
  await page.addInitScript(
    ([key, session]) => localStorage.setItem(key, session),
    [
      `sb-${ref}-auth-token`,
      JSON.stringify({
        access_token: "a.b.c",
        refresh_token: "r",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user,
      }),
    ],
  );
  const writes: unknown[] = [];
  const deletes: string[] = [];
  const json = (body: unknown, type = "application/json") => ({
    status: 200,
    headers: cors,
    contentType: type,
    body: JSON.stringify(body),
  });
  await page.route(`${supabaseUrl}/auth/v1/user*`, (route) => route.fulfill(json(user)));
  await page.route(`${supabaseUrl}/rest/v1/rpc/is_admin*`, (route) => route.fulfill(json(true)));
  await page.route(`${supabaseUrl}/rest/v1/site_settings*`, (route) =>
    route.request().method() === "PATCH"
      ? (writes.push(route.request().postDataJSON()), route.fulfill({ status: 204, headers: cors }))
      : route.fulfill(json({ content }, "application/vnd.pgrst.object+json")),
  );
  await page.route(`${supabaseUrl}/rest/v1/rsvps*`, (route) =>
    route.request().method() === "DELETE"
      ? (deletes.push(route.request().url()), route.fulfill({ status: 204, headers: cors }))
      : route.fulfill(json(rsvps)),
  );
  // Captura o que seria aberto no WhatsApp em vez de sair para a internet.
  await page.addInitScript(() => {
    (window as Window & { __opened?: string[] }).__opened = [];
    window.open = (url) => {
      (window as Window & { __opened?: string[] }).__opened!.push(String(url));
      return null;
    };
  });
  return { writes, deletes };
}

test.describe("painel com Supabase", () => {
  test.skip(!supabaseUrl, "Requer NEXT_PUBLIC_SUPABASE_URL (veja o topo do arquivo).");

  test("exporta a lista de confirmações por WhatsApp", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/admin");
    await page.getByRole("button", { name: "Confirmações" }).click();
    const button = page.getByRole("button", { name: "Exportar por WhatsApp" });
    await expect(button).toBeEnabled();
    await button.click();

    const opened = await page.evaluate(() => (window as Window & { __opened?: string[] }).__opened);
    expect(opened).toHaveLength(1);
    const url = new URL(opened![0]);
    expect(url.origin + url.pathname).toBe("https://wa.me/");
    const text = url.searchParams.get("text")!;
    expect(text).toContain("*Confirmações de presença — Vicente Mateus*");
    expect(text).toContain("3 famílias confirmadas");
    // Mais recentes primeiro, igual à tabela.
    expect(text.split("\n").slice(3)).toEqual(["1. Lima", "2. Família Souza", "3. Família Silva"]);
  });

  test("respeita a pesquisa e fica desativado sem resultados", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/admin");
    await page.getByRole("button", { name: "Confirmações" }).click();
    await page.getByLabel("Pesquisar família").fill("Souza");
    await page.getByRole("button", { name: "Exportar por WhatsApp" }).click();
    const opened = await page.evaluate(() => (window as Window & { __opened?: string[] }).__opened);
    expect(new URL(opened![0]).searchParams.get("text")).toContain("1 família confirmada");

    await page.getByLabel("Pesquisar família").fill("ninguém");
    await expect(page.getByRole("button", { name: "Exportar por WhatsApp" })).toBeDisabled();
  });

  test("a visão geral mostra os números e o que falta preencher", async ({ page }) => {
    await signInAsAdmin(page, families, { name: "Vicente Mateus", date: "2099-12-12" });
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "O livro de Vicente Mateus" })).toBeVisible();
    await expect(page.locator(".admin-stat").filter({ hasText: "Confirmações" })).toContainText("3");
    await expect(page.locator(".admin-stat").filter({ hasText: "Festa" })).toContainText("dias");
    // Data definida; horário e endereço faltam e levam direto para a aba certa.
    await expect(page.getByText("Data da festa definida")).toBeVisible();
    await expect(page.getByText("O que falta para enviar o convite")).toBeVisible();
    await page.getByRole("listitem").filter({ hasText: "Definir o horário" }).getByRole("button", { name: /Preencher/ }).click();
    await expect(page).toHaveURL(/#event$/);
    await expect(page.getByLabel("Horário")).toBeVisible();
  });

  test("a seção fica no endereço e o botão voltar retorna à anterior", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/admin#music");
    await expect(page.getByRole("button", { name: "Música" })).toHaveAttribute("aria-current", "page");
    await page.getByRole("button", { name: "Capa" }).click();
    await expect(page).toHaveURL(/#cover$/);
    await page.goBack();
    await expect(page).toHaveURL(/#music$/);
    await expect(page.getByRole("button", { name: "Música" })).toHaveAttribute("aria-current", "page");
  });

  test("avisa de alterações não salvas e salva só o que mudou no convite", async ({ page }) => {
    const { writes } = await signInAsAdmin(page);
    await page.goto("/admin#cover");
    const save = page.getByRole("button", { name: "Salvar alterações" });
    await expect(page.getByText("Tudo salvo")).toBeVisible();
    await expect(save).toBeDisabled();

    await page.getByLabel("Idade").fill("2 anos");
    await expect(page.getByText("Alterações não salvas")).toBeVisible();
    await expect(save).toBeEnabled();

    await save.click();
    await expect(page.getByText("Alterações salvas.")).toBeVisible();
    await expect(page.getByText(/Tudo salvo/)).toBeVisible();
    await expect(save).toBeDisabled();
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ content: { name: "Vicente Mateus", age: "2 anos" } });
  });

  test("a data aparece por extenso e os botões do mapa testam o endereço", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/admin#event");
    await expect(page.getByText("Escolha a data para ver como ela aparece.")).toBeVisible();
    await page.getByLabel("Data", { exact: true }).fill("2026-12-12");
    await expect(page.getByText("sábado, 12 de dezembro de 2026")).toBeVisible();
    await expect(page.getByRole("link", { name: /Testar no Google Maps/ })).toHaveCount(0);
    await page.getByLabel("Endereço").fill("Rua das Estrelas, 42");
    const maps = page.getByRole("link", { name: /Testar no Google Maps/ });
    await expect(maps).toHaveAttribute("href", /destination=Rua%20das%20Estrelas%2C%2042/);
    await expect(maps).toHaveAttribute("target", "_blank");
  });

  test("remove uma confirmação depois de perguntar e atualiza a lista", async ({ page }) => {
    const { deletes } = await signInAsAdmin(page);
    await page.goto("/admin#rsvps");
    page.once("dialog", (dialog) => {
      expect(dialog.message()).toContain("Família Silva");
      void dialog.accept();
    });
    await page.getByRole("button", { name: "Remover Família Silva" }).click();
    await expect(page.getByText("Confirmação removida.")).toBeVisible();
    await expect(page.getByRole("cell", { name: "Família Silva" })).toHaveCount(0);
    expect(deletes).toHaveLength(1);
    expect(deletes[0]).toContain("id=eq.1");
  });

  test("sem confirmações a lista orienta a compartilhar o convite", async ({ page }) => {
    await signInAsAdmin(page, []);
    await page.goto("/admin#rsvps");
    await expect(page.getByRole("heading", { name: "Ainda não há confirmações" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Exportar por WhatsApp" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Copiar link do convite" })).toBeVisible();
  });

  test("copia o link do convite e compartilha pelo WhatsApp sem emoji nem seta em texto", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
    await signInAsAdmin(page);
    await page.goto("/admin");
    const share = page.getByRole("link", { name: "Compartilhar no WhatsApp" });
    expect(decodeURIComponent((await share.getAttribute("href"))!)).toContain("festa de Vicente Mateus");
    await expect(page.getByRole("link", { name: "Ver convite" }).first()).toHaveAttribute("target", "_blank");
    // Os links externos usam ícone SVG: o iOS desenharia "↗" como emoji colorido.
    const text = await page.locator(".admin-shell").innerText();
    expect(text).not.toMatch(/[\u2190-\u21FF\u{1F000}-\u{1FAFF}]/u);
    await expect(page.getByRole("link", { name: "Ver convite" }).first().locator("svg")).toHaveCount(1);
  });
});
