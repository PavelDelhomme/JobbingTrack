#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${PROJECT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
CERT_DIR="${DEV_HTTPS_CERT_DIR:-$ROOT_DIR/.local/dev-certs}"
CERT_FILE="$CERT_DIR/jobbingtrack-dev.pem"
KEY_FILE="$CERT_DIR/jobbingtrack-dev-key.pem"
CA_DIR="$CERT_DIR/ca"
CA_CERT="$CA_DIR/jobbingtrack-dev-root-ca.pem"
CA_KEY="$CA_DIR/jobbingtrack-dev-root-ca-key.pem"
FULLCHAIN_FILE="$CERT_DIR/jobbingtrack-dev-fullchain.pem"
DOMAINS=(
  "jobbingtrack.localhost"
  "api.jobbingtrack.localhost"
  "localhost"
  "127.0.0.1"
  "::1"
)

mkdir -p "$CERT_DIR" "$CA_DIR"
chmod 700 "$CERT_DIR" "$CA_DIR"

# Répertoires NSS (sql:…) où certutil doit enregistrer la CA pour Chrome/Chromium/Brave/etc.
# Chrome ne se contente pas toujours du seul magasin système p11-kit : chaque profil peut avoir cert9.db.
collect_nss_database_dirs() {
  local seen_file
  seen_file="$(mktemp)"
  trap 'rm -f "$seen_file"' RETURN

  mark_seen() {
    grep -Fxq "$1" "$seen_file" 2>/dev/null && return 1
    printf '%s\n' "$1" >>"$seen_file"
    return 0
  }

  emit_dir() {
    local d="$1"
    [ -n "$d" ] || return 0
    d="${d%/}"
    [ -d "$d" ] || return 0
    mark_seen "$d" || return 0
    printf '%s\n' "$d"
  }

  emit_dir "$HOME/.pki/nssdb"

  if [ -d "$HOME/.mozilla/firefox" ]; then
    local p
    while IFS= read -r p; do
      emit_dir "$p"
    done < <(find "$HOME/.mozilla/firefox" -maxdepth 1 -type d \( -name "*.default*" -o -name "*.dev-edition-default*" \) 2>/dev/null)
  fi

  # Navigateurs Chromium (profils avec cert9.db)
  local chrome_root
  for chrome_root in \
    "$HOME/.config/google-chrome" \
    "$HOME/.config/chromium" \
    "$HOME/.config/BraveSoftware/Brave-Browser" \
    "$HOME/.config/microsoft-edge" \
    "$HOME/.config/vivaldi" \
    "$HOME/snap/chromium/common" \
    "$HOME/snap/chromium/current/.config" \
    "$HOME/snap/google-chrome/common"; do
    [ -d "$chrome_root" ] || continue
    local f
    while IFS= read -r -d '' f; do
      emit_dir "$(dirname "$f")"
    done < <(find "$chrome_root" -type f -name cert9.db -print0 2>/dev/null)
  done

  # Flatpak : tout cert9.db sous ~/.var/app (Chrome, Chromium, Brave, …)
  if [ -d "$HOME/.var/app" ]; then
    local f
    while IFS= read -r -d '' f; do
      case "$f" in
        *Chrome*|*Chromium*|*Brave*|*Edge*|*Vivaldi*) emit_dir "$(dirname "$f")" ;;
      esac
    done < <(find "$HOME/.var/app" -type f -name cert9.db -print0 2>/dev/null)
  fi
}

