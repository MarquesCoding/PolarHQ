# Security & storage transparency

This document explains, in concrete terms, **how PolarHQ encrypts your data, what the server can and
cannot see, and where the trade‑offs are.** It is written to be honest rather than reassuring: the
limitations section is as important as the rest.

It reflects the actual implementation. Where a claim maps to code, the source file is cited so you can
verify it yourself — start at [`packages/core/src/crypto.ts`](packages/core/src/crypto.ts) and
[`packages/core/src/e2e.ts`](packages/core/src/e2e.ts).

> **TL;DR** — Your files, photos, filenames, photo EXIF/GPS, thumbnails, and search index are
> end‑to‑end encrypted with keys derived from your password. The server only ever stores ciphertext
> and never receives your password or private key. It *does* see file sizes, MIME types, and
> timestamps, because those drive quotas and the UI. See [Limitations](#what-the-server-can-still-see).

---

## 1. The model in one paragraph

PolarHQ uses a **single‑password, Proton‑style** scheme. When you sign in, your password is run
through a slow key‑derivation function **in your browser** to produce a key‑encryption‑key (KEK). That
KEK unwraps your personal **key pair**. Every file gets its own random **content key**; that content
key is sealed to your public key and stored alongside the (encrypted) file. To open a file, your
browser fetches the sealed content key, opens it with your private key, and decrypts the bytes
locally. **The server never has the password, the KEK, the private key, or any content key in a form
it can read.** It stores ciphertext and sealed key blobs, nothing else.

The cryptography is [libsodium](https://doc.libsodium.org/) via `libsodium-wrappers-sumo` — no
hand‑rolled primitives.

---

## 2. Your account keys

When you first set up encryption ([`e2e.ts` `setupKeys`](packages/core/src/e2e.ts)):

1. A random **16‑byte salt** is generated (`newSalt`, `crypto_pwhash_SALTBYTES`).
2. Your password + salt are stretched into a **32‑byte KEK** with **Argon2id**
   (`crypto_pwhash`, `crypto_pwhash_ALG_ARGON2ID13`). The default work factor is
   `OPSLIMIT_MODERATE` with **128 MiB** of memory — see `defaultKdfParams()` in
   [`crypto.ts`](packages/core/src/crypto.ts). These parameters are **stored with your key
   bundle and versioned**, so the cost can be raised in future without locking out existing accounts.
3. A **Curve25519 key pair** is generated (`crypto_box_keypair`).
4. Your **private key is wrapped** with the KEK using `crypto_secretbox_easy`
   (XSalsa20‑Poly1305). The stored blob is `nonce ‖ ciphertext`.
5. A separate random **recovery key** also wraps the private key, so you can regain access with a
   one‑time recovery code if you forget your password.

What the server receives and stores ([`docs.ts` `user_keys`](packages/db/src/schema/docs.ts)):

| Stored field | Contents | Readable by server? |
|---|---|---|
| `publicKey` | Your Curve25519 public key | Yes (it's public) |
| `wrappedPrivateKey` | `secretbox(privateKey, KEK)` | **No** — needs your password |
| `kdfSalt` | Random per‑account salt | Yes (salts are not secret) |
| `kdfParams` | `{ops, mem}` for Argon2id | Yes |
| `recoveryWrapped` | `secretbox(privateKey, recoveryKey)` | **No** — needs your recovery code |
| `wrappedMetaKey` | Your account metadata key, sealed to your public key | **No** |

> The password is **never transmitted**. Derivation happens entirely client‑side; only *wrapped*
> material leaves the browser. (Your login itself is handled separately by the auth layer, which
> stores a standard password hash for authentication — that is independent of the encryption keys
> above and cannot decrypt anything.)

---

## 3. How a file is encrypted — a concrete walk‑through

Say you upload `taxes-2025.pdf` (2 MB) to Drive
([`driveE2e.ts`](packages/core/src/driveE2e.ts)):

1. Your browser generates a **random 32‑byte content key** (`crypto_secretbox_keygen`).
2. The PDF bytes are encrypted with that key: `crypto_secretbox_easy` → `nonce(24) ‖ ciphertext ‖
   tag(16)`. This blob is what gets uploaded.
3. The **filename** `taxes-2025.pdf` is encrypted separately with your **account metadata key**
   (also a secretbox blob) and stored as `encryptedName`. The plaintext `name` column holds only a
   placeholder.
4. A **thumbnail/preview** (if applicable) is generated locally and encrypted with the *same content
   key*, then uploaded as a separate object.
5. The content key is **sealed to your own public key** (`crypto_box_seal`) and stored as a wrapped
   key entry ([`docs.ts` `doc_keys`](packages/db/src/schema/docs.ts)).

The server now holds: an opaque ciphertext blob, an opaque encrypted thumbnail, an encrypted
filename, and a sealed key it cannot open. To download, your browser fetches the sealed content key,
opens it with your private key, fetches the ciphertext, and decrypts it locally.

### Large files stream

Files at or above **64 MiB** (`CHUNKED_UPLOAD_THRESHOLD`) don't use a single secretbox — they use
**`crypto_secretstream_xchacha20poly1305`** (XChaCha20‑Poly1305) so neither the plaintext nor the
ciphertext is ever fully held in memory ([`crypto.ts` `secretstreamInit`](packages/core/src/crypto.ts)).
The stored blob is `MAGIC(4) ‖ header(24) ‖ chunk₀ ‖ chunk₁ ‖ …`, each chunk encrypting exactly
**8 MiB** of plaintext (`STREAM_CHUNK_SIZE`) with its own AEAD tag, the last marked `FINAL`. Uploads
are chunked and resumable ([`chunkedUpload.ts`](packages/core/src/chunkedUpload.ts)); downloads
stream straight to disk ([`streamDownload.ts`](packages/core/src/streamDownload.ts)). The 4‑byte
magic lets the reader tell a streamed blob from a legacy secretbox one.

Photos and videos follow the same pattern, plus encrypted EXIF/GPS — see
[`photosE2e.ts`](packages/core/src/photosE2e.ts).

---

## 4. What's encrypted, and what isn't

This is the honest table. "Account metadata key" = a per‑account key sealed to your public key;
"content key" = the per‑file random key.

| Data | Encrypted? | Key | Why |
|---|---|---|---|
| File & photo **contents** | ✅ | per‑file content key | the whole point |
| **Filenames** | ✅ | account metadata key | names leak a lot |
| Photo **EXIF** (camera, lens, ISO…) | ✅ | account metadata key | metadata is sensitive |
| Photo **GPS location** | ✅ | account metadata key | location is sensitive |
| **Thumbnails / previews** | ✅ | content key (same as original) | a thumbnail is the image |
| **Search index** (CLIP embeddings) | ✅ | account metadata key | semantic search runs **client‑side** |
| Shared‑document names | ✅ | document content key | so collaborators (only) can read them |
| Private key | ✅ | password‑derived KEK | — |
| **File size** | ❌ | — | quota enforcement, download progress |
| **MIME type** | ❌ | — | content‑type on download, icons |
| **Timestamps** (created/updated/taken) | ❌ | — | sorting, timelines |
| Image **dimensions**, video **duration** | ❌ | — | grid layout without decrypting |
| **Folder structure** (which nodes exist, nesting) | ❌ | — | server organizes the tree (names are encrypted) |

Search is intentionally client‑side: filename search filters over decrypted names in your browser, and
semantic photo search runs the CLIP model and ranks **encrypted** embeddings locally. The server never
sees a query or a raw embedding. The cost is that there is **no server‑side full‑text search** — that
would be incompatible with end‑to‑end encryption.

---

## 5. Sharing & collaboration

When you share a document ([`e2e.ts`](packages/core/src/e2e.ts),
[`keyVerification.ts`](packages/core/src/keyVerification.ts)):

1. The recipient's **public key** is fetched from the server.
2. It's checked against a **trust‑on‑first‑use (TOFU) pin** — a short fingerprint
   (`crypto_generichash`, formatted like `A1B2‑C3D4`) you can compare out of band. If a contact's key
   changes, sharing is blocked until you re‑verify, which surfaces a possible server‑side key swap.
3. The document's content key is **sealed to the recipient's public key** and stored as their wrapped
   key entry. Only they can open it.

**Revoking** access rotates the content key (`rekeyDoc`): a fresh key is generated, content is
re‑encrypted, the removed collaborator's wrapped key is deleted, and a new key is sealed to the
remaining members. Note this is not forward secrecy for already‑downloaded data (see limitations).

---

## 6. Staying signed in (client key cache)

Re‑deriving Argon2id on every page load would be slow and would mean re‑typing your password
constantly. After the first unlock, your key bundle is cached in the browser's **IndexedDB**,
encrypted with **AES‑GCM** under a random per‑device wrap key
([`secureStore.ts`](packages/core/src/secureStore.ts)).

The wrap key is stored as **raw bytes**, deliberately. A non‑extractable `CryptoKey` gets protected by
the OS keychain in WebKit/Safari/Tauri webviews; when that keychain becomes inaccessible the cache
can't be restored and you're prompted for your password on every refresh. Storing raw bytes within
same‑origin‑isolated IndexedDB avoids that failure mode. The trade‑off: the cache is only as strong as
your device's local storage isolation — your private key remains fully password‑protected on the
server regardless. Signing out clears the cache.

---

## 7. Where & how data is stored on the server

Encrypted blobs go to **object storage** through a pluggable driver
([`packages/storage`](packages/storage/src/driver.ts)): an **S3‑compatible** backend (MinIO by
default; also AWS S3, Cloudflare R2, Backblaze B2, …) or the **local filesystem** for simple
self‑hosting. Structured metadata (the rows in the tables above) lives in **PostgreSQL**.

What reaches object storage is **only ciphertext** — file blobs, encrypted thumbnails/previews, and
(for documents) encrypted snapshots. The server has no content key and no private key, so even with
full disk access it cannot read your files. Multipart uploads are assembled from already‑encrypted
parts; **no decryption ever happens server‑side.**

Because you self‑host, "the server" is infrastructure **you** control. End‑to‑end encryption means a
compromise of that infrastructure (a stolen database dump, a leaked storage bucket) still doesn't
expose file contents or the sensitive metadata listed as encrypted above.

---

## 8. What the server can still see

End‑to‑end encryption protects **contents and sensitive metadata**, not the existence of activity. Be
clear‑eyed about what an operator (or anyone who compromises the server) can observe:

- **File and object sizes**, exactly. Sizes can fingerprint known files or hint at content type.
- **MIME types** and **timestamps** — so *when* you create/modify things and roughly *what kind* of
  thing each is.
- **The shape of your library** — how many items, the folder tree, image dimensions, video lengths.
  Names are encrypted, but the structure isn't.
- **Access patterns** — which objects are requested and when, via normal request logs.
- **Account email and login activity**, handled by the standard auth layer.

There is **no perfect forward secrecy**: content keys are wrapped once and not rotated except on
revocation, so if your private key were ever compromised, previously stored items could be decrypted.
This matches the model of comparable end‑to‑end‑encrypted storage (Proton Drive, etc.) and is a
deliberate trade‑off for a single‑password, recoverable system.

### One deliberate exception: Google import

The optional **"Import from Google"** migration streams your Google Photos/Drive bytes **through the
server** so your browser can re‑encrypt them ([`apps/api/src/migrate`](apps/api/src/migrate/routes.ts)).
During an active import, those specific bytes pass through the server **in the clear, transiently** —
they are proxied, never written to disk, and discarded immediately. Your browser encrypts them before
they're stored in PolarHQ, so the *imported result* is end‑to‑end encrypted like everything else. If
this transient exposure matters to your threat model, don't use the importer.

---

## 9. Cryptographic primitives reference

All via `libsodium-wrappers-sumo` (libsodium compiled to WASM); see
[`crypto.ts`](packages/core/src/crypto.ts).

| Purpose | Primitive |
|---|---|
| Password → key (KDF) | Argon2id (`crypto_pwhash`, `ALG_ARGON2ID13`), 128 MiB / MODERATE ops |
| Key pair | Curve25519 (`crypto_box_keypair`) |
| Small‑file & metadata encryption | XSalsa20‑Poly1305 (`crypto_secretbox_easy`) |
| Large‑file streaming encryption | XChaCha20‑Poly1305 (`crypto_secretstream_xchacha20poly1305`) |
| Wrapping content keys to a public key | sealed box (`crypto_box_seal` / `_seal_open`) |
| Key fingerprint (TOFU) | `crypto_generichash` (8 bytes) |
| Randomness (salts, nonces, keys) | `randombytes_buf` (CSPRNG) |

---

## 10. Reporting a vulnerability

If you believe you've found a security issue, please report it privately rather than opening a public
issue. See [`SECURITY.md`](SECURITY.md) at the repository root for the disclosure process.

---

*This document is maintained alongside the code. If you find a discrepancy between what's written here
and what the code does, that's a bug in one of them — please report it.*
