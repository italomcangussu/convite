import { test } from "node:test";
import assert from "node:assert/strict";
import { countdown, daysUntil, longDate, readiness, relativeTime } from "../lib/admin";
import { defaults } from "../lib/content";

// 12h em Fortaleza (UTC-3)
const now = new Date("2026-10-05T15:00:00Z");

test("o que falta preencher antes de enviar o convite", () => {
  const steps = readiness(defaults);
  assert.deepEqual(
    steps.map((s) => [s.id, s.done, s.required]),
    [["date", false, true], ["time", false, true], ["place", false, true], ["music", false, false]],
  );
  const filled = readiness({ ...defaults, date: "2026-12-12", time: "16:00", address: " Rua A, 1 ", audioPath: "x.mp3" });
  assert.ok(filled.every((s) => s.done));
  assert.equal(readiness({ ...defaults, address: "   " })[2].done, false);
});

test("dias até a festa contam pelo calendário de Fortaleza", () => {
  assert.equal(daysUntil("2026-10-05", now), 0);
  assert.equal(daysUntil("2026-10-06", now), 1);
  assert.equal(daysUntil("2026-12-12", now), 68);
  assert.equal(daysUntil("2026-10-01", now), -4);
  assert.equal(daysUntil("", now), null);
  // 01:00 UTC ainda é o dia anterior em Fortaleza
  assert.equal(daysUntil("2026-10-05", new Date("2026-10-06T01:00:00Z")), 0);
});

test("frases do contador", () => {
  assert.deepEqual(countdown(null), { value: "A definir", note: "Escolha a data da festa" });
  assert.deepEqual(countdown(68), { value: "68 dias", note: "para a festa" });
  assert.equal(countdown(1).value, "Amanhã");
  assert.equal(countdown(0).value, "Hoje");
  assert.deepEqual(countdown(-1), { value: "Já passou", note: "há 1 dia" });
  assert.deepEqual(countdown(-5), { value: "Já passou", note: "há 5 dias" });
});

test("data por extenso com dia da semana", () => {
  assert.equal(longDate("2026-12-12"), "sábado, 12 de dezembro de 2026");
  assert.equal(longDate(""), "");
});

test("tempo relativo das confirmações", () => {
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
  assert.equal(relativeTime(ago(20_000), now), "agora há pouco");
  assert.equal(relativeTime(ago(5 * 60_000), now), "há 5 min");
  assert.equal(relativeTime(ago(3 * 3_600_000), now), "há 3 h");
  assert.equal(relativeTime(ago(30 * 3_600_000), now), "ontem");
  assert.equal(relativeTime(ago(5 * 86_400_000), now), "30/09/2026");
  assert.equal(relativeTime("lixo", now), "");
});
