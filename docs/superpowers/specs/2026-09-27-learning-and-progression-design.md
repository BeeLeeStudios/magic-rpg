# Learning & Progression Update — Design

Approved in chat on 2026-09-27. Nine features, built in three phases. Each
phase ends with an automated math check (where relevant), a browser
play-through with screenshots, a commit, and a push so CI builds a test APK.

All code follows the existing single-file layout of `www/index.html`
(data tables near the top, `xxxHTML()` view functions, `data-action` click
routing, state on `S`, persisted per save slot in `saveActiveSlot` /
`selectSave`). New top-level systems get a line in the FILE MAP comment.
Art changes go in `www/hd-art.js`.

Constraints that apply everywhere:
* Families policy: no data leaves the device, no ads, no links out. Any new
  native plugin must work offline and collect nothing.
* Old saves must load cleanly. New save fields default sensibly when absent.
* `prefers-reduced-motion` and the new in-game Reduce Motion setting both
  calm every new animation.

---

## Phase 1

### 1. Multiplication & division ranks

Six ranks appended to `MATH_BANDS` after rank 11. Promotion, demotion,
review and fast-track rules are unchanged.

| id | name | gen | speedMs |
|---|---|---|---|
| 12 | Twin Flame | a × b, one factor ∈ {2, 5, 10}, other 1–10 | 8000 |
| 13 | Triple Claw | one factor ∈ {3, 4}, other 1–10 | 9000 |
| 14 | Splitter | (d·q) ÷ d, d ∈ {2, 5, 10}, q 1–10 | 9000 |
| 15 | Rune Weaver | one factor ∈ {6, 7, 8, 9}, other 2–10 | 10000 |
| 16 | Shard Breaker | (d·q) ÷ d, d ∈ {3..9}, q 2–10 | 10000 |
| 17 | Dragon Sage | 50/50 × or ÷, all facts 2–10 | 9000 |

* `op` values are `"×"` and `"÷"`; the problem display already prints `op`.
* Division is always exact (built from the product).
* Distractors (`errors`): neighbour facts (a·(b±1), (a±1)·b), a + b,
  answer ± 1; for ÷: q ± 1, dividend − divisor, the product d·q.
  All filtered to positive integers ≠ answer by `makeChoices`.
* Rank-card / info copy that says "addition and subtraction" is updated to
  mention × and ÷; store listing text updated too.
* Enemy `weakness.op` only matches + / −; × and ÷ simply never trigger it.
* Verification: in-browser script generates 5,000 problems per new band and
  asserts integer answers, exact division, 4 distinct non-negative choices
  that include the answer, and `getBand(17)` is reachable (`MAX_BAND` = 17).

### 2. Celebrations

A full-screen overlay (`S.celebration = { kind, title, sub, icon }`) with
CSS confetti, the existing `rankup` sound, and a Continue button (auto-closes
after 4 s). Battle input is locked while it shows.

Triggers: math rank promotion (replaces the plain banner), boss defeated,
dragon growth stage reached (Phase 3), new world entered (Phase 3). Multiple
triggers in one moment queue and play in order. Reduced motion: no
confetti, just a fade.

---

## Phase 2

### 3. Parent area

* The "For Parents · Privacy" link opens a **grown-up gate**: a random
  a × b (6–9 × 6–9) with a number pad; wrong answer returns to the save list.
* Parent hub has two tabs: **Progress** and **Privacy** (existing text).
* Progress lists every save slot. Per slot: name, hero, current rank + desc,
  total problems (sum of lifetime `seen`), overall accuracy, time played,
  best wave, and a skill list of all 17 ranks marked Mastered (below current
  rank), Practicing (current), or Not yet, with lifetime accuracy where seen.
* **Time played**: new slot field `playMs`, accumulated while
  `S.screen === "playing"` and the page is visible; saved with the slot.
* **Set math rank**: − / + control per slot; writes `mathBand`, clears the
  target band's rolling window (like `demoteTo`) so evidence starts fresh.

### 4. Accessibility (Settings)

Stored per device in localStorage (like volume):
* Text size: Normal / Large / Extra large → a class on `<html>` scaling the
  problem, choices and body text.
* Reduce motion: Auto (follows system) / On / Off → a class that disables
  shakes, confetti and particles; BattleStage reads it to skip screen shake.
* Colour-blind friendly: answer feedback uses blue/orange and always shows
  ✓ / ✗ glyphs.

### 5. Vibration

`navigator.vibrate(120)` on a wrong answer (the enemy hit). Settings toggle,
default On. Android manifest gains `android.permission.VIBRATE`.

### 6. Read aloud

* 🔊 button beside the problem; Settings option "Read problems aloud
  automatically" (default Off).
* Spoken form: "7 plus 5 equals what?", minus / times / divided by.
* Native: `@capacitor-community/text-to-speech` (on-device Android TTS).
  Browser fallback: `window.speechSynthesis`. If neither exists the button
  is hidden.
* Only the on-screen text is spoken; nothing is recorded or sent.

---

## Phase 3

### 7. Collection book & badges

* 📖 button in the battle top bar → full-screen book with tabs Monsters,
  Treasures, Badges.
* New slot fields: `defeated: { [enemyName]: count }`, `stats: { correct,
  bestStreak, chests, bossesNoMiss }`, `badges: { [id]: timestamp }`.
* Monsters: every `ENEMIES` + `BOSSES` entry; beaten ones render their
  sprite and "Beaten ×N", others a black silhouette and "???".
* Treasures: dragon mounts, pets, swords; owned in colour, others silhouette.
* Badges (≈18), each with a coin reward (25–100):
  first win; 10 / 50 / 200 monsters; first boss; perfect boss (no wrong
  answers during the fight); 10 / 25 streak; 100 / 1,000 correct answers;
  rank 5 / 8 / 11 / 12 ("Times Tables!") / 17; wave 10 / 25; 10 chests;
  own 3 dragons; own a pet.
* Earning one shows a small toast in battle and adds coins. On load, badges
  derivable from existing data (rank, owned items, best wave) are granted
  silently (no coins for retroactive ones).

### 8. Dragon grows up

Growth stage from dragon level: Hatchling 1–4 (scale 0.78), Young 5–9
(0.88), Adult 10–19 (1.0), Elder 20+ (1.0 + longer horns, gold armour plates
on the back/chest, soft aura). Implemented as an optional `growth` argument
to `drawHDDragon` (defaults to Adult so the store/site scripts are
unchanged). Reaching a new stage triggers a celebration.

### 9. World map & ordered worlds

* `arenaBiomeForWave` becomes ordered: world = floor((wave − 1) / 10) % 5,
  order Volcano, Lagoon, Forest, Night, Ice. Waves 51+ loop (enemy scaling is
  already by wave).
* 🗺️ button in the top bar opens a map: 5 world panels, 10 nodes each,
  bosses every 5th node, current wave highlighted, best wave flagged.
* Entering a new world (wave 11, 21, …) shows a world-intro celebration.

---

## Out of scope
Rider redesign, new music, typed-answer mode, daily quests, session timer.
