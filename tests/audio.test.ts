import { test, mock } from "node:test";
import assert from "node:assert/strict";
import {
  audioMimeType,
  clampVolume,
  downloadAudio,
  fadeIn,
  resolveStartAt,
} from "../lib/audio";
import { bookLoad, type LoadSnapshot } from "../lib/loading";

function streamOf(...chunks: number[][]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new Uint8Array(chunk));
      controller.close();
    },
  });
}

test("volume e início da trilha ficam em limites seguros", () => {
  assert.equal(clampVolume(0.35), 0.35);
  assert.equal(clampVolume(4), 1);
  assert.equal(clampVolume(-2), 0);
  assert.equal(clampVolume("abc"), 0.5);
  assert.equal(resolveStartAt(7.58, 120), 7.58);
  assert.equal(resolveStartAt(500, 120), 119.75);
  assert.equal(resolveStartAt(-3, 120), 0);
  assert.equal(resolveStartAt("x", Number.NaN), 0);
  assert.equal(resolveStartAt(7.58, Number.NaN), 7.58);
});

test("o tipo do áudio vem do servidor, ou da extensão quando for genérico", () => {
  assert.equal(audioMimeType("a.mp3", "audio/mpeg; charset=x"), "audio/mpeg");
  assert.equal(audioMimeType("a.m4a", "application/octet-stream"), "audio/mp4");
  assert.equal(audioMimeType("a.WAV", null), "audio/wav");
  assert.equal(audioMimeType("a.ogg?t=1", ""), "audio/ogg");
  assert.equal(audioMimeType("sem-extensao", ""), "audio/mpeg");
});

test("baixa a trilha inteira, informa o progresso e tipa o blob", async () => {
  const progress: [number, number][] = [];
  const blob = await downloadAudio("https://x/a.mp3", "a.mp3", {
    fetchImpl: async () =>
      new Response(streamOf([1, 2, 3], [4, 5]), {
        headers: { "content-length": "5", "content-type": "audio/mpeg" },
      }),
    onProgress: (loaded, total) => progress.push([loaded, total]),
  });
  assert.equal(blob.size, 5);
  assert.equal(blob.type, "audio/mpeg");
  assert.deepEqual(progress, [
    [3, 5],
    [5, 5],
  ]);
});

test("resposta com erro não vira trilha", async () => {
  await assert.rejects(
    downloadAudio("https://x/a.mp3", "a.mp3", {
      fetchImpl: async () => new Response("nope", { status: 404 }),
    }),
    /404/,
  );
});

test("desiste quando nenhum byte chega a tempo", async () => {
  await assert.rejects(
    downloadAudio("https://x/a.mp3", "a.mp3", {
      stallMs: 20,
      // Como um fetch real: abortar a requisição derruba o corpo da resposta.
      fetchImpl: async (_url, init) =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              init?.signal?.addEventListener("abort", () =>
                controller.error(new DOMException("aborted", "AbortError")),
              );
            },
          }),
        ),
    }),
    /Tempo esgotado/,
  );
});

test("cancelar o download aborta a requisição", async () => {
  const controller = new AbortController();
  const pending = downloadAudio("https://x/a.mp3", "a.mp3", {
    signal: controller.signal,
    fetchImpl: (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      }),
  });
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
});

test("a música sobe do silêncio até o volume configurado", () => {
  mock.timers.enable({ apis: ["setInterval", "Date"] });
  try {
    const player = { volume: 1 };
    fadeIn(player, 0.4, 1000);
    assert.equal(player.volume, 0);
    mock.timers.tick(500);
    assert.ok(player.volume > 0.15 && player.volume < 0.25);
    mock.timers.tick(600);
    assert.ok(Math.abs(player.volume - 0.4) < 1e-9);
  } finally {
    mock.timers.reset();
  }
});

test("encerrar o fade vai direto ao volume final; iOS não fica mudo", () => {
  mock.timers.enable({ apis: ["setInterval", "Date"] });
  try {
    const player = { volume: 1 };
    const stop = fadeIn(player, 0.4, 1000);
    mock.timers.tick(100);
    stop();
    assert.equal(player.volume, 0.4);

    const ios = {
      get volume() {
        return 1;
      },
      set volume(_value: number) {},
    };
    fadeIn(ios, 0.4, 1000);
    assert.equal(ios.volume, 1);
  } finally {
    mock.timers.reset();
  }
});

const loaded: LoadSnapshot = {
  content: "ready",
  art: true,
  fonts: true,
  audio: "ready",
  audioProgress: 1,
  slow: false,
};

test("o livro só abre quando conteúdo, arte, fontes e música estão prontos", () => {
  assert.equal(bookLoad(loaded).ready, true);
  assert.equal(bookLoad(loaded).stage, "done");
  assert.equal(bookLoad({ ...loaded, content: "loading" }).ready, false);
  assert.equal(bookLoad({ ...loaded, art: false }).ready, false);
  assert.equal(bookLoad({ ...loaded, fonts: false }).ready, false);
  const audio = bookLoad({ ...loaded, audio: "loading", audioProgress: 0.5 });
  assert.equal(audio.ready, false);
  assert.equal(audio.stage, "audio");
  assert.ok(audio.progress > 0.5 && audio.progress < 1);
});

test("sem música configurada o livro não espera por ela", () => {
  assert.equal(bookLoad({ ...loaded, audio: "none" }).ready, true);
  // Música em fallback (streaming) ou com falha não trava o convite.
  assert.equal(bookLoad({ ...loaded, audio: "stream" }).ready, true);
  assert.equal(bookLoad({ ...loaded, audio: "failed" }).ready, true);
});

test("falha ao buscar o texto nunca abre com o conteúdo de rascunho", () => {
  const failed = bookLoad({ ...loaded, content: "error", slow: true });
  assert.equal(failed.ready, false);
  assert.equal(failed.error, true);
});

test("espera longa libera extras opcionais, mas não o texto", () => {
  const slow = { ...loaded, art: false, audio: "loading" as const, slow: true };
  assert.equal(bookLoad(slow).ready, true);
  assert.equal(bookLoad({ ...slow, content: "loading" }).ready, false);
});

test("o progresso só cresce com o que já chegou", () => {
  const start = bookLoad({
    ...loaded,
    content: "loading",
    art: false,
    fonts: false,
    audio: "loading",
    audioProgress: 0,
  });
  const middle = bookLoad({ ...loaded, audio: "loading", audioProgress: 0.4 });
  assert.ok(start.progress < middle.progress);
  assert.ok(middle.progress < bookLoad(loaded).progress);
  assert.equal(bookLoad(loaded).progress, 1);
});
