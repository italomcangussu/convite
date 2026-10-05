import { test, expect } from "@playwright/test";
test("abre o livro, navega pelas bordas e confirma pelo modal sem fingir persistência", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/rest/v1/rsvps**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Service temporarily unavailable" }),
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Vicente Mateus" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Abrir o livro" }).click();
  await expect(page.locator(".active-page h2")).toContainText("Há um ano");
  const leaf = page.locator(".active-page");
  let box = (await leaf.boundingBox())!;
  await page.mouse.click(box.x + box.width - 8, box.y + box.height * 0.5);
  await expect(leaf.locator("blockquote")).toBeVisible();
  box = (await leaf.boundingBox())!;
  await page.mouse.click(box.x + 8, box.y + box.height * 0.5);
  await expect(leaf.locator("h2")).toContainText("Há um ano");

  // Cada virada é aguardada pelo resultado (a página mudou), não por um
  // intervalo fixo: em WebKit lento a virada pode passar de 720 ms.
  for (let n = 2; n <= 6; n++) {
    await page.locator(".book").focus();
    await page.keyboard.press("ArrowRight");
    await expect(leaf.locator(".chapter-progress")).toContainText(`PÁGINA ${n}`);
  }
  await expect(leaf.locator("h2")).toContainText("Algumas estrelas");

  // O livro termina aqui: "próxima" abre a confirmação em modal.
  await page.getByRole("button", { name: "Confirmar presença" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Nome da família").fill("Família Teste");
  await dialog.getByRole("button", { name: "Confirmar presença" }).click();
  await expect(dialog.getByRole("status")).toContainText(
    /serão abertas|Não foi possível/,
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await page.locator(".book").focus();
  await page.keyboard.press("ArrowLeft");
  await expect(leaf.locator(".chapter-progress")).toContainText("PÁGINA 5");
  await expect(leaf.locator("h2")).toContainText("Presentes para");
  expect(errors).toEqual([]);
  await page.screenshot({
    path: `test-results/book-${test.info().project.name}.png`,
  });
});
test("gesto horizontal avança e volta, gesto curto cancela", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir o livro" }).click();
  await expect(page.locator(".active-page h2")).toContainText("Há um ano");
  const leaf = page.locator(".active-page");
  const box = (await leaf.boundingBox())!;
  async function drag(from: number, to: number) {
    await page.mouse.move(box.x + from, box.y + box.height * 0.55);
    await page.mouse.down();
    await page.mouse.move(box.x + to, box.y + box.height * 0.55, { steps: 8 });
    await page.mouse.up();
  }
  await drag(260, 80);
  await expect(leaf.locator("blockquote")).toBeVisible();
  await drag(100, 280);
  await expect(leaf.locator("h2")).toContainText("Há um ano");
  await drag(180, 160);
  await expect(leaf.locator("h2")).toContainText("Há um ano");
});
test("admin permanece protegido", async ({ page }) => {
  await page.goto("/admin");
  await expect(
    page.getByText("Configure o Supabase").or(page.getByLabel("E-mail")),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Salvar alterações" }),
  ).toHaveCount(0);
});


test("mantém a mesma folha montada durante a virada sem piscar o conteúdo", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir o livro" }).click();
  const leaf = page.locator(".active-page");
  await expect(leaf.locator("h2")).toContainText("Há um ano");

  // Marca o nó real. Se React remontar a folha no fim da animação,
  // este atributo desaparece e a regressão visual volta a ser detectada.
  await leaf.evaluate((element) =>
    element.setAttribute("data-page-leaf-stable", "true"),
  );

  await page.getByRole("button", { name: /Próxima página/ }).click();
  await expect(page.locator(".under-page blockquote")).toBeVisible();
  await page.waitForTimeout(720);

  await expect(leaf).toHaveAttribute("data-page-leaf-stable", "true");
  await expect(leaf.locator("blockquote")).toBeVisible();
});

test("WebKit móvel usa virada 2D sem esconder o conteúdo da folha", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "webkit", "Regressão específica do Safari/WebKit.");

  await page.goto("/");
  await page.getByRole("button", { name: "Abrir o livro" }).click();
  const leaf = page.locator(".active-page");
  await expect(leaf.locator("h2")).toBeVisible();

  await page.getByRole("button", { name: /Próxima página/ }).click();

  await expect
    .poll(() =>
      leaf.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          animationName: style.animationName,
          backfaceVisibility: style.backfaceVisibility,
        };
      }),
    )
    .toEqual({
      animationName: "turnNextMobile",
      backfaceVisibility: "visible",
    });

  await expect(page.locator(".under-page blockquote")).toBeVisible();
  await page.waitForTimeout(650);
  await expect(leaf.locator("blockquote")).toBeVisible();
});
