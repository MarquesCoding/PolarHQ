mod commands;

/// Boots the Tauri runtime and registers the native command surface the frontend reaches through
/// `@tauri-apps/api`'s `invoke` (see `lib/native.ts`). The mobile entry-point attribute lets the same
/// `run()` back a future Tauri mobile target.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_process::init());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .setup(|app| {
            build_main_window(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::generate_splat,
            commands::p2p_status,
            commands::sync_now,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Create the main window in code (rather than from `tauri.conf.json`) so we can apply the macOS
/// native chrome after build (see `apply_invisible_toolbar`): overlay title-bar style keeps the
/// traffic lights but drops the OS title bar, and the webview flows underneath.
fn build_main_window(app: &tauri::App) -> tauri::Result<()> {
    use tauri::{WebviewUrl, WebviewWindowBuilder};
    #[allow(unused_mut)]
    let mut builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("PolarHQ")
        .inner_size(1280.0, 832.0)
        .min_inner_size(880.0, 600.0)
        .resizable(true)
        // Let the webview handle HTML5 drag-and-drop (moving Drive files, uploads). Without this,
        // Tauri's native OS file-drop handler swallows the drag events and in-app DnD breaks.
        .disable_drag_drop_handler();
    #[cfg(target_os = "macos")]
    {
        use tauri::TitleBarStyle;
        builder = builder
            .title_bar_style(TitleBarStyle::Overlay)
            .hidden_title(true);
    }
    let window = builder.build()?;
    #[cfg(target_os = "macos")]
    apply_invisible_toolbar(&window);
    Ok(())
}

/// Attach an invisible `NSToolbar` to the native window (the approach Spacedrive uses). On macOS
/// Tahoe a window *with a toolbar* gets the full native corner rounding and correctly padded traffic
/// lights, whereas a plain full-size-content overlay window gets a smaller radius. This keeps the
/// real native window controls — no transparency, no frameless window.
#[cfg(target_os = "macos")]
fn apply_invisible_toolbar(window: &tauri::WebviewWindow) {
    use objc2::runtime::{AnyObject, Bool};
    use objc2::{class, msg_send};
    use objc2_foundation::NSString;

    let Ok(ptr) = window.ns_window() else {
        return;
    };
    let ns_window = ptr as *mut AnyObject;
    unsafe {
        let _: () = msg_send![ns_window, setTitlebarAppearsTransparent: Bool::YES];
        let identifier = NSString::from_str("window_invisible_toolbar");
        let toolbar: *mut AnyObject = msg_send![class!(NSToolbar), alloc];
        let toolbar: *mut AnyObject = msg_send![toolbar, initWithIdentifier: &*identifier];
        let _: () = msg_send![toolbar, setShowsBaselineSeparator: Bool::NO];
        let _: () = msg_send![ns_window, setToolbar: toolbar];
    }
}
