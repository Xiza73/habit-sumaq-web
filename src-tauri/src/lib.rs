#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let mut builder = tauri::Builder::default();

  // Single-instance MUST be the first plugin registered. It works by claiming
  // a lock before the rest of the app initialises; register it after another
  // plugin and a second launch can get far enough to do real work before being
  // told to stop. Desktop-only — on mobile the OS owns process lifecycle.
  //
  // Reopening the app from the dock, Spotlight or the Start menu used to spawn
  // a whole second instance. Now the second process hands off to the running
  // one and exits; this callback raises the window that already exists.
  #[cfg(desktop)]
  {
    use tauri::Manager;

    builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
      let Some(window) = app.get_webview_window("main") else {
        return;
      };
      // All three, in this order, and none of them is redundant:
      //   - `unminimize` — a minimised window ignores `set_focus`.
      //   - `show`       — restores it if it was hidden rather than minimised.
      //   - `set_focus`  — brings it to the front and gives it keyboard focus.
      // Errors are logged rather than propagated: failing to raise a window is
      // not a reason to take down the instance the user is actually using.
      let _ = window.unminimize();
      let _ = window.show();
      if let Err(error) = window.set_focus() {
        log::warn!("single-instance: could not focus the main window: {error}");
      }
    }));
  }

  // Autostart (launch on OS login) is a desktop-only capability — the plugin
  // has no mobile implementation, so gate it behind `cfg(desktop)`.
  #[cfg(desktop)]
  {
    use tauri_plugin_autostart::MacosLauncher;
    builder = builder.plugin(tauri_plugin_autostart::init(
      MacosLauncher::LaunchAgent,
      None,
    ));
  }

  builder
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
