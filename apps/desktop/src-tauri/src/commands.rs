//! Native command stubs. Each returns a placeholder until the real Rust pipeline lands; the IPC
//! surface is wired now so the frontend (`lib/native.ts`) can target these from day one.

/// Generate a 3D Gaussian-splat scene from a source image/video path.
///
/// Stub: the splat pipeline is not implemented yet, so this rejects. Wired so the frontend has a
/// stable command name to call.
#[tauri::command]
pub async fn generate_splat(input_path: String) -> Result<String, String> {
    let _ = input_path;
    Err("gaussian-splat generation is not implemented yet".into())
}

/// Report peer-to-peer device-link status. Stub: always reports offline until the p2p stack lands.
#[tauri::command]
pub async fn p2p_status() -> Result<String, String> {
    Ok("offline".into())
}

/// Run a device-sync pass. Stub: rejects until device sync is implemented.
#[tauri::command]
pub async fn sync_now() -> Result<String, String> {
    Err("device sync is not implemented yet".into())
}
