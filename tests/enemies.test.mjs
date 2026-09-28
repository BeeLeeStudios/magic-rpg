import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadSection } from "./load-game.mjs";

// Every sprite built with pixDraw, found automatically so new art is always covered.
const html = readFileSync(new URL("../www/index.html", import.meta.url), "utf8");
const NAMES = [...html.matchAll(/^const (PIX_[A-Z0-9_]+) = pixDraw\(/gm)].map((m) => m[1]);
const S = loadSection("function pixDraw(", "const PIX_ENEMY_ART", NAMES);

test("found the shape-drawn sprites", () => assert.ok(NAMES.length >= 70, `only ${NAMES.length}`));

for (const name of NAMES) {
  test(`${name}: well-formed, animated, nothing clipped at the edges`, () => {
    const sp = S[name];
    assert.equal(sp.frames.length, 2);
    for (const rows of sp.frames) {
      assert.equal(rows.length, sp.h);
      rows.forEach((r) => assert.equal(r.length, sp.w * 2));
      const filled = (x, y) => rows[y].slice(x * 2, x * 2 + 2) !== "..";
      for (let x = 0; x < sp.w; x++) assert.ok(!filled(x, 0) && !filled(x, sp.h - 1), `touches top/bottom edge at x=${x}`);
      for (let y = 0; y < sp.h; y++) assert.ok(!filled(0, y) && !filled(sp.w - 1, y), `touches left/right edge at y=${y}`);
      const count = rows.join("").replace(/\.\./g, "").length / 2;
      assert.ok(count > sp.w * sp.h * 0.08, "sprite is mostly empty");
    }
    assert.notDeepEqual(sp.frames[0], sp.frames[1], "the two frames are identical (no animation)");
  });
}
