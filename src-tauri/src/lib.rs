#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let mut builder = tauri::Builder::default();

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
