import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMath } from "./load-game.mjs";

const M = loadMath();
const N = 5000;
const calc = (p) => ({ "+": p.a + p.b, "-": p.a - p.b, "×": p.a * p.b, "÷": p.a / p.b })[p.op];

test("ladder has 17 ranks", () => {
  assert.equal(M.MAX_BAND, 17);
  assert.deepEqual(Array.from(M.MATH_BANDS.slice(11), (b) => b.name),
    ["Twin Flame", "Triple Claw", "Splitter", "Rune Weaver", "Shard Breaker", "Dragon Sage"]);
});

for (let id = 1; id <= 17; id++) {
  test(`rank ${id}: answers are right and choices are sane`, () => {
    for (let i = 0; i < N; i++) {
      const p = M.generateProblem(id);
      assert.equal(p.band, id);
      assert.ok(Number.isInteger(p.answer) && p.answer >= 0, `bad answer ${JSON.stringify(p)}`);
      assert.equal(calc(p), p.answer, `wrong answer ${JSON.stringify(p)}`);
      const ch = M.makeChoices(p);
      assert.equal(ch.length, 4);
      assert.equal(new Set(ch).size, 4);
      assert.ok(ch.includes(p.answer));
      assert.ok(ch.every((v) => Number.isInteger(v) && v >= 0), `bad choices ${ch}`);
    }
  });
}

const factorsIn = (p, set, lo, hi) =>
  (set.includes(p.a) && p.b >= lo && p.b <= hi) || (set.includes(p.b) && p.a >= lo && p.a <= hi);

test("rank 12 is x2, x5, x10", () => {
  for (let i = 0; i < N; i++) { const p = M.generateProblem(12); assert.equal(p.op, "×"); assert.ok(factorsIn(p, [2, 5, 10], 1, 10), JSON.stringify(p)); }
});
test("rank 13 is x3, x4", () => {
  for (let i = 0; i < N; i++) { const p = M.generateProblem(13); assert.equal(p.op, "×"); assert.ok(factorsIn(p, [3, 4], 1, 10), JSON.stringify(p)); }
});
test("rank 14 divides by 2, 5, 10 exactly", () => {
  for (let i = 0; i < N; i++) { const p = M.generateProblem(14); assert.equal(p.op, "÷"); assert.ok([2, 5, 10].includes(p.b)); assert.ok(p.answer >= 1 && p.answer <= 10); }
});
test("rank 15 is x6 to x9", () => {
  for (let i = 0; i < N; i++) { const p = M.generateProblem(15); assert.equal(p.op, "×"); assert.ok(factorsIn(p, [6, 7, 8, 9], 2, 10), JSON.stringify(p)); }
});
test("rank 16 divides by 3 to 9 exactly", () => {
  for (let i = 0; i < N; i++) { const p = M.generateProblem(16); assert.equal(p.op, "÷"); assert.ok(p.b >= 3 && p.b <= 9); assert.ok(p.answer >= 2 && p.answer <= 10); }
});
test("rank 17 mixes x and ÷", () => {
  const ops = new Set();
  for (let i = 0; i < N; i++) ops.add(M.generateProblem(17).op);
  assert.deepEqual([...ops].sort(), ["×", "÷"]);
});
