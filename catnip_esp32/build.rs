use std::path::PathBuf;

fn main() {
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let workspace_dir = PathBuf::from(
        std::env::var("CARGO_WORKSPACE_DIR").unwrap_or_else(|_| manifest_dir.to_string_lossy().into()),
    );

    let rel = manifest_dir
        .strip_prefix(&workspace_dir)
        .unwrap_or(manifest_dir.as_path());

    let mut defaults = vec![rel.join("sdkconfig.defaults")];
    if cfg!(feature = "bt") {
        defaults.push(rel.join("sdkconfig.defaults.bt"));
    }

    let defaults = defaults
        .iter()
        .map(|path| path.to_string_lossy().into_owned())
        .collect::<Vec<_>>()
        .join(";");

    unsafe {
        std::env::set_var("ESP_IDF_SDKCONFIG_DEFAULTS", defaults);
    }
    embuild::espidf::sysenv::output();
}
