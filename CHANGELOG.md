# Changelog

All notable changes to PolarHQ. This file is the single source of truth for release notes —
it is rendered in-app (the "What's new" dialog) and on the marketing site. New versions are
appended by [release-please](https://github.com/googleapis/release-please) from conventional
commits; you may polish the wording in the Release PR before merging.

Format: each release is `## [version] - date — Title`, an optional `<!-- tags: a, b -->` line,
then Markdown notes.

## [0.6.0](https://github.com/MarquesCoding/PolarHQ/compare/v0.5.0...v0.6.0) (2026-07-18)


### ⚠ BREAKING CHANGES

* **suite:** remove Notes and Presentations apps

### Added

* **account:** device & session management ([0a06338](https://github.com/MarquesCoding/PolarHQ/commit/0a063385e2757e204ee8227d5a45ca64fd1fe65a))
* **admin:** create user accounts and edit/delete custom roles ([cdcce8c](https://github.com/MarquesCoding/PolarHQ/commit/cdcce8c27ec4bfd834c61432b9ebe8fd4457c41b))
* **admin:** demo / read-only mode ([bda6455](https://github.com/MarquesCoding/PolarHQ/commit/bda64551b67d58112a917f2c0667967d74f60e21))
* **admin:** inline Discord-style People editors (Users/Groups/Roles) ([d25b720](https://github.com/MarquesCoding/PolarHQ/commit/d25b720ecb217bf0d248edbcdc1d744874ab0067))
* **admin:** notify admins when a new version is available ([7b48058](https://github.com/MarquesCoding/PolarHQ/commit/7b480585ede238109cab5e037928b972ba92052d))
* **admin:** per-user storage usage (bytes/quota) in the User detail sheet — usage amount only, still no contents/devices (privacy invariant preserved) ([c3f2f4a](https://github.com/MarquesCoding/PolarHQ/commit/c3f2f4aa77f29908cafe4222276d0217a29f61ad))
* **api:** content-less push notifications for mobile sync ([60d9008](https://github.com/MarquesCoding/PolarHQ/commit/60d9008a0dee8edf213742d4b53e6b697c02e27b))
* **auth:** enable bearer-token auth for native clients ([6d0e30b](https://github.com/MarquesCoding/PolarHQ/commit/6d0e30b785ccc5b6e1a6a6a658267ce926e34def))
* **auth:** redesign the sign-in page ([ba1cf01](https://github.com/MarquesCoding/PolarHQ/commit/ba1cf012f360e87fced910dad3bbf19832e3b67f))
* **auth:** single-page sign-in with animated server selection ([cdf45a4](https://github.com/MarquesCoding/PolarHQ/commit/cdf45a4cefe2b612ff9a31c6e3f441567891b1a1))
* **backup:** Google Drive as an off-site backup destination ([b2a9cce](https://github.com/MarquesCoding/PolarHQ/commit/b2a9cceb72899c803873f3b33fd000cb62e62618))
* Beta badges for Docs, Sheets and Whiteboard ([56abf41](https://github.com/MarquesCoding/PolarHQ/commit/56abf41e31306dd8d3a2bfd489eadc416e2f78fa))
* **brand:** rebrand to PolarHQ — new logo, README, license & contributing ([976f56e](https://github.com/MarquesCoding/PolarHQ/commit/976f56ea8e749cd63ea93d30970b2262e2816781))
* **changelog:** CHANGELOG.md as single source + release automation ([22d3719](https://github.com/MarquesCoding/PolarHQ/commit/22d3719f3b8e5d8394544e45ffed693f798f7373))
* **config:** trust desktop (Tauri) origins for CORS and auth ([ccaa8c9](https://github.com/MarquesCoding/PolarHQ/commit/ccaa8c93e30fb89d01234a365051066b1d178a44))
* **deploy:** default to a local drive mount for storage instead of S3/MinIO ([19e3463](https://github.com/MarquesCoding/PolarHQ/commit/19e34636388aef8f44ef04f94666891d16265e69))
* **deploy:** embed Caddyfile in compose via inline configs (no bind-mount) ([7df9f84](https://github.com/MarquesCoding/PolarHQ/commit/7df9f842fc6b5a4e6fece6cef0f9ee31cc8eedb5))
* **deploy:** GHCR image builds + production docker-compose ([0e0ba71](https://github.com/MarquesCoding/PolarHQ/commit/0e0ba71c535bf0cff4dd1b07064763b13ecd6891))
* **deploy:** inline all compose values (remove ${VAR} interpolation) ([9db7943](https://github.com/MarquesCoding/PolarHQ/commit/9db79434bc836534bcb5100d603199432084a287))
* **deploy:** make compose fully literal (no ${VAR} interpolation) ([89f1066](https://github.com/MarquesCoding/PolarHQ/commit/89f106669c1f7ba471a78e179b0659b3de2177b9))
* **deploy:** run compose with no .env file (AUTH_SECRET has a placeholder default) ([829ba55](https://github.com/MarquesCoding/PolarHQ/commit/829ba5597eac4f777aa86c6cba87fbc1f382fe79))
* **deploy:** single-port reverse-proxy front door for any-port deploys ([d329f6e](https://github.com/MarquesCoding/PolarHQ/commit/d329f6ee9bc6fcea25af57cfcfc50a5428b8fa5d))
* **desktop:** folder-sync engine foundation (Rust indexer + watcher) ([729e011](https://github.com/MarquesCoding/PolarHQ/commit/729e011c90fb16fa87387e91503df6c5e8892658))
* **desktop:** image-&gt;3D splat generation (offline monocular-depth point cloud) ([fe83688](https://github.com/MarquesCoding/PolarHQ/commit/fe836882f9af05c2b39caaf50f608deb4979dcd5))
* **desktop:** image→3D generation (monocular-depth → colored point-cloud PLY, offline) — right-click an image → Generate 3D splat, view in ModelViewer — via agent worktree ([837aea8](https://github.com/MarquesCoding/PolarHQ/commit/837aea810d4e69d28b9f372681caac609ece99d3))
* **desktop:** inset the native traffic lights ~14px to align with sidebar padding ([b9c047f](https://github.com/MarquesCoding/PolarHQ/commit/b9c047f8693523785a0f628461235c65e67c2143))
* **desktop:** live folder auto-upload — watch synced folders (sync://change) + debounced background sync; start/stop watchers on add/remove ([0a9aa18](https://github.com/MarquesCoding/PolarHQ/commit/0a9aa18c2be670c5fcc0b70c5ed2b9121229fed5))
* **desktop:** native video playback (untested — needs Tauri build) ([3ca9700](https://github.com/MarquesCoding/PolarHQ/commit/3ca9700ac2fc27715fc9300f311f479d19867fa2))
* **desktop:** re-enable the real update check on launch (was stubbed behind a 5s splash timer) ([74895f0](https://github.com/MarquesCoding/PolarHQ/commit/74895f0f3bb81e71a57deb71dae6038580a74e0c))
* **desktop:** Tauri 2 shell with native macOS chrome + auto-update ([5e20ab0](https://github.com/MarquesCoding/PolarHQ/commit/5e20ab0ccc4ae8c98a1a39452d4098783247ee4c))
* **docker:** opt-in MinIO/S3 storage for the prod compose ([6682b88](https://github.com/MarquesCoding/PolarHQ/commit/6682b884edd9b3d170a99a415ad6fe4794241091))
* **drive,photos:** full-width centered card label + drop per-item ticks ([7833c70](https://github.com/MarquesCoding/PolarHQ/commit/7833c709945b359cefdf435ec199e814d0ed347c))
* **drive:** "Space" storage treemap on the Library Overview ([8070ea1](https://github.com/MarquesCoding/PolarHQ/commit/8070ea110d4abc14aacf6ee867696885a7416463))
* **drive:** CLOUD/LOCAL/P2P type badges next to device names in the sidebar ([91e2812](https://github.com/MarquesCoding/PolarHQ/commit/91e2812a55bb1f1bfb530007236bf26fb849a190))
* **drive:** content-center the selection bar (Drive is now floating too) ([7db2df2](https://github.com/MarquesCoding/PolarHQ/commit/7db2df2199f2f5cb808a53de75ceca8626e1b2df))
* **drive:** device-first sidebar IA — Overview on top, then Devices: the Cloud (My Drive/Recents/Favorites/Trash nested), This &lt;device&gt; (synced folders), P2P peers ([a0979fe](https://github.com/MarquesCoding/PolarHQ/commit/a0979fe479f19cc18dbd030064197833a62425d2))
* **drive:** Devices overview section becomes a P2P coming-soon placeholder ([f57ac9d](https://github.com/MarquesCoding/PolarHQ/commit/f57ac9db6ad93537abd859db26b610dd32cd0660))
* **drive:** DEVICES sidebar section replaces FILE KINDS ([6090788](https://github.com/MarquesCoding/PolarHQ/commit/6090788e4723ae141a4db861f81341d156b95fa5))
* **drive:** Favorites smart view with star toggle ([957c62b](https://github.com/MarquesCoding/PolarHQ/commit/957c62ba1dcf1f3652efc7614c46e8d9e4f2bbfb))
* **drive:** Home icon for the parent entry + blue folder for all folders ([32fd3ed](https://github.com/MarquesCoding/PolarHQ/commit/32fd3ed64d34589ec7fad543014588a69af2cc7e))
* **drive:** immersive sidebar to match Photos (traffic-light well + account at bottom), keeping the breadcrumb top bar ([14642be](https://github.com/MarquesCoding/PolarHQ/commit/14642bec9e27f0412d3aec1beac473a7fc9f3764))
* **drive:** Kind + Extension rows in the details panel ([87d6bbc](https://github.com/MarquesCoding/PolarHQ/commit/87d6bbc2bb5f310b1d125c4796b0eb2f47f77c2f))
* **drive:** Library Overview dashboard as the default Drive landing ([1bdc9a3](https://github.com/MarquesCoding/PolarHQ/commit/1bdc9a3ee969fd9d8bac0bd7a75d75a02163738a))
* **drive:** Lightbox has its own backdrop blur (matches the Photos focus viewer standalone); +right padding on Photos details panel ([269771f](https://github.com/MarquesCoding/PolarHQ/commit/269771f509625981f62c50f42bb0e50fb6b078e6))
* **drive:** match the details panel to the Lightbox info panel ([1a35310](https://github.com/MarquesCoding/PolarHQ/commit/1a35310e3806b9dac8ec3cf0efba208470536d07))
* **drive:** Miller-column (cascading) view ([8ebbce7](https://github.com/MarquesCoding/PolarHQ/commit/8ebbce7689d8c9d47319553fb8a325e8aabf09d0))
* **drive:** overview i18n — real device keys (cloud/local/peer, online states) + composition, drop coming-soon ([77314ce](https://github.com/MarquesCoding/PolarHQ/commit/77314cee05cad6a475a98381445cdd1f0dc71707))
* **drive:** real local device in Devices — whoami device_name (macOS ComputerName) via host capability; This &lt;name&gt; always shown on desktop with synced folders nested; drop fake P2P placeholders (real discovery will populate them) ([c0791d6](https://github.com/MarquesCoding/PolarHQ/commit/c0791d6110ef6714082dc3204f8bc122337a2d01))
* **drive:** Recents + File Kinds smart views in the sidebar ([9d61642](https://github.com/MarquesCoding/PolarHQ/commit/9d616428bd6146d8dd56288d2e44723afb615c06))
* **drive:** redesign Drive Overview — hero storage + kind composition, real Devices section (this device, synced folders, P2P peers), polished apps/space-map/largest ([08fab93](https://github.com/MarquesCoding/PolarHQ/commit/08fab930b56db8fa5550bda30145e10a3c412609))
* **drive:** redesign Overview into a device-first dashboard (storage hero + kind composition + real Devices: Cloud/This device/P2P) — via agent worktree ([174db75](https://github.com/MarquesCoding/PolarHQ/commit/174db755b5be2c931db6777b3c36b3e0843af088))
* **drive:** remove the top bar (Photos-style) — floating sidebar, toolbar moved to a floating bottom-right pill, content offset by the sidebar ([aeb76ce](https://github.com/MarquesCoding/PolarHQ/commit/aeb76ced925a5cafbb9c10ec4b66abc3f79ddb69))
* **drive:** reuse the Photos Lightbox for image View ([1ba0d1c](https://github.com/MarquesCoding/PolarHQ/commit/1ba0d1c7e9f35a50c7c576bc3062fe59ce020c9e))
* **drive:** saved searches pinned to the sidebar ([9ac93a1](https://github.com/MarquesCoding/PolarHQ/commit/9ac93a138710ba0c8c7dd2fb46664869329b8568))
* **drive:** Spacedrive-style Library Overview ([379a926](https://github.com/MarquesCoding/PolarHQ/commit/379a9266a0fdd8c82c5d45b4c8f41f0b6989fe98))
* **drive:** star badge on favourited rows in the table view ([95bfaeb](https://github.com/MarquesCoding/PolarHQ/commit/95bfaeb4c7fffe6c1a81f69656791195e049f5c8))
* **drive:** use Spacedrive file-type icons ([b352c83](https://github.com/MarquesCoding/PolarHQ/commit/b352c838f9500065d8d3f94ef386f826b75aed17))
* **drive:** use the blue Folder icon for all folders ([a1f7705](https://github.com/MarquesCoding/PolarHQ/commit/a1f770509878ab9df447b42fc2d277aa7838bc11))
* **drive:** use the custom folder icon ([b8402ec](https://github.com/MarquesCoding/PolarHQ/commit/b8402ec5f7ce2c182acc2a2ef90b3e6a4f32495a))
* **drive:** use the custom generic-file icon ([2943825](https://github.com/MarquesCoding/PolarHQ/commit/29438250f3db35d5a303e7ebc2e8def6922c0695))
* **drive:** view toggle gets a sliding highlight (matches the mode switcher) + dedupe its buttons ([b75277a](https://github.com/MarquesCoding/PolarHQ/commit/b75277a366343dfb10efd6dff6b8042d6139555d))
* handle an open document/photo being deleted in another tab ([67c5a5c](https://github.com/MarquesCoding/PolarHQ/commit/67c5a5c67619b026b501fc18e8a63cfee5e1e0e8))
* **i18n:** fill missing translation keys across all 21 locales ([48f8072](https://github.com/MarquesCoding/PolarHQ/commit/48f8072a373f4a3e5c1c3a3d44e2090f0463a3a2))
* **i18n:** language selector + My Account page + 21 locale scaffolds ([e4f1c12](https://github.com/MarquesCoding/PolarHQ/commit/e4f1c12298290506640b04205102308f73e964bb))
* **i18n:** react-i18next infrastructure + namespaced catalogs ([f80bbf5](https://github.com/MarquesCoding/PolarHQ/commit/f80bbf5301bb4b3853c7598e9c33aae3ed271598))
* **inspector:** shared tabbed inspector across Drive + Photos ([7d8c55e](https://github.com/MarquesCoding/PolarHQ/commit/7d8c55e880144e0a6bf5aa4c757f7ffd45bf584f))
* **ios:** app launcher home screen (replaces app tab bar) ([6930640](https://github.com/MarquesCoding/PolarHQ/commit/6930640035cd02a21bec1f798d3049aaa2d00578))
* **ios:** Apple-style photo viewer (glass chrome, filmstrip, action bar) ([56ca9f2](https://github.com/MarquesCoding/PolarHQ/commit/56ca9f2b8b73e71f1abc92fd4853b0887e217db8))
* **ios:** Drive screen — folder browsing with decrypted names + type icons ([e6c288a](https://github.com/MarquesCoding/PolarHQ/commit/e6c288a3ec790f3e69ecee1835a3bdc9ebff3ebf))
* **ios:** E2E unlock + decrypted Photos thumbnails; wire OrbitKit into app ([1bfad8c](https://github.com/MarquesCoding/PolarHQ/commit/1bfad8ca6913dffeabfad695c5e57d6465c4193f))
* **ios:** Files-app-style Drive with actions (rename/delete/new folder/sort) ([52d2eb1](https://github.com/MarquesCoding/PolarHQ/commit/52d2eb1e92e3a0afd886369f4e8fe8f058f3e5ec))
* **ios:** immersive Apple-Photos library (Liquid Glass + pinch-zoom) ([ea224eb](https://github.com/MarquesCoding/PolarHQ/commit/ea224eb21f9f587ca06e8ab53c3c2c2a8d737c9b))
* **ios:** OrbitCrypto — libsodium module with JS parity test vectors ([d0ae8b4](https://github.com/MarquesCoding/PolarHQ/commit/d0ae8b47fd6d636266d45b27121f67084c474332))
* **ios:** photo viewer (decrypted originals), favourite/trash, PhotoKit upload ([c63c7ec](https://github.com/MarquesCoding/PolarHQ/commit/c63c7ec08e90a586c74997d29e516afce735d15e))
* **ios:** scaffold native SwiftUI client (server setup, bearer auth, glass tab bar) ([3d710cc](https://github.com/MarquesCoding/PolarHQ/commit/3d710cc4df2153235344db9257f7db45fb5f1ccc))
* **ios:** secretstream decryption for chunk-uploaded files (Phase 2g) ([435dc1d](https://github.com/MarquesCoding/PolarHQ/commit/435dc1d2c86996587d420d65b1393f508d760f1a))
* **ios:** Years/Months/All zoom + fix upload thumbnail not refreshing ([37fd9c5](https://github.com/MarquesCoding/PolarHQ/commit/37fd9c58246998f0f37696a1f2cbd328f52f731a))
* **jobs:** retry failed jobs from the panel and tray ([bc9a935](https://github.com/MarquesCoding/PolarHQ/commit/bc9a9352d8115f0337226c2379e79dcce0d6cb27))
* live sync (web↔mobile) for Photos and Drive ([62ac0d2](https://github.com/MarquesCoding/PolarHQ/commit/62ac0d267303b552f8bb4d24c700ae1068abd90f))
* **marketing:** desktop download links + the 0.5.0 release post ([16cf3d2](https://github.com/MarquesCoding/PolarHQ/commit/16cf3d282c2721d7d609e92afc8ef9de2f2d8542))
* **marketing:** favicon + Open Graph/Discord embed metadata ([5fe7594](https://github.com/MarquesCoding/PolarHQ/commit/5fe75945203d3dfaf8a2f1f6dab0a3385946ecd8))
* **marketing:** hero uses landing.jpg as a dithered background (Paper Design ImageDithering shader) with the app screenshot centered + cut off; trim white window-shadow off screenshots; smaller copy, screenshot-forward; mobile-responsive (natural height on phones) ([85cb60c](https://github.com/MarquesCoding/PolarHQ/commit/85cb60ca59ab9265a042f091e4a84889ca7f9464))
* **marketing:** live Photos demo on real components + page transitions ([0779782](https://github.com/MarquesCoding/PolarHQ/commit/0779782419bc9737f155c4074afbcfb480dced1a))
* **marketing:** Orbit landing page (apps/marketing) ([3557789](https://github.com/MarquesCoding/PolarHQ/commit/3557789cc6b88313642534daa0a53e922b7fd0d4))
* **marketing:** parallax hero polish, video demos, dark mode + one-command install ([2007edb](https://github.com/MarquesCoding/PolarHQ/commit/2007edb0a45d1d34ebbfd69cd0a182142a27347c))
* **marketing:** PolarHQ rebrand + blog, changelog, roadmap & legal pages ([112f910](https://github.com/MarquesCoding/PolarHQ/commit/112f91020e91051ecabbb9353242e7bc13767998))
* **marketing:** real varied-size photos converging to the top + real screenshot ([764a553](https://github.com/MarquesCoding/PolarHQ/commit/764a5539e750bd4995bf7a9f77c4f4a56f7246d8))
* **marketing:** rebuild as dark app-matching landing ([3727dd9](https://github.com/MarquesCoding/PolarHQ/commit/3727dd93f356243a301d17cb2b052af5c85d23a5))
* **marketing:** redesign landing — full-height hero with the app shot cut off (100%→50% fade), light-mode default, clean (non-bubbly) type, real app icon favicon; rich alternating feature sections with optimized screenshots; drop the live-demo BrowserFrame ([ffc83aa](https://github.com/MarquesCoding/PolarHQ/commit/ffc83aadb6960a142c57961b8d7c918602f0ed08))
* migrate from Google (Photos + Drive) ([#4](https://github.com/MarquesCoding/PolarHQ/issues/4)) ([c6becd6](https://github.com/MarquesCoding/PolarHQ/commit/c6becd6737e390e50267f0ad679cf6d48af148b6))
* **mobile:** background auto-sync, video backup, notifications, Drive file upload ([2d6b9f9](https://github.com/MarquesCoding/PolarHQ/commit/2d6b9f968d831ac02247afd041a1e93971f2bf6d))
* **mobile:** branded auth — bear logo, violet gradient hero, form sheet ([ba3be45](https://github.com/MarquesCoding/PolarHQ/commit/ba3be454e4ba4a76217976ffe134a50450a1c50d))
* **mobile:** camera-roll auto-backup (Photos) ([2b5a3a1](https://github.com/MarquesCoding/PolarHQ/commit/2b5a3a1fb0b07018e6e6bf52d308835f844cb6e4))
* **mobile:** collapsing glass top bar + floating date badge (Google-style) ([38e79b2](https://github.com/MarquesCoding/PolarHQ/commit/38e79b2f236cb3997813d95e5dd411ea44794fe0))
* **mobile:** Drive actions — new folder, rename, delete ([2de7c99](https://github.com/MarquesCoding/PolarHQ/commit/2de7c99571f4c9d68329c51ed1b5747f4bdad163))
* **mobile:** Drive browser — folder drill-down, decrypted names, type icons ([2b5bdea](https://github.com/MarquesCoding/PolarHQ/commit/2b5bdeae3a846576017edd531e0af757623b1ed7))
* **mobile:** E2E unlock wired end-to-end ([#1](https://github.com/MarquesCoding/PolarHQ/issues/1) + [#2](https://github.com/MarquesCoding/PolarHQ/issues/2)) ([2f1ab28](https://github.com/MarquesCoding/PolarHQ/commit/2f1ab289bb3545882f75b122619324b3b992ffbd))
* **mobile:** encrypted photo upload ([97c20d8](https://github.com/MarquesCoding/PolarHQ/commit/97c20d82cdbca08cbdd47f3d215199f1a824cc75))
* **mobile:** Expo app foundation — connect, sign-in, tab shell ([572a7ee](https://github.com/MarquesCoding/PolarHQ/commit/572a7ee1aa1b3af824742e5d7f7c535bb715c08b))
* **mobile:** Google-Photos-influenced Photos screen ([52c148e](https://github.com/MarquesCoding/PolarHQ/commit/52c148e0a57f73dd83cd4ca87fcdf36457831b76))
* **mobile:** Google-style photo viewer + native menus & sheets ([e2b2ffc](https://github.com/MarquesCoding/PolarHQ/commit/e2b2ffc820f2fc39709b42be6eeed34543d132b2))
* **mobile:** in-place Drive folder navigation with a persistent top bar ([ba5200a](https://github.com/MarquesCoding/PolarHQ/commit/ba5200ada8fcd8b6b4619dcd811e36e9d241b008))
* **mobile:** Liquid-Glass photo viewer (Apple-style) + glass on Photos page ([8816de7](https://github.com/MarquesCoding/PolarHQ/commit/8816de75b828bbbbd1fc495ad7bd95d5c7553115))
* **mobile:** Liquid-Glass top-bar controls on iOS ([c4cb491](https://github.com/MarquesCoding/PolarHQ/commit/c4cb491ae5768845e5e6e31ff5c07bec6e7c74cc))
* **mobile:** live updates over /ws ([abc7907](https://github.com/MarquesCoding/PolarHQ/commit/abc79070c3144274b76697fd0014aafd593c5c48))
* **mobile:** multi-select on Drive ([d3919fa](https://github.com/MarquesCoding/PolarHQ/commit/d3919fa1aaec5f420240f976021910cf43a3313b))
* **mobile:** multi-select on the Photos grid ([51287a2](https://github.com/MarquesCoding/PolarHQ/commit/51287a25c72486790335d2dd505ba0eec8535a15))
* **mobile:** native crypto wiring + Android emulator host fix ([3d1ce91](https://github.com/MarquesCoding/PolarHQ/commit/3d1ce916a219739f1b972dab85541a7ca4986b07))
* **mobile:** native E2E crypto proven on device (dev build) ([a706b1f](https://github.com/MarquesCoding/PolarHQ/commit/a706b1f1c68ecf5310ee95a5fe7b5816570562e5))
* **mobile:** native iOS Liquid Glass tab bar; Android keeps custom pill ([14d6ff0](https://github.com/MarquesCoding/PolarHQ/commit/14d6ff09cf3d829ea84c54fa95486d44abfd0c94))
* **mobile:** Photos albums + library search ([5313f20](https://github.com/MarquesCoding/PolarHQ/commit/5313f200d738310d45b65f508c3aafafdc5deb23))
* **mobile:** Photos grid — encrypted library + on-device thumbnail decrypt ([b87524c](https://github.com/MarquesCoding/PolarHQ/commit/b87524c9de70bdc3a7c3aae08ce8c5210ee8530a))
* **mobile:** Photos viewer — tap to full-res decrypt ([59eb81e](https://github.com/MarquesCoding/PolarHQ/commit/59eb81ee7138a385d31ec83ffc4a0d134918bcad))
* **mobile:** Photos views (All/Favourites/Trash) + viewer favourite/trash actions ([8c546be](https://github.com/MarquesCoding/PolarHQ/commit/8c546be0751ffdc90f50b3b695f9a538aab15385))
* **mobile:** pinch-to-zoom in the photo viewer + delete confirmation ([ec8fc45](https://github.com/MarquesCoding/PolarHQ/commit/ec8fc45036b30335727618b2c0b4ca838614ea14))
* **mobile:** polish foundation — design tokens, motion, materials, gestures ([5210b2a](https://github.com/MarquesCoding/PolarHQ/commit/5210b2a8fc3b15e3092b8efc391c9155969e72f0))
* **mobile:** real iOS 26 Liquid Glass top-bar controls (expo-glass-effect) ([ddf3bab](https://github.com/MarquesCoding/PolarHQ/commit/ddf3bab01aa0bd444382b6a062d9b7ee8d3ea060))
* **mobile:** restructure nav — Photos/Albums/Drive bottom bar, account card, no titles ([d9da345](https://github.com/MarquesCoding/PolarHQ/commit/d9da3453818b32c06a4ec9b13a705c39266b4cf1))
* **mobile:** shared floating top bar + Drive media thumbnails ([70fa789](https://github.com/MarquesCoding/PolarHQ/commit/70fa789bb5b1c8991bef304799ef4aa5cbd967e1))
* **mobile:** swipe between photos in the viewer ([f23ed5e](https://github.com/MarquesCoding/PolarHQ/commit/f23ed5ee1872ccd3889ec5d6bb460f298c41ea48))
* **mobile:** top-bar avatar + timeline motion (Google-Photos influence) ([4b8fbd3](https://github.com/MarquesCoding/PolarHQ/commit/4b8fbd373e11fb455b4e493031b36ced11d33d65))
* **mobile:** video playback (expo-video) ([5a67015](https://github.com/MarquesCoding/PolarHQ/commit/5a67015a3e1b6f5aaa747385bb645eb2377b24b5))
* **notes:** bidirectional (backlink) relations ([5e36c03](https://github.com/MarquesCoding/PolarHQ/commit/5e36c03aab93265806bf23a8b77cff812502c94f))
* **notes:** Notion-style databases with table, board and gallery views ([d8cf002](https://github.com/MarquesCoding/PolarHQ/commit/d8cf002f464cceba13c11a6d803b78c11f8e627e))
* **notes:** Notion-style Notes app on the shared collab stack ([89c4276](https://github.com/MarquesCoding/PolarHQ/commit/89c4276e1124a11c4bc42e8e518fe62357e1cb3f))
* **notes:** open a database row as a full page ([cfa93eb](https://github.com/MarquesCoding/PolarHQ/commit/cfa93eb6b24fc481752493bf312eb9e12a771d3a))
* **notes:** per-view filters and sorts for databases ([28d4cd4](https://github.com/MarquesCoding/PolarHQ/commit/28d4cd400c1d69b7212eaa13f4f8103bde52e605))
* **notes:** relation property type linking databases ([b821ab3](https://github.com/MarquesCoding/PolarHQ/commit/b821ab3acd06c67efdb8515abe6a385479a349e0))
* **notes:** rollups aggregating across relations ([032367d](https://github.com/MarquesCoding/PolarHQ/commit/032367da1ed1fa8ea9ce532a595713e07561f292))
* **notes:** slash command menu for inserting blocks ([99adbbe](https://github.com/MarquesCoding/PolarHQ/commit/99adbbeb0e8718c1c686604082bbc0c67e253865))
* **photos,onboarding:** NumberFlow + frosted arrows + onboarding polish ([21473ff](https://github.com/MarquesCoding/PolarHQ/commit/21473ffb36a877639d3ebce066530ec686f06dfb))
* **photos:** ambient blurred-image backdrop + snappier filmstrip scroll ([1c07824](https://github.com/MarquesCoding/PolarHQ/commit/1c078241d6c7ad3034efe7103c8243e3e49c8509))
* **photos:** attach the details pane flush instead of floating ([548910b](https://github.com/MarquesCoding/PolarHQ/commit/548910ba64b09400a3b98fc1cb3922a945a172d9))
* **photos:** blur the grid behind the focused photo (single backdrop layer) ([b04eb15](https://github.com/MarquesCoding/PolarHQ/commit/b04eb15e4f9a32a9a72e6bf40c977bb6da5d972f))
* **photos:** burst photo support — auto-stack on upload, export all frames ([65ff990](https://github.com/MarquesCoding/PolarHQ/commit/65ff990fd86d10b4179e41cde4aae0dc11a2dc40))
* **photos:** canvas mode drag-to-arrange with persisted positions ([91eda61](https://github.com/MarquesCoding/PolarHQ/commit/91eda61eb382efc2706e86da13c23ab9f226692a))
* **photos:** center the mode switcher; inline size slider + sort menu on the right ([7d08456](https://github.com/MarquesCoding/PolarHQ/commit/7d08456d5fe6648ba9615b51f56156c7be020fc4))
* **photos:** client-side EXIF metadata + location map in details ([e8bc12f](https://github.com/MarquesCoding/PolarHQ/commit/e8bc12fa23716da1a1b6668c4ab546c921b2b54e))
* **photos:** content-center the selection bar (offset by sidebar) so it aligns with the chrome ([8aafcb6](https://github.com/MarquesCoding/PolarHQ/commit/8aafcb657b3ab99da860e9587664957ed3595e10))
* **photos:** continuous-flow layout — sparse days share a row ([3254a18](https://github.com/MarquesCoding/PolarHQ/commit/3254a1891cd4f75126acc405ea306844b144668b))
* **photos:** copy image to clipboard from the lightbox ([0b07b76](https://github.com/MarquesCoding/PolarHQ/commit/0b07b76043c851892e4408052912e7e59dc554cf))
* **photos:** custom video/audio player (MediaPlayer) in the focused viewer; raw video stays for grid hover-autoplay ([899c33d](https://github.com/MarquesCoding/PolarHQ/commit/899c33df0f8753772c52a07f7f95f1635b2cc6d5))
* **photos:** declutter the lightbox toolbar + add a filmstrip toggle ([8f48ff4](https://github.com/MarquesCoding/PolarHQ/commit/8f48ff43355fc61a6c50f8140d65a6648ac256a0))
* **photos:** download action liquid-morphs — icon expands to spinner+Saving then check+Saved, pill reflows via layout ([bbf06eb](https://github.com/MarquesCoding/PolarHQ/commit/bbf06eb8e72f9b2eae74c58327ed664d932de140))
* **photos:** download action morphs to a spinner while the focused image is downloading ([e5679dd](https://github.com/MarquesCoding/PolarHQ/commit/e5679dd2119a8a9271905d1844c25ddea6f4d80a))
* **photos:** downloading is a third branch of the actions morph — pill swaps actions-&gt;Saving-&gt;Saved and morphs back on finish/close (same mechanism as sort&lt;-&gt;actions) ([59b12c8](https://github.com/MarquesCoding/PolarHQ/commit/59b12c8188b74cec6359fd120775a665e1789f73))
* **photos:** downloading shows a matching pill above the actions (same width/chrome); trash menu matches the action pill (width, roundness, colour) ([51b11a4](https://github.com/MarquesCoding/PolarHQ/commit/51b11a43589b8deb84140b8ffa3e9f367fc6a2c9))
* **photos:** drag-to-pan when zoomed; content runs behind sharp sidebar ([62ada03](https://github.com/MarquesCoding/PolarHQ/commit/62ada03a96c493c9b0f5cf4c770f8cced5e31bd8))
* **photos:** Escape-to-close + arrow-key navigation in the viewer ([151b833](https://github.com/MarquesCoding/PolarHQ/commit/151b83305e6f2480dcc5cbe85e5793e433e2234a))
* **photos:** F toggles favourite in the focus viewer ([854a53a](https://github.com/MarquesCoding/PolarHQ/commit/854a53aada07a545f227289ad147e1d9cb04053f))
* **photos:** filename&lt;-&gt;zoom% pill + details panel toggle ([7ddd4a4](https://github.com/MarquesCoding/PolarHQ/commit/7ddd4a4c71e148decf3fcfea754898b5d4a60933))
* **photos:** filmstrip of frames in the stack/burst viewer ([d9bbc42](https://github.com/MarquesCoding/PolarHQ/commit/d9bbc422a99a24f32ea646010757313cf9f76e3f))
* **photos:** flat single-sidebar shell prototype ([a43a316](https://github.com/MarquesCoding/PolarHQ/commit/a43a31611575bb23cf3785c4a9146aa04311b72d))
* **photos:** floating chrome adapts to content luminance (dark chrome over light images, light over dark) ([b36aa1a](https://github.com/MarquesCoding/PolarHQ/commit/b36aa1a93183a0979588a5dd9c57ea6e5e55dffd))
* **photos:** focus open/close on the entity model (Phase 2) ([aaa4bf2](https://github.com/MarquesCoding/PolarHQ/commit/aaa4bf24828bfd5370ace16013cabc6347244b79))
* **photos:** frosted hero-zoom lightbox (pass 1) ([fce5ef4](https://github.com/MarquesCoding/PolarHQ/commit/fce5ef4122da6beeb14871b5a5b9915891890a23))
* **photos:** grid-only workspace mode; wire AlbumDetail to it (cutover proof) ([d7e2c2d](https://github.com/MarquesCoding/PolarHQ/commit/d7e2c2d2bc84cd5ede673352684b63f512843890))
* **photos:** HEIC + Apple Live Photo upload support ([036ec35](https://github.com/MarquesCoding/PolarHQ/commit/036ec35557010192775843d97fd8bf593092b107))
* **photos:** hover tools stack in a vertical panel above the pill ([4767daa](https://github.com/MarquesCoding/PolarHQ/commit/4767daa0b59cbe28dc3c4bf4177e334f3553bdf7))
* **photos:** in-depth photo editor with before/after stacking ([bc66af6](https://github.com/MarquesCoding/PolarHQ/commit/bc66af65d3053424360f5e415a2590fd47ee0860))
* **photos:** Infinity back in the entity model (morphs on mode switch) + grid pinch-zoom + snappier open ([07a2de5](https://github.com/MarquesCoding/PolarHQ/commit/07a2de5375f6aaa506470416105bcdc211c91d18))
* **photos:** Infinity keeps photo aspect ratios (continuous justified flow) ([95ae2cf](https://github.com/MarquesCoding/PolarHQ/commit/95ae2cfec7766ef238681dddf8543c3c98a3412a))
* **photos:** Infinity mode is a dense small-tile overview (104px squares, tight gaps) ([0d1bcc2](https://github.com/MarquesCoding/PolarHQ/commit/0d1bcc2e42e19c1ff9fdaf7e1462eb727054ef40))
* **photos:** inline the photo editor in the Lightbox ([59deea2](https://github.com/MarquesCoding/PolarHQ/commit/59deea2a18e7b09402103b6be7fa1f2916af28e5))
* **photos:** liquid-glass bottom pills (SVG displacement + specular highlights) ([446ea03](https://github.com/MarquesCoding/PolarHQ/commit/446ea0385aab9bf5b6e4d63de1eda3763abed1aa))
* **photos:** migrate the lightbox + details panel icons to @phosphor-icons/react ([28002da](https://github.com/MarquesCoding/PolarHQ/commit/28002da2e2391ca7bdc17825374c44cdef6cd8ca))
* **photos:** mode switcher + Canvas layout + details-as-sidebar-card ([53a7cc2](https://github.com/MarquesCoding/PolarHQ/commit/53a7cc2926cdd088dbc2ff54949c024fee345012))
* **photos:** NumberFlow selection count + hover-to-play videos ([97fd0fc](https://github.com/MarquesCoding/PolarHQ/commit/97fd0fc300e5b09126d2b01e94e584232cee0320))
* **photos:** open reaction + close/nav polish (Phase 2) ([8d51836](https://github.com/MarquesCoding/PolarHQ/commit/8d51836b198b1daf01478399db447bcb45b38046))
* **photos:** outline (non-duotone) icons in the lightbox toolbar ([a14090f](https://github.com/MarquesCoding/PolarHQ/commit/a14090fb3eee334f512559b0511ff15ce7ba8265))
* **photos:** per-element adaptive chrome — each floating element samples the region beneath it and tweens ([627e10f](https://github.com/MarquesCoding/PolarHQ/commit/627e10fc0d5d8475b154afbfcc82126cef301d34))
* **photos:** per-entity push + full-window immersive content (Phase 2/3) ([1518b11](https://github.com/MarquesCoding/PolarHQ/commit/1518b1163e6b3179d8f4c3b2cd315a8cdd98cdc3))
* **photos:** photo displays in content area; pinch-zoom collapses sidebar ([78169f6](https://github.com/MarquesCoding/PolarHQ/commit/78169f62b2a0a594948d2b5149ec346e5d971f71))
* **photos:** photo stacks (collections) ([37aa99f](https://github.com/MarquesCoding/PolarHQ/commit/37aa99f811cc6a83d418f0200be18b0995ea7a7a))
* **photos:** pinch zoom scales the whole photo to full-bleed ([4529de4](https://github.com/MarquesCoding/PolarHQ/commit/4529de41f4fbd6f8ae5edff9be0943f1e756841d))
* **photos:** pinch/ctrl-wheel zooms the focused photo; restore sidebar on close ([f24e492](https://github.com/MarquesCoding/PolarHQ/commit/f24e49231a45da0a75e5397a2e222de54ae8794f))
* **photos:** play video/motion assets in the focus viewer (controls, sound, contained) ([a9a45c7](https://github.com/MarquesCoding/PolarHQ/commit/a9a45c7e8ce29a2d34d11159b648730317890142))
* **photos:** ReactBits fluid-glass bar in the WebGL grid (real refraction + mode switch) ([dfc0fb3](https://github.com/MarquesCoding/PolarHQ/commit/dfc0fb3ee78a29cae498eb5b0c70e540e0cd37f1))
* **photos:** real Infinity plane — pannable/zoomable camera over a photo world ([5682636](https://github.com/MarquesCoding/PolarHQ/commit/5682636b7e63345d48e2e249d9e93cdc04d278b6))
* **photos:** redesign the lightbox details panel + fixes ([d6b1c4b](https://github.com/MarquesCoding/PolarHQ/commit/d6b1c4b940847f0a2c4e8ede10b1013115905bc0))
* **photos:** remember lightbox details-panel preference ([459152a](https://github.com/MarquesCoding/PolarHQ/commit/459152a78abf1028e9b144d2e80fee862b9cce00))
* **photos:** right-align chrome, tighten gaps, reliable sidebar inset ([5b9eb7c](https://github.com/MarquesCoding/PolarHQ/commit/5b9eb7c8a7e34923cea6e4b9a5360cf2ba207db6))
* **photos:** right-click context menu in the Lightbox ([#6](https://github.com/MarquesCoding/PolarHQ/issues/6)) ([18047e2](https://github.com/MarquesCoding/PolarHQ/commit/18047e215b19d2aee68dde885596f3c399f27467))
* **photos:** selection bar as a frosted pill; mode switcher/tools yield to it when selecting ([cbc2ef1](https://github.com/MarquesCoding/PolarHQ/commit/cbc2ef1df802fa21a1838aa8ec2b218c16b0cb08))
* **photos:** selection favourite toggles — all favourited -&gt; Unfavourite, mixed/none -&gt; Favourite all (Library/Albums/Tags) ([2b65e82](https://github.com/MarquesCoding/PolarHQ/commit/2b65e8284d6c39799bc30e84d7e999707d67b51a))
* **photos:** shared-element zoom viewer — FLIP hero + grid dolly-blur ([1de0139](https://github.com/MarquesCoding/PolarHQ/commit/1de0139b360b795c73459659e1571146a45eacfe))
* **photos:** show Kind + Duration in the info panel ([f87688b](https://github.com/MarquesCoding/PolarHQ/commit/f87688b825ec87bbbf55f0af35a7cf17838b2493))
* **photos:** spring-pop the heart when favouriting (focused action + grid tile); favourited heart fills rose ([a05e994](https://github.com/MarquesCoding/PolarHQ/commit/a05e994e6fef3fac74c90c86c85d0b2cce3fffdb))
* **photos:** stop the tab-crash on huge encrypted videos in the viewer ([848f298](https://github.com/MarquesCoding/PolarHQ/commit/848f2980abf1b333792d8ecc2004ca12f2018ef2))
* **photos:** success feedback morphs the resizer/sort pill into an inline notice (grid) instead of a floating toast ([c4b1f61](https://github.com/MarquesCoding/PolarHQ/commit/c4b1f6139b4842a4b9fb6390aa29957fad221620))
* **photos:** thin thumbless size slider that reveals on hover/pinch ([f892858](https://github.com/MarquesCoding/PolarHQ/commit/f892858b3d52f3af279a21f42da01ae5f7c2785a))
* **photos:** thumbnail filmstrip in the focused viewer — windowed strip, click to jump, toggle in the actions row (persisted) ([d058bb7](https://github.com/MarquesCoding/PolarHQ/commit/d058bb733cc1638031f3268c4b04fe2b420dca2b))
* **photos:** tile resizer in the bottom-right chrome next to the mode switcher ([c839440](https://github.com/MarquesCoding/PolarHQ/commit/c8394400e363c0c95189a03cd5830c1227ed82b3))
* **photos:** top-bar actions, richer empty states, fixes ([1cd8217](https://github.com/MarquesCoding/PolarHQ/commit/1cd8217b58c82348c768733edda4d23ba1e9afa7))
* **photos:** unified morphing bottom chrome + even padding + kill top bar ([4b6c3d5](https://github.com/MarquesCoding/PolarHQ/commit/4b6c3d5d589260fc4e4e8788df4d84d01de79457))
* **photos:** WebGL glass photo grid (three.js/r3f) refracting real photos ([c641117](https://github.com/MarquesCoding/PolarHQ/commit/c641117ab9a53869f84bebff68d78658cf268c07))
* **photos:** windowed lightbox + minimal toolbar + animated filmstrip ([30b41c4](https://github.com/MarquesCoding/PolarHQ/commit/30b41c4ee314e1ba250e3e1482e9d4103f5e5c41))
* **photos:** wire Favourites/Trash/Tags to the grid-only workspace via CollectionView ([dbfe2b9](https://github.com/MarquesCoding/PolarHQ/commit/dbfe2b9670c51e26c26bb0b590be8ad3d7186fd8))
* **photos:** workspace foundation — asset entities + grid layout (Phase 1) ([a5dab81](https://github.com/MarquesCoding/PolarHQ/commit/a5dab812bd3ba310cb5248b737ab034f1ad09515))
* **photos:** zooming back out re-opens the sidebar ([6f92671](https://github.com/MarquesCoding/PolarHQ/commit/6f92671a99adec19c298458ce4cf99f3f7b6b70f))
* **seed-demo:** Flickr provider with real EXIF/GPS metadata (real-only by default) ([e3b02ba](https://github.com/MarquesCoding/PolarHQ/commit/e3b02ba7553058e533e75b5bcdfb32ad35241a2f))
* **seed-demo:** MAX_SEED_GB cap to protect the target disk ([2c67dc2](https://github.com/MarquesCoding/PolarHQ/commit/2c67dc2733845c72cb3959699dc24ac983859a82))
* **seed-demo:** real Unsplash fetch (topic-varied, high-res) + purge tool ([374f621](https://github.com/MarquesCoding/PolarHQ/commit/374f621a2e454b28cdb078355116b9f6f68f478b))
* **seed-demo:** topic-varied Pexels fetch (full-res photos + HD video) + Wikimedia provider ([35e31b8](https://github.com/MarquesCoding/PolarHQ/commit/35e31b8b5bfbe2f4a28320dbaa4c6893df9ac9ea))
* **settings:** Admin scope in the settings overlay ([6e8055b](https://github.com/MarquesCoding/PolarHQ/commit/6e8055b4f1fd0864b90bd0c0ea1cf3b5ec67e5a2))
* **settings:** Discord-style settings overlay shell + Account scope ([d896fe7](https://github.com/MarquesCoding/PolarHQ/commit/d896fe7eec80e8bf36fbc6d7cb82286e15745c7e))
* **setup:** name the instance during install — instanceName in setup status/complete; Cloud device in the Drive sidebar shows the instance name (falls back to 'Cloud') ([5574a3f](https://github.com/MarquesCoding/PolarHQ/commit/5574a3f34061921958366a0ace6630470f4e3a36))
* **setup:** send fresh instances to /setup instead of a dead-end sign-in ([8c4c866](https://github.com/MarquesCoding/PolarHQ/commit/8c4c866c8f34351f665ccb2a61ff7d9c975e86b7))
* **sheets:** charts (bar, line, pie) ([e01ec40](https://github.com/MarquesCoding/PolarHQ/commit/e01ec4049f7c84eeadb93347d07b8adbf99a2db2))
* **sheets:** conditional formatting rules ([844c571](https://github.com/MarquesCoding/PolarHQ/commit/844c57176aaf62eca76281922f298825f842a10d))
* **sheets:** data validation rules ([7cbf786](https://github.com/MarquesCoding/PolarHQ/commit/7cbf78688f6759d2524aa6ee381bf6a61d15c6da))
* **sheets:** formula reference highlighting and autocomplete descriptions ([fce0b49](https://github.com/MarquesCoding/PolarHQ/commit/fce0b49e54e6e91b9f188d169554e07d4c6773c1))
* **sheets:** freeze columns and formula autocomplete ([4406962](https://github.com/MarquesCoding/PolarHQ/commit/4406962d332878836ff3a48cd712b14668ebd81f))
* **sheets:** full number formats, palette color picker, nucleo icon + dynamic title ([bc28856](https://github.com/MarquesCoding/PolarHQ/commit/bc288560694ec419058fa2a4dbedf4fcf050fad5))
* **sheets:** in-cell formula editor with autocomplete + disable overscroll ([4d892f1](https://github.com/MarquesCoding/PolarHQ/commit/4d892f13e77dd93f08ab2f7f3f66e6d41197306e))
* **sheets:** multiple sheet tabs with cross-sheet formulas ([d4316bc](https://github.com/MarquesCoding/PolarHQ/commit/d4316bc35aacccd61338b1fab286b02496b1a411))
* **sheets:** render cell formatting and fix data-integrity bugs ([b736443](https://github.com/MarquesCoding/PolarHQ/commit/b7364432137ba06806244f36b130726e133df677))
* **sheets:** self-managed in-cell editor with click-to-insert references ([952c237](https://github.com/MarquesCoding/PolarHQ/commit/952c2370c4c671e580ff0f2730bf162b425363c8))
* **shell:** collapsible sidebar + mobile drawer ([48b23bb](https://github.com/MarquesCoding/PolarHQ/commit/48b23bbe32cea283f0dc9ab7ca9a3cb72c2f8252))
* **shell:** extract shared FloatingShell; apply Photos-style floating layout to Docs/Sheets/Whiteboards too ([cb533fc](https://github.com/MarquesCoding/PolarHQ/commit/cb533fc15ac9936805ac7f00172cc56b508b161f))
* **shell:** frosted top bar — content scrolls under a translucent, blurred header ([b07f4c4](https://github.com/MarquesCoding/PolarHQ/commit/b07f4c40fd114ec0cef3eb9ff4af83a573d41c4d))
* **shell:** hide the version/changelog footer when running from a dev server (coreConfig.dev) ([fb10edb](https://github.com/MarquesCoding/PolarHQ/commit/fb10edb15f2ab626ee93ec81a4ace363f1cd0bf6))
* **shell:** PolarHQ brand header at the top of the sidebar ([60a8940](https://github.com/MarquesCoding/PolarHQ/commit/60a89407da43e195e1eccd400d01b5ca90029b60))
* **shortcuts:** ⌘K command palette, central registry & global key chords ([#7](https://github.com/MarquesCoding/PolarHQ/issues/7)) ([746570b](https://github.com/MarquesCoding/PolarHQ/commit/746570b2f0aaa5112157d1ad4f27f1c6ca70ceea))
* **storage:** animate usage bar (motion) + count-up total (NumberFlow) ([7b3b629](https://github.com/MarquesCoding/PolarHQ/commit/7b3b62904b724c2cd644f0973a02b8bd42cdde34))
* **storage:** storage breakdown dialog from the sidebar usage card ([b9036d5](https://github.com/MarquesCoding/PolarHQ/commit/b9036d5bca9c798c4b2ec9e41e861405f744e150))
* **suite:** fullscreen Office editors, Glide sheets grid, Office import/export, mapcn maps ([a8494c3](https://github.com/MarquesCoding/PolarHQ/commit/a8494c3aa975b9af3325cc53078fdecf513f6760))
* **suite:** remove Notes and Presentations apps ([d2bcbb3](https://github.com/MarquesCoding/PolarHQ/commit/d2bcbb394267df8e18240aa6eb21b83ca5fcbdd4))
* **sync:** desktop folder sync — local→Drive push (Phase 2) ([#8](https://github.com/MarquesCoding/PolarHQ/issues/8)) ([dfe9c6c](https://github.com/MarquesCoding/PolarHQ/commit/dfe9c6c06080f7f429e8818fce520add3ad64153))
* **tooling:** seed-demo — bulk E2E demo-media uploader ([0ae60de](https://github.com/MarquesCoding/PolarHQ/commit/0ae60de372322c206a79906d30d49131e588ac74))
* **ui:** first-class Jobs panel in the sidebar ([00ceeec](https://github.com/MarquesCoding/PolarHQ/commit/00ceeec7bf26a0b5fefa0612f820791510fbf7e6))
* **ui:** stagger the sidebar nav rows in on app transitions ([306522b](https://github.com/MarquesCoding/PolarHQ/commit/306522b7db1ab40172127c2de6c9c09431ba10c3))
* **uploads:** progress in the tray for streamed Drive downloads (Phase 2b) ([6307ae4](https://github.com/MarquesCoding/PolarHQ/commit/6307ae4d4ea00978b2b5ab358093cae5785eb8c5))
* **uploads:** real progress + surfaced failure reasons ([beccb19](https://github.com/MarquesCoding/PolarHQ/commit/beccb1976f0b7689b2f378f8ff17f2e510e52caf))
* **uploads:** resume chunked uploads through transient failures (Phase 2f) ([26d9b96](https://github.com/MarquesCoding/PolarHQ/commit/26d9b966a2824b9d8921a0b80b40b4a6124a462e))
* **uploads:** size-gated streaming download for large Photos (Phase 2d) ([1585095](https://github.com/MarquesCoding/PolarHQ/commit/158509512ddaaa914f3d12c97c39fda8cdaaa470))
* **uploads:** streaming chunked upload for large Drive files (Phase 1) ([888d6c5](https://github.com/MarquesCoding/PolarHQ/commit/888d6c5800dc7a704e3fbbfeb8b082dbd51e26e4))
* **uploads:** streaming chunked upload for large Photos media (Phase 2c) ([c6c47c0](https://github.com/MarquesCoding/PolarHQ/commit/c6c47c038770dda090e12064fe6a05d3ae723ac6))
* **uploads:** streaming decrypt-to-disk download for large Drive files (Phase 2a) ([50ce1eb](https://github.com/MarquesCoding/PolarHQ/commit/50ce1ebd740997bc28000679515c297ff4583720))
* **web:** first-run onboarding card ([da404e3](https://github.com/MarquesCoding/PolarHQ/commit/da404e34ab5ea13854d3857c93f8f7dfe2bbe9e9))
* **web:** in-app changelog from the sidebar version ([d7059b5](https://github.com/MarquesCoding/PolarHQ/commit/d7059b5ce92ef5be825801b55e994dd8b8059875))
* **web:** onboarding card uses real components + cursor demos ([7a2212d](https://github.com/MarquesCoding/PolarHQ/commit/7a2212df1023e6e9a320955e7a4b9ed82feefb0f))
* **web:** scrim behind the onboarding card ([dd9a062](https://github.com/MarquesCoding/PolarHQ/commit/dd9a06228eb54b347be1030a3c875659660410ab))
* **web:** shared Encrypted badge with end-to-end encryption popover ([5315b06](https://github.com/MarquesCoding/PolarHQ/commit/5315b067bdfffc07d7df877edce9878681540755))
* **web:** Shift+A selects all in Photos and Drive ([38c3847](https://github.com/MarquesCoding/PolarHQ/commit/38c3847d99cc8bf8c23dc0c297ae2a1e88b9192f))
* **web:** theme reveal transition, share glyph, trash tweak ([0689205](https://github.com/MarquesCoding/PolarHQ/commit/0689205ffaf284b088646b414006deba5b82805d))
* **whiteboard:** collaborative infinite whiteboard, native to the suite ([55088ae](https://github.com/MarquesCoding/PolarHQ/commit/55088aed4ecf617901fb90c77e9f3958cd31ef36))
* **whiteboard:** rotation + live-updating selection handles ([1d348eb](https://github.com/MarquesCoding/PolarHQ/commit/1d348eb405e94f1965a85a2ebb8bb9864ca9caa2))


### Fixed

* **api:** trust same-origin + multiple origins (fix 'invalid origin' off-localhost) ([2a4c4b9](https://github.com/MarquesCoding/PolarHQ/commit/2a4c4b9da42e5f30a7b561fdd25f08ae8da969cb))
* **auth:** give every account the User role so apps are accessible ([1925795](https://github.com/MarquesCoding/PolarHQ/commit/1925795af695f2a3d7210fae276252cefe7c58fd))
* broadcast photos.asset.changed on upload + thumbnail ([70013ed](https://github.com/MarquesCoding/PolarHQ/commit/70013edba2e1b9aea5aeac56c314980a6e553487))
* **ci:** unbreak the docker image builds ([193dcf0](https://github.com/MarquesCoding/PolarHQ/commit/193dcf0fc521486b1ef2eb07b74546ccff0c8863))
* **ci:** unbreak the web next build (createContext in RSC) ([af798ea](https://github.com/MarquesCoding/PolarHQ/commit/af798eaa55425ceb40d066faa756a27d4e7bab06))
* **core:** keep the desktop webview off the macOS keychain ([a62be1f](https://github.com/MarquesCoding/PolarHQ/commit/a62be1f741abb3d4e44244f0702dcfb2ec656b32))
* **core:** stop the per-refresh encryption-unlock prompt ([ca93100](https://github.com/MarquesCoding/PolarHQ/commit/ca93100c9b8e4fd5fee866d3dd23817307730cc8))
* **db:** add migration 0002 for schema drift (drive/docs/backup/branding/e2e) ([f546ef6](https://github.com/MarquesCoding/PolarHQ/commit/f546ef6b26c7f733b74e09eb86fcba99f05361b1))
* **desktop:** add Nucleo icon packs so the build resolves ([8e10389](https://github.com/MarquesCoding/PolarHQ/commit/8e10389a5ad023f39baccd26be9a4ef0f50b592a))
* **desktop:** authenticate cross-origin with a bearer token ([f5d473d](https://github.com/MarquesCoding/PolarHQ/commit/f5d473d9df8519ea90eef7b9f8cb467144e5fafd))
* **desktop:** drop the phosphor-&gt;Nucleo icon swap plugin (back to Phosphor icons everywhere) ([ada718a](https://github.com/MarquesCoding/PolarHQ/commit/ada718a5c818fc06a276ddb3ef27628442dde62f))
* **desktop:** folder-sync crash — pick the sync folder via a Rust command instead of the JS dialog plugin (NSOpenPanel crashed the drag-drop-disabled webview on macOS) ([0ed3d40](https://github.com/MarquesCoding/PolarHQ/commit/0ed3d408560e7a3d4d7cdc1947f08be520f5a21f))
* **desktop:** folder-sync froze the UI — make sync_index + sync_read_file async (run the folder walk/hash + file reads on a blocking pool thread, not the main thread) ([5b9bc3e](https://github.com/MarquesCoding/PolarHQ/commit/5b9bc3ecfb9eb27181a428cf121691f43f540e2b))
* **desktop:** numeric app version for the Windows MSI bundle ([245ee75](https://github.com/MarquesCoding/PolarHQ/commit/245ee75492629871423888b803188195bf6df7dc))
* **desktop:** pnpm dev launches the native app, not just Vite ([7d44934](https://github.com/MarquesCoding/PolarHQ/commit/7d44934b3f2212388f39fcc2916fabcc1e0b0835))
* **desktop:** show the real bundle version and keep the keypair unlocked across launches ([b628808](https://github.com/MarquesCoding/PolarHQ/commit/b628808ddb0ee6752d6a7056982092dd444240a3))
* **desktop:** shrink app icon art to ~72% for native macOS sizing ([6245926](https://github.com/MarquesCoding/PolarHQ/commit/624592615673a26258ae36845e763afaafc7daf8))
* **drive:** back to Spacedrive folder/file icons + FolderGrey ([3af95d9](https://github.com/MarquesCoding/PolarHQ/commit/3af95d9ca4b8fb3e8ebfdfa3d9f376b57588e6ce))
* **drive:** live Overview stats + scope view controls to the browser ([f04109a](https://github.com/MarquesCoding/PolarHQ/commit/f04109a1362a0211a25c650c972a00539440283d))
* **i18n:** apply locale on first load + localise SizeControl labels ([0dc1083](https://github.com/MarquesCoding/PolarHQ/commit/0dc1083ca45f0ac62ed4b596b7b62f018470a312))
* **i18n:** date locale prefers the selected language over resolvedLanguage ([a7e4a7c](https://github.com/MarquesCoding/PolarHQ/commit/a7e4a7c4c349c19ed80ed52aa01d1c1bf1cfdf44))
* **i18n:** format dates/times in the active UI language ([ccad708](https://github.com/MarquesCoding/PolarHQ/commit/ccad708a978901304a604dcf7d66c02e7ede054f))
* **i18n:** make module-level translated arrays reactive + localise app names ([00b9231](https://github.com/MarquesCoding/PolarHQ/commit/00b9231be5a2cb065eaf62eba55105eea95b7ba7))
* **i18n:** photo day labels use catalog date names (browser-ICU-independent) ([a0af5dc](https://github.com/MarquesCoding/PolarHQ/commit/a0af5dc3868782c3da4230d1021ee273431114ec))
* **i18n:** rebuild Photos day labels on language change ([6eb9d5a](https://github.com/MarquesCoding/PolarHQ/commit/6eb9d5ad90c5e32205391c7a4683929161ffe348))
* **i18n:** translate SizeControl rounded-corners label + catalog dates everywhere ([d97b351](https://github.com/MarquesCoding/PolarHQ/commit/d97b35124952f2dce789b33deed85f83757e241d))
* **ios:** native iOS 26 TabView, square photo grid, auto-unlock, persistent session ([9c77441](https://github.com/MarquesCoding/PolarHQ/commit/9c774413146a7ae2672ad4b20160c9134b905586))
* **ios:** OrbitCrypto compiles under Swift 6 strict concurrency ([3ae991c](https://github.com/MarquesCoding/PolarHQ/commit/3ae991c2143fbbcbfa10a839542d4e28df5a8bee))
* **ios:** order photos by capture date to match web (takenAt ?? createdAt) ([1fbb2b0](https://github.com/MarquesCoding/PolarHQ/commit/1fbb2b0141a333e573eafd2eba0ea46007602afc))
* **ios:** paginate Photos to load the full library (was capped at one page) ([eca287a](https://github.com/MarquesCoding/PolarHQ/commit/eca287afc80a75cf412005732adb65cccc6bb4f2))
* **ios:** persist login + E2E keys reliably (Keychain w/ UserDefaults fallback) ([c682908](https://github.com/MarquesCoding/PolarHQ/commit/c682908939a57f166ed9684f480aaebb1060ca86))
* **ios:** send Origin header so better-auth accepts native sign-in ([4a0258e](https://github.com/MarquesCoding/PolarHQ/commit/4a0258e9d9dfaa625c244f795c9b1d60a07b2362))
* **ios:** sort photos by parsed capture date (mixed ISO precision) ([ea3df3a](https://github.com/MarquesCoding/PolarHQ/commit/ea3df3aa6545be431bb524bbb0ffcc01034f3808))
* **ios:** surface the real sign-in error (status + URL + server message) ([d02f6d8](https://github.com/MarquesCoding/PolarHQ/commit/d02f6d82a9a17b1513f4e4c167e1b66041f08eb1))
* **limits:** default storage quota to unlimited, not a hardcoded 50GB ([00aaccd](https://github.com/MarquesCoding/PolarHQ/commit/00aaccd4b611c569a44b0ff24ea8350511a3e43d))
* **marketing:** dark theme + de-round buttons to match the web ([19970c0](https://github.com/MarquesCoding/PolarHQ/commit/19970c0e69501555bda6c3df99ffcf80af9794b8))
* **marketing:** light-mode legibility, em-dash-free copy, home top-glow ([0ada742](https://github.com/MarquesCoding/PolarHQ/commit/0ada742e6e81e7cf13bb53f4806fe3aeeab11b62))
* **marketing:** link the Planet of Lana artwork credit to its Steam page ([497be33](https://github.com/MarquesCoding/PolarHQ/commit/497be33031eccdf2fc89653f07121f0f669fc456))
* **marketing:** photos sweep to top, screen anchored at bottom (cut off) ([d4b2d0c](https://github.com/MarquesCoding/PolarHQ/commit/d4b2d0c0c53be91272faf2b1acd264d7eb5d1df5))
* **marketing:** replace deleted workspace-switcher in the Photos demo ([639b52f](https://github.com/MarquesCoding/PolarHQ/commit/639b52f87bceb12f02c0e92c6b016850df79ef91))
* **marketing:** show the parallax ridge on mobile ([827b6c1](https://github.com/MarquesCoding/PolarHQ/commit/827b6c1b052ff0aa5ef16f41d4f75c281e4d74fb))
* **marketing:** use phosphor SSR entry in server components ([463a886](https://github.com/MarquesCoding/PolarHQ/commit/463a886f08883ff9c0216dbe9e202f04a3f17333))
* **mobile:** account sheet avatar no longer overlaps the grabber on iOS ([2bf82e2](https://github.com/MarquesCoding/PolarHQ/commit/2bf82e27d9892c4d511a93037b2d51febdfec47a))
* **mobile:** account sheet opens full-height (single detent) ([b427fb1](https://github.com/MarquesCoding/PolarHQ/commit/b427fb1b2cbf560903abc684bd7c119f907022f3))
* **mobile:** add iOS top clearance on formSheets (account, details) ([db40dbe](https://github.com/MarquesCoding/PolarHQ/commit/db40dbed839b78a0d8875477f13d3b75866abbc8))
* **mobile:** clearer top gap under the grabber on the iOS account sheet ([f6e5946](https://github.com/MarquesCoding/PolarHQ/commit/f6e59469e3b9d4381f6db673036883ac218b045c))
* **mobile:** correct top spacing on iOS form sheets ([f741941](https://github.com/MarquesCoding/PolarHQ/commit/f74194185bc7a502eb704a13524414f2364b4962))
* **mobile:** Drive folder loading state no longer jumps mid-slide ([0da454b](https://github.com/MarquesCoding/PolarHQ/commit/0da454b8617c858bcf1c71237534511a6df22294))
* **mobile:** Drive folder slide works on iOS + keep avatar in subfolders ([b83c0c5](https://github.com/MarquesCoding/PolarHQ/commit/b83c0c5a38568a3df04621e20de92842c52b7be7))
* **mobile:** photo viewer top bar clears the notch/Dynamic Island on iOS ([c9c46ff](https://github.com/MarquesCoding/PolarHQ/commit/c9c46ffeadb6a06d75af269f4ce3b5d7b19ebbf3))
* **mobile:** remove unlock prompt — unlock automatically at sign-in ([09800b7](https://github.com/MarquesCoding/PolarHQ/commit/09800b7e190c01a4c51b4d545f1a76eab1b1c149))
* **mobile:** unlock prompt for locked sessions ([1711085](https://github.com/MarquesCoding/PolarHQ/commit/1711085ccca4b6e69d9b064bddc9014b9400c05a))
* **mobile:** use expo-media-library/legacy for saveToLibraryAsync ([1778f02](https://github.com/MarquesCoding/PolarHQ/commit/1778f02659a86caf2765b1a6febeafd100d109ff))
* **photos,admin:** key on collapsed-sidebar tooltip wrappers ([caf231e](https://github.com/MarquesCoding/PolarHQ/commit/caf231e44729c8bfa362b9b5109fbc15e000aff6))
* **photos:** adaptive action icons inherit the pill's contrast colour (dark icons on a light pill) ([6774e56](https://github.com/MarquesCoding/PolarHQ/commit/6774e56a3308a871517a5e3ca401e14e8ec9cd33))
* **photos:** bound upload concurrency to fix ERR_INSUFFICIENT_RESOURCES ([d339489](https://github.com/MarquesCoding/PolarHQ/commit/d339489a74667b73af247e0a163477490b970455))
* **photos:** center day labels, harden map sizing, drop raw button ([049ab04](https://github.com/MarquesCoding/PolarHQ/commit/049ab0496f2fcf011492677c7bd775ecd8b9347a))
* **photos:** clamp marquee to the container (no horizontal page scroll); center the focus chrome (filename/arrows) on the image, not the viewport ([f1fdc60](https://github.com/MarquesCoding/PolarHQ/commit/f1fdc6036930c467baaee97f1e071696bef993ec))
* **photos:** collapse the sidebar only while zoomed into a photo ([3d14fcc](https://github.com/MarquesCoding/PolarHQ/commit/3d14fcc45ae2d3e8453d5e90296293f10731a1dc))
* **photos:** details panel — clip to card (no double-scroll), even 12px inset ([cfd5281](https://github.com/MarquesCoding/PolarHQ/commit/cfd528185ec7da18d687321ef894acb81a8b7dd1))
* **photos:** don't pass empty-string src to the peek-preview image ([16c9b3a](https://github.com/MarquesCoding/PolarHQ/commit/16c9b3afcc71df4462ba71ece2d9a79ca31d725b))
* **photos:** drag-select from empty grid margins (right + below) ([337fec6](https://github.com/MarquesCoding/PolarHQ/commit/337fec682fc6f96dd30a47a5d5155ac28c3cc8c6))
* **photos:** drop crossOrigin on the luminance probe so decrypted blob thumbnails are actually readable (chrome now adapts instead of always falling back) ([52ca8b5](https://github.com/MarquesCoding/PolarHQ/commit/52ca8b50a6ac0161289e091df806fd5b03ff0768))
* **photos:** drop the rounded corners on a zoomed-in focused image (full-bleed, no border) ([a3a7c1f](https://github.com/MarquesCoding/PolarHQ/commit/a3a7c1fb6cc297433adf54e8dc82e93c5b24ce84))
* **photos:** drop top scroll-blur in the floating layout; fix pill border-radius glitch ([ab3e206](https://github.com/MarquesCoding/PolarHQ/commit/ab3e2068db2a145495e4750fec904acdd4f50b07))
* **photos:** entities back to motion.div; defer original decrypt off the open frame ([bc5179d](https://github.com/MarquesCoding/PolarHQ/commit/bc5179dea613b0f0f5180039467e44e3a9232db4))
* **photos:** filename pill reverts from zoom% to the name shortly after you stop zooming ([bd22619](https://github.com/MarquesCoding/PolarHQ/commit/bd226196db14f576bf4f8fef1f22a2a74be8709b))
* **photos:** filmstrip centers on the content (offset by the sidebar), not the viewport ([397bd6f](https://github.com/MarquesCoding/PolarHQ/commit/397bd6f66f21aac15250c554a69f5de4f69ce45e))
* **photos:** filmstrip shrinks + recenters within the content area when the details panel is open ([23e5240](https://github.com/MarquesCoding/PolarHQ/commit/23e5240e8c53c390f87797a99d6dc78eecbaa69c))
* **photos:** force no position/size tween on paged-in photo; unclip focused image ([3aa2319](https://github.com/MarquesCoding/PolarHQ/commit/3aa231984e04519b47b1f6a34e818d59e358e05a))
* **photos:** grace delay on tools-panel hover so moving up to the panel doesn't drop it ([83210e8](https://github.com/MarquesCoding/PolarHQ/commit/83210e80a7f91be090a487f1fdd85f3090bf9e33))
* **photos:** Infinity mode buttons work (drop pointer-capture that stole clicks) + bouncier open/repel spring ([4b72cd9](https://github.com/MarquesCoding/PolarHQ/commit/4b72cd9b388ace760e15db1dae7d2702c7c2190d))
* **photos:** Infinity pinch zooms at the pinch point, not the center (use gesture clientX/Y + incremental scale) ([24a8f24](https://github.com/MarquesCoding/PolarHQ/commit/24a8f2438d14c681f13776bdeb0e59feb1f15acb))
* **photos:** keep MediaPlayer controls visible in the viewer (auto-hide only in fullscreen); details panel padding back to a clear 16px ([7a640b8](https://github.com/MarquesCoding/PolarHQ/commit/7a640b8ad6c1edf84b21fefbeae12d047d7f3f28))
* **photos:** keep motion.div entities (smooth animations preferred over scroll FPS) ([ddaaeb5](https://github.com/MarquesCoding/PolarHQ/commit/ddaaeb5526745b72a047fdb0de57d2edad842ce7))
* **photos:** make the grid margins selectable (inset baked into layout) ([1dbf935](https://github.com/MarquesCoding/PolarHQ/commit/1dbf935684da5bac859c3ff74fa3a5a6e2ba9029))
* **photos:** measure the visible sidebar card so the zoomed-out photo clears it ([454e1a7](https://github.com/MarquesCoding/PolarHQ/commit/454e1a75c275a993a5c1bae69b882b85ac816316))
* **photos:** merge focused-zoom + grid-resize pinch into one handler (fixes broken image pinch) ([21b6cde](https://github.com/MarquesCoding/PolarHQ/commit/21b6cdec1a174c1680b4fdf53b44368f0ccda3ac))
* **photos:** move theme switch below profile + version, shrink it ([74fdbe5](https://github.com/MarquesCoding/PolarHQ/commit/74fdbe5f19bd732f10e73c1dce23546f8ffd6dd5))
* **photos:** navigation crossfades at center instead of flying in from the tile ([748e6ec](https://github.com/MarquesCoding/PolarHQ/commit/748e6ecdbf8bb3cef02d94b0c170d074b851bf4e))
* **photos:** only the slider bar reveals on hover/pinch; magnifier + ×N stay put ([2efeda1](https://github.com/MarquesCoding/PolarHQ/commit/2efeda170dce2c84445ce1680e0ce389075a9bee))
* **photos:** order the timeline by capture date, not upload time ([657553b](https://github.com/MarquesCoding/PolarHQ/commit/657553b29b4c051dc9ea098b4490fceca8200341))
* **photos:** pause a focused video when you navigate away (don't keep playing in the grid) ([0e87d9f](https://github.com/MarquesCoding/PolarHQ/commit/0e87d9ffcc11a1bce9b95ced446f966c4dfcf7a8))
* **photos:** pin timeline rail to the viewport, not content height ([6660d26](https://github.com/MarquesCoding/PolarHQ/commit/6660d26ea27ae8a68301d35b5cbade32c4b325a5))
* **photos:** pin timeline rail via a zero-height sticky anchor ([eea8084](https://github.com/MarquesCoding/PolarHQ/commit/eea80845414e352f4ec9926b3e84f1693be9b228))
* **photos:** remove bare DropdownMenuLabel that crashed the sort menu (needs a menu group) ([80bcf4e](https://github.com/MarquesCoding/PolarHQ/commit/80bcf4e61d033bf78cf28868407754c6295cdbbe))
* **photos:** remove liquid glass (CSS pills + WebGL glass grid) ([4870f88](https://github.com/MarquesCoding/PolarHQ/commit/4870f8855218b22d2d15f7dda6da78fd96af6903))
* **photos:** remove the actions-group border + the blue active state; exact icons ([115826d](https://github.com/MarquesCoding/PolarHQ/commit/115826d90c9ac7423084ade28ce3337f103626e7))
* **photos:** resizer & sort hover panels are mutually exclusive (no overlap when moving between them) ([b3de8e8](https://github.com/MarquesCoding/PolarHQ/commit/b3de8e8eafd03dc3a3b237abd7502f93e53a0752))
* **photos:** sample luminance from the on-screen focused image (guaranteed decoded + same-origin) instead of reloading the thumbnail blob ([8af0e81](https://github.com/MarquesCoding/PolarHQ/commit/8af0e812506cbd7f9d9405754ca1cee7b63eb5ff))
* **photos:** scope tools-hover to size pill; sort on hover (resizer-style panel); square+hidedates; full-cover focus backdrop ([207c055](https://github.com/MarquesCoding/PolarHQ/commit/207c05512ceca5f601e725e21f2023dec6991a90))
* **photos:** sidebar clearance + no background fly on navigation ([0140308](https://github.com/MarquesCoding/PolarHQ/commit/01403081c114fcaccb49865b6a820ea67e89eb0e))
* **photos:** size slider track now shows (fixed-width wrapper vs data-horizontal:w-full) ([1b5f6a1](https://github.com/MarquesCoding/PolarHQ/commit/1b5f6a1dfb1f7e3951e011acaddbc3ed85b13fca))
* **photos:** smoother sort&lt;-&gt;actions morph (no nested layout, delayed content reveal) + details panel padding matches the sidebar (8px) ([809a733](https://github.com/MarquesCoding/PolarHQ/commit/809a73306d846078f9f5506f2fc492a943e4bfab))
* **photos:** soften the focus backdrop blur (xl-&gt;sm) ([f6ba8bb](https://github.com/MarquesCoding/PolarHQ/commit/f6ba8bbfd465e4781fc230503dae7fc00c64760b))
* **photos:** stationary timeline rail via portal + flat-shell polish ([4b6464f](https://github.com/MarquesCoding/PolarHQ/commit/4b6464f15bf1b0776664385620a3c1ae5842201e))
* **photos:** stop sort crash + rework bottom chrome ([1764629](https://github.com/MarquesCoding/PolarHQ/commit/1764629f47a8ebd07e6f65f449b17bb74e0c6a50))
* **photos:** stop toggling sidebar on zoom (fixes image misplaced after zoom in/out); filmstrip thumbs fall back to placeholder on decode error ([1c113d5](https://github.com/MarquesCoding/PolarHQ/commit/1c113d5cbf46f5d535b3cb3b6b6cbe450503005b))
* **photos:** timeline scrubber broken under the overlay topbar ([d953ce7](https://github.com/MarquesCoding/PolarHQ/commit/d953ce7e9ae98cbc22e9f3a28e90fc1f49b508ba))
* **photos:** trash menu sizes to its label (was collapsed); download action shows spinner→check with a visible min duration ([443bb30](https://github.com/MarquesCoding/PolarHQ/commit/443bb30ef3bcfc58bd1450a4f9d1e424e7870c25))
* **photos:** use nucleo duplicate icon for lightbox copy action ([809671f](https://github.com/MarquesCoding/PolarHQ/commit/809671f65f6eac603d62ef70db37b6bd77377564))
* **photos:** white favourite heart; focused actions shift left of the open details panel ([18734e3](https://github.com/MarquesCoding/PolarHQ/commit/18734e3b528fbd36ae6ae09a7a201d166da29a32))
* **rtl:** mirror the shared shell + isolate mixed-direction numbers ([0d862aa](https://github.com/MarquesCoding/PolarHQ/commit/0d862aa297179b60e7c9426d9056b49d0044b1d3))
* **seed-demo:** backoff + throttle on Flickr CDN downloads ([2530fa1](https://github.com/MarquesCoding/PolarHQ/commit/2530fa1794c7d9ef8878adb6dcabd2dfb98788fa))
* **seed-demo:** send trusted Origin on sign-in ([c37497c](https://github.com/MarquesCoding/PolarHQ/commit/c37497cc7bda8c1b264abbde98102c214f9f26b2))
* **settings:** narrower modal + centered content; close button clears pane actions; draggable window (tauri drag region on backdrop + header) ([d323fc0](https://github.com/MarquesCoding/PolarHQ/commit/d323fc06132d9f9c0bc035dcc83b74b250f96495))
* **shell:** render the PolarHQ brand logo via a plain img ([0650643](https://github.com/MarquesCoding/PolarHQ/commit/06506433fcf2de48a5ea3b4751b2a9d6bf392cb5))
* **shell:** roll back the top bar + sidebar redesign ([cb94374](https://github.com/MarquesCoding/PolarHQ/commit/cb943742dc792fbde9316bd9fa218bafcd1ff540))
* **shell:** show a gated Admin link in the account menu ([a2e5f23](https://github.com/MarquesCoding/PolarHQ/commit/a2e5f238ae93907ea6d890737122bc783b7b400b))
* **shell:** show the real app version in the sidebar ([3a1af58](https://github.com/MarquesCoding/PolarHQ/commit/3a1af588140566815cdfd5ec34d7a49209119f2f))
* **storage:** make the usage bar + total actually animate, in card and dialog ([91cd77e](https://github.com/MarquesCoding/PolarHQ/commit/91cd77ec9e3911ca409f5c47ec2d647e5d3fb671))
* **storage:** show "Unlimited" when no storage quota is set ([9edb69a](https://github.com/MarquesCoding/PolarHQ/commit/9edb69ac71fc12796fd6e91c1270cb37511e0d03))
* **ui:** stop the browser autofilling search inputs with the user's email ([0025d58](https://github.com/MarquesCoding/PolarHQ/commit/0025d5868f710fc5fe5c7fb7f04a1c6d0ed38fa1))
* **uploads:** keep uploads alive across app navigation ([2bc1384](https://github.com/MarquesCoding/PolarHQ/commit/2bc13847a3c47cd8584940c6bf36d42f37926c87))
* **video:** analyzeVideo timeout + host nativeMediaUrl hook ([1f79027](https://github.com/MarquesCoding/PolarHQ/commit/1f790273ad6dde66276872e502fe0ac1341718b0))
* **web:** add glide-data-grid portal target for the spreadsheet overlay editor ([50a2b4c](https://github.com/MarquesCoding/PolarHQ/commit/50a2b4cee1275837d1c15168cbc27286fdd2c0f1))
* **web:** bootstrap E2E encryption at signup, not via a later prompt ([caced14](https://github.com/MarquesCoding/PolarHQ/commit/caced14c1f804bec9a5972b37474b1e56e97b8bb))
* **web:** derive vite preview allowedHosts from env ([2575090](https://github.com/MarquesCoding/PolarHQ/commit/2575090169db7a5ee7e8dd664d6022c69964453a))
* **web:** don't bounce a signed-in user back to /setup on stale status ([aa48a0a](https://github.com/MarquesCoding/PolarHQ/commit/aa48a0ab2cc90c70f5091df04eed837ca96aaccc))
* **whiteboard:** visible canvas, working arrows/text, pan/zoom feedback, images, keybinds ([416b3ef](https://github.com/MarquesCoding/PolarHQ/commit/416b3ef6345053cdba1c9a2bea0d13d84377a7a2))
* widen changelog dialog past base sm cap; make hero artwork link clickable ([9c191f5](https://github.com/MarquesCoding/PolarHQ/commit/9c191f5a0f3268df2b6ee206d7dc0eafd3e37df8))


### Improved

* **#1,#2:** lazy-load the Docs/Sheets/Whiteboard editors (out of the initial bundle); optimistic favourite/trash in Photos + debounced WebSocket refetch (no full-feed refetch per action) ([45d32a5](https://github.com/MarquesCoding/PolarHQ/commit/45d32a5f5d1f18043b7afcee7aad8b827fbb6a96))
* **#1:** focused-viewer favourite (+F key) is optimistic too (patch in-place, no refetch) ([73e6c85](https://github.com/MarquesCoding/PolarHQ/commit/73e6c85963f06e5ac5c0633008d0537c6349b801))
* **#3:** feed pages lazily on scroll instead of eager-loading every page on mount (search still eager-loads for client-side filtering) ([4dade9d](https://github.com/MarquesCoding/PolarHQ/commit/4dade9d16be00724978bc5cd46d6e12b476873e8))
* **#4:** memoize Drive NodeCard + stabilize its whole prop chain (lazy dragIds, useCallback select/toggle, ref-delegated open/drop/springInto) — selection/drag now re-renders only the affected cards ([8afa6a0](https://github.com/MarquesCoding/PolarHQ/commit/8afa6a0751a630d4b6724d62f1c40041163e7e50))
* **core:** dedup concurrent wrapped-key fetches (getDocContentKey); Drive thumbnails now cached + deduped like Photos ([2caf8bd](https://github.com/MarquesCoding/PolarHQ/commit/2caf8bde5bc746f557745fce0acd1969c36dde84))
* **core:** extract cross-cutting util/data helpers ([d951f5d](https://github.com/MarquesCoding/PolarHQ/commit/d951f5dede16e6fba37d5de758b80d68b47faefc))
* **core:** extract the data-layer foundation + env injection ([430dcbe](https://github.com/MarquesCoding/PolarHQ/commit/430dcbeb17c52d9119d6713832c4ea873e27436e))
* **core:** extract the relational/E2E data layer ([c0b4b6c](https://github.com/MarquesCoding/PolarHQ/commit/c0b4b6c61db66d5225acbaf8f77712e0e8d4aa1e))
* **core:** start @workspace/core with the crypto module ([733d69a](https://github.com/MarquesCoding/PolarHQ/commit/733d69a2f409ff33ec9e7e21de0d866b30a9db8a))
* decrypt large media (photo originals + motion video) in a Web Worker, off the main thread — synchronous fallback if the worker is unavailable, so loading never depends on it ([eb42a98](https://github.com/MarquesCoding/PolarHQ/commit/eb42a986d612396e8bcbceefcb6e0714777b7800))
* **drive:** lift the sidebar offset to the layout (covers all Drive pages, not just the Browser) ([d8be3a8](https://github.com/MarquesCoding/PolarHQ/commit/d8be3a85691264ae2f592b8e191ac6c0fbc334af))
* **drive:** memoize Browser derived data (filtered/visible/byId/imageNodes were rebuilt every render) + stable actions identity (delegates via ref) ([f6fa822](https://github.com/MarquesCoding/PolarHQ/commit/f6fa822126cd7ef3349343aeaa3f515ccdeecbff))
* **i18n:** extract @workspace/i18n shared package ([957c6e8](https://github.com/MarquesCoding/PolarHQ/commit/957c6e8d9bb0f3c33a8a9a321be13bdf211b392f))
* **i18n:** serve locale catalogs as static files (fixes Turbopack runaway) ([f7c0c22](https://github.com/MarquesCoding/PolarHQ/commit/f7c0c22c9e8401ea0f06f658c9e7493a0cda97de))
* memoize UploadContext value (was a fresh object every render → re-rendered every consumer on each upload tick) ([e723ee1](https://github.com/MarquesCoding/PolarHQ/commit/e723ee1df917cc706146881b5aeeae0caf8f58ce))
* migrate all icons to @phosphor-icons/react; remove tabler + nucleo ([450eeb6](https://github.com/MarquesCoding/PolarHQ/commit/450eeb62b5fd30c8ee6f549e167e7d0f2f3ae114))
* **mobile:** account + details sheets use @gorhom/bottom-sheet ([47c5b74](https://github.com/MarquesCoding/PolarHQ/commit/47c5b74bcf71b8f58f9e46b0cdf0f5810c960566))
* **photos:** blur via CSS not motion; fix overlapping date labels + thin borders ([469b3ab](https://github.com/MarquesCoding/PolarHQ/commit/469b3abccd2d56dd8e96fa2bb52b34c120d3af86))
* **photos:** cache + prefetch decrypted originals in the lightbox ([d148d48](https://github.com/MarquesCoding/PolarHQ/commit/d148d48aa40511b0e5450da561e3312713c8ffff))
* **photos:** contain layout/paint on entities so resizing tiles don't reflow the page ([2b956d9](https://github.com/MarquesCoding/PolarHQ/commit/2b956d9292633b3f4539f553a6cabe3de38f8ca7))
* **photos:** drop per-entity blur — it forced CPU repaint of moving tiles ([546b78b](https://github.com/MarquesCoding/PolarHQ/commit/546b78babbf11ad4ab1c0e4e27daff2d2342a916))
* **photos:** plain-div CSS entities + deferred decrypt (fast scroll + smooth anims) ([b4ea183](https://github.com/MarquesCoding/PolarHQ/commit/b4ea18315a0a5e22e4dae85efcb80748849742e8))
* **photos:** rAF-coalesce pinch/wheel resize (one relayout + localStorage write per frame instead of per wheel event) ([708dd5c](https://github.com/MarquesCoding/PolarHQ/commit/708dd5cf0d38bc9bcf88072c9e734f2cc652dc42))
* **photos:** replace motion.div entities with plain div + CSS transitions ([0244747](https://github.com/MarquesCoding/PolarHQ/commit/02447470173afdf959e9bff5eb4139bfdbef6c29))
* **photos:** reuse one canvas for adaptive-chrome sampling + skip readback when unchanged; marquee only commits selection when the hit-set changes ([c8189ec](https://github.com/MarquesCoding/PolarHQ/commit/c8189ec450e62226ca4fb93c291f6f1c69628001))
* **photos:** shared thumbnail store — decrypt once, dedupe concurrent requests, one hook (useThumbnail) for grid + filmstrip ([edd3365](https://github.com/MarquesCoding/PolarHQ/commit/edd3365a7b8552dd186eadaf2ea05a6128619a72))
* **photos:** smooth pinch zoom + re-center on sidebar collapse ([ae35af5](https://github.com/MarquesCoding/PolarHQ/commit/ae35af526139b21643be5b91c5fb51288318a719))
* **photos:** snap the grid blur on focus instead of animating it ([66329e0](https://github.com/MarquesCoding/PolarHQ/commit/66329e0d6ed31e069ba67cf9e539e6ff4c18a168))
* remove the Jobs panel ([10bbb05](https://github.com/MarquesCoding/PolarHQ/commit/10bbb05495ac8dbed9cb118aa9cc380886a374aa))
* remove the workgroups concept entirely ([fef22e3](https://github.com/MarquesCoding/PolarHQ/commit/fef22e398db3efc221f2f0e401ba5ca96752dbb4))
* **screens:** add the platform adapter (decouple screens from next/*) ([63bfb26](https://github.com/MarquesCoding/PolarHQ/commit/63bfb2670600032e50c0a12aa47ee0f89f949415))
* **screens:** extract app routing into @workspace/screens/router ([3cf2ead](https://github.com/MarquesCoding/PolarHQ/commit/3cf2eadba3462206bf93484d38c68d0bd92a3a03))
* **screens:** extract feature logic + collab/ML hooks ([33824ea](https://github.com/MarquesCoding/PolarHQ/commit/33824eae0c77724f3ae9946aac154fc21b859040))
* **screens:** extract UI hooks + icons into @workspace/screens ([fb3fda5](https://github.com/MarquesCoding/PolarHQ/commit/fb3fda59530b4419d7f83fc1019d52c448f50a73))
* **screens:** finish next/* decoupling (store, lazy, img) ([affaca2](https://github.com/MarquesCoding/PolarHQ/commit/affaca2149f9f8e3418a1f237f0c3e7da59d544e))
* **screens:** relocate screen + component files into @workspace/screens ([f7d4b37](https://github.com/MarquesCoding/PolarHQ/commit/f7d4b372341073df3457ad3b42168aac54faa431))
* **settings:** retire /admin/* + /account routes — shim them to open the overlay + redirect to /photos ([b2dc0a2](https://github.com/MarquesCoding/PolarHQ/commit/b2dc0a214493e63215d8169411657269496350df))
* **sheets:** memoize cfScaleStats (nested per-cell scan for scale conditional formats no longer runs on every render) ([2a8c6ca](https://github.com/MarquesCoding/PolarHQ/commit/2a8c6ca37a432b0dcec95afaf22cff968bd19e9f))
* **shell:** use the shadcn Sidebar for collapse + mobile ([cb55ed6](https://github.com/MarquesCoding/PolarHQ/commit/cb55ed6c517e82ff42488557b28f81b32a4398c7))
* **sidebar:** move the theme switch out of the sidebar ([510f4e8](https://github.com/MarquesCoding/PolarHQ/commit/510f4e8a3e5a6b4a32b644a598bb91f56168fb23))
* **ui:** add slim variant to Slider; use it in Photos + Drive (no duplicated slider styling) ([b12d70d](https://github.com/MarquesCoding/PolarHQ/commit/b12d70da98fabf4ec40239069ce1861b24a9b4a8))
* **ui:** drop the app/view name from the top bar ([fda7bae](https://github.com/MarquesCoding/PolarHQ/commit/fda7bae6df72257491c83c2e222e89729716f698))
* **ui:** extract shared suite shell into packages/ui ([19557f0](https://github.com/MarquesCoding/PolarHQ/commit/19557f0d3c936f561f6fbfe3c1a9353ffa838889))
* **upload:** parallelize encrypted part uploads so one large file saturates the link ([7b90655](https://github.com/MarquesCoding/PolarHQ/commit/7b9065530674352ee0aa3f8dfa4e335215fba5f1))
* **web:** migrate the web app from Next.js to Vite + React Router ([23593de](https://github.com/MarquesCoding/PolarHQ/commit/23593de2e5de26180515d34fd306581b975356a1))
* **web:** remove split-screen application view ([6d86dc5](https://github.com/MarquesCoding/PolarHQ/commit/6d86dc567e1110cd26fd407b3458fd770ff6a5e6))
* **web:** shared flat shell across all apps ([de1ae14](https://github.com/MarquesCoding/PolarHQ/commit/de1ae146526cda75f56a5c9d8bdd02b9dc1457ed))

## [0.5.0] - 2026-06-20 — PolarHQ Desktop + a shared-everything rebuild
<!-- tags: Release, Desktop, Architecture -->

The headline: **PolarHQ Desktop** — a native app for macOS, Windows, and Linux that runs the *exact same code* as the web app. Underneath it is a ground-up re-architecture that lets one codebase power web, desktop, and (soon) mobile, plus a big round of Photos and Drive polish.

### Added
- **PolarHQ Desktop** — a native Tauri 2 app with proper macOS chrome: a Tahoe-rounded window, a floating sidebar, the traffic-light controls tucked into the sidebar, and a frosted top bar. Downloads for macOS (Intel + Apple Silicon), Windows, and Linux are on the releases page.
- **Auto-update** — a Discord-style launch updater that checks for new versions, downloads, installs, and relaunches automatically; signed end-to-end.
- **Pick your server on the sign-in page** — one animated, split-screen sign-in with a *Self-hosted* / *PolarHQ Hosted* (managed storage, coming soon) toggle and server field right above your credentials.
- **The Photos lightbox, now in Drive** — image previews in the file browser use the exact same viewer as Photos, filmstrip and all.
- **A reimagined Drive** — a Library Overview dashboard, a Miller-column (cascading) view, smart views for Recents / Favorites / File Kinds, pinned saved searches, a storage treemap, and proper file-type icons.
- **Inline photo editor** — edit straight inside the lightbox.

### Improved
- **Re-architected into shared packages** — the i18n, data/crypto core, and the entire UI + feature logic now live in `@workspace/*` packages, so web, desktop, and future mobile are thin shells over one codebase with no duplication.
- **Migrated the web app from Next.js to Vite + React Router**, for one consistent stack across every shell.
- **Redesigned the Photos lightbox** — a windowed viewer, an animated filmstrip, an ambient blurred backdrop, a minimal toolbar, and an attached details panel.
- **Frosted top bar** — content scrolls cleanly under a translucent, blurred header.
- Migrated every icon to a single Phosphor set.
- Parallelized encrypted part uploads, so one large file can saturate the connection.

### Fixed
- The desktop webview no longer prompts for the macOS keychain on every launch (the local-cache key is stored as raw bytes there).
- Uploads stay alive across in-app navigation, and chunked uploads resume through transient failures.
- The viewer no longer crashes the tab on very large encrypted videos.

### Notes
- Still alpha, still moving fast. Keep your **recovery code** safe — without your password, encrypted data can't be recovered.

## [0.3.0] - 2026-06-08 — A full office suite — Sheets & Docs
<!-- tags: Release, Docs, Sheets -->

The big one: PolarHQ is now a real office suite. Sheets and Docs ship as full-screen, Google-parity editors, with genuine Microsoft and Google file interop.

### Added
- **Full-screen editors** for Sheets and Docs — each opens in its own tab with a menu bar, toolbar, and (for Sheets) a formula bar.
- **Office import** — open `.xlsx` and `.docx` files directly.
- **Office export** — save documents back out to the Microsoft formats.
- **Open Office files from Drive** — double-click an `.xls`/`.docx` in the file browser and the right editor launches.
- Correct **file-type icons** per document type across Drive.

### Improved
- Rebuilt the spreadsheet grid on **Glide Data Grid** (canvas) — smooth scrolling, real resize, right-click menus, copy/paste, and a correct fill handle.
- Spreadsheets default to 1,000 rows with a button to add more, matching Google Sheets.
- Migrated all maps to **mapcn** for consistent, reliable rendering.
- Rebuilt the marketing site to match the app's dark theme.

### Fixed
- Undo/redo in Sheets after the grid rebuild.
- Column dropdowns no longer scroll the sheet to the bottom.
- Spreadsheet text selection no longer triggers on drag-fill.

## [0.2.1] - 2026-06-06 — iOS reliability & photo fidelity
<!-- tags: Patch, iOS, Fix -->

A focused round of fixes for the new iOS client, mostly about making the library complete and the timeline correct.

### Fixed
- **Paginate the full photo library** — earlier builds capped at a single page.
- Sort photos by **parsed capture date** across mixed-precision timestamps, so mobile matches the web.
- Persist login and **E2E keys reliably** in the Keychain (with a UserDefaults fallback).
- Send the `Origin` header so better-auth accepts native sign-in.
- Surface the **real sign-in error** (status, URL, and server message) instead of a generic failure.

### Improved
- Refresh upload thumbnails immediately after capture.
- Broadcast `photos.asset.changed` on upload so other clients update live.

## [0.2.0] - 2026-06-04 — Native iOS app + live sync
<!-- tags: Release, iOS, Mobile -->

PolarHQ goes mobile. A native SwiftUI client for iOS 26, built on a libsodium core that matches the web's encryption byte-for-byte.

### Added
- **Native iOS client** (SwiftUI) — server setup, bearer auth, and an app-launcher home screen.
- **OrbitCrypto** — a Swift libsodium module with JS parity test vectors; E2E unlock and decrypted Photos thumbnails on-device.
- **Immersive Photos library** — Liquid Glass chrome, pinch-to-zoom across Years / Months / All, and an Apple-style photo viewer with filmstrip and action bar.
- **Drive on iOS** — Files-app-style folder browsing with decrypted names and types, plus rename / delete / new folder.
- **Device & session management** — see and revoke every signed-in client.
- **Live sync** — Photos and Drive changes broadcast across web and mobile in real time.

### Improved
- Bearer-token auth enabled for native clients.
- OrbitCrypto compiles cleanly under Swift 6 strict concurrency.

## [0.1.2] - 2026-05-28 — Photo stacks & the in-depth editor
<!-- tags: Feature, Photos -->

Photos grows up: non-destructive editing and Immich-style stacks.

### Added
- **In-depth photo editor** with non-destructive **before/after stacking** — your original is never overwritten.
- **Photo stacks (collections)** — group related shots behind a single cover with a count.
- **Copy image to clipboard** straight from the lightbox.
- Remember the lightbox **details-panel** preference between sessions.

### Improved
- Continuous-flow layout so sparse days share a row instead of each taking a lonely line.
- HEIC + Apple **Live Photo** upload support.
- Client-side **EXIF** metadata with a location map in the details panel.

### Fixed
- Use the correct nucleo duplicate icon for the lightbox copy action.
- Center day labels and harden map sizing.

## [0.1.1] - 2026-05-18 — Grid, selection & lightbox polish
<!-- tags: Patch, Photos, Fix -->

Dozens of small fixes that make the Photos grid feel solid.

### Added
- **Selection keybinds** with on-screen keyboard hints in the quick-actions bar.
- **NumberFlow** selection count that animates as you select.
- Videos **play on hover** in the grid.

### Fixed
- Stop runaway scroll and stabilise pagination.
- Virtualization range now updates on scroll — no more grid gaps.
- Drag-select works from the empty grid margins (right and below).
- Inset selection ring with a white check, no focus-ring overlap.
- Square-grid corner rounding and continuous-flow row math.

## [0.1.0] - 2026-05-02 — First alpha — Photos, Drive & E2E
<!-- tags: Release, Photos, Drive, Security -->

The first public alpha. The foundation of the whole suite: an encrypted library with Photos and Drive on top.

### Added
- **End-to-end encryption** — a Proton-style single-password model with libsodium; the server only ever stores ciphertext.
- **Photos** — a virtualized, continuous-flow library with encrypted thumbnails.
- **Drive** — folders, uploads, versioning, and trash, with encrypted filenames and bytes.
- **Drive ↔ Photos shared storage** — one stored object, two apps, zero duplication.
- **Admin console** — users, apps, per-user limits, groups, roles, branding, and an audit log.

### Notes
- This is alpha software under active development. Keep your **recovery code** somewhere safe — without your password, encrypted data cannot be recovered.
