# The dragonsvsmath.com website

`site/` is a one-page static website for the game, plus the privacy policy
(`site/privacy.html`), which gives Google Play the public privacy-policy URL
it requires: **https://dragonsvsmath.com/privacy.html**.

It's plain HTML with no build step and no tracking, and it costs nothing to host.

## 1. Get the domain

Buy `dragonsvsmath.com` from any registrar (about $10–15 a year). Cloudflare
Registrar sells at cost and makes steps 2 and 3 simplest, but Namecheap,
Porkbun, Squarespace Domains and others all work.

## 2. Put the site online (pick one)

**Cloudflare Pages (recommended, free)**
1. Cloudflare dashboard → Workers & Pages → Create → Pages →
   *Upload assets* (or *Connect to Git* and choose this repo).
2. Upload the `site` folder (for Git: build command empty, output directory `site`).
3. Custom domains → add `dragonsvsmath.com` (and `www.dragonsvsmath.com`).
   If the domain is on Cloudflare, DNS is set up for you.

**Netlify (free)**
1. app.netlify.com → Add new site → *Deploy manually* → drag the `site` folder in.
2. Domain management → add `dragonsvsmath.com` and follow the DNS instructions.

**GitHub Pages** also works, but it only publishes from the repo root or
`/docs` (or through a deploy workflow), and needs a public repo on the free
plan, so Cloudflare or Netlify is simpler here. `site/CNAME` is already set
to `dragonsvsmath.com` if you go that way.

HTTPS is automatic on all three.

## 3. The support email

The site and privacy page list **support@dragonsvsmath.com**. Set up free
forwarding to your own inbox (Cloudflare Email Routing, or your registrar's
email forwarding). Then use the same address in the app
(`PRIVACY_CONTACT_EMAIL` in `www/index.html`), `docs/privacy-policy.html`
and the Play Console listing.

## 4. When the game is live on Google Play

Replace the "Coming soon to Google Play" pill in `site/index.html` with the
official "Get it on Google Play" badge linking to the store listing
(https://play.google.com/intl/en_us/badges/ — follow Google's badge guidelines).

## Updating the pictures

After changing the game's art:

```bash
node scripts/generate-store-assets.mjs   # store screenshots + icon
node scripts/build-site-assets.mjs       # site/assets from the game's art
```

Pushes that only change `site/`, `docs/` or Markdown files don't trigger the
Android build.
