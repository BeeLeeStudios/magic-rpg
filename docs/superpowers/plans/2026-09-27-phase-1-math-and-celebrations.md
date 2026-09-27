# Phase 1: Multiplication/Division Ranks + Celebrations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add math ranks 12–17 (× and ÷ facts to 10 × 10) and a full-screen celebration overlay fired by rank-ups and boss wins.

**Architecture:** Everything lives in the single-file game `www/index.html`, following its existing sections (MATH_BANDS table, `xxxHTML()` view functions, `data-action` click routing, state on `S`). The math logic is pure and gets an automated Node test that loads the MATH BANDS section of the file into a `vm` sandbox. Celebrations are UI and are verified in the built-in browser against a local static server.

**Tech Stack:** Vanilla JS/HTML/CSS, Node 22 (`node:test`, `node:vm`), Capacitor Android (unchanged in this phase).

**Spec:** `docs/superpowers/specs/2026-09-27-learning-and-progression-design.md` (Phase 1 sections 1 and 2)

## Global Constraints

* Families policy: no data leaves the device, no ads, no links out.
* Old saves must load cleanly; new fields default sensibly when absent.
* `prefers-reduced-motion` (and the future `html.reduce-motion` class) calm every new animation.
* Promotion/demotion/review/fast-track rules are unchanged.
* `op` values for new ranks are exactly `"×"` and `"÷"`.
* Division is always exact.

---

### Task 1: Math ranks 12–17 with an automated test

**Files:**
- Create: `tests/math-bands.test.mjs`
- Create: `tests/load-game.mjs`
- Modify: `package.json` (add `"test"` script)
- Modify: `www/index.html` — `MATH_BANDS` (after the rank 11 entry, ~line 1700), helpers after `teenErrors` (~line 1726), header comment (~line 1549), `infoHTML` copy (~line 3874)
- Modify: `store/listing.md`, `site/index.html`, `README.md` (copy only)

**Interfaces:**
- Produces: `MATH_BANDS` entries with ids 12–17; `mulFact(tables, lo, hi)`, `divFact(divisors, lo, hi)`, `mulErrors(p)`, `divErrors(p)`; `MAX_BAND === 17`.
- Produces (test util): `loadMath()` in `tests/load-game.mjs` → `{ MATH_BANDS, MAX_BAND, getBand, generateProblem, makeChoices }`.

- [ ] **Step 1: Write the loader**

`tests/load-game.mjs`:
```js
// Loads the pure math section of www/index.html (helpers through
// makeChoices) into a sandbox so it can be tested without a browser.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../www/index.html", import.meta.url), "utf8");

export function loadMath() {
  const start = html.indexOf("/* ---------- helpers ---------- */");
  const end = html.indexOf("/* ================= MASTERY");
  if (start < 0 || end < 0) throw new Error("math section markers not found in www/index.html");
  const code = html.slice(start, end);
  const ctx = vm.createContext({ S: { mathBand: 1, mastery: {} }, Math });
  return vm.runInContext(`${code}\n;({ MATH_BANDS, MAX_BAND, getBand, generateProblem, makeChoices })`, ctx);
}
```

- [ ] **Step 2: Write the failing test**

`tests/math-bands.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMath } from "./load-game.mjs";

const M = loadMath();
const N = 5000;
const calc = (p) => ({ "+": p.a + p.b, "-": p.a - p.b, "×": p.a * p.b, "÷": p.a / p.b })[p.op];

test("ladder has 17 ranks", () => {
  assert.equal(M.MAX_BAND, 17);
  assert.deepEqual(M.MATH_BANDS.slice(11).map((b) => b.name),
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
```

`package.json` scripts gains: `"test": "node --test tests/"`.

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `ladder has 17 ranks` (11 !== 17) and `generateProblem(12..17)` clamp to rank 11 so `p.band` is 11, failing ranks 12–17.

- [ ] **Step 4: Implement the ranks**

