#!/usr/bin/env bash
# =====================================================================
# Dragons vs Math website -- one-time setup on your own VPS.
#
#   sudo bash setup-vps.sh                 # free address: <your-ip>.sslip.io
#   sudo bash setup-vps.sh dragonsvsmath.com   # later, if you buy a domain
#
# What it does (Debian/Ubuntu, or Fedora/RHEL-family):
#   1. Installs Caddy, a small web server that gets free HTTPS certificates
#      automatically (Let's Encrypt).
#   2. Creates a locked-down "sitedeploy" user that owns /var/www/dragonsvsmath
#      and nothing else, plus an SSH key GitHub Actions uses to upload the site.
#   3. Serves /var/www/dragonsvsmath at your address over HTTPS.
#   4. Opens ports 80 and 443 if a firewall (ufw/firewalld) is on.
#   5. Prints the values to paste into GitHub (Settings > Secrets > Actions).
# Safe to run again; it won't duplicate anything.
# =====================================================================
set -euo pipefail

SITE_DIR=/var/www/dragonsvsmath
DEPLOY_USER=sitedeploy
KEY=/root/dvm-deploy-key

[ "$(id -u)" = 0 ] || { echo "Please run with sudo:  sudo bash $0"; exit 1; }

IP=$(curl -4 -fsS --max-time 10 https://api.ipify.org || hostname -I | awk '{print $1}')
DOMAIN="${1:-${IP//./-}.sslip.io}"
echo "==> Website address will be: https://$DOMAIN"

# --- anything else already using the web ports? ----------------------
BUSY=$(ss -ltnpH '( sport = :80 or sport = :443 )' 2>/dev/null | grep -v caddy || true)
if [ -n "$BUSY" ]; then
  echo
  echo "!! Another program is already using port 80 or 443:"
  echo "$BUSY"
  echo "!! Stop it, or tell Claude what it is (nginx, apache...) to get a config for it instead."
  exit 1
fi

# --- 1. Caddy + rsync ---------------------------------------------------
if ! command -v caddy >/dev/null 2>&1; then
  echo "==> Installing Caddy"
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -y
    apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg rsync
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -y
    apt-get install -y caddy
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y 'dnf-command(copr)' rsync
    dnf copr enable -y @caddy/caddy
    dnf install -y caddy
  else
    echo "Unsupported system: needs apt (Debian/Ubuntu) or dnf (Fedora/RHEL)."; exit 1
  fi
fi
command -v rsync >/dev/null 2>&1 || { command -v apt-get >/dev/null && apt-get install -y rsync || dnf install -y rsync; }

# --- 2. deploy user, folder and key -------------------------------------
id "$DEPLOY_USER" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash "$DEPLOY_USER"
mkdir -p "$SITE_DIR"
if [ ! -f "$SITE_DIR/index.html" ]; then
  echo '<!doctype html><meta charset="utf-8"><title>Dragons vs Math</title><p style="font:20px sans-serif;text-align:center;margin-top:20vh">Dragons vs Math is on its way! 🐉</p>' > "$SITE_DIR/index.html"
fi
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$SITE_DIR"
chmod 755 "$SITE_DIR"

[ -f "$KEY" ] || ssh-keygen -q -t ed25519 -N "" -C "dragonsvsmath-github-deploy" -f "$KEY"
HOME_DIR=$(getent passwd "$DEPLOY_USER" | cut -d: -f6)
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$HOME_DIR/.ssh"
# "restrict": no shell tricks, no port forwarding -- just file uploads.
echo "restrict $(cat "$KEY.pub")" > "$HOME_DIR/.ssh/authorized_keys"
chown "$DEPLOY_USER:$DEPLOY_USER" "$HOME_DIR/.ssh/authorized_keys"
chmod 600 "$HOME_DIR/.ssh/authorized_keys"

# --- 3. Caddy site ------------------------------------------------------
BLOCK_START="# >>> dragonsvsmath >>>"
BLOCK_END="# <<< dragonsvsmath <<<"
CADDYFILE=/etc/caddy/Caddyfile
touch "$CADDYFILE"
cp "$CADDYFILE" "$CADDYFILE.bak.$(date +%s)"
# Drop the stock welcome page (the default file only serves /usr/share/caddy)
# and any earlier copy of our block, then add ours.
if grep -q "/usr/share/caddy" "$CADDYFILE" && [ "$(grep -cvE '^\s*(#|$)' "$CADDYFILE")" -le 6 ]; then
  : > "$CADDYFILE"
fi
awk -v s="$BLOCK_START" -v e="$BLOCK_END" '$0==s{skip=1;next} $0==e{skip=0;next} !skip' "$CADDYFILE" > "$CADDYFILE.tmp" && mv "$CADDYFILE.tmp" "$CADDYFILE"
cat >> "$CADDYFILE" <<CADDY
$BLOCK_START
$DOMAIN {
	root * $SITE_DIR
	file_server
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "no-referrer"
	}
	@static path /assets/* /fonts/*
	header @static Cache-Control "public, max-age=604800"
}
$BLOCK_END
CADDY
caddy validate --config "$CADDYFILE" --adapter caddyfile >/dev/null
systemctl enable --now caddy
systemctl reload caddy || systemctl restart caddy

# --- 4. firewall ------------------------------------------------------
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
fi
if command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --state >/dev/null 2>&1; then
  firewall-cmd --permanent --add-service=http --add-service=https >/dev/null; firewall-cmd --reload >/dev/null
fi

# --- 5. values for GitHub ------------------------------------------------
SSH_PORT=$(sshd -T 2>/dev/null | awk '/^port /{print $2; exit}'); SSH_PORT=${SSH_PORT:-22}
HOSTKEY=$(awk '{print $1" "$2}' /etc/ssh/ssh_host_ed25519_key.pub 2>/dev/null || true)
if [ "$SSH_PORT" = 22 ]; then KNOWN="$IP $HOSTKEY"; else KNOWN="[$IP]:$SSH_PORT $HOSTKEY"; fi
cat <<DONE

======================================================================
 Done! Your site: https://$DOMAIN
 (the first visit can take ~30 seconds while the HTTPS certificate is issued)

 Privacy policy URL for Google Play:  https://$DOMAIN/privacy.html

 Now add these in GitHub: repo > Settings > Secrets and variables >
 Actions > New repository secret (one secret each):

   VPS_HOST   = $IP
   VPS_PORT   = $SSH_PORT
   VPS_USER   = $DEPLOY_USER
   VPS_KNOWN_HOSTS = (the line below)
$KNOWN
   VPS_SSH_KEY = (everything between the two lines below, including
                  the BEGIN/END lines)
----------------------------------------------------------------------
$(cat "$KEY")
----------------------------------------------------------------------
 Keep that key private. It can only upload to $SITE_DIR.
======================================================================
DONE
