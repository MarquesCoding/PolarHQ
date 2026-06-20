export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  author: string
  date: string
  eyebrow: string
  tags: string[]
  content: string
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "polarhq-desktop",
    title: "PolarHQ Desktop — the whole suite, now native",
    excerpt:
      "A native app for macOS, Windows, and Linux that runs the exact same code as the web — built on a ground-up rebuild that lets one codebase power every platform.",
    author: "Marques",
    date: "2026-06-20",
    eyebrow: "Alpha v0.5",
    tags: ["News", "Release", "Desktop"],
    content: `PolarHQ now lives on your desktop. **A native app for macOS, Windows, and Linux** — not a browser tab pretending to be an app, but a real window in your dock that opens instantly and feels like it belongs on your machine.

And here's the part we're proud of: it runs the *exact same code* as the web app. Not a port, not a fork — the same Photos, the same Drive, the same encryption. One codebase, every platform.

## How it's the same app, everywhere

Getting here meant tearing the app apart and rebuilding it as a set of shared packages. The UI, the feature logic, the translations, and the entire data and crypto layer now live in libraries that any "shell" can import. The web app is one thin shell. The desktop app is another. Mobile will be a third.

> The goal: write a feature once, and it shows up — identical — on web, desktop, and mobile.

The desktop shell is built on **Tauri**, so the binary is tiny and fast, with a real Rust core underneath for the native pieces still to come (peer-to-peer device sync, on-device processing).

## Native where it counts

It doesn't just *work* on macOS — it feels native. A properly rounded window, a floating sidebar with the traffic-light controls tucked right into it, and a frosted top bar that content slides under as you scroll. Little things, but they're the difference between "a web page in a window" and "an app."

## It updates itself

Like the apps you already trust, PolarHQ Desktop checks for new versions on launch, downloads them, installs them, and relaunches — no manual downloads, no "a new version is available" nagging. Every update is cryptographically signed end-to-end, so you only ever install builds we actually shipped.

## Sign in, your way

The sign-in screen now asks the one question that matters for a self-hosted app: *where does your data live?* Choose **Self-hosted** and point it at your server, or — soon — choose **PolarHQ Hosted** and let us run it for you. Either way it's the same private, end-to-end encrypted suite.

## Get it

Downloads for macOS (Intel and Apple Silicon), Windows, and Linux are on the [releases page](https://github.com/MarquesCoding/PolarHQ/releases/latest). The web app isn't going anywhere — it's the same app, after all — but if you want PolarHQ in your dock, it's there now.

This is **Alpha v0.5**. Next up: the mobile apps, built on the very same shared core.`,
  },
  {
    slug: "introducing-polarhq",
    title: "Introducing PolarHQ — your private home for everything",
    excerpt:
      "A self-hosted, open-source, end-to-end encrypted suite for your photos, files and documents. One server you own, every app you need.",
    author: "Marques",
    date: "2026-04-12",
    eyebrow: "Alpha v0.1",
    tags: ["News", "Release", "Vision"],
    content: `Most of us have quietly handed our entire digital lives to a handful of companies. Your photos live on one cloud, your documents on another, your files scattered across a third — and none of it is really *yours*. You rent access to your own memories, and the terms can change whenever the landlord likes.

**PolarHQ is the opposite of that.** It's an open-source suite you run on your own server: Photos, Drive, and Docs, with the same polish you'd expect from Google or Apple, but with a single non-negotiable rule — *the server never sees your data in the clear.*

## What you get on day one

- **Photos** — an Apple-Photos-grade library with a continuous-flow grid, HEIC and Live Photo support, EXIF metadata, and an on-map view of where every shot was taken.
- **Drive** — folders, versioning, trash, and fast uploads, with every filename and byte encrypted before it leaves your browser.
- **Docs & Sheets** — full-screen, Google-parity editors that open in their own tab.
- **An admin console** — users, groups, per-user limits, branding, and an audit log.

All of it ships in a single deployment you control.

## Owned, not rented

The whole project is built around one idea: *ownership instead of lock-in.* That shows up everywhere.

> If you can't hold the keys, you don't own the data. PolarHQ is designed so the keys never leave your device.

There's no proprietary format you can't escape. Your photos are photos. Your files are files. Export everything, move servers, or fork the project — it's [AGPL-licensed](#) and always will be.

## Why self-hosted

Self-hosting used to mean a weekend of YAML and a permanent second job keeping it alive. We're working hard to make PolarHQ a *single command* to stand up and genuinely boring to run. You bring a box — a spare mini PC, a VPS, a NAS — and PolarHQ brings the suite.

This is **Alpha v0.1**. It's early, it's moving fast, and it's already the daily driver for the people building it. Over the next few releases we'll bring the mobile apps, real-time collaboration, and a one-click deploy story.

If "your digital life, under your control" sounds like something you've been waiting for — welcome. Star the repo, read the [encryption deep-dive](/blog/how-end-to-end-encryption-works), and come build the alternative with us.`,
  },
  {
    slug: "how-end-to-end-encryption-works",
    title: "How end-to-end encryption works in PolarHQ",
    excerpt:
      "A Proton-style single-password model, libsodium under the hood, and a server that only ever stores ciphertext. Here's the whole design.",
    author: "Marques",
    date: "2026-04-26",
    eyebrow: "Engineering",
    tags: ["Engineering", "Security", "Deep dive"],
    content: `End-to-end encryption is easy to claim and hard to do without making the product miserable to use. The bar we set for PolarHQ: **the server stores nothing but ciphertext, and you only ever type one password.** No per-file prompts, no key-management homework. Here's how it fits together.

## One password, one keypair

When you sign up, your browser does the heavy lifting before anything touches the network:

1. Generate an **X25519 keypair** with [libsodium](#).
2. Derive a **key-encryption key (KEK)** from your login password using Argon2id.
3. Wrap (encrypt) your private key with that KEK.
4. Send the server only \`{ publicKey, wrappedPrivateKey, kdfSalt }\`.

The server never sees your password, your KEK, or your private key — only an opaque wrapped blob it couldn't open if it wanted to.

\`\`\`text
password ──Argon2id──▶ KEK ──unwraps──▶ privateKey (memory only)
                                   │
publicKey ──shared──▶ collaborators │
\`\`\`

On sign-in, the browser re-derives the KEK, unwraps the private key into memory, and keeps it for the session. That's the *only* moment your password is in play.

## Per-item content keys

Every photo, file, and document gets its own random **symmetric content key**. The bytes are sealed with \`crypto_secretbox\`; the content key itself is wrapped to your public key. To share with someone, we wrap that one content key to *their* public key — the underlying data never has to be re-encrypted.

This is what lets a single library scale: thousands of items, each independently keyed, all openable with the one private key sitting in your session.

## What's encrypted

Short answer: **everything that could identify you or your content.**

- Photo and video originals, plus every generated thumbnail
- Filenames and folder names
- Document snapshots *and* the real-time collaboration frames
- EXIF, captions, and search embeddings

The server sees sizes and timing, and that's roughly it. Even the ML search index — the [on-device CLIP embeddings](/blog/photos-that-feel-like-apple-photos) — is encrypted at rest and ranked client-side.

## The honest trade-offs

E2E isn't free, and we'd rather be upfront:

- **Lost password = lost data.** Without your password there's no KEK, and without the KEK there's no way back in. That's the whole point — but it means a recovery code is essential, and we generate one at signup.
- **No server-side search or rendering** of encrypted content. We push that work to the client, which is why search runs in your browser.
- **Sharing is key distribution,** not link magic. Public, non-E2E links exist for when you explicitly want them.

> The goal isn't encryption for its own sake. It's that nobody — not us, not a cloud provider, not a future acquirer — can read your life without your password.

That's the model. It's the same shape across Photos, Drive, and Docs, and it's why "self-hosted" and "end-to-end encrypted" aren't two features in PolarHQ — they're the same promise.`,
  },
  {
    slug: "photos-that-feel-like-apple-photos",
    title: "Photos that feel like Apple Photos — but yours",
    excerpt:
      "A continuous-flow grid, HEIC and Live Photos, EXIF maps, a non-destructive editor, stacks, and on-device semantic search. All encrypted.",
    author: "Marques",
    date: "2026-05-10",
    eyebrow: "Product",
    tags: ["Photos", "Product"],
    content: `Photos is the app most people will open first, so it had to be *good* — not "good for self-hosted," just good. The benchmark was Apple Photos, and the constraint was that none of it could exist on the server in the clear.

## A grid that flows

The library uses a **continuous-flow layout**: sparse days share a row instead of each claiming a lonely line, so scrolling feels dense and natural. Selection is first-class — drag-select from anywhere (including the empty margins), keyboard shortcuts, an inset selection ring, and a live count that animates as you go.

Under the hood it's virtualized, so a library of tens of thousands of photos scrolls without breaking a sweat — and we spent an embarrassing number of commits making the virtualization range update correctly so the grid never tears or gaps.

## Real formats, real metadata

- **HEIC and Apple Live Photos** upload and display natively.
- **Videos** play on hover, right in the grid.
- **EXIF** is parsed client-side — camera, lens, exposure — and the capture location is shown on a map in the details panel.
- Photos sort by *true capture date*, parsed from mixed-precision timestamps, so your timeline matches what actually happened.

Because everything is E2E, all of this — including the thumbnails and the map — is decrypted only in your browser.

## A real editor

The editor saves **non-destructive** edits as a before/after stack: your original is never overwritten, and you can always step back. Crop, adjust, and compare, then save a new version that lives alongside the source.

## Stacks and search

**Stacks** group related shots — burst sequences, edited versions, collections — behind a single cover with a count, Immich-style, so the grid stays clean.

The part we're proudest of is **semantic search**. Type "red bike in the snow" and it just works — powered by a **CLIP model running on your device**. The embeddings are computed locally, encrypted, and ranked client-side, so you get Google-Photos-style search with *zero* server-side access to your images.

> Search that understands your photos, without a single one of them being readable by the server.

## It's yours

Every feature here was built under the same rule as the rest of PolarHQ: it has to work entirely from encrypted data the server can't read. Apple-Photos polish, on a server you own. That was the whole assignment.`,
  },
  {
    slug: "one-library-two-apps-drive-and-photos",
    title: "One library, two apps: how Drive and Photos share storage",
    excerpt:
      "Your photos are files, and your files include your photos. Here's the shared-object architecture that keeps Drive and Photos in sync with zero duplication.",
    author: "Marques",
    date: "2026-05-24",
    eyebrow: "Engineering",
    tags: ["Engineering", "Drive", "Photos"],
    content: `Here's a question that quietly breaks most "suites": where does a photo live? If Photos and Drive each keep their own copy, you've doubled your storage and guaranteed they'll drift out of sync. PolarHQ takes a different route — **one stored object, two views.**

## A photo *is* a Drive file

Every photo asset and every Drive file points at the same underlying **stored object**. Upload a picture in Photos and it appears in your Drive tree. Drop a file into a Drive folder and, if it's an image or video, Photos picks it up. There's exactly one set of encrypted bytes in object storage, referenced from both places.

## Bidirectional sync, no duplication

The two apps stay consistent through shared node and asset records:

- **Move** a file in Drive and the photo's location follows.
- **Trash** it in Photos and it lands in the Drive trash — and vice versa.
- **Rename, version, restore** — all operate on the same node.

\`\`\`text
        ┌──────────────┐
Photos ─▶│ stored object │◀─ Drive
        │  (ciphertext) │
        └──────────────┘
   one set of bytes, two front doors
\`\`\`

Because the object is encrypted once with its own content key, both apps decrypt it the same way client-side. No re-encryption, no second copy, no reconciliation job trying to guess which version is canonical.

## Why this matters

This isn't just an efficiency win. It's what makes the suite feel *coherent* instead of like a bundle of separate products. Your storage quota is one number. Your trash is one place. Your backup is one set of objects. And the mental model is the one you already have: your photos are part of your files, not a walled garden beside them.

> The best architecture is the one you never have to think about. Files and photos are the same thing — so we made them the same thing.

It also sets up everything that comes next. Documents are Drive files too. So are spreadsheets. Once "everything is a node in one encrypted tree," sharing, versioning, and sync only have to be built **once** — and every app in the suite inherits them.`,
  },
  {
    slug: "google-parity-office-editors",
    title: "Bringing Google-parity Sheets & Docs to a self-hosted suite",
    excerpt:
      "Full-screen editors, a canvas-fast spreadsheet grid, real Office import/export, and collaboration — without giving up end-to-end encryption.",
    author: "Marques",
    date: "2026-06-02",
    eyebrow: "Product",
    tags: ["Docs", "Sheets", "Product"],
    content: `Documents were the test of whether PolarHQ could be a *real* suite or just a nice photo app. The answer had to be Google-parity editors — and they had to round-trip Microsoft and Google files, all while staying end-to-end encrypted.

## Full-screen, by design

Sheets and Docs each open in their **own full-screen tab** — no suite sidebar, no chrome stealing space. Each has a proper menu bar, a toolbar, and (for Sheets) a formula bar. They feel like applications, not widgets embedded in a dashboard.

A document is just a Drive file with a special type, so creating one from Drive or from the app puts it in the same encrypted tree as everything else. Open it and you're in the editor; everyone else keeps seeing a normal file.

## A spreadsheet that doesn't flinch

The first version of Sheets used a hand-rolled grid, and it fought us on everything — header bleed, resize, dropdowns, text selection on drag. So we rebuilt the grid on **Glide Data Grid**, a canvas renderer, and restyled it to match.

The payoff:

- Smooth scrolling over large sheets, with 1,000 rows by default and a button to add more.
- Real column/row resize, right-click menus, and copy/paste.
- A fill handle that tiles correctly.
- Formulas powered by **HyperFormula**, with proper undo/redo.

\`\`\`text
Yjs doc  ──▶  HyperFormula engine  ──▶  Glide canvas grid
   ▲              (calc)                   (render)
   └── encrypted snapshot in Drive
\`\`\`

## It speaks Office

You can **import** \`.xlsx\` and \`.docx\` and **export** back to them. We lazy-load the heavy libraries — SheetJS for spreadsheets, Mammoth for Word — so the editors stay light until you actually need interop. Got an \`.xls\` sitting in your Drive? Open it straight from the file browser; the right editor launches and the right icon shows on the node.

## Collaboration, encrypted

Editing is built on **Yjs** CRDTs over a relay. The crucial design decision: the relay only ever forwards *opaque, encrypted update blobs*. Clients merge plaintext locally; the server brokers ciphertext. That means real-time collaboration and end-to-end encryption coexist — the relay is a dumb pipe that couldn't read your document if it tried.

> Most collaborative editors trade away privacy for presence. We kept both by making the server a courier, not a reader.

## Where it's headed

Comments, presence cursors, and shared public views are next. But the foundation is here: a self-hosted office suite that imports your existing files, edits them at Google parity, and never lets the server read a word.`,
  },
  {
    slug: "polarhq-on-ios",
    title: "PolarHQ on iOS — a native client with crypto parity",
    excerpt:
      "A native SwiftUI app, a libsodium core that matches the web byte-for-byte, immersive Apple-Photos browsing, and live sync with the desktop.",
    author: "Marques",
    date: "2026-06-06",
    eyebrow: "Product",
    tags: ["iOS", "Mobile", "Product"],
    content: `A private cloud you can only reach from a laptop isn't much of a cloud. So alongside the web app, PolarHQ now has a **native iOS client** — SwiftUI, built for iOS 26 — and getting it right meant solving the hard part first: encryption parity.

## Crypto parity was the gate

The web app encrypts everything with libsodium. For the iOS app to read the same library, its crypto had to produce **byte-for-byte identical** results. So before building any UI, we built **OrbitCrypto** — a Swift libsodium module — and verified it against the JavaScript implementation using shared test vectors.

> No screen shipped until the Swift crypto matched the web's output exactly. Decryption parity isn't a feature you can fake.

It compiles cleanly under Swift 6 strict concurrency, and the test vectors run on every change. Only once that passed did the rest of the app get built on top.

## An immersive library

Photos on iOS leans into the platform: an Apple-Photos-style library with **Liquid Glass** chrome, pinch-to-zoom between Years / Months / All, and a proper photo viewer with a filmstrip and action bar. Originals are decrypted on-device; thumbnails stream in and stay sharp.

We paginate the full library (an early build capped it at one page — now it loads everything) and sort by parsed capture date so the mobile timeline matches the web exactly.

## Drive, sessions, and sign-in

- A **Files-app-style Drive** with rename, delete, new folder, and decrypted names and types.
- **Device & session management**, so you can see and revoke every signed-in client.
- Native sign-in via bearer tokens, with login and E2E keys persisted reliably in the **Keychain**.

## Live sync

Upload a photo on your phone and it appears on the desktop moments later — and vice versa. **Live sync** broadcasts changes for Photos and Drive across every connected client, so the web app and the iOS app stay in lockstep without a manual refresh.

## What's next for mobile

Android is on the roadmap, along with background upload and offline caching. But the milestone that mattered is done: a native app that decrypts your real, end-to-end encrypted library — because it shares the exact same crypto as the web. Everything else is product on top of that foundation.`,
  },
]

export const getPost = (slug: string) => BLOG_POSTS.find((p) => p.slug === slug)
