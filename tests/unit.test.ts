import { test } from "node:test";
import assert from "node:assert/strict";
import { maps, displayDate, defaults } from "../lib/content";
test("links preservam endereço com acentos e caracteres reservados", () => {
  const address = "Rua São João, 42 & Centro";
  const links = maps(address);
  assert.equal(new URL(links.google).searchParams.get("destination"), address);
  assert.equal(new URL(links.waze).searchParams.get("q"), address);
  assert.equal(new URL(links.waze).searchParams.get("navigate"), "yes");
});
test("não inventa data e mantém o dia correto em Fortaleza", () => {
  assert.equal(displayDate("", "long"), "Em breve");
  assert.equal(displayDate("2026-10-05", "short"), "05/10");
  assert.match(displayDate("2026-10-05", "long"), /5 de outubro de 2026/);
  assert.equal(defaults.address, "");
  assert.equal(defaults.audioPath, "");
});
