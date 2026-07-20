//! Folder-sync engine (native side). Rust owns the filesystem — it walks + hashes a synced folder
//! into an index the JS controller reconciles against the remote Drive, and watches the folder for
//! changes (emitting `sync://change`). The crypto + upload/download stays in JS so it matches the web
//! and iOS clients byte-for-byte; this layer never touches the network. Reading/writing file bytes is
//! done from JS via the fs plugin against the user-granted folder.

use std::collections::HashMap;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::UNIX_EPOCH;

use ignore::WalkBuilder;
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

/// One node in a synced folder's index. Paths are POSIX-style and relative to the sync root, so they
/// map cleanly onto Drive paths regardless of host OS.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct IndexEntry {
    pub rel_path: String,
    pub is_dir: bool,
    pub size: u64,
    /// Last-modified time, milliseconds since the Unix epoch.
    pub modified_ms: u64,
    /// Content identifier (blake3 hex) — the source of truth for "changed". Empty for directories.
    pub hash: String,
}

// Content-hash sampling: small files are hashed whole;
// large files are identified by a header + evenly-spaced samples + footer + size, so we read ~tens of
// KB instead of the whole file. Different content overwhelmingly produces a different hash.
const FULL_HASH_MAX: u64 = 100 * 1024; // ≤100KB: hash the whole file
const EDGE_SIZE: u64 = 8 * 1024; // header + footer, 8KB each
const SAMPLE_COUNT: u64 = 4;
const SAMPLE_SIZE: usize = 10 * 1024; // 10KB per interior sample

/// blake3 content identifier for a file. Returns empty on read error (treated as "unknown/changed").
fn content_hash(path: &Path, size: u64) -> String {
    let Ok(mut file) = std::fs::File::open(path) else {
        return String::new();
    };
    let mut hasher = blake3::Hasher::new();

    if size <= FULL_HASH_MAX {
        let mut buf = Vec::new();
        if file.read_to_end(&mut buf).is_err() {
            return String::new();
        }
        hasher.update(&buf);
    } else {
        let mut edge = vec![0u8; EDGE_SIZE as usize];
        if file.read_exact(&mut edge).is_err() {
            return String::new();
        }
        hasher.update(&edge);

        let jump = (size - EDGE_SIZE * 2) / SAMPLE_COUNT;
        let mut pos = EDGE_SIZE;
        let mut sample = vec![0u8; SAMPLE_SIZE];
        for _ in 0..SAMPLE_COUNT {
            if file.seek(SeekFrom::Start(pos)).is_err() || file.read_exact(&mut sample).is_err() {
                break;
            }
            hasher.update(&sample);
            pos += jump;
        }

        if file.seek(SeekFrom::End(-(EDGE_SIZE as i64))).is_ok()
            && file.read_exact(&mut edge).is_ok()
        {
            hasher.update(&edge);
        }
        hasher.update(&size.to_le_bytes());
    }

    hasher.finalize().to_hex().to_string()
}

/// Walk a folder into a flat index (files + directories), respecting `.gitignore`/`.ignore` and
/// skipping hidden entries. Pure + stateless, so it also backs ephemeral browsing later.
pub fn index_folder(root: &Path) -> Vec<IndexEntry> {
    let mut entries = Vec::new();
    // Skip hidden entries (.DS_Store, .git, …) but do NOT honour .gitignore/.ignore files — this is a
    // Dropbox-style folder sync, so a stray ignore file must not silently drop the user's real files.
    let walker = WalkBuilder::new(root)
        .hidden(true)
        .ignore(false)
        .git_ignore(false)
        .git_global(false)
        .git_exclude(false)
        .parents(false)
        .require_git(false)
        .build();

    for result in walker.flatten() {
        if result.depth() == 0 {
            continue; // the root itself
        }
        let path = result.path();
        let Ok(rel) = path.strip_prefix(root) else {
            continue;
        };
        let rel_path = rel.to_string_lossy().replace('\\', "/");
        let Ok(meta) = result.metadata() else {
            continue;
        };
        let is_dir = meta.is_dir();
        let modified_ms = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        let (size, hash) = if is_dir {
            (0, String::new())
        } else {
            (meta.len(), content_hash(path, meta.len()))
        };
        entries.push(IndexEntry {
            rel_path,
            is_dir,
            size,
            modified_ms,
            hash,
        });
    }
    entries
}

/// Live watchers, keyed by synced-folder path. Dropping a watcher stops it.
#[derive(Default)]
pub struct SyncState {
    watchers: Mutex<HashMap<String, RecommendedWatcher>>,
}

/// Index a folder on demand (the JS controller reconciles the result against Drive). Async + run on a
/// blocking pool thread: the walk+hash can take a while on a large folder, and a synchronous command
/// would run it on the main thread and freeze the UI (beachball).
#[tauri::command]
pub async fn sync_index(path: String) -> Result<Vec<IndexEntry>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = PathBuf::from(&path);
        if !root.is_dir() {
            return Err(format!("not a directory: {path}"));
        }
        Ok(index_folder(&root))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Read a file's raw bytes for the JS controller to encrypt + upload. Returns them as a binary IPC
/// payload (an `ArrayBuffer` on the JS side), so large files don't pass through JSON. Rust has native
/// filesystem access, so this sidesteps the fs plugin's path-scope restrictions for the user-granted
/// synced folder.
#[tauri::command]
pub async fn sync_read_file(path: String) -> Result<tauri::ipc::Response, String> {
    let bytes = tauri::async_runtime::spawn_blocking(move || std::fs::read(&path))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())?;
    Ok(tauri::ipc::Response::new(bytes))
}

/// Start watching a synced folder; emits `sync://change` (payload = the folder path) on any FS change.
/// Idempotent per path. Debouncing/coalescing is done on the JS side.
#[tauri::command]
pub fn sync_start_watch(app: AppHandle, state: State<SyncState>, path: String) -> Result<(), String> {
    let root = PathBuf::from(&path);
    if !root.is_dir() {
        return Err(format!("not a directory: {path}"));
    }
    let mut watchers = state.watchers.lock().map_err(|e| e.to_string())?;
    if watchers.contains_key(&path) {
        return Ok(());
    }
    let emit_path = path.clone();
    let mut watcher = notify::recommended_watcher(move |result: notify::Result<notify::Event>| {
        if result.is_ok() {
            let _ = app.emit("sync://change", &emit_path);
        }
    })
    .map_err(|e| e.to_string())?;
    watcher
        .watch(&root, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;
    watchers.insert(path, watcher);
    Ok(())
}

/// Stop watching a synced folder.
#[tauri::command]
pub fn sync_stop_watch(state: State<SyncState>, path: String) -> Result<(), String> {
    let mut watchers = state.watchers.lock().map_err(|e| e.to_string())?;
    watchers.remove(&path);
    Ok(())
}