In `www/index.html`, append after the rank 11 object (before the closing `];` of `MATH_BANDS`):
```js
  // Ranks 12-17: times tables and division facts up to 10 x 10, in the
  // order schools teach them -- the easy tables, then sharing by them,
  // then the hard tables, then sharing by those, then everything mixed.
  {
    id: 12,
    name: "Twin Flame",
    desc: "Times tables: × 2, × 5, × 10",
    speedMs: 8000,
    gen() { return mulFact([2, 5, 10], 1, 10); },
    errors: mulErrors,
  },
  {
    id: 13,
    name: "Triple Claw",
    desc: "Times tables: × 3, × 4",
    speedMs: 9000,
    gen() { return mulFact([3, 4], 1, 10); },
    errors: mulErrors,
  },
  {
    id: 14,
    name: "Splitter",
    desc: "Sharing: ÷ 2, ÷ 5, ÷ 10",
    speedMs: 9000,
    gen() { return divFact([2, 5, 10], 1, 10); },
    errors: divErrors,
  },
  {
    id: 15,
    name: "Rune Weaver",
    desc: "Times tables: × 6 to × 9",
    speedMs: 10000,
    gen() { return mulFact([6, 7, 8, 9], 2, 10); },
    errors: mulErrors,
  },
  {
    id: 16,
    name: "Shard Breaker",
    desc: "Sharing: ÷ 3 to ÷ 9",
    speedMs: 10000,
    gen() { return divFact([3, 4, 5, 6, 7, 8, 9], 2, 10); },
    errors: divErrors,
  },
  {
    id: 17,
    name: "Dragon Sage",
    desc: "All × and ÷ facts to 10 × 10",
    speedMs: 9000,
    gen() {
      const all = [2, 3, 4, 5, 6, 7, 8, 9, 10];
      return Math.random() < 0.5 ? mulFact(all, 2, 10) : divFact(all, 2, 10);
    },
    errors: (p) => (p.op === "×" ? mulErrors(p) : divErrors(p)),
  },
```
After `teenErrors`, add:
```js
/* Ranks 12-17. One factor comes from this rank's tables, the other from
   lo..hi, in either order so 3 x 7 and 7 x 3 both show up. */
function mulFact(tables, lo, hi) {
  const t = tables[randInt(0, tables.length - 1)];
  const n = randInt(lo, hi);
  return Math.random() < 0.5
    ? { a: t, op: "×", b: n, answer: t * n }
    : { a: n, op: "×", b: t, answer: t * n };
}
/* Division is built backwards from a product, so it always comes out even. */
function divFact(divisors, lo, hi) {
  const d = divisors[randInt(0, divisors.length - 1)];
  const q = randInt(lo, hi);
  return { a: d * q, op: "÷", b: d, answer: q };
}
// Times tables: a neighbouring fact (7 x 8 -> 49 or 64), adding instead of
// multiplying, and a slip of one.
function mulErrors(p) {
  return [p.a * (p.b + 1), p.a * (p.b - 1), (p.a + 1) * p.b, (p.a - 1) * p.b, p.a + p.b, p.answer + 1, p.answer - 1];
}
// Division: off by one or two, and subtracting instead of dividing.
function divErrors(p) {
  return [p.answer + 1, p.answer - 1, p.answer + 2, p.answer - 2, p.a - p.b];
}
```
Replace the header comment lines
```
   Every band is addition/subtraction. Multiplication, if added later,
   belongs after rank 11 so it never shows up for a kid who isn't ready.
```
with
```
   Ranks 1-11 are addition/subtraction; ranks 12-17 are times tables and
   division, after rank 11 so they never show up for a kid who isn't ready.
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 6: Update copy**

* `www/index.html` `infoHTML`: `(addition and subtraction, from "within 10" up to two-digit regrouping)` → `(addition and subtraction up to two-digit regrouping, then times tables and division)`.
* `store/listing.md`: short description → `Solve math to power up your dragon! Adaptive + − × ÷ practice for ages 5–13.` (73 chars, update the count note); full description first paragraph `practice addition and subtraction` → `practice addition, subtraction, times tables and division`; bullet `all the way to two-digit carrying and borrowing.` → `through two-digit carrying and borrowing, then times tables and division.`
* `site/index.html`: both `addition and subtraction` phrases → `addition, subtraction, times tables and division`.
* `README.md`: `from numbers 1 to 4 up to two-digit carrying and borrowing` → `from numbers 1 to 4 up to two-digit carrying and borrowing, then times tables and division`.

- [ ] **Step 7: Commit**

```bash
git add tests package.json www/index.html store/listing.md site/index.html README.md
git commit -m "Add times tables and division ranks 12-17 with math tests"
```

---

### Task 2: Celebration overlay, fired by rank-ups and boss wins

**Files:**
- Create: `scripts/serve.mjs` (dependency-free static server for local play-testing)
- Create: `.claude/launch.json`
- Modify: `package.json` (`"serve"` script)
- Modify: `www/index.html` — CSS (after the level-up block ~line 1403, reduced-motion block ~line 1484), `makeFireworks` area (~line 2590), state `S` (~line 2713), `announceBandChange` (~line 2773), `handleWaveClear` (~line 2995), run reset (~line 3265), `levelUpHTML` (~line 4241), `renderNow` (~line 4304), click routing (~line 4371), FILE MAP comment

**Interfaces:**
- Consumes: `makeFireworks(count)`, `Sound.play("rankup")`, `getBand(id)`, `esc(str)`.
- Produces: `celebrate({ icon, kicker, title, sub })` (queues and shows), `dismissCelebration()`, `S.celebrations` (array, not saved), `fireworksHTML(list)`, `CELEBRATION_MS = 4000`. Phase 3 calls `celebrate()` for dragon growth and new worlds.

- [ ] **Step 1: Local server**

`scripts/serve.mjs`:
```js
// Tiny static server for play-testing www/ locally (no dependencies).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = new URL("../www/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const port = Number(process.env.PORT) || 8080;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json", ".svg": "image/svg+xml" };

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^([/\\])+/, "");
  const file = join(root, path || "index.html");
  if (!file.startsWith(normalize(root))) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" }).end(body);
  } catch { res.writeHead(404).end("Not found"); }
}).listen(port, () => console.log(`Serving www/ on http://localhost:${port}`));
```
`package.json`: `"serve": "node scripts/serve.mjs"`.
`.claude/launch.json`:
```json
{ "version": "0.0.1", "configurations": [ { "name": "game", "runtimeExecutable": "node", "runtimeArgs": ["scripts/serve.mjs"], "port": 8080 } ] }
```

- [ ] **Step 2: Write the failing browser check**

With the server running, in the browser pane on `http://localhost:8080`, run:
```js
typeof celebrate === "function" && Array.isArray(S.celebrations)
```
Expected now: `false` (not implemented).

