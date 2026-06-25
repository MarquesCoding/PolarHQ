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
