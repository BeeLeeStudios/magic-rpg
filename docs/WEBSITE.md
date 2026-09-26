# The Dragons vs Math website

`site/` is a one-page static website for the game, plus the privacy policy
(`site/privacy.html`) that Google Play asks for. It's plain HTML with no
build step and no tracking. It's hosted on your own VPS, for free, with
free HTTPS.

## One-time setup on the VPS (about 2 minutes)

1. Copy `deploy/setup-vps.sh` to the VPS (or paste it into a new file there),
   then run:

   ```bash
   sudo bash setup-vps.sh
   ```

   With no domain, the site gets a free address based on the server's IP,
   for example `https://203-0-113-7.sslip.io`, with a real HTTPS certificate.
   If you buy a domain later, point it at the VPS and run
   `sudo bash setup-vps.sh yourdomain.com`.

2. The script ends by printing five values. In GitHub, open the repo →
   **Settings → Secrets and variables → Actions → New repository secret**
   and add each one: `VPS_HOST`, `VPS_PORT`, `VPS_USER`, `VPS_KNOWN_HOSTS`,
   `VPS_SSH_KEY`.

3. In GitHub → **Actions → Deploy website → Run workflow**. The site is
   uploaded and live a few seconds later.

After that, any change to `site/` that reaches GitHub is uploaded
automatically. Website-only changes don't rebuild the Android app.

The script installs Caddy (web server with automatic HTTPS), creates a
`sitedeploy` user that can only upload files into `/var/www/dragonsvsmath`,
and opens ports 80/443 if a firewall is on. It stops and tells you if
something else (nginx, Apache) already uses those ports. Running it again is
safe.

## Google Play

- **Privacy policy URL** (Play Console → App content → Privacy policy):
  `https://<your site address>/privacy.html`
- **Website** (store listing → contact details): `https://<your site address>/`

## Launch day

In `site/index.html`, change `<body data-play="soon">` to
`<body data-play="live">`. The "Coming soon" labels disappear and the
"Get it on Google Play" buttons link to
https://play.google.com/store/apps/details?id=com.beeleestudios.dragonsvsmath

## Support email

The site lists `support@dragonsvsmath.com` as the contact. Change it (footer
of `site/index.html`, `site/privacy.html`, `docs/privacy-policy.html`,
`PRIVACY_CONTACT_EMAIL` in `www/index.html`) to an address you actually
read, such as a free Gmail made for the game.

## Updating the pictures

After changing the game's art:

```bash
node scripts/generate-store-assets.mjs   # store screenshots + icon
node scripts/build-site-assets.mjs       # site/assets from the game's art
```
