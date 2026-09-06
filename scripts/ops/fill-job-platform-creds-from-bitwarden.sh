#!/usr/bin/env bash
# Remplit LINKEDIN_*/INDEED_*/HELLOWORK_* dans .env depuis Bitwarden (session locale).
#
# Prérequis :
#   cd .local/tools && npm install @bitwarden/cli
#   ./node_modules/.bin/bw login
#   export BW_SESSION="$(./node_modules/.bin/bw unlock --raw)"
#
# Usage :
#   bash scripts/ops/fill-job-platform-creds-from-bitwarden.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BW="${ROOT}/.local/tools/node_modules/.bin/bw"
ENV_FILE="${ROOT}/.env"

if [[ ! -x "$BW" ]]; then
  echo "Installez le CLI : (cd .local/tools && npm install @bitwarden/cli)" >&2
  exit 1
fi
if [[ -z "${BW_SESSION:-}" ]]; then
  echo "Définis BW_SESSION d'abord : export BW_SESSION=\"\$($BW unlock --raw)\"" >&2
  exit 1
fi

json="$("$BW" list items --session "$BW_SESSION")"
python3 - "$ENV_FILE" <<'PY' <<<"$json"
import json, re, sys
from pathlib import Path

env_path = Path(sys.argv[1])
items = json.load(sys.stdin)

def pick(*needles):
    for it in items:
        name = (it.get('name') or '').lower()
        uri = ' '.join(
            (u.get('uri') or '') for u in ((it.get('login') or {}).get('uris') or [])
        ).lower()
        blob = f'{name} {uri}'
        if all(n.lower() in blob for n in needles):
            login = it.get('login') or {}
            return (login.get('username') or '').strip(), (login.get('password') or '').strip()
    return '', ''

pairs = {
    'LINKEDIN_EMAIL': None,
    'LINKEDIN_PASSWORD': None,
    'INDEED_EMAIL': None,
    'INDEED_PASSWORD': None,
    'HELLOWORK_EMAIL': None,
    'HELLOWORK_PASSWORD': None,
}
u, p = pick('linkedin')
pairs['LINKEDIN_EMAIL'], pairs['LINKEDIN_PASSWORD'] = u, p
u, p = pick('indeed')
pairs['INDEED_EMAIL'], pairs['INDEED_PASSWORD'] = u, p
u, p = pick('hellowork')
if not u:
    u, p = pick('hello', 'work')
if not u:
    u, p = pick('regionsjob')
pairs['HELLOWORK_EMAIL'], pairs['HELLOWORK_PASSWORD'] = u, p

text = env_path.read_text()
for key, val in pairs.items():
    if not val:
        print(f'{key}: NOT FOUND in Bitwarden')
        continue
    if re.search(rf'^{re.escape(key)}=.*$', text, flags=re.M):
        text = re.sub(rf'^{re.escape(key)}=.*$', f'{key}={val}', text, count=1, flags=re.M)
    else:
        text = text.rstrip() + f'\n{key}={val}\n'
    print(f'{key}: SET (len={len(val)})')
env_path.write_text(text)
print('Updated', env_path)
PY
