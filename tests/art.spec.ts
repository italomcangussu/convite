import { test, expect, type Page } from "@playwright/test";

// A arte é uma pilha de camadas (components/book/art.ts) animadas pela Web
// Animations API num relógio só (startTime 0): duas cópias da mesma cena
// estão sempre na mesma fase, então a figura não "pula" ao trocar de página.

const motion = (page: Page, where: string) =>
  page.evaluate((selector) => {
    const root = document.querySelector(selector);
    const all = root
      ? [...root.querySelectorAll("[data-sprite], [data-fx]")].flatMap((el) =>
          el.getAnimations(),
        )
      : [];
    return {
      count: all.length,
      states: [...new Set(all.map((a) => a.playState))],
      clocks: [...new Set(all.map((a) => a.startTime))],
    };
  }, where);

test("a capa monta a cena em camadas, carregadas, e elas se movem", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".open-book")).toBeEnabled();

  const sprites = page.locator(".cover .scene-sprite > img");
  expect(await sprites.count()).toBeGreaterThan(5);
  const broken = await sprites.evaluateAll(
    (imgs) =>
      (imgs as HTMLImageElement[]).filter(
        (i) => !i.complete || i.naturalWidth === 0,
      ).length,
  );
  expect(broken).toBe(0);

  await expect
    .poll(async () => (await motion(page, ".cover")).count)
    .toBeGreaterThan(10);
  const state = await motion(page, ".cover");
  expect(state.states).toEqual(["running"]);
  // Um relógio só para todas: é o que mantém as cópias da cena em sincronia.
  expect(state.clocks).toEqual([0]);
});

test("o movimento da arte não mexe no layout da página", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".open-book")).toBeEnabled();
  // A capa entra em cascata; a medição começa depois que ela assentou.
  await page.waitForTimeout(1500);
  const scene = page.locator(".cover .illustration-scene");
  const canvas = page.locator(".cover .scene-canvas");
  const before = [await scene.boundingBox(), await canvas.boundingBox()];
  await page.waitForTimeout(1500);
  expect([await scene.boundingBox(), await canvas.boundingBox()]).toEqual(
    before,
  );
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("a folha que o dedo arrasta fica parada, a de baixo já se move, e tudo volta", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir o livro" }).click();
  const leaf = page.locator(".active-page");
  await expect(leaf.locator("h2")).toContainText("Há um ano");
  await expect
    .poll(async () => (await motion(page, ".active-page")).states)
    .toEqual(["running"]);

  const box = (await leaf.boundingBox())!;
  const y = box.y + box.height * 0.55;
  await page.mouse.move(box.x + box.width * 0.7, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7 - 20, y, { steps: 4 });
  await expect(leaf).toHaveClass(/is-dragging/);

  await expect
    .poll(async () => (await motion(page, ".active-page")).states)
    .toEqual(["paused"]);
  // A página que vai aparecer já está viva, na mesma fase de sempre.
  await expect
    .poll(async () => (await motion(page, ".under-page")).states)
    .toEqual(["running"]);
  expect((await motion(page, ".under-page")).clocks).toEqual([0]);

  await page.mouse.move(box.x + box.width * 0.7, y, { steps: 4 });
  await page.mouse.up();
  await expect(leaf).not.toHaveClass(/is-dragging/);
  await expect
    .poll(async () => (await motion(page, ".active-page")).states)
    .toEqual(["running"]);
});

test("depois da virada a página nova se move no mesmo relógio", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir o livro" }).click();
  await expect(page.locator(".active-page h2")).toContainText("Há um ano");
  await page.getByRole("button", { name: /Próxima página/ }).click();
  await expect(
    page.locator(".chapter-progress", { hasText: "PÁGINA 2" }),
  ).toBeVisible();
  await expect
    .poll(async () => (await motion(page, ".active-page")).states)
    .toEqual(["running"]);
  expect((await motion(page, ".active-page")).clocks).toEqual([0]);
});

test.describe("com movimento reduzido", () => {
  test.use({ reducedMotion: "reduce" });

  test("a arte fica parada, inteira, e o livro abre normalmente", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".open-book")).toBeEnabled();
    await page.waitForTimeout(500);
    expect((await motion(page, ".cover")).count).toBe(0);
    // As luzes só aparecem quando animadas: parado, não sobra nada extra.
    const visibleFx = await page.evaluate(
      () =>
        [...document.querySelectorAll(".cover .scene-fx")].filter(
          (el) => getComputedStyle(el).opacity !== "0",
        ).length,
    );
    expect(visibleFx).toBe(0);
    await page.getByRole("button", { name: "Abrir o livro" }).click();
    await expect(page.locator(".active-page h2")).toContainText("Há um ano");
  });
});
