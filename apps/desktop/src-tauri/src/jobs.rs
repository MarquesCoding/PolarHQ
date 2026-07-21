//! Background job manager — the single source of truth for long-running desktop actions.
//!
//! Every long action (folder sync, 3D-splat generation, SHARP setup, uploads/downloads driven from
//! the webview, imports, …) is registered here as a [`Job`] with live progress, and streamed to the
//! UI over a single `job://update` event. Jobs are persisted to `jobs.json` (via the store plugin) so
//! they survive a webview reload or app restart; on load, anything left running is marked
//! [`JobState::Interrupted`] so the frontend can re-queue what's resumable. Rust-native actions call
//! these methods directly; JS-orchestrated actions drive them over the `job_*` commands.

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "jobs.json";
const STORE_KEY: &str = "jobs";

#[derive(Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum JobState {
    Queued,
    Running,
    Done,
    Failed,
    Cancelled,
    Interrupted,
}

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobProgress {
    pub done: u64,
    pub total: u64,
    pub current: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Job {
    pub id: String,
    /// A stable per-action key so retries/dedup can find an existing job (e.g. a synced folder id).
    pub key: Option<String>,
    pub kind: String,
    pub name: String,
    pub state: JobState,
    pub progress: JobProgress,
    pub error: Option<String>,
    pub retriable: bool,
    pub created_at: u64,
    pub updated_at: u64,
}

/// A partial update applied to a job — the shape the webview sends over `job_report`.
#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobPatch {
    pub state: Option<JobState>,
    pub done: Option<u64>,
    pub total: Option<u64>,
    pub current: Option<Option<String>>,
    pub error: Option<Option<String>>,
    pub name: Option<String>,
}

#[derive(Default)]
pub struct JobManager {
    jobs: Mutex<HashMap<String, Job>>,
    cancels: Mutex<HashMap<String, Arc<AtomicBool>>>,
    seq: AtomicU64,
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

impl JobManager {
    fn next_id(&self) -> String {
        format!("job-{}-{}", now_ms(), self.seq.fetch_add(1, Ordering::Relaxed))
    }

    fn emit(app: &AppHandle, job: &Job) {
        let _ = app.emit("job://update", job);
    }

    fn snapshot(&self) -> Vec<Job> {
        let jobs = self.jobs.lock().unwrap();
        let mut list: Vec<Job> = jobs.values().cloned().collect();
        list.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        list
    }

    /// Persist the current job set so it survives a reload/restart.
    fn persist(&self, app: &AppHandle) {
        if let Ok(store) = app.store(STORE_FILE) {
            if let Ok(value) = serde_json::to_value(self.snapshot()) {
                store.set(STORE_KEY, value);
                let _ = store.save();
            }
        }
    }

    /// Create a job in the `Queued` state and return its id (plus a fresh cancel token).
    pub fn create(&self, app: &AppHandle, kind: &str, name: &str, key: Option<String>) -> String {
        let id = self.next_id();
        let ts = now_ms();
        let job = Job {
            id: id.clone(),
            key,
            kind: kind.to_string(),
            name: name.to_string(),
            state: JobState::Queued,
            progress: JobProgress::default(),
            error: None,
            retriable: false,
            created_at: ts,
            updated_at: ts,
        };
        self.cancels
            .lock()
            .unwrap()
            .insert(id.clone(), Arc::new(AtomicBool::new(false)));
        self.jobs.lock().unwrap().insert(id.clone(), job.clone());
        JobManager::emit(app, &job);
        self.persist(app);
        id
    }

    /// Apply a partial update to a job and re-emit it. Persists only on a state transition, so
    /// per-file progress ticks stay in-memory (no disk write per file during a big sync).
    pub fn apply(&self, app: &AppHandle, id: &str, patch: JobPatch) {
        let (updated, state_changed) = {
            let mut jobs = self.jobs.lock().unwrap();
            let Some(job) = jobs.get_mut(id) else { return };
            let previous_state = job.state;
            if let Some(state) = patch.state {
                job.state = state;
            }
            if let Some(done) = patch.done {
                job.progress.done = done;
            }
            if let Some(total) = patch.total {
                job.progress.total = total;
            }
            if let Some(current) = patch.current {
                job.progress.current = current;
            }
            if let Some(error) = patch.error {
                job.error = error;
            }
            if let Some(name) = patch.name {
                job.name = name;
            }
            job.updated_at = now_ms();
            (job.clone(), job.state != previous_state)
        };
        JobManager::emit(app, &updated);
        if state_changed {
            self.persist(app);
        }
    }

