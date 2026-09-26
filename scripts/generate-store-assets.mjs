/*
 * Renders Google Play store assets straight from the game's own pixel-art
 * code, so the listing always matches what kids see in the app.
 *
 *   node scripts/generate-store-assets.mjs
 *
 * Outputs:
 *   store/icon-512.png              Play Console "App icon" (512x512, 32-bit PNG)
 *   store/feature-graphic.png       Play Console "Feature graphic" (1024x500)
 *   store/screenshots/phone-*.png   Phone screenshots (1080x1920, 9:16)
 *   assets/icon-only.png, assets/icon-foreground.png, assets/icon-background.png,
 *   assets/splash.png, assets/splash-dark.png
 *                                   Sources for `npx capacitor-assets generate --android`
 *
 * Needs Playwright + Chromium (`npm i -D playwright && npx playwright install chromium`
 * locally; the CI image already has them).
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = await import(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright/index.mjs'); }
const { chromium } = playwright;
const sharp = require('sharp');   // installed with @capacitor/assets

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gameUrl = pathToFileURL(path.join(root, 'www', 'index.html')).href;
for (const d of ['store/screenshots', 'assets']) mkdirSync(path.join(root, d), { recursive: true });
const out = (p) => path.join(root, p);

const launchOpts = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
const browser = await chromium.launch(launchOpts);

/* ---------- icon, feature graphic, splash: drawn with the game's functions ---------- */
async function drawArt(width, height, kind, file) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(gameUrl);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(({ width, height, kind }) => {
    document.body.innerHTML = '';
    document.body.style.margin = '0';
    const cv = document.createElement('canvas');
    cv.width = width; cv.height = height; cv.id = 'art';
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const fire = ELEMENT_PALETTES.creature_fire;

    // Same smooth renderer the game uses (EPX + painted fills + clean outlines).
    const drawSmooth = (srcs, scale, x, y) => {
      const img = renderSprite(srcs, srcs.fill.width * scale, srcs.fill.height * scale);
      ctx.drawImage(img, x, y);
    };
    const rider = (scale, x, y, hero = 'boy') => drawSmooth(riderSource(hero, fire, 3, 0), scale, x, y);
    const pixelText = (text, size, x, y, fill, align = 'center') => {
      ctx.font = `1000 ${size}px Nunito, sans-serif`;
      ctx.textAlign = align; ctx.textBaseline = 'middle';
      const o = Math.max(3, Math.round(size / 12));
      ctx.fillStyle = '#0c0714';
      for (const [dx, dy] of [[o, 0], [-o, 0], [0, o], [0, -o], [o, o], [-o, o], [o, -o], [-o, -o], [0, o * 2]]) ctx.fillText(text, x + dx, y + dy);
      ctx.fillStyle = fill; ctx.fillText(text, x, y);
    };
    const goldGrad = (y0, y1) => {
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, '#fff3c4'); g.addColorStop(0.45, '#ffd66e'); g.addColorStop(0.55, '#f08a24'); g.addColorStop(1, '#c8501a');
      return g;
    };

    if (kind === 'icon' || kind === 'icon-bg' || kind === 'icon-fg') {
      // Full-bleed square; Play/Android apply their own rounded mask.
      if (kind !== 'icon-fg') {
        const bw = 64, bh = 64;
        const low = paintBiome(3, bw, bh, 52, true);   // night biome, smooth sky
        const sky = ctx.createLinearGradient(0, 0, 0, height * 0.8);
        BIOMES[3].sky.forEach((c, i, a) => sky.addColorStop(i / (a.length - 1), c));
        ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
        ctx.drawImage(renderSmooth(low.canvas, width, height, 0.85, 0.6), 0, 0);
        const g = ctx.createRadialGradient(width / 2, height * 0.45, 0, width / 2, height * 0.45, width * 0.55);
        g.addColorStop(0, 'rgba(255,140,60,0.45)'); g.addColorStop(1, 'rgba(255,140,60,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
      }
      if (kind !== 'icon-bg') {
        // capacitor-assets already insets the adaptive foreground into the
        // centre 66% safe zone, so the art can use most of its own canvas.
        const safe = kind === 'icon-fg' ? 0.92 : 0.86;
        const scale = Math.floor((width * safe) / (PIX_DRAGON.w + 2));
        const w = PIX_DRAGON.w * scale, h = (PIX_DRAGON.h + 3) * scale;
        rider(scale, Math.round((width - w) / 2), Math.round((height - h) / 2 + height * 0.02));
        // a chunky rounded "+" badge (maths!) in the corner
        const u = width / 40, s = kind === 'icon-fg' ? 0.06 : 0.1;
        const px = width * s, py = height * s, L = u * 3.2, T = u * 1.1;
        const bar = (x, y, w, h) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, T / 2); };
        ctx.fillStyle = '#0c0714';
        bar(px - u * 0.35, py + L / 2 - T / 2 - u * 0.35, L + u * 0.7, T + u * 0.7); ctx.fill();
        bar(px + L / 2 - T / 2 - u * 0.35, py - u * 0.35, T + u * 0.7, L + u * 0.7); ctx.fill();
        ctx.fillStyle = '#ffd66e';
        bar(px, py + L / 2 - T / 2, L, T); ctx.fill();
        bar(px + L / 2 - T / 2, py, T, L); ctx.fill();
      }
    }

    if (kind === 'feature') {
      const ap = 4;
      const low = paintBiome(0, Math.ceil(width / ap), Math.ceil(height / ap), Math.floor(height / ap * 0.8), true); // volcano
      const sky = ctx.createLinearGradient(0, 0, 0, height * 0.8);
      BIOMES[0].sky.forEach((c, i, a) => sky.addColorStop(i / (a.length - 1), c));
      ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
      const cel = low.extra.celestial;
      if (cel) { const g = ctx.createRadialGradient(cel.x * ap, cel.y * ap, 0, cel.x * ap, cel.y * ap, cel.r * ap); g.addColorStop(0, cel.core); g.addColorStop(1, cel.edge); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cel.x * ap, cel.y * ap, cel.r * ap, 0, Math.PI * 2); ctx.fill(); }
      ctx.drawImage(renderSmooth(low.canvas, width, height, 0.85, 0.6), 0, 0);
      ctx.fillStyle = 'rgba(10,4,20,0.25)'; ctx.fillRect(0, 0, width, height);
      rider(6, 40, 150, 'girl');
      const gob = PIX_ENEMY_ART['Ooze Monarch'];
      drawSmooth(spriteSource(gob.art, 0, gob.palette), 5, width - gob.art.w * 5 - 40, height - gob.art.h * 5 - 22);
      ctx.fillStyle = goldGrad(90, 190);
      pixelText('DRAGONS', 86, width * 0.56, 110, goldGrad(70, 150));
      ctx.save(); ctx.translate(width * 0.56, 185); ctx.rotate(-0.07);
      ctx.fillStyle = '#0c0714'; ctx.fillRect(-52, -30, 104, 60);
      ctx.fillStyle = '#d8321f'; ctx.fillRect(-46, -24, 92, 48);
      pixelText('VS', 40, 0, 2, '#ffffff'); ctx.restore();
      pixelText('MATH', 86, width * 0.56, 262, goldGrad(222, 302));
      pixelText('Solve it. Beat it. Level up!', 30, width * 0.56, 350, '#ffe7cc');
    }

    if (kind === 'splash') {
      ctx.fillStyle = '#140b24'; ctx.fillRect(0, 0, width, height);
      const scale = Math.floor(width * 0.3 / PIX_DRAGON.w);
      rider(scale, Math.round(width / 2 - PIX_DRAGON.w * scale / 2), Math.round(height / 2 - PIX_DRAGON.h * scale / 2 - 60));
      pixelText('DRAGONS VS MATH', Math.round(width * 0.06), width / 2, height / 2 + PIX_DRAGON.h * scale / 2 + 120, goldGrad(height / 2, height / 2 + 400));
    }
  }, { width, height, kind });
  const buf = await page.locator('#art').screenshot({ omitBackground: kind.startsWith('icon') });
  await page.close();
  // Play wants the app icon as a 32-bit PNG (RGBA); Chromium writes opaque
  // images as 24-bit, so force the alpha channel. The feature graphic must
  // stay 24-bit (no alpha).
  if (kind.startsWith('icon')) await sharp(buf).ensureAlpha().png().toFile(out(file));
  else await sharp(buf).removeAlpha().png().toFile(out(file));
}

