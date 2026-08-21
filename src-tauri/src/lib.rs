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
      // Logged at info so a release build can answer the only question that
      // matters when someone reports "it still opens twice": did the second
      // process reach this callback at all? No line here means the handoff
      // never happened and the lock is not being shared.
      log::info!("single-instance: a second launch handed off to this instance");

      let Some(window) = app.get_webview_window("main") else {
        log::warn!("single-instance: no window named 'main' to raise");
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
      // Logging used to be debug-only, which meant the builds people actually
      // install wrote nothing at all — a desktop bug report had no evidence
      // behind it and could only be answered with guesses.
      //
      // Release writes to a rotating file in the OS log directory; debug also
      // keeps stdout so `pnpm tauri dev` stays readable.
      let mut log_builder = tauri_plugin_log::Builder::default()
        .level(log::LevelFilter::Info)
        .target(tauri_plugin_log::Target::new(
          tauri_plugin_log::TargetKind::LogDir { file_name: Some("habit-sumaq".into()) },
        ))
        .max_file_size(1_000_000)
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne);

      if cfg!(debug_assertions) {
        log_builder = log_builder.target(tauri_plugin_log::Target::new(
          tauri_plugin_log::TargetKind::Stdout,
        ));
      }

      app.handle().plugin(log_builder.build())?;

      // First line of every run. Two of these with different pids, and no
      // handoff line between them, is single-instance failing — stated as a
      // fact from the log rather than inferred from a screenshot.
      log::info!(
        "habit-sumaq starting — version {}, pid {}",
        app.package_info().version,
        std::process::id()
      );

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
