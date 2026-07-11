mod commands;
mod sync;

/// Boots the Tauri runtime and registers the native command surface the frontend reaches through
/// `@tauri-apps/api`'s `invoke` (see `lib/native.ts`). The mobile entry-point attribute lets the same
/// `run()` back a future Tauri mobile target.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .manage(sync::SyncState::default())
        .setup(|app| {
            build_main_window(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::generate_splat,
            commands::p2p_status,
            commands::pick_folder,
            commands::sync_now,
            commands::write_temp_media,
            sync::sync_index,
            sync::sync_read_file,
            sync::sync_start_watch,
            sync::sync_stop_watch,
            updater_window_mode,
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
    {
        apply_invisible_toolbar(&window);
        inset_traffic_lights(&window);
        let win = window.clone();
        window.on_window_event(move |event| {
            if matches!(event, tauri::WindowEvent::Resized(_)) {
                inset_traffic_lights(&win);
            }
        });
    }
    Ok(())
}

/// Attach an invisible `NSToolbar` to the native window. On macOS
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

/// Toggle the launch updater's window between a small, traffic-light-free splash (Discord-style) and
/// the full app window. Called from the JS Updater on mount, and again when it hands off to the app.
#[tauri::command]
fn updater_window_mode(window: tauri::WebviewWindow, compact: bool) {
    let _ = window.set_resizable(!compact);
    let (w, h) = if compact {
        (380.0, 460.0)
    } else {
        (1280.0, 832.0)
    };
    let _ = window.set_size(tauri::LogicalSize::new(w, h));
    // Center on the active monitor using the NEW size (Tauri's center() can use the pre-resize size,
    // leaving the small window off-centre).
    if let Ok(Some(monitor)) = window.current_monitor() {
        let scale = monitor.scale_factor();
        let screen = monitor.size().to_logical::<f64>(scale);
        let origin = monitor.position().to_logical::<f64>(scale);
        let x = origin.x + (screen.width - w) / 2.0;
        let y = origin.y + (screen.height - h) / 2.0;
        let _ = window.set_position(tauri::LogicalPosition::new(x, y));
    } else {
        let _ = window.center();
    }
    #[cfg(target_os = "macos")]
    set_traffic_lights_hidden(&window, compact);
}

/// Nudge the native traffic lights inward (right) so they line up with the sidebar's content padding.
/// macOS re-lays out the toolbar buttons on resize, so this is re-applied from the resize handler.
#[cfg(target_os = "macos")]
fn inset_traffic_lights(window: &tauri::WebviewWindow) {
    use objc2::msg_send;
    use objc2::runtime::AnyObject;
    use objc2_foundation::{NSPoint, NSRect};

    const INSET_X: f64 = 14.0;
    let Ok(ptr) = window.ns_window() else {
        return;
    };
    let ns_window = ptr as *mut AnyObject;
    unsafe {
        // NSWindowButton: 0 = close, 1 = miniaturize, 2 = zoom.
        for index in 0u64..3 {
            let button: *mut AnyObject = msg_send![ns_window, standardWindowButton: index];
            if button.is_null() {
                continue;
            }
            let frame: NSRect = msg_send![button, frame];
            let origin = NSPoint {
                x: frame.origin.x + INSET_X,
                y: frame.origin.y,
            };
            let _: () = msg_send![button, setFrameOrigin: origin];
        }
    }
}

/// Hide/show the macOS traffic-light window buttons (close/minimise/zoom) without dropping the window
/// decorations, so the updater splash keeps its rounded chrome but loses the controls.
#[cfg(target_os = "macos")]
fn set_traffic_lights_hidden(window: &tauri::WebviewWindow, hidden: bool) {
    use objc2::msg_send;
    use objc2::runtime::{AnyObject, Bool};

    let Ok(ptr) = window.ns_window() else {
        return;
    };
    let ns_window = ptr as *mut AnyObject;
    let value = if hidden { Bool::YES } else { Bool::NO };
    unsafe {
        // NSWindowButton: 0 = close, 1 = miniaturize, 2 = zoom.
        for index in 0u64..3 {
            let button: *mut AnyObject = msg_send![ns_window, standardWindowButton: index];
            if !button.is_null() {
                let _: () = msg_send![button, setHidden: value];
            }
        }
    }
}