install_nss_ca() {
  local installed=1
  if ! command -v certutil >/dev/null 2>&1; then
    return 1
  fi

  local db
  while IFS= read -r db; do
    [ -n "$db" ] || continue
    mkdir -p "$db"
    if [ ! -f "$db/cert9.db" ]; then
      certutil -N -d "sql:$db" --empty-password >/dev/null 2>&1 || true
    fi
    certutil -D -d "sql:$db" -n "JobbingTrack Local Dev Root CA" >/dev/null 2>&1 || true
    # CT,C,C : CA de confiance pour serveur TLS (Chromium / NSS)
    if certutil -A -d "sql:$db" -t "CT,C,C" -n "JobbingTrack Local Dev Root CA" -i "$CA_CERT" >/dev/null 2>&1; then
      echo "CA locale installée dans NSS: $db"
      installed=0
    fi
  done < <(collect_nss_database_dirs)

  return "$installed"
}

# Chaîne TLS servie par Nginx : certificat feuille + CA locale quand c'est notre OpenSSL
# (certificat mkcert → vérification échoue avec notre CA fichier : on copie seulement la feuille).
write_fullchain_pem() {
  [ -s "$CERT_FILE" ] || return 0
  if [ -s "$CA_CERT" ] && openssl verify -CAfile "$CA_CERT" "$CERT_FILE" >/dev/null 2>&1; then
    cat "$CERT_FILE" "$CA_CERT" > "$FULLCHAIN_FILE"
  else
    cp "$CERT_FILE" "$FULLCHAIN_FILE"
  fi
  chmod 644 "$FULLCHAIN_FILE" 2>/dev/null || true
}

needs_regen=0
if [ "${FORCE:-0}" = "1" ] || [ ! -s "$CERT_FILE" ] || [ ! -s "$KEY_FILE" ]; then
  needs_regen=1
elif ! openssl x509 -checkend "$((30 * 24 * 3600))" -noout -in "$CERT_FILE" >/dev/null 2>&1; then
  needs_regen=1
fi

if [ "$needs_regen" = "0" ]; then
  echo "Certificat HTTPS dev déjà présent et valide: $CERT_FILE"
else
  if command -v mkcert >/dev/null 2>&1; then
    echo "Génération certificat HTTPS dev avec mkcert (CA locale installée par mkcert si nécessaire)."
    mkcert -install
    mkcert -cert-file "$CERT_FILE" -key-file "$KEY_FILE" "${DOMAINS[@]}"
  else
    echo "mkcert non installé: génération OpenSSL avec CA locale JobbingTrack."
    if [ ! -s "$CA_CERT" ] || [ ! -s "$CA_KEY" ] || [ "${FORCE:-0}" = "1" ]; then
      CA_OPENSSL_CONF="$CA_DIR/openssl-ca.cnf"
      cat > "$CA_OPENSSL_CONF" <<'CONF'
[req]
distinguished_name=req_distinguished_name
x509_extensions=v3_ca
prompt=no

[req_distinguished_name]
CN=JobbingTrack Local Dev Root CA

[v3_ca]
basicConstraints=critical,CA:true,pathlen:0
keyUsage=critical,keyCertSign,cRLSign
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid:always,issuer
CONF
      openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \
        -keyout "$CA_KEY" \
        -out "$CA_CERT" \
        -config "$CA_OPENSSL_CONF" >/dev/null 2>&1
    fi

    OPENSSL_CONF="$CERT_DIR/openssl-san.cnf"
    cat > "$OPENSSL_CONF" <<'CONF'
[req]
distinguished_name=req_distinguished_name
req_extensions=v3_req
prompt=no

[req_distinguished_name]
CN=jobbingtrack.localhost

[v3_req]
keyUsage=keyEncipherment,digitalSignature
extendedKeyUsage=serverAuth
subjectAltName=@alt_names

[alt_names]
DNS.1=jobbingtrack.localhost
DNS.2=api.jobbingtrack.localhost
DNS.3=localhost
IP.1=127.0.0.1
IP.2=::1
CONF

    CSR_FILE="$CERT_DIR/jobbingtrack-dev.csr"
    openssl req -new -newkey rsa:2048 -nodes \
      -keyout "$KEY_FILE" \
      -out "$CSR_FILE" \
      -config "$OPENSSL_CONF" >/dev/null 2>&1
    openssl x509 -req -in "$CSR_FILE" \
      -CA "$CA_CERT" \
      -CAkey "$CA_KEY" \
      -CAcreateserial \
      -out "$CERT_FILE" \
      -days 825 \
      -sha256 \
      -extensions v3_req \
      -extfile "$OPENSSL_CONF" >/dev/null 2>&1
  fi
  chmod 600 "$KEY_FILE" "$CA_KEY" 2>/dev/null || true
