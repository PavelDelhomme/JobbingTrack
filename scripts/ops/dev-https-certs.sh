#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${PROJECT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
CERT_DIR="${DEV_HTTPS_CERT_DIR:-$ROOT_DIR/.local/dev-certs}"
CERT_FILE="$CERT_DIR/jobbingtrack-dev.pem"
KEY_FILE="$CERT_DIR/jobbingtrack-dev-key.pem"
CA_DIR="$CERT_DIR/ca"
CA_CERT="$CA_DIR/jobbingtrack-dev-root-ca.pem"
CA_KEY="$CA_DIR/jobbingtrack-dev-root-ca-key.pem"
DOMAINS=(
  "jobbingtrack.localhost"
  "api.jobbingtrack.localhost"
  "localhost"
  "127.0.0.1"
  "::1"
)

mkdir -p "$CERT_DIR" "$CA_DIR"
chmod 700 "$CERT_DIR" "$CA_DIR"

install_nss_ca() {
  local installed=1
  if ! command -v certutil >/dev/null 2>&1; then
    return 1
  fi

  local dbs=()
  dbs+=("$HOME/.pki/nssdb")
  if [ -d "$HOME/.mozilla/firefox" ]; then
    while IFS= read -r profile; do
      dbs+=("$profile")
    done < <(find "$HOME/.mozilla/firefox" -maxdepth 1 -type d \( -name "*.default*" -o -name "*.dev-edition-default*" \) 2>/dev/null)
  fi

  for db in "${dbs[@]}"; do
    mkdir -p "$db"
    if [ ! -f "$db/cert9.db" ]; then
      certutil -N -d "sql:$db" --empty-password >/dev/null 2>&1 || true
    fi
    if certutil -A -d "sql:$db" -t "C,," -n "JobbingTrack Local Dev Root CA" -i "$CA_CERT" >/dev/null 2>&1; then
      echo "CA locale installée dans NSS: $db"
      installed=0
    fi
  done

  return "$installed"
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
      openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \
        -keyout "$CA_KEY" \
        -out "$CA_CERT" \
        -subj "/CN=JobbingTrack Local Dev Root CA" >/dev/null 2>&1
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

if [ -s "$CA_CERT" ] && [ "${DEV_HTTPS_INSTALL_CA:-0}" = "1" ]; then
  installed=1
  if install_nss_ca; then
    installed=0
  fi
  if command -v trust >/dev/null 2>&1; then
    echo "Installation de la CA locale via trust si un magasin écrivable existe."
    if trust anchor --store "$CA_CERT" >/dev/null 2>&1; then
      installed=0
      echo "CA locale installée via trust."
    else
      echo "Magasin trust non écrivable dans cette session; confiance navigateur NSS utilisée si disponible."
    fi
  elif command -v update-ca-certificates >/dev/null 2>&1; then
    echo "Installation système de la CA locale via update-ca-certificates."
    sudo cp "$CA_CERT" /usr/local/share/ca-certificates/jobbingtrack-dev-root-ca.crt
    sudo update-ca-certificates
    installed=0
  else
    echo "Aucun installateur CA automatique trouvé. Installez manuellement: $CA_CERT"
  fi
  if [ "$installed" != "0" ]; then
    echo "CA générée mais non installée automatiquement dans un magasin de confiance."
    exit 2
  fi
fi

echo "Certificat HTTPS dev prêt."
echo "Certificat: $CERT_FILE"
echo "Clé privée: $KEY_FILE"
if [ -s "$CA_CERT" ]; then
  echo "CA locale: $CA_CERT"
fi
