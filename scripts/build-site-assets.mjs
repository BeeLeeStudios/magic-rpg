/*
 * Renders the images for the dragonsvsmath.com website (site/) from the
 * game's own art, so the site always matches the app.
 *
 *   node scripts/generate-store-assets.mjs   # refresh store screenshots first
 *   node scripts/build-site-assets.mjs
 *
 * Outputs to site/assets/: hero-*.png (transparent dragon riders), pet-*.png,
 * shot-*.webp (phone screenshots), icon-*.png, og.png (link preview image).
 */
import { createRequire } from 'node:module';
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = await import(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright/index.mjs'); }
const sharp = require('sharp');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = (p) => path.join(root, 'site', p);
mkdirSync(out('assets'), { recursive: true });
mkdirSync(out('fonts'), { recursive: true });

const launchOpts = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
const browser = await playwright.chromium.launch(launchOpts);
const page = await browser.newPage();
await page.goto(pathToFileURL(path.join(root, 'www', 'index.html')).href);

// Each render returns a PNG data URL of a transparent canvas.
const render = (spec) => page.evaluate((spec) => {
  let c;
  if (spec.kind === 'rider') {
    const pal = ELEMENT_PALETTES[spec.mount];
    const H = hdHeroLook(spec.hero, spec.tier);
    const h = spec.w * HD_DRAGON_FIT.h / HD_DRAGON_FIT.w;
    c = hdRender((ctx) => { drawHDDragon(ctx, pal, 0.25); drawHDRider(ctx, H, 0.25); }, HD_DRAGON_FIT, spec.w, h, 1, spec.w / 230);
  } else {
    const h = spec.w * HD_PET_FIT.h / HD_PET_FIT.w;
    c = hdRender((ctx) => drawHDPet(ctx, spec.pet, 0.2), HD_PET_FIT, spec.w, h, 1, spec.w / 70);
  }
  return c.toDataURL('image/png');
}, spec);
const save = async (dataUrl, file) => {
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  await sharp(buf).png({ compressionLevel: 9 }).toFile(out(`assets/${file}`));
};

await save(await render({ kind: 'rider', hero: 'boy', mount: 'creature_fire', tier: 3, w: 1400 }), 'hero-boy-fire.png');
await save(await render({ kind: 'rider', hero: 'girl', mount: 'creature_water', tier: 4, w: 1000 }), 'hero-girl-water.png');
await save(await render({ kind: 'rider', hero: 'boy', mount: 'creature_storm', tier: 5, w: 1000 }), 'hero-boy-storm.png');
for (const pet of ['pet_owl', 'pet_wolf', 'pet_bear', 'pet_panther', 'pet_griffin', 'pet_dragonwhelp']) {
  await save(await render({ kind: 'pet', pet, w: 280 }), `${pet.replace('pet_', 'pet-')}.png`);
}
await browser.close();

// Phone screenshots -> small WebP for fast pages.
for (const name of ['phone-1-title', 'phone-2-battle', 'phone-3-hit', 'phone-4-boss', 'phone-5-fireball', 'phone-6-shop']) {
  await sharp(path.join(root, 'store/screenshots', `${name}.png`)).resize({ width: 540 }).webp({ quality: 86 }).toFile(out(`assets/${name.replace('phone-', 'shot-')}.webp`));
}
// Icons and the link-preview image.
await sharp(path.join(root, 'store/icon-512.png')).resize(180).png().toFile(out('assets/icon-180.png'));
await sharp(path.join(root, 'store/icon-512.png')).resize(32).png().toFile(out('assets/icon-32.png'));
copyFileSync(path.join(root, 'store/icon-512.png'), out('assets/icon-512.png'));
copyFileSync(path.join(root, 'store/feature-graphic.png'), out('assets/og.png'));
copyFileSync(path.join(root, 'www/fonts/nunito.woff2'), out('fonts/nunito.woff2'));
copyFileSync(path.join(root, 'www/fonts/OFL-nunito.txt'), out('fonts/OFL-nunito.txt'));
console.log('Site assets written to site/assets/');
