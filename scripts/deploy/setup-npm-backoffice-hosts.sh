#!/usr/bin/env bash
# Crée ou ignore les Proxy Hosts NPM pour les sous-domaines backoffice JobbingTrack.
#
# Usage :
#   NPM_TOKEN='…' bash scripts/deploy/setup-npm-backoffice-hosts.sh
#   NPM_BASE=https://nginx.delhomme.ovh NPM_TOKEN='…' bash scripts/deploy/setup-npm-backoffice-hosts.sh
set -euo pipefail

NPM_BASE="${NPM_BASE:-https://nginx.delhomme.ovh}"
TOKEN="${NPM_TOKEN:-}"

if [ -z "$TOKEN" ]; then
  echo "NPM_TOKEN requis (JWT depuis NPM → localStorage nginx-proxy-manager-tokens)." >&2
  exit 1
fi

python3 <<'PY'
import json, os, urllib.request, urllib.error

BASE = os.environ["NPM_BASE"].rstrip("/") + "/api"
TOKEN = os.environ["NPM_TOKEN"]

def api(method, path, data=None, timeout=180):
    req = urllib.request.Request(
        BASE + path,
        data=None if data is None else json.dumps(data).encode(),
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode()
            return resp.status, json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="replace")[:2000]

st, me = api("GET", "/users/me")
email = (me or {}).get("email") or "admin@jobbingtrack.com"

HOSTS = [
    {
        "domain_names": ["backoffice-preprod.jobbingtrack.com"],
        "forward_host": "jobbingtrack-preprod-frontend",
    },
    {
        "domain_names": ["backoffice.jobbingtrack.com"],
        "forward_host": "jobbingtrack-prod-frontend",
    },
]

st, existing = api("GET", "/nginx/proxy-hosts")
have = set()
for h in existing or []:
    for d in h.get("domain_names") or []:
        have.add(d.lower())

for spec in HOSTS:
    if any(d.lower() in have for d in spec["domain_names"]):
        print("SKIP", spec["domain_names"])
        continue
    payload = {
        "domain_names": spec["domain_names"],
        "forward_scheme": "http",
        "forward_host": spec["forward_host"],
        "forward_port": 3000,
        "certificate_id": "new",
        "ssl_forced": True,
        "http2_support": True,
        "hsts_enabled": False,
        "hsts_subdomains": False,
        "block_exploits": True,
        "caching_enabled": False,
        "allow_websocket_upgrade": True,
        "access_list_id": 0,
        "advanced_config": "",
        "enabled": True,
        "meta": {
            "letsencrypt_agree": True,
            "letsencrypt_email": email,
            "dns_challenge": False,
        },
        "locations": [],
    }
    print("CREATE", spec["domain_names"], "→", spec["forward_host"])
    st, res = api("POST", "/nginx/proxy-hosts", payload)
    if isinstance(res, dict):
        print(" ", st, "id=", res.get("id"), "cert=", res.get("certificate_id"))
    else:
        print(" ", st, res)
PY
