import { test, expect, type Page } from "@playwright/test";

// Estes testes exercitam o caminho com Supabase (conteúdo e trilha), então só
// rodam com as variáveis públicas definidas. Toda chamada ao Supabase é
// interceptada aqui; nada sai para um projeto real. Exemplo:
//   NEXT_PUBLIC_SUPABASE_URL=https://exemplo.supabase.co \
//   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=chave npm run test:e2e -- tests/audio.spec.ts
// (o restante da suíte assume o modo local, sem Supabase.)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const cors = { "access-control-allow-origin": "*" };

function silentWav(seconds = 12, rate = 8000) {
  const samples = seconds * rate;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  return buffer;
}

async function mockSupabase(
  page: Page,
  { settings = "ok", audio = "ok" }: { settings?: "ok" | "fail"; audio?: "ok" | "404" } = {},
) {
  const state = { settingsFail: settings === "fail", playCalls: 0 };
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    const w = window as Window & { __playCalls?: number };
    w.__playCalls = 0;
    HTMLMediaElement.prototype.play = function (...args) {
      w.__playCalls = (w.__playCalls ?? 0) + 1;
      return original.apply(this, args);
    };
  });
  await page.route(`${supabaseUrl}/rest/v1/site_settings*`, (route) =>
    state.settingsFail
      ? route.fulfill({
          status: 500,
          headers: cors,
          contentType: "application/json",
          body: JSON.stringify({ message: "indisponível" }),
        })
      : route.fulfill({
          status: 200,
          headers: cors,
          contentType: "application/vnd.pgrst.object+json",
          body: JSON.stringify({
            content: { audioPath: "trilha.wav", audioName: "trilha.wav", audioStartAt: 1 },
          }),
        }),
  );
  const track = silentWav();
  await page.route(`${supabaseUrl}/storage/v1/object/public/soundtracks/**`, (route) =>
    audio === "404"
      ? route.fulfill({ status: 404, headers: cors, body: "não encontrado" })
      : route.fulfill({
          status: 200,
          headers: { ...cors, "content-length": String(track.length) },
          contentType: "audio/wav",
          body: track,
        }),
  );
  return state;
}

test.describe("com Supabase", () => {
  test.skip(!supabaseUrl, "Requer NEXT_PUBLIC_SUPABASE_URL (veja o topo do arquivo).");

  test("baixa a trilha antes de liberar o livro e toca no mesmo toque que o abre", async ({
    page,
  }) => {
    await mockSupabase(page);
    await page.goto("/");

    const open = page.locator(".open-book");
    await expect(open).toHaveAttribute("data-state", "ready", { timeout: 15_000 });
    await expect(page.locator("audio")).toHaveAttribute("preload", "auto");
    // A trilha já está na memória: reprodução imediata, sem rede.
    await expect(page.locator("audio")).toHaveAttribute("src", /^blob:/);
    expect(await page.evaluate(() => (window as Window & { __playCalls?: number }).__playCalls)).toBe(0);

    await open.click();
    await expect
      .poll(() => page.evaluate(() => (window as Window & { __playCalls?: number }).__playCalls))
      .toBe(1);
    await expect(page.locator(".active-page h2")).toBeVisible();
    await expect(page.locator(".audio-control")).toHaveCount(1);
  });

  test("falha ao buscar o texto mantém o livro fechado e permite tentar de novo", async ({
    page,
  }) => {
    const state = await mockSupabase(page, { settings: "fail" });
    await page.goto("/");

    const open = page.locator(".open-book");
    await expect(open).toHaveAttribute("data-state", "error", { timeout: 20_000 });
    await expect(open).toContainText("Tentar novamente");
    await expect(page.locator(".book.closed")).toHaveCount(1);

    state.settingsFail = false;
    await open.click();
    await expect(open).toHaveAttribute("data-state", "ready", { timeout: 15_000 });
  });

  test("trilha indisponível não prende o convite: abre sem música", async ({ page }) => {
    await mockSupabase(page, { audio: "404" });
    await page.goto("/");

    const open = page.locator(".open-book");
    await expect(open).toHaveAttribute("data-state", "ready", { timeout: 15_000 });
    await expect(open).toContainText("Abrir sem música");
    await open.click();
    await expect(page.locator(".active-page h2")).toBeVisible();
    await expect(page.locator(".audio-control")).toHaveCount(0);
  });

  test("confirmar pelo modal mostra o agradecimento e lembra a confirmação", async ({
    page,
  }) => {
    await mockSupabase(page);
    let inserted: unknown;
    await page.route(`${supabaseUrl}/rest/v1/rsvps*`, async (route) => {
      inserted = route.request().postDataJSON();
      await route.fulfill({ status: 201, headers: cors, body: "" });
    });
    await page.goto("/");
    await expect(page.locator(".open-book")).toHaveAttribute("data-state", "ready", {
      timeout: 15_000,
    });
    await page.locator(".open-book").click();
    const leaf = page.locator(".active-page");
    await expect(leaf.locator("h2")).toBeVisible();
    for (let n = 2; n <= 6; n++) {
      await page.locator(".book").focus();
      await page.keyboard.press("ArrowRight");
      await expect(leaf.locator(".chapter-progress")).toContainText(`PÁGINA ${n}`);
    }
    await page.locator(".page-next").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nome da família").fill("Família Teste");
    await dialog.getByRole("button", { name: "Confirmar presença" }).click();

    await expect(dialog.getByRole("heading")).toContainText("Presença confirmada");
    await expect(dialog).toContainText("Família Teste");
    expect(inserted).toMatchObject({ family_name: "Família Teste" });

    // Ao voltar ao modal depois, ele já mostra a presença confirmada.
    await dialog.getByRole("button", { name: "Voltar ao livro" }).click();
    await expect(dialog).toHaveCount(0);
    await page.locator(".page-next").click();
    await expect(page.getByRole("dialog").getByRole("heading")).toContainText(
      "Presença confirmada",
    );
  });
});
