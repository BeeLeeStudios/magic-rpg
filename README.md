# Dragons vs Math

A pixel-art math battle game for kids ages 5–13. Every correct answer is an
attack; the math adapts to each child, from numbers 1 to 4 up to two-digit
carrying and borrowing, then times tables and division. Packaged as an
Android app for Google Play with
[Capacitor](https://capacitorjs.com).

## Layout

| Path | What it is |
|---|---|
| `www/index.html` | The entire game (HTML/CSS/JS, no build step). Open it in a browser to play. |
| `www/fonts/` | Bundled fonts (SIL Open Font License) so the app works offline |
| `android/` | Capacitor Android project (target SDK 36) |
| `capacitor.config.json` | App ID, name, Android settings |
| `scripts/generate-store-assets.mjs` | Renders the store icon, feature graphic, screenshots and launcher-icon/splash sources from the game's own sprite code |
| `store/` | Play Store listing text and graphics |
| `docs/PLAY_STORE_GUIDE.md` | **Start here to publish** — requirements, Play Console answers, release steps |
| `docs/NAME_OPTIONS.md` | Name ideas to evaluate |
| `docs/privacy-policy.html` | Privacy policy to host publicly |
| `site/` | The dragonsvsmath.com website (see `docs/WEBSITE.md`) |
| `.github/workflows/android.yml` | CI: builds a debug APK and a release `.aab` on every push |

## Play it locally

```bash
npx http-server www -p 8080     # then open http://localhost:8080
```

## Build the Android app

Needs Node 22+, JDK 21 and the Android SDK (Android Studio installs both).

```bash
npm ci
npx cap sync android            # copy www/ into android/
npx cap open android            # open in Android Studio, or:
cd android && ./gradlew bundleRelease
```

After changing art, regenerate store graphics and launcher icons:

```bash
node scripts/generate-store-assets.mjs
npx capacitor-assets generate --android --iconBackgroundColor '#1a0f2e' --splashBackgroundColor '#140b24'
```
