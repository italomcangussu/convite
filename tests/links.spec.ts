import { test, expect } from "@playwright/test";

// Links do convite com endereço configurado (precisa do Supabase simulado; veja
// o topo de tests/audio.spec.ts).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const cors = { "access-control-allow-origin": "*" };

test.describe("links do livro", () => {
  test.skip(!supabaseUrl, "Requer NEXT_PUBLIC_SUPABASE_URL (veja o topo de tests/audio.spec.ts).");

  test("os links do mapa são botões com ícone, sem seta em texto", async ({ page }) => {
    await page.route(`${supabaseUrl}/rest/v1/site_settings*`, (route) =>
      route.fulfill({
        status: 200,
        headers: cors,
        contentType: "application/vnd.pgrst.object+json",
        body: JSON.stringify({ content: { address: "Rua das Estrelas, 42", venue: "Sítio" } }),
      }),
    );
    await page.goto("/");
    await expect(page.locator(".open-book")).toHaveAttribute("data-state", "ready", { timeout: 15_000 });
    await page.locator(".open-book").click();
    const leaf = page.locator(".active-page");
    await expect(leaf.locator("h2")).toBeVisible();
    for (let n = 2; n <= 4; n++) {
      await page.locator(".book").focus();
      await page.keyboard.press("ArrowRight");
      await expect(leaf.locator(".chapter-progress")).toContainText(`PÁGINA ${n}`);
    }

    const google = leaf.getByRole("link", { name: /Google Maps/ });
    const waze = leaf.getByRole("link", { name: /Waze/ });
    await expect(google).toHaveAttribute("target", "_blank");
    await expect(google).toHaveAttribute("rel", /noreferrer/);
    await expect(google).toHaveAttribute("href", /google\.com\/maps.*destination=/);
    await expect(waze).toHaveAttribute("href", /waze\.com\/ul\?q=/);
    // Ícones SVG (pino/rota + link externo) no lugar de "↗".
    await expect(google.locator("svg")).toHaveCount(2);
    await expect(waze.locator("svg")).toHaveCount(2);
    expect(await leaf.locator(".map-actions").innerText()).not.toMatch(/[\u2190-\u21FF]/);
    // Alvo de toque confortável (≥ 44px de altura).
    expect((await google.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
});
