//! Apple SHARP integration — single image -> 3D Gaussian Splat.
//!
//! SHARP (github.com/apple/ml-sharp) regresses a 3D Gaussian representation from one photo in a
//! single feed-forward pass and writes a standard 3DGS `.ply`. We invoke its Python CLI as a
//! subprocess (GPU: CUDA/MPS), so the heavy ML stack lives outside the app bundle. Rather than
//! shipping ~5GB of PyTorch + weights in the installer, [`setup`] provisions it on demand: install
//! `uv`, create a Python 3.13 env, install `ml-sharp`, and fetch the checkpoint — with progress
//! events for the UI. When SHARP isn't set up, the caller falls back to the offline heuristic in
//! [`crate::splat`].

use std::path::{Path, PathBuf};
use std::process::Command;

use tauri::{AppHandle, Emitter};

fn home_dir() -> Option<PathBuf> {
    std::env::var("HOME")
        .ok()
        .or_else(|| std::env::var("USERPROFILE").ok())
        .map(PathBuf::from)
}

/// The SHARP install root (`~/.polarhq/ml-sharp`).
fn sharp_repo() -> Option<PathBuf> {
    home_dir().map(|home| home.join(".polarhq/ml-sharp"))
}

/// Resolve the `sharp` CLI: an explicit `POLARHQ_SHARP_BIN`, then the provisioned venv, then PATH.
fn sharp_binary() -> Option<PathBuf> {
    if let Ok(explicit) = std::env::var("POLARHQ_SHARP_BIN") {
        let path = PathBuf::from(explicit);
        if path.exists() {
            return Some(path);
        }
    }
    if let Some(repo) = sharp_repo() {
        for candidate in [repo.join(".venv/bin/sharp"), repo.join(".venv/Scripts/sharp.exe")] {
            if candidate.exists() {
                return Some(candidate);
            }
        }
    }
    let on_path = Command::new("sharp")
        .arg("--help")
        .output()
        .map(|out| out.status.success())
        .unwrap_or(false);
    on_path.then(|| PathBuf::from("sharp"))
}

/// Whether the SHARP CLI is available on this machine.
pub fn is_available() -> bool {
    sharp_binary().is_some()
}

/// Run SHARP on a single image and return the produced 3DGS `.ply`. SHARP takes a directory of
/// images, so the input is staged into a temp folder and the sole output `.ply` is returned.
pub fn generate_splat_ply(input_path: &str, work_dir: &Path) -> Result<PathBuf, String> {
    let binary = sharp_binary().ok_or("SHARP CLI not found")?;

    let in_dir = work_dir.join("sharp-in");
    let out_dir = work_dir.join("sharp-out");
    let _ = std::fs::remove_dir_all(&in_dir);
    let _ = std::fs::remove_dir_all(&out_dir);
    std::fs::create_dir_all(&in_dir).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&out_dir).map_err(|e| e.to_string())?;

    let source = Path::new(input_path);
    let ext = source.extension().and_then(|e| e.to_str()).unwrap_or("jpg");
    let staged = in_dir.join(format!("input.{ext}"));
    std::fs::copy(source, &staged).map_err(|e| format!("stage SHARP input: {e}"))?;

    let output = Command::new(&binary)
        .arg("predict")
        .arg("-i")
        .arg(&in_dir)
        .arg("-o")
        .arg(&out_dir)
        .output()
        .map_err(|e| format!("run SHARP: {e}"))?;
    if !output.status.success() {
        return Err(format!(
            "SHARP predict failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    std::fs::read_dir(&out_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok().map(|e| e.path()))
        .find(|path| path.extension().and_then(|e| e.to_str()) == Some("ply"))
        .ok_or_else(|| "SHARP produced no .ply".to_string())
}

/// Locate the `uv` binary (Python env manager) if already installed.
fn uv_binary() -> Option<PathBuf> {
    if let Some(home) = home_dir() {
        for candidate in [home.join(".local/bin/uv"), home.join(".local/bin/uv.exe")] {
            if candidate.exists() {
                return Some(candidate);
            }
        }
    }
    let on_path = Command::new("uv")
        .arg("--version")
        .output()
        .map(|out| out.status.success())
        .unwrap_or(false);
    on_path.then(|| PathBuf::from("uv"))
}

/// Run a command to completion, mapping a non-zero exit to its stderr.
fn run(cmd: &mut Command) -> Result<(), String> {
    let output = cmd.output().map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

fn install_uv() -> Result<(), String> {
    #[cfg(windows)]
    {
        run(Command::new("powershell").args([
            "-NoProfile",
            "-Command",
            "irm https://astral.sh/uv/install.ps1 | iex",
        ]))
    }
    #[cfg(not(windows))]
    {
        run(Command::new("sh")
            .arg("-c")
            .arg("curl -LsSf https://astral.sh/uv/install.sh | sh"))
    }
}

/// Pre-download the SHARP checkpoint into torch's hub cache (it would otherwise download on first
/// predict). ~2.6GB.
fn download_model() -> Result<(), String> {
    let home = home_dir().ok_or("no home dir")?;
    let dir = home.join(".cache/torch/hub/checkpoints");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let dest = dir.join("sharp_2572gikvuh.pt");
    if dest.exists() {
        return Ok(());
    }
    let tmp = dir.join("sharp_2572gikvuh.pt.part");
    run(Command::new("curl")
        .arg("-Lf")
        .arg("-o")
        .arg(&tmp)
        .arg("https://ml-site.cdn-apple.com/models/sharp/sharp_2572gikvuh.pt"))?;
    std::fs::rename(&tmp, &dest).map_err(|e| e.to_string())
}

fn emit(app: &AppHandle, phase: &str) {
    let _ = app.emit("sharp-setup", phase);
}

/// Provision SHARP on demand: install `uv`, clone the repo, create a Python 3.13 env, install the
/// package, and fetch the checkpoint — emitting `sharp-setup` progress phases for the UI.
pub fn setup(app: &AppHandle) -> Result<(), String> {
    if is_available() {
        emit(app, "ready");
        return Ok(());
    }
    let repo = sharp_repo().ok_or("no home dir")?;
    std::fs::create_dir_all(repo.parent().ok_or("bad path")?).map_err(|e| e.to_string())?;

    let uv = match uv_binary() {
        Some(uv) => uv,
        None => {
            emit(app, "installing-uv");
            install_uv().map_err(|e| format!("install uv: {e}"))?;
            uv_binary().ok_or("uv not found after install")?
        }
    };

    if !repo.join(".git").exists() {
        emit(app, "downloading-sharp");
        run(Command::new("git")
            .args(["clone", "--depth", "1", "https://github.com/apple/ml-sharp"])
            .arg(&repo))
        .map_err(|e| format!("clone ml-sharp: {e}"))?;
    }

    emit(app, "creating-env");
    run(Command::new(&uv)
        .args(["venv", "--python", "3.13"])
        .current_dir(&repo))
    .map_err(|e| format!("create env: {e}"))?;

    emit(app, "installing-deps");
    run(Command::new(&uv)
        .args(["pip", "install", "-r", "requirements.txt"])
        .current_dir(&repo))
    .map_err(|e| format!("install deps: {e}"))?;

    emit(app, "downloading-model");
    download_model().map_err(|e| format!("download model: {e}"))?;

    emit(app, "ready");
    Ok(())
}
