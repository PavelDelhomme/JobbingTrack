# shellcheck shell=bash
# À sourcer après avoir défini REPO_ROOT (racine du monorepo).
# Remplit jt_dev_bypass_curl_args pour les appels curl (WAF / intrusion en dev).
# Voir aussi : scripts/env/dev-test-bypass-fetch.cjs (Node) et config/dev-test-bypass-format.cjs.

_jt_dev_bypass_token_valid() {
  local v="$1"
  [[ ${#v} -ge 43 ]] || return 1
  [[ "$v" =~ ^jtbypass1-[A-Za-z0-9_-]{32,192}$ ]] || return 1
  return 0
}

_jt_dev_bypass_token_from_env_files() {
  local f line v
  for f in "${REPO_ROOT}/.env" "${REPO_ROOT}/frontend/.env"; do
    [[ -f "$f" ]] || continue
    line=$(grep -E '^DEV_TEST_BYPASS_TOKEN=' "$f" 2>/dev/null | tail -1) || true
    [[ -z "$line" ]] && continue
    v="${line#DEV_TEST_BYPASS_TOKEN=}"
    v="${v%$'\r'}"
    v="${v#\"}"
    v="${v%\"}"
    v="${v#\'}"
    v="${v%\'}"
    if _jt_dev_bypass_token_valid "$v"; then
      printf '%s' "$v"
      return 0
    fi
  done
  return 1
}

jt_refresh_dev_bypass_curl_args() {
  jt_dev_bypass_curl_args=()
  local t="${DEV_TEST_BYPASS_TOKEN:-}"
  if ! _jt_dev_bypass_token_valid "$t"; then
    t="$(_jt_dev_bypass_token_from_env_files || true)"
  fi
  if _jt_dev_bypass_token_valid "$t"; then
    jt_dev_bypass_curl_args=(-H "X-JobbingTrack-Dev-Test-Token: $t")
  fi
}
