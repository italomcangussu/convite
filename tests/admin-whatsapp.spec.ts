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

async function signInAsAdmin(page: Page, rsvps = families) {
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
  const json = (body: unknown, type = "application/json") => ({
    status: 200,
    headers: cors,
    contentType: type,
    body: JSON.stringify(body),
  });
  await page.route(`${supabaseUrl}/auth/v1/user*`, (route) => route.fulfill(json(user)));
  await page.route(`${supabaseUrl}/rest/v1/rpc/is_admin*`, (route) => route.fulfill(json(true)));
  await page.route(`${supabaseUrl}/rest/v1/site_settings*`, (route) =>
    route.fulfill(json({ content: { name: "Vicente Mateus" } }, "application/vnd.pgrst.object+json")),
  );
  await page.route(`${supabaseUrl}/rest/v1/rsvps*`, (route) => route.fulfill(json(rsvps)));
  // Captura o que seria aberto no WhatsApp em vez de sair para a internet.
  await page.addInitScript(() => {
    (window as Window & { __opened?: string[] }).__opened = [];
    window.open = (url) => {
      (window as Window & { __opened?: string[] }).__opened!.push(String(url));
      return null;
    };
  });
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
});