await drawArt(512, 512, 'icon', 'store/icon-512.png');
await drawArt(1024, 1024, 'icon', 'assets/icon-only.png');
await drawArt(1024, 1024, 'icon-bg', 'assets/icon-background.png');
await drawArt(1024, 1024, 'icon-fg', 'assets/icon-foreground.png');
await drawArt(1024, 500, 'feature', 'store/feature-graphic.png');
await drawArt(2732, 2732, 'splash', 'assets/splash.png');
await drawArt(2732, 2732, 'splash', 'assets/splash-dark.png');

/* ---------- phone screenshots: real gameplay ---------- */
const page = await browser.newPage({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 1080 / 405 });
await page.goto(gameUrl);
await page.evaluate(() => { localStorage.clear(); });
await page.reload();
await page.evaluate(() => document.fonts.ready);
const shot = async (name) => { await page.screenshot({ path: out(`store/screenshots/${name}.png`) }); };
await page.evaluate(() => { selectSave(SAVES.slots[0].id); });
await page.waitForTimeout(300);
await page.evaluate(() => { pickHero('girl'); S.coins = 320; S.xp = 900; S.ownedCosmetics.creature_fire = true; S.equippedCreature = 'creature_fire'; S.ownedUpgrades.dmg1 = S.ownedUpgrades.dmg2 = S.ownedUpgrades.dmg3 = true; saveActiveSlot(); render(); });
await page.waitForTimeout(2600);
await shot('phone-1-title');
await page.evaluate(() => { S.mathBand = 6; startGame(); S.wave = 3; spawnWave(3, 10); newProblem(); render(); });
await page.waitForTimeout(1200);
await page.evaluate(() => { S.problem = { a: 27, op: '+', b: 15, answer: 42, band: 6 }; S.choices = [32, 42, 312, 41]; render(); });
await page.waitForTimeout(400);
await shot('phone-2-battle');
await page.evaluate(() => { handleAnswer(42); window.scrollTo(0, 0); });
await page.waitForTimeout(430);
await shot('phone-3-hit');
await page.waitForTimeout(1600);
await page.evaluate(() => { S.wave = 5; spawnWave(5, 10); render(); });
await page.waitForTimeout(700);
await shot('phone-4-boss');
await page.evaluate(() => { beginBossFight(); S.fireballReady = true; S.fireballCharge = 3; render(); });
await page.waitForTimeout(700);
await page.evaluate(() => { useFireball(); window.scrollTo(0, 0); });
await page.waitForTimeout(540);
await shot('phone-5-fireball');
await page.waitForTimeout(1500);
await page.evaluate(() => { S.shopOpen = true; render(); });
await page.waitForTimeout(300);
await page.evaluate(() => { document.querySelector('.shop-card').scrollTop = 1050; });
await shot('phone-6-shop');
await browser.close();
console.log('Store assets written to store/ and assets/');