- [ ] **Step 3: Implement the overlay**

Refactor the particle markup out of `levelUpHTML` into a shared helper placed right after `makeFireworks`:
```js
function fireworksHTML(list) {
  return list.map((p) => {
    const rad = (p.angle * Math.PI) / 180;
    const dx = Math.cos(rad) * p.distance;
    const dy = Math.sin(rad) * p.distance;
    return `<span class="firework-particle" style="--dx:${dx}px; --dy:${dy}px; background:${p.color}; left:${p.originX}%; top:${p.originY}%; animation-delay:${p.delay}s;"></span>`;
  }).join("");
}
```
and in `levelUpHTML` replace the `const particles = d.fireworks.map(...).join("");` block with `const particles = fireworksHTML(d.fireworks);`.

Add the system after `announceBandChange`'s neighbours (right before `function announceBandChange`):
```js
/* ================= CELEBRATIONS =================
   Big full-screen moments: math rank up, boss beaten (and in later
   phases: dragon grows up, new world). Queued so two at once play one
   after the other. While one is up, the problem timer is paused so the
   confetti doesn't eat the kid's speed bonus. */
const CELEBRATION_MS = 4000;

function celebrate(c) {
  S.celebrations.push(Object.assign({ confetti: makeFireworks(28) }, c));
  if (S.celebrations.length === 1) startCelebration();
}

function startCelebration() {
  const c = S.celebrations[0];
  if (!c) return;
  c.shownAt = Date.now();
  Sound.play("rankup");
  const rid = S.runId;
  setTimeout(() => { if (S.runId === rid && S.celebrations[0] === c) dismissCelebration(); }, CELEBRATION_MS);
  render();
}

function dismissCelebration() {
  const c = S.celebrations.shift();
  if (!c) return;
  // Give back the time the overlay covered an unanswered problem.
  if (!S.pick && S.problemShownAt) {
    const pausedFrom = Math.max(c.shownAt, S.problemShownAt);
    S.problemShownAt += Math.max(0, Date.now() - pausedFrom);
  }
  if (S.celebrations.length) startCelebration();
  else render();
}

function celebrationHTML() {
  const c = S.celebrations[0];
  return `
  <div class="celebrate-overlay" data-action="dismiss-celebration">
    <div class="fireworks">${fireworksHTML(c.confetti)}</div>
    <div class="card celebrate-card">
      <div class="celebrate-icon">${c.icon}</div>
      <div class="celebrate-kicker">${esc(c.kicker)}</div>
      <h2>${esc(c.title)}</h2>
      <p>${esc(c.sub)}</p>
      <button class="btn primary big" data-action="dismiss-celebration">Awesome!</button>
    </div>
  </div>`;
}
```
Replace `announceBandChange` with:
```js
function announceBandChange(change) {
  if (!change || change.type !== "promote") return;
  const band = getBand(change.band);
  const unlockedTimes = band.id >= 12 && change.from < 12;
  celebrate({
    icon: unlockedTimes ? "✖️" : "⭐",
    kicker: change.jumped ? "Double rank up!" : "Math rank up!",
    title: `Rank ${band.id}: ${band.name}`,
    sub: unlockedTimes ? `Times tables unlocked! ${band.desc}` : band.desc,
  });
}
```
Remove the now-unused `bandBanner`: the `bandBanner: null,` state field, the two `S.bandBanner = null;` resets, and the `${S.bandBanner ? ... : ""}` line in `playingHTML`.

