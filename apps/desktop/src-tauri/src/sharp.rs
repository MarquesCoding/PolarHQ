//! Apple SHARP integration — single image -> 3D Gaussian Splat.
//!
//! SHARP (github.com/apple/ml-sharp) regresses a 3D Gaussian representation from one photo in a
//! single feed-forward pass and writes a standard 3DGS `.ply`. We invoke its Python CLI as a
//! subprocess (like a user-installed tool), so the heavy ML stack lives outside the app. When SHARP
//! isn't installed the caller falls back to the offline heuristic in [`crate::splat`].
//!
//! Install (once): a Python 3.13 env with `pip install -r requirements.txt` from the repo; the
//! ~2.6GB checkpoint downloads to `~/.cache/torch/hub/checkpoints/` on first run. Point the app at
//! the CLI with `POLARHQ_SHARP_BIN`, or drop the repo at `~/.polarhq/ml-sharp` (its `.venv/bin/sharp`
//! is found automatically). Prediction runs on CPU, CUDA, or Apple Silicon (MPS).

use std::path::{Path, PathBuf};
use std::process::Command;

/// Resolve the `sharp` CLI: an explicit `POLARHQ_SHARP_BIN`, then the default venv under
/// `~/.polarhq/ml-sharp`, then `sharp` on `PATH`. Returns `None` when SHARP isn't installed.
fn sharp_binary() -> Option<PathBuf> {
    if let Ok(explicit) = std::env::var("POLARHQ_SHARP_BIN") {
        let path = PathBuf::from(explicit);
        if path.exists() {
            return Some(path);
        }
    }
    if let Ok(home) = std::env::var("HOME") {
        let venv = PathBuf::from(home).join(".polarhq/ml-sharp/.venv/bin/sharp");
        if venv.exists() {
            return Some(venv);
        }
    }
    let on_path = Command::new("sharp")
        .arg("--help")
        .output()
        .map(|out| out.status.success())
        .unwrap_or(false);
    on_path.then(|| PathBuf::from("sharp"))
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
