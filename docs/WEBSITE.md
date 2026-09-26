# The Dragons vs Math website

`site/` is a one-page static website for the game, plus the privacy policy
(`site/privacy.html`) that Google Play asks for. It's plain HTML with no
build step and no tracking.

It's hosted free on **Netlify** at **https://dragonsvsmath.netlify.app**.
`netlify.toml` tells Netlify to publish the `site/` folder, and Netlify
redeploys automatically whenever `site/` changes on GitHub.

## One-time setup (about 3 minutes, works on a phone)

1. Go to https://app.netlify.com/signup and choose **Sign up with GitHub**.
2. **Add new project → Import an existing project → GitHub**, and allow
   Netlify to see the `magic-rpg` repository.
3. Pick **magic-rpg**. For **Branch to deploy**, choose the branch that has
   the website (currently `claude/dragons-vs-math-graphics-2aie5q`; use
   `main` once it's merged). Leave everything else as it is; `netlify.toml`
   fills it in.
4. Tap **Deploy**. When it finishes, open **Project configuration → Change
   project name** and type `dragonsvsmath`.

The site is then at https://dragonsvsmath.netlify.app with free HTTPS.

## Google Play

- **Privacy policy URL** (Play Console → App content → Privacy policy):
  https://dragonsvsmath.netlify.app/privacy.html
- **Website** (store listing → contact details): https://dragonsvsmath.netlify.app

## Launch day

In `site/index.html`, change `<body data-play="soon">` to
`<body data-play="live">`. The "Coming soon" labels disappear and the
"Get it on Google Play" buttons link to
https://play.google.com/store/apps/details?id=com.beeleestudios.dragonsvsmath

## A custom address later (optional)

If you buy `dragonsvsmath.com`, add it in Netlify under **Domain management**
and follow its DNS instructions; HTTPS stays free.

## Support email

The contact address is currently a temporary personal Gmail. To change it,
update the footer of `site/index.html`, `site/privacy.html`,
`docs/privacy-policy.html` and `PRIVACY_CONTACT_EMAIL` in `www/index.html`.

## Updating the pictures

After changing the game's art:

```bash
node scripts/generate-store-assets.mjs   # store screenshots + icon
node scripts/build-site-assets.mjs       # site/assets from the game's art
```
