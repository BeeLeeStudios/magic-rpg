import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSection } from "./load-game.mjs";

const L = loadSection("const MAX_LEVEL", "/* ---------- damage, decoupled",
  ["MAX_LEVEL", "XP_THRESHOLDS", "levelFromXP", "xpForLevel", "migrateXP", "getMaxHPForLevel"]);

test("levels go to 100", () => {
  assert.equal(L.MAX_LEVEL, 100);
  assert.equal(L.levelFromXP(L.xpForLevel(100)).level, 100);
  assert.equal(L.levelFromXP(L.xpForLevel(100) - 1).level, 99);
});

test("leveling is slower than before", () => {
  // Old curve: level 2 at 10 XP (2 waves), level 10 at 198 XP, level 25 at 1068 XP.
  assert.ok(L.xpForLevel(2) >= 20);
  assert.ok(L.xpForLevel(10) >= 300);
  assert.ok(L.xpForLevel(25) >= 1500);
  for (let lv = 2; lv < 100; lv++) assert.ok(L.XP_THRESHOLDS[lv - 1] > L.XP_THRESHOLDS[lv - 2]);
});

test("old saves keep their level", () => {
  const OLD = Array.from({ length: 24 }, (_, i) => 10 + i * 3);
  let oldXP = 0;
  for (let lv = 1; lv <= 25; lv++) {
    assert.equal(L.levelFromXP(L.migrateXP(oldXP)).level, lv, `old level ${lv}`);
    // halfway through the level stays halfway-ish
    if (lv < 25) {
      const mid = L.levelFromXP(L.migrateXP(oldXP + Math.floor(OLD[lv - 1] / 2)));
      assert.equal(mid.level, lv);
      assert.ok(mid.remaining > 0);
      oldXP += OLD[lv - 1];
    }
  }
});

test("max HP keeps growing but stays sane at level 100", () => {
  assert.equal(L.getMaxHPForLevel(1), 30);
  assert.equal(L.getMaxHPForLevel(25), 78);
  assert.ok(L.getMaxHPForLevel(100) > L.getMaxHPForLevel(25));
  assert.ok(L.getMaxHPForLevel(100) <= 160);
});
