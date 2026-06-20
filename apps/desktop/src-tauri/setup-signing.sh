#!/bin/bash
# One-time: create a stable self-signed CODE-SIGNING identity in your login keychain so dev builds of
# the desktop app sign consistently. This makes the macOS WebCrypto "Always Allow" stick across
# rebuilds (the keychain ACL trusts the signing identity, not the per-build ad-hoc signature).
#
# Run once:  bash apps/desktop/src-tauri/setup-signing.sh
# Safe to re-run (skips if the identity already exists). Creates one local cert; removes nothing.
set -e

IDENTITY="PolarHQ Dev Signing"
KEYCHAIN="$HOME/Library/Keychains/login.keychain-db"

if security find-identity -v -p codesigning 2>/dev/null | grep -q "$IDENTITY"; then
  echo "✓ '$IDENTITY' already exists — nothing to do."
  exit 0
fi

DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT

cat > "$DIR/req.cnf" <<EOF
[req]
distinguished_name = dn
x509_extensions = v3
prompt = no
[dn]
CN = $IDENTITY
[v3]
basicConstraints = critical, CA:false
keyUsage = critical, digitalSignature
extendedKeyUsage = critical, codeSigning
EOF

echo "→ Generating a self-signed code-signing certificate…"
openssl req -x509 -newkey rsa:2048 -keyout "$DIR/key.pem" -out "$DIR/cert.pem" \
  -days 3650 -nodes -config "$DIR/req.cnf" >/dev/null 2>&1
openssl pkcs12 -export -inkey "$DIR/key.pem" -in "$DIR/cert.pem" \
  -out "$DIR/cert.p12" -passout pass:polarhq -name "$IDENTITY" >/dev/null 2>&1

echo "→ Importing into your login keychain…"
security import "$DIR/cert.p12" -k "$KEYCHAIN" -P polarhq -T /usr/bin/codesign

echo ""
echo "✓ Done — '$IDENTITY' installed."
echo "  Next: relaunch the app. On the first launch codesign may ask to use the key — click"
echo "  'Always Allow'. Then click 'Always Allow' once on the WebCrypto prompt. Both will now stick."
