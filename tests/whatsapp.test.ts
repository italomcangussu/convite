import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fitsWhatsAppLink,
  rsvpWhatsAppText,
  whatsAppLink,
} from "../lib/whatsapp";

const updatedAt = new Date("2026-10-05T17:10:00Z"); // 14:10 em Fortaleza

test("a lista vira uma mensagem numerada, na ordem recebida", () => {
  const text = rsvpWhatsAppText({
    title: "Vicente Mateus",
    families: ["Família Silva", "Família Souza"],
    updatedAt,
  });
  assert.equal(
    text,
    [
      "*Confirmações de presença — Vicente Mateus*",
      "2 famílias confirmadas (atualizado em 05/10/2026 às 14:10)",
      "",
      "1. Família Silva",
      "2. Família Souza",
    ].join("\n"),
  );
});

test("singular, espaços e quebras de linha nos nomes", () => {
  const text = rsvpWhatsAppText({
    title: "Vicente",
    families: ["  Família\n  Lima  ", "   "],
    updatedAt,
  });
  assert.match(text, /1 família confirmada/);
  assert.match(text, /\n1\. Família Lima$/);
});

test("o link preserva acentos, emojis e caracteres reservados", () => {
  const text = "*Olá* & família — 50% 🎉\n1. João";
  const url = new URL(whatsAppLink(text));
  assert.equal(url.origin + url.pathname, "https://wa.me/");
  assert.equal(url.searchParams.get("text"), text);
});

test("lista enorme não cabe no link e pede outro caminho", () => {
  const families = Array.from({ length: 400 }, (_, i) => `Família Número ${i}`);
  const big = rsvpWhatsAppText({ title: "Vicente", families, updatedAt });
  assert.equal(fitsWhatsAppLink(big), false);
  const small = rsvpWhatsAppText({ title: "Vicente", families: families.slice(0, 20), updatedAt });
  assert.equal(fitsWhatsAppLink(small), true);
});
