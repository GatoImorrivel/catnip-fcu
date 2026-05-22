fn main() {
    let admin_user = std::env::var("ADMIN_USER").unwrap_or("root".into());
    println!("cargo:rustc-env=ADMIN_USER={}", admin_user);
    let admin_pass = std::env::var("ADMIN_PASS").unwrap_or("1234".into());
    println!("cargo:rustc-env=ADMIN_PASS={}", admin_pass);
    let hmac_secret = std::env::var("HMAC_SECRET").unwrap_or("something".into());
    println!("cargo:rustc-env=HMAC_SECRET={}", hmac_secret);

    embuild::espidf::sysenv::output();
}
