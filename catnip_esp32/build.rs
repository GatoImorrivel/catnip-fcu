use std::path::PathBuf;

fn main() {
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());

    let mut defaults = vec![manifest_dir.join("sdkconfig.defaults")];
    if std::env::var("CARGO_FEATURE_BT").is_ok() {
        defaults.push(manifest_dir.join("sdkconfig.defaults.bt"));
    }

    let defaults = defaults
        .iter()
        .map(|path| path.to_string_lossy().into_owned())
        .collect::<Vec<_>>()
        .join(";");

    // embuild reads this when configuring esp-idf-sys for ESP_IDF_SYS_ROOT_CRATE.
    unsafe {
        std::env::set_var("ESP_IDF_SDKCONFIG_DEFAULTS", &defaults);
    }

    println!("cargo:rerun-if-changed=sdkconfig.defaults");
    println!("cargo:rerun-if-changed=sdkconfig.defaults.bt");

    embuild::espidf::sysenv::output();
}
