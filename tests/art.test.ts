import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import manifest from "../components/book/art-manifest.json" with { type: "json" };
import {
  frames,
  lights,
  motion,
  sceneArt,
  type SceneId,
} from "../components/book/art";

// As ilustrações são fatiadas por scripts/slice_art.py e animadas à mão em
// components/book/art.ts. Estes testes pegam o descompasso entre as duas pontas.
const scenes = Object.keys(manifest.scenes) as SceneId[];
const layersDir = join("public", "illustrations", "layers");

test("o manifesto aponta só para arquivos que existem, sem sobras", () => {
  const listed = new Set<string>();
  for (const id of scenes) {
    for (const layer of manifest.scenes[id].layers) {
      assert.ok(
        existsSync(join(layersDir, layer.file)),
        `${layer.file} não existe`,
      );
      listed.add(layer.file);
    }
  }
  const onDisk = readdirSync(layersDir).filter((f) => f.endsWith(".webp"));
  assert.deepEqual(
    onDisk.sort(),
    [...listed].sort(),
    "arquivos órfãos ou faltando em public/illustrations/layers",
  );
});

test("cada camada filha tem um pai que vem antes dela", () => {
  for (const id of scenes) {
    const seen = new Set<string>();
    for (const layer of manifest.scenes[id].layers) {
      if (layer.parent)
        assert.ok(
          seen.has(layer.parent),
          `${id}/${layer.id}: pai ${layer.parent} ausente`,
        );
      seen.add(layer.id);
    }
  }
});

test("todo movimento descreve uma camada que existe", () => {
  for (const id of scenes) {
    const ids = new Set(manifest.scenes[id].layers.map((l) => l.id));
    for (const key of Object.keys(motion[id])) {
      assert.ok(
        ids.has(key),
        `${id}: movimento para "${key}", que não é uma camada`,
      );
    }
  }
});

test("movimentos de camadas voltam à pose de repouso (a arte parada é a original)", () => {
  for (const id of scenes) {
    for (const [layer, moves] of Object.entries(motion[id])) {
      for (const move of moves) {
        const where = `${id}/${layer}/${move.prop}`;
        assert.equal(
          move.values[0],
          move.values.at(-1),
          `${where}: começa e termina em poses diferentes`,
        );
        assert.ok(move.ms >= 200, `${where}: ciclo curto demais`);
        assert.ok((move.delay ?? 0) >= 0, `${where}: delay negativo`);
      }
    }
  }
});

test("os quadros respeitam os offsets e a ordem", () => {
  for (const id of scenes) {
    const moves = [
      ...Object.values(motion[id]).flat(),
      ...lights[id].flatMap((f) => f.moves),
    ];
    for (const move of moves) {
      const list = frames(move);
      assert.equal(list.length, move.values.length);
      const offsets = list.map((k) => k.offset as number);
      assert.equal(offsets[0], 0);
      assert.equal(offsets.at(-1), 1);
      assert.deepEqual(
        [...offsets].sort((a, b) => a - b),
        offsets,
        "offsets fora de ordem",
      );
    }
  }
});

test("a cena monta uma árvore: filhos relativos ao pai e luzes dentro da tela", () => {
  for (const id of scenes) {
    const scene = sceneArt(id);
    assert.ok(scene.ratio > 1.2 && scene.ratio < 1.4);
    const total = (nodes: typeof scene.sprites): number =>
      nodes.reduce((n, node) => n + 1 + total(node.children), 0);
    assert.equal(total(scene.sprites), manifest.scenes[id].layers.length);
    for (const fx of scene.fx) {
      const left = parseFloat(fx.box.left);
      const width = parseFloat(fx.box.width);
      assert.ok(
        left >= 0 && left + width <= 100,
        `${id}: luz fora da cena (${fx.kind})`,
      );
    }
  }
});
