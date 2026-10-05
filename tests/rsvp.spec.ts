import { test, expect, type Page } from "@playwright/test";

async function openBookOnLastPage(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir o livro" }).click();
  const leaf = page.locator(".active-page");
  await expect(leaf.locator("h2")).toContainText("Há um ano");
  for (let n = 2; n <= 6; n++) {
    await page.locator(".book").focus();
    await page.keyboard.press("ArrowRight");
    await expect(leaf.locator(".chapter-progress")).toContainText(`PÁGINA ${n}`);
  }
  return leaf;
}

test("a última página do livro convida a confirmar e abre o modal sem virar a folha", async ({
  page,
}) => {
  const leaf = await openBookOnLastPage(page);
  await expect(leaf.locator("h2")).toContainText("Algumas estrelas");
  await expect(page.locator(".page-next")).toContainText("Confirmar presença");
  await expect(page.locator(".page-next")).toBeEnabled();

  await page.locator(".page-next").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading")).toContainText("Tem um lugar");
  await expect(dialog.locator(".chapter-progress")).toContainText("PÁGINA 7");
  // O livro fica ao fundo, inerte e na mesma página.
  await expect(page.locator(".book-stage")).toHaveJSProperty("inert", true);
  await expect(leaf.locator("h2")).toContainText("Algumas estrelas");

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".book-stage")).toHaveJSProperty("inert", false);
  // O foco volta para o botão que abriu o modal.
  await expect(page.locator(".page-next")).toBeFocused();
});

test("o modal cabe na tela, fecha no X e pelo toque fora, e pede o nome", async ({
  page,
}) => {
  await openBookOnLastPage(page);
  await page.locator(".page-next").click();
  const sheet = page.locator(".rsvp-sheet");
  await expect(sheet).toBeVisible();
  // Espera a animação de entrada terminar para medir de verdade.
  await page.waitForTimeout(700);
  const viewport = page.viewportSize()!;
  const box = (await sheet.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  // Alvo de toque do X: 44px, a diretriz da Apple.
  const close = (await page.locator(".rsvp-close").boundingBox())!;
  expect(close.width).toBeGreaterThanOrEqual(44);
  expect(close.height).toBeGreaterThanOrEqual(44);

  // Nome vazio: o formulário não envia e nada é confirmado.
  await sheet.getByRole("button", { name: "Confirmar presença" }).click();
  await expect(sheet.getByRole("status")).toHaveText("");

  await page.locator(".rsvp-close").click();
  await expect(sheet).toHaveCount(0);

  await page.locator(".page-next").click();
  await expect(sheet).toBeVisible();
  await page.waitForTimeout(700);
  await page.mouse.click(4, 4);
  await expect(sheet).toHaveCount(0);
});

test("puxar a página para frente na última página também abre a confirmação", async ({
  page,
}) => {
  const leaf = await openBookOnLastPage(page);
  const box = (await leaf.boundingBox())!;
  const y = box.y + box.height * 0.55;
  await page.mouse.move(box.x + box.width * 0.85, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, y, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(leaf.locator("h2")).toContainText("Algumas estrelas");
});
