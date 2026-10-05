import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// iOS desenha setas como "↗" e símbolos como emoji coloridos. O site usa só os
// ícones SVG de components/ui/Icon.tsx; este teste impede a volta do texto.
const forbidden = /[←-⇿⌀-⏿☀-➿⬀-⯿\u{1F000}-\u{1FAFF}]/u;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx$/.test(name) ? [path] : [];
  });
}

test("componentes não usam setas nem emoji como texto", () => {
  const offenders = [...sources("components"), ...sources("app")].flatMap((file) =>
    readFileSync(file, "utf8")
      .split("\n")
      .flatMap((line, i) => (forbidden.test(line) ? [`${file}:${i + 1}: ${line.trim()}`] : [])),
  );
  assert.deepEqual(offenders, []);
});