State `S` (next to `bossIntro: null,`): `celebrations: [],`. In the run reset where `S.bossBanner = null;` is set (~line 3266) add `S.celebrations = [];`.

`handleWaveClear`, right after the `S.banner = \`${label} defeated! ...\`` line (inside the `else`):
```js
    if (meta.isBoss) celebrate({ icon: "🏆", kicker: "Boss defeated!", title: `${meta.name} is beaten!`, sub: `+${coinReward} coins · +${xpReward} XP` });
```
`renderNow`: after `if (S.levelUpData) html += levelUpHTML();` add `if (S.celebrations.length) html += celebrationHTML();`.
Click routing: after the `choose-levelup-card` branch add `else if (action === "dismiss-celebration") dismissCelebration();`.

CSS, after the level-up block:
```css
/* ---------- celebrations ---------- */
.celebrate-overlay {
  position: fixed; inset: 0; z-index: 70; display: flex; align-items: center; justify-content: center;
  background: rgba(10,4,24,0.84); overflow: hidden; animation: celebrateIn 0.25s ease-out;
}
.celebrate-card { position: relative; text-align: center; max-width: 340px; margin: 0 16px; padding: 22px 24px; }
.celebrate-icon { font-size: 64px; line-height: 1.1; filter: drop-shadow(0 3px 0 var(--ink)); animation: celebratePop 0.6s cubic-bezier(.2,1.6,.4,1) both; }
.celebrate-kicker { font-family: var(--font-ui); font-weight: 900; font-size: 15px; letter-spacing: 2px; text-transform: uppercase; color: var(--gold); margin-top: 6px; }
.celebrate-card h2 { font-size: 30px; margin: 6px 0; }
.celebrate-card p { color: var(--text); font-size: 17px; margin: 0 0 18px; }
@keyframes celebrateIn { from { opacity: 0; } }
@keyframes celebratePop { from { transform: scale(0.2); opacity: 0; } }
```
Extend the rays rule selector: `.levelup-overlay::before, .celebrate-overlay::before { ... }`.
Reduced motion — extend the `@media (prefers-reduced-motion: reduce)` block and add the class form:
```css
@media (prefers-reduced-motion: reduce) {
  .celebrate-overlay::before, .celebrate-icon { animation: none !important; }
  .celebrate-overlay .fireworks { display: none; }
}
html.reduce-motion .celebrate-overlay::before, html.reduce-motion .celebrate-icon { animation: none !important; }
html.reduce-motion .celebrate-overlay .fireworks { display: none; }
```
FILE MAP: add a line `Celebrations ............ celebrate, dismissCelebration, celebrationHTML (queued full-screen moments)`.

- [ ] **Step 4: Verify in the browser**

1. Reload `http://localhost:8080`; re-run the Step 2 check → `true`.
2. Start a save, reach battle, then run:
   ```js
   S.mathBand = 11; S.mastery[11].recent = Array(32).fill(1); S.mastery[11].times = Array(32).fill(500); S.mastery[11].seen = 40; S.mastery[11].cooldown = 0; S.mastery[11].demotions = 0; handleAnswer(S.problem.answer); S.celebrations[0] && S.celebrations[0].title
   ```
   Expected: `"Rank 12: Twin Flame"` (or `"Rank 13: Triple Claw"` on a fast-track jump); screenshot shows the overlay; after tapping Awesome! the next problem uses `×`.
3. `celebrate({icon:"🏆",kicker:"Boss defeated!",title:"A",sub:"x"}); celebrate({icon:"⭐",kicker:"k",title:"B",sub:"y"}); [S.celebrations.length, S.celebrations[0].title]` → `[2, "A"]`; `dismissCelebration(); S.celebrations[0].title` → `"B"`.
4. No console errors (`read_console_messages` onlyErrors).

- [ ] **Step 5: Commit**

```bash
git add scripts/serve.mjs .claude/launch.json package.json www/index.html
git commit -m "Add celebration overlay for rank ups and boss wins"
```

---

### Task 3: Ship Phase 1 for phone testing

- [ ] **Step 1:** `npm test` → all PASS.
- [ ] **Step 2:** `git push -u origin feature/math-parents-progression` (CI builds the debug APK).
- [ ] **Step 3:** Report the Actions run link and screenshots to the owner.
