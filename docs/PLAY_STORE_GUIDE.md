# Publishing Dragons vs Math on Google Play

A step-by-step checklist for getting this game from this repo onto the Play
Store as a kids' app. Researched September 2026 — Google changes these rules
often, so re-check anything marked **(verify)** in Play Console before you submit.

---

## 1. What's already done in this repo

| Requirement | Status |
|---|---|
| Android App Bundle (.aab) build | ✅ Capacitor 8 project in `android/`; CI builds `.aab` + debug `.apk` (`.github/workflows/android.yml`) |
| **Target API level 36 (Android 16)** — required for new apps & updates since **Aug 31, 2026** | ✅ `android/variables.gradle` → `targetSdkVersion = 36`, `compileSdkVersion = 36` |
| Edge-to-edge (forced for API 36 on Android 16+) | ✅ `viewport-fit=cover` + safe-area insets in CSS; Capacitor `SystemBars` injects insets |
| Works offline / no network | ✅ Fonts bundled in `www/fonts`; **INTERNET permission removed** from the manifest (the only permission is VIBRATE, for a buzz on wrong answers) |
| No personal data collected (COPPA / GDPR-K / Families) | ✅ No ads, analytics, accounts, IAP, or third-party SDKs; saves stay in on-device storage |
| Privacy policy — in-app **and** on a public URL | ✅ In-app: "For Parents · Privacy" on the save screen. Public: `docs/privacy-policy.html` (you must host it — step 4) |
| No outbound links / purchases (so no parental gate needed) | ✅ Nothing in the app leaves the app |
| Android Back button behaves | ✅ Steps back through screens; exits from the save list |
| Progress saved when the app is backgrounded | ✅ `visibilitychange` + Capacitor `pause` handlers |
| App icon (adaptive), splash screen | ✅ Generated into `android/app/src/main/res/` |
| Store icon, feature graphic, screenshots, listing text | ✅ `store/` (see `store/listing.md`) |
| 16 KB memory page size support (required for API 35+ targets with native code) | ✅ No native libraries in the app, so nothing to realign **(verify with the Play Console pre-launch report)** |

## 2. Things only you can do (TODOs before submitting)

1. **Support email.** A temporary personal Gmail is set in `www/index.html`
   (`PRIVACY_CONTACT_EMAIL`), `docs/privacy-policy.html` and the website.
   Swap in a dedicated address before launch if you can — it is shown
   publicly on the store listing.
2. **Publisher name.** The privacy policy says "published by BeeLee Studios".
   Change it if your Play developer name is different.
3. **Pick the final name** — see `docs/NAME_OPTIONS.md`. If you change it,
   update `GAME_NAME` in `www/index.html`, `appName` in
   `capacitor.config.json`, `android/app/src/main/res/values/strings.xml`,
   the privacy policy, and `store/listing.md`, then re-run
   `node scripts/generate-store-assets.mjs`.
4. **Package name is permanent.** `com.beeleestudios.dragonsvsmath` can never
   change after the first upload. Change it now (in `capacitor.config.json`,
   `android/app/build.gradle` → `applicationId`/`namespace`, and the Java
   package folder) if you want something else.

## 3. Google Play developer account

* Create an account at <https://play.google.com/console/signup> — **US$25
  one-time fee**.
* **Identity verification is mandatory** (legal name, address, phone, email,
  government photo ID). Google's newer *Android developer verification*
  program also requires every Play app to be registered to a verified
  developer; Play Console does this automatically once your identity is
  verified. Enforcement on devices starts **Sept 30, 2026** in Brazil,
  Indonesia, Singapore and Thailand and rolls out globally from 2027.
  This also matters if you hand the debug APK to testers in those
  countries — sideloaded apps need a verified developer too.
* **Personal vs organization account.** If you open a **personal** account
  (created after Nov 13, 2023) you **must** run a *closed test with at least
  12 testers who stay opted-in for 14 consecutive days* before Google lets
  you apply for production. Google now also checks that testers actually
  used the app. Organization accounts (requires a D-U-N-S number) skip this.

## 4. Host the privacy policy

Play needs a public, non-PDF, non-geo-blocked URL.

* **GitHub Pages:** Repo → Settings → Pages → *Deploy from branch* → `main`
  / `/docs`. URL will be
  `https://beeleestudios.github.io/magic-rpg/privacy-policy.html`.
  (Pages on a *private* repo needs a paid GitHub plan — otherwise use the
  next option.)
* **Google Sites** (free): paste the text of `docs/privacy-policy.html`
  into a new site and publish.

## 5. Signing

Google Play uses **Play App Signing**: you sign uploads with your own
*upload key*, Google re-signs for users.

```bash
keytool -genkeypair -v -keystore upload.jks -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

**Back up `upload.jks` and its passwords somewhere safe. Never commit them**
(`.gitignore` already blocks `*.jks` and `keystore.properties`).

* **Build locally:** create `android/keystore.properties`:
  ```
  storeFile=/absolute/path/to/upload.jks
  storePassword=...
  keyAlias=upload
  keyPassword=...
  ```
* **Build in GitHub Actions:** add these repo secrets (Settings → Secrets and
  variables → Actions): `ANDROID_KEYSTORE_BASE64` (`base64 -w0 upload.jks`),
  `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
  Every push then produces a signed `dragons-vs-math-release-aab` artifact.

