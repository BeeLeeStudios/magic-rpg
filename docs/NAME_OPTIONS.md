# Name options

The game currently ships as **Dragons vs Math**. It's a good working title,
but the dragon-math space on Google Play is crowded ("Dragon Math",
"Math Dragon", "Dragon Math Battle", "Mathew the Math Dragon", "Math Mania:
Saga of Dragons" are all live), so it's worth a deliberate choice before
the first upload. The package ID never changes, but the store name can.

| Name | Why it works | Watch out for |
|---|---|---|
| **Dragons vs Math** *(current)* | Instantly says "dragons + math". Fun, easy to say, easy to search. No exact match found on Play (Sept 2026). | "vs Math" can read as *math is the enemy* — slightly off-message for an app meant to make kids like math. Very close to several "Dragon Math" apps. |
| **Sum Slayers** | Short, punchy, memorable; the pun ("sum" / "some") lands with 8–13 year-olds. Distinct from the dragon-math crowd. | "Slayers" is a little edgy for a 5-year-old audience; doesn't mention dragons. |
| **Math Dragon Riders** | Describes the fantasy (you ride a dragon) and puts math first. Positive framing. | Close to "Math Dragon" apps; a bit long. |
| **Number Knights** | Friendly, alliterative, works for all ages, room for sequels ("Number Knights: Times Tables"). | Hero is a knight-ish rider, not a knight exactly; name doesn't mention dragons. |
| **Dragon Math Quest** | Clear, parent-friendly, very searchable. | Generic; hard to stand out against existing "Dragon Math" titles. |
| **Mathlands: Dragon Riders** | Builds a world name you can reuse for future topics (multiplication, fractions). | Two-part names get truncated on phone home screens ("Mathlands: Dr…"). |

**Recommendation:** keep **Dragons vs Math** if you like the energy of it — it
is clear and currently unique. If you want to avoid the "math is the enemy"
reading, **Number Knights** is the strongest alternative for the full 5–13
age range.

Before you commit, search the name on Google Play and on the USPTO
trademark search (<https://tmsearch.uspto.gov>) — a close match to an
existing trademarked game name is the most common reason for a forced
rename after launch.

To rename: update `GAME_NAME` in `www/index.html` (the title logo splits it
into top / middle / bottom words), `appName` in `capacitor.config.json`,
`app_name` and `title_activity_main` in
`android/app/src/main/res/values/strings.xml`, `docs/privacy-policy.html`,
`store/listing.md`, then run `node scripts/generate-store-assets.mjs` to
redraw the feature graphic and splash.
