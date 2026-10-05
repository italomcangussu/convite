import { test, expect } from "@playwright/test";

test("o livro só abre depois que a arte da capa carregou", async ({ page }) => {
  // Segura as camadas da ilustração até a hora de liberar.
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/illustrations/layers/**", async (route) => {
    await gate;
    await route.continue();
  });

  // domcontentloaded: o evento load esperaria as imagens seguradas.
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const open = page.locator(".open-book");
  await expect(open).toBeDisabled();
  await expect(open).toHaveAttribute("aria-busy", "true");
  await expect(open).toContainText("Preparando o livro");
  await expect(page.locator(".book.closed")).toHaveCount(1);

  release();
  await expect(open).toBeEnabled({ timeout: 15_000 });
  await expect(open).toContainText("Abrir o livro");
  await open.click();
  await expect(page.locator(".active-page h2")).toContainText("Há um ano");
});

test("teclado abre o livro fechado quando ele está pronto", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".open-book")).toBeEnabled();
  await page.locator(".book").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".active-page h2")).toContainText("Há um ano");
});

test("a folha acompanha o dedo mostrando a próxima página e volta se soltar curto", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir o livro" }).click();
  const leaf = page.locator(".active-page");
  await expect(leaf.locator("h2")).toContainText("Há um ano");
  const box = (await leaf.boundingBox())!;
  const y = box.y + box.height * 0.55;

  await page.mouse.move(box.x + box.width * 0.7, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7 - 20, y, { steps: 4 });

  await expect(leaf).toHaveClass(/is-dragging/);
  await expect(leaf).toHaveCSS("--drag-x", /-?\d/);
  // A folha de baixo já mostra a página seguinte enquanto o dedo arrasta.
  await expect(page.locator(".under-page blockquote")).toBeVisible();

  await page.mouse.up();
  await expect(leaf).not.toHaveClass(/is-dragging/, { timeout: 2000 });
  await expect(leaf.locator("h2")).toContainText("Há um ano");
});

test("arrastar além do limite vira a página a partir de onde o dedo soltou", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir o livro" }).click();
  const leaf = page.locator(".active-page");
  await expect(leaf.locator("h2")).toContainText("Há um ano");
  const box = (await leaf.boundingBox())!;
  const y = box.y + box.height * 0.55;

  await page.mouse.move(box.x + box.width * 0.85, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, y, { steps: 8 });
  await page.mouse.up();

  await expect(leaf).toHaveClass(/turn-next/);
  // A virada herda a posição do dedo em vez de recomeçar do zero.
  await expect(leaf).toHaveCSS("--turn-ms", /\d+ms/);
  await expect(leaf.locator("blockquote")).toBeVisible({ timeout: 3000 });
});