## 6. Build

```bash
npm ci
npx cap sync android          # copies www/ into the Android project
cd android && ./gradlew bundleRelease     # -> app/build/outputs/bundle/release/app-release.aab
```
Or open in Android Studio with `npx cap open android`. Needs JDK 21 and the
Android SDK (Android Studio installs both). To try it on a phone:
`./gradlew assembleDebug` and install `app-debug.apk`, or download the
`dragons-vs-math-debug-apk` artifact from the GitHub Actions run.

**Every upload needs a higher `versionCode`** (`android/app/build.gradle`).

## 7. Play Console setup — "App content" answers for this game

These are the answers that match what the code actually does. Answer
truthfully if you change the game.

| Section | Answer |
|---|---|
| **Privacy policy** | Your hosted URL (step 4) |
| **App access** | All functionality is available without special access |
| **Ads** | No, my app does not contain ads |
| **Content rating** (IARC questionnaire) | Category: *Game*. Violence: fantasy/cartoon characters, no blood, no realistic humans harmed. No sexual content, language, drugs, gambling, user interaction, sharing of location, or purchases. Expect **ESRB Everyone / PEGI 3–7** (the questionnaire decides) |
| **Target audience and content** | Age groups: **5 & under, 6–8, 9–12** (add **13–15** if you want teens included). Because children are targeted, the app is automatically in the **Families** program and must follow the **Families Policy** |
| **Appeal to children** (if asked) | Yes |
| **Data safety** | *Does your app collect or share any of the required user data types?* → **No**. (Save-slot names stay on the device; Google only counts data that leaves the device as "collected".) Encryption in transit / deletion request: not applicable because nothing is collected |
| **Government app / Financial features / Health / News** | No / None / No / No |
| **Advertising ID** | No — the app does not use the advertising ID (and does not declare the `AD_ID` permission) |
| **Families: ads & SDKs** | No ads, no SDKs that collect data — nothing to certify |

### Families Policy essentials (and how this app meets them)

* Content must be appropriate for kids → cartoon pixel monsters, no blood,
  no scary realism. Keep new content in that spirit.
* No collection of device identifiers, location, or personal info from
  children → none collected.
* Only Families-certified ad SDKs, no personalized ads → no ads at all.
* Links out of the app, purchases, and social features must sit behind a
  **parental gate** → the app has none. If you later add a "Rate us" link,
  a website link, or IAP, add a parental gate (e.g. "ask a grown-up: what is
  7 × 8?" with typed input) in front of it.
* No anonymous chat features targeting kids (policy update July 2026) → none.
* Store listing must not be deceptive (no fake "Teacher approved" claims,
  no "#1", no Google endorsement).
* Optional: after launch you can be reviewed for **Teacher Approved**
  (Google's educator review program) — it's by invitation/selection, not
  something you apply for directly **(verify)**.

## 8. Release path

1. **Internal testing** track → upload the `.aab`, add your own Google
   account, install from the opt-in link, play through every screen.
2. **Closed testing** (required for new personal accounts) → at least **12
   testers opted in for 14 days in a row**. Friends/family with Android
   phones work; ask them to actually play a few sessions. Fix anything the
   **pre-launch report** flags (Play runs the app on real devices).
3. **Apply for production access** (Dashboard). Google reviews answers about
   your testing.
4. **Production** → roll out. First reviews of apps in the Families program
   typically take longer than normal apps — plan for several days **(verify)**.

## 9. After launch

* **Target API bumps are yearly.** Google raises the required `targetSdk`
  every August. Update Capacitor (`npm i @capacitor/core@latest
  @capacitor/cli@latest @capacitor/android@latest @capacitor/app@latest`,
  then `npx cap sync`) and raise `targetSdkVersion`.
* Keep the in-app privacy notice, `docs/privacy-policy.html`, and the Data
  safety form in sync if you ever add a feature that touches data.

## Sources

* [Target API level requirements for Google Play apps](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
* [Meet Google Play's target API level requirement (Android Developers)](https://developer.android.com/google/play/requirements/target-sdk)
* [Google Play Families Policies](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en)
* [Data practices in Families apps](https://support.google.com/googleplay/android-developer/answer/11043825?hl=en)
* [Policy announcement: 15 July 2026](https://support.google.com/googleplay/android-developer/answer/17134731?hl=en-GB)
* [App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
* [Android developer verification: rolling out to all developers (Mar 2026)](https://android-developers.googleblog.com/2026/03/android-developer-verification-rolling-out-to-all-developers.html)
* [Android developer verification (Jun 2026)](https://android-developers.googleblog.com/2026/06/android-developer-verification.html)
* [Capacitor edge-to-edge & safe areas guide](https://capawesome.io/blog/capacitor-edge-to-edge-and-safe-areas-guide/)
