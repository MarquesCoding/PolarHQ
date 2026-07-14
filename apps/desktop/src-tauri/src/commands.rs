//! Native commands reached over Tauri IPC from the frontend (`lib/native.ts`).

/// Generate a 3D point-cloud "splat" from a source image and return the path to the written `.ply`.
///
/// Runs the offline monocular-depth pipeline in [`crate::splat`]: estimate depth from photometric
/// cues, back-project to a colored 3D point cloud, and export a PLY the Three.js viewer renders. This
/// is not a learned/optimized 3D Gaussian-Splatting reconstruction (that needs a GPU ML stack we
/// can't ship) — it's the pragmatic image->3D relief, and it runs with no network or Python/CUDA.
///
/// A sync command so Tauri runs the CPU work on a worker thread rather than blocking the async
/// runtime. The output lands in the app temp dir (asset-protocol scope) so the webview can load it.
#[tauri::command]
pub fn generate_splat(app: tauri::AppHandle, input_path: String) -> Result<String, String> {
    use tauri::Manager;

    let dir = app
        .path()
        .temp_dir()
        .map_err(|e| e.to_string())?
        .join("polarhq-media");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let output = dir.join(format!("splat-{stamp}.ply"));

    crate::splat::generate_point_cloud_ply(&input_path, &output)?;
    Ok(output.to_string_lossy().into_owned())
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

/// Write already-decrypted media bytes to a temp file and return its path. The frontend then loads
/// it via the asset protocol (`convertFileSrc`) so the webview decodes it with macOS's native
/// codecs — WKWebView can't play many formats (HEVC/.mov) from an in-memory `blob:` URL. Bytes are
/// sent as a raw IPC body (not JSON) so large videos don't blow up memory.
#[tauri::command]
pub fn write_temp_media(
    app: tauri::AppHandle,
    request: tauri::ipc::Request<'_>,
) -> Result<String, String> {
    use tauri::Manager;

    let bytes = match request.body() {
        tauri::ipc::InvokeBody::Raw(data) => data.as_slice(),
        _ => return Err("expected raw media bytes".into()),
    };
    let ext = request
        .headers()
        .get("x-media-ext")
        .and_then(|value| value.to_str().ok())
        .filter(|value| !value.is_empty())
        .unwrap_or("mp4");

    let dir = app
        .path()
        .temp_dir()
        .map_err(|e| e.to_string())?
        .join("polarhq-media");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let path = dir.join(format!("media-{stamp}.{ext}"));
    std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}
