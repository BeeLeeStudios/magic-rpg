import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSection } from "./load-game.mjs";

const NEW = ["PIX_SALAMANDER", "PIX_MAGMA_BEETLE", "PIX_LAVA_GOLEM", "PIX_CRAB_KNIGHT", "PIX_BUBBLE_PUFFER",
  "PIX_REEF_EEL", "PIX_BOG_FROG", "PIX_MUSHROOM_IMP", "PIX_TREANT", "PIX_THORN_WOLF", "PIX_OWLBEAR",
  "PIX_PUMPKIN_GHOUL", "PIX_CANDLE_GHOST", "PIX_MUMMY", "PIX_MIMIC", "PIX_STORM_SPRITE", "PIX_ICE_IMP",
  "PIX_YETI", "PIX_PENGUIN_KNIGHT", "PIX_SAND_SCORPION",
  "PIX_PHOENIX_CHICK", "PIX_CINDER_HOUND", "PIX_LAVA_SNAIL", "PIX_OBSIDIAN_KNIGHT", "PIX_GLOW_JELLY",
  "PIX_PIRATE_PARROT", "PIX_SHELL_TURTLE", "PIX_SHARK_PUP", "PIX_ACORN_KNIGHT", "PIX_FOX_SPIRIT", "PIX_PIXIE",
  "PIX_BEE_SWARM", "PIX_SCARECROW", "PIX_HAUNTED_ARMOR", "PIX_GHOST_CAT", "PIX_WISP", "PIX_WALRUS", "PIX_SNOW_OWL",
  "PIX_FROST_MOTH", "PIX_ICE_SLIME", "PIX_KRAKEN", "PIX_KRAKEN_TENTACLE", "PIX_SPHINX",
  "PIX_HYDRA", "PIX_CLOCKWORK", "PIX_CRYSTAL_QUEEN", "PIX_GOBLIN_KING", "PIX_MOSS_WITCH"];
const S = loadSection("function pixDraw(", "const PIX_ENEMY_ART", NEW);

for (const name of NEW) {
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
