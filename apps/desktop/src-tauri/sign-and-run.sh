#!/bin/sh
# Cargo `runner` for local macOS dev (wired in .cargo/config.toml). `tauri dev`/`cargo run` invoke
# this with the freshly built binary; we re-sign it with a STABLE self-signed identity before exec,
# so the macOS keychain ACL for the WebCrypto master key stays valid across rebuilds (no repeated
# "Always Allow" prompts). If the identity isn't installed (CI, other machines), we skip signing and
# run the binary as-is — so this is safe to commit. Create the identity with ./setup-signing.sh.
IDENTITY="PolarHQ Dev Signing"
BIN="$1"
shift
if security find-identity -v -p codesigning 2>/dev/null | grep -q "$IDENTITY"; then
  codesign --force --sign "$IDENTITY" "$BIN" >/dev/null 2>&1 || true
fi
exec "$BIN" "$@"