fi

write_fullchain_pem

if [ -s "$CA_CERT" ] && [ "${DEV_HTTPS_INSTALL_CA:-0}" = "1" ]; then
  # Chrome/Chromium sous Linux s'appuient sur le magasin système (p11-kit / ca-certificates),
  # pas sur NSS seul. Il faut en général : sudo trust anchor --store <pem>   (Arch, Fedora, …)
  system_ca_ok=1
  nss_ca_ok=1

  if command -v trust >/dev/null 2>&1; then
    echo "Installation de la CA dans le magasin système (trust / p11-kit)…"
    if sudo -n trust anchor --store "$CA_CERT" >/dev/null 2>&1; then
      echo "CA installée via trust (sudo sans mot de passe)."
      system_ca_ok=0
      # Régénère les bundles compat (/etc/ssl/certs, etc.) — certains Chromium lisent encore ce chemin.
      if sudo -n trust extract-compat >/dev/null 2>&1; then
        echo "Caches compat SSL régénérés (trust extract-compat)."
      fi
    elif trust anchor --store "$CA_CERT" >/dev/null 2>&1; then
      echo "CA installée via trust (emplacement utilisateur)."
      system_ca_ok=0
    else
      echo "trust: échec sans privilèges root (normal). Pour Chrome/Chromium, exécutez une fois :"
      echo "  sudo trust anchor --store $(printf '%q' "$CA_CERT")"
    fi
  elif command -v update-ca-certificates >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
    echo "Installation système de la CA via update-ca-certificates (Debian/Ubuntu)…"
    if sudo -n cp "$CA_CERT" /usr/local/share/ca-certificates/jobbingtrack-dev-root-ca.crt >/dev/null 2>&1 \
      && sudo -n update-ca-certificates >/dev/null 2>&1; then
      echo "CA installée dans /usr/local/share/ca-certificates/."
      system_ca_ok=0
    else
      echo "Copiez la CA puis mettez à jour les certificats (sudo requis) :"
      echo "  sudo cp $(printf '%q' "$CA_CERT") /usr/local/share/ca-certificates/jobbingtrack-dev-root-ca.crt"
      echo "  sudo update-ca-certificates"
    fi
  else
    echo "Aucune commande trust / update-ca-certificates trouvée. Import manuel : $CA_CERT"
  fi

  if install_nss_ca; then
    nss_ca_ok=0
  fi

  if [ "$system_ca_ok" != "0" ] && [ "$nss_ca_ok" != "0" ]; then
    echo "CA générée mais non installée dans un magasin de confiance."
    exit 2
  fi

  if [ "$system_ca_ok" != "0" ] && [ "$nss_ca_ok" = "0" ]; then
    echo ""
    echo "ℹ️  NSS seul : Firefox est souvent OK. Chrome/Chromium exigent en général la commande"
    echo "   sudo trust anchor --store … (voir ci-dessus) ou l’import manuel du PEM dans les"
    echo "   autorités du navigateur."
    echo ""
  fi
fi

echo "Certificat HTTPS dev prêt."
echo "Certificat: $CERT_FILE"
echo "Chaîne Nginx (fullchain): $FULLCHAIN_FILE"
echo "Clé privée: $KEY_FILE"
if [ -s "$CA_CERT" ]; then
  echo "CA locale: $CA_CERT"
fi
echo "Redémarrez le proxy après changement de certificats : make dev-https-up (ou make up-full)."