    /// Convenience for Rust-native actions: set progress.
    pub fn progress(&self, app: &AppHandle, id: &str, done: u64, total: u64, current: Option<String>) {
        self.apply(
            app,
            id,
            JobPatch {
                state: Some(JobState::Running),
                done: Some(done),
                total: Some(total),
                current: Some(current),
                ..Default::default()
            },
        );
    }

    /// Mark a job finished — `Done` when `error` is None, else `Failed` (retriable).
    pub fn finish(&self, app: &AppHandle, id: &str, error: Option<String>) {
        let retriable = error.is_some();
        self.apply(
            app,
            id,
            JobPatch {
                state: Some(if error.is_some() {
                    JobState::Failed
                } else {
                    JobState::Done
                }),
                error: Some(error),
                ..Default::default()
            },
        );
        if retriable {
            if let Some(job) = self.jobs.lock().unwrap().get_mut(id) {
                job.retriable = true;
            }
        }
        self.cancels.lock().unwrap().remove(id);
    }

    /// Request cancellation — flips the token the running action polls, and marks the job cancelled.
    pub fn cancel(&self, app: &AppHandle, id: &str) {
        if let Some(token) = self.cancels.lock().unwrap().get(id) {
            token.store(true, Ordering::SeqCst);
        }
        self.apply(
            app,
            id,
            JobPatch {
                state: Some(JobState::Cancelled),
                ..Default::default()
            },
        );
    }

    /// The cancel token for a job — a Rust action checks `token.load(Ordering::SeqCst)` in its loop.
    pub fn token(&self, id: &str) -> Arc<AtomicBool> {
        self.cancels
            .lock()
            .unwrap()
            .entry(id.to_string())
            .or_insert_with(|| Arc::new(AtomicBool::new(false)))
            .clone()
    }

    pub fn remove(&self, app: &AppHandle, id: &str) {
        self.jobs.lock().unwrap().remove(id);
        self.cancels.lock().unwrap().remove(id);
        let _ = app.emit("job://removed", id);
        self.persist(app);
    }

    /// Load persisted jobs on startup, marking anything still Running/Queued as Interrupted so the
    /// frontend can re-queue what's resumable.
    pub fn load(&self, app: &AppHandle) {
        let Ok(store) = app.store(STORE_FILE) else { return };
        let Some(value) = store.get(STORE_KEY) else { return };
        let Ok(saved) = serde_json::from_value::<Vec<Job>>(value) else { return };
        let mut jobs = self.jobs.lock().unwrap();
        for mut job in saved {
            if matches!(job.state, JobState::Running | JobState::Queued) {
                job.state = JobState::Interrupted;
                job.retriable = true;
            }
            jobs.insert(job.id.clone(), job);
        }
    }
}

#[tauri::command]
pub fn jobs_list(jobs: State<JobManager>) -> Vec<Job> {
    jobs.snapshot()
}

#[tauri::command]
pub fn job_create(
    app: AppHandle,
    jobs: State<JobManager>,
    kind: String,
    name: String,
    key: Option<String>,
) -> String {
    jobs.create(&app, &kind, &name, key)
}

#[tauri::command]
pub fn job_report(app: AppHandle, jobs: State<JobManager>, id: String, patch: JobPatch) {
    jobs.apply(&app, &id, patch);
}

#[tauri::command]
pub fn job_cancel(app: AppHandle, jobs: State<JobManager>, id: String) {
    jobs.cancel(&app, &id);
}

#[tauri::command]
pub fn job_remove(app: AppHandle, jobs: State<JobManager>, id: String) {
    jobs.remove(&app, &id);
}

/// Whether a job has been asked to cancel — for the webview to poll between chunks.
#[tauri::command]
pub fn job_cancelled(jobs: State<JobManager>, id: String) -> bool {
    jobs.token(&id).load(Ordering::SeqCst)
}
