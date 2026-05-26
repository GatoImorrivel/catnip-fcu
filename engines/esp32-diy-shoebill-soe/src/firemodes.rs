use catnip_core::define_firemode_system;
use catnip_core::firemode::FireModeConfig;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, FireModeConfig)]
pub struct FullAutoConfig {
    #[field(
        display_name = "Dwell Time",
        min = 1,
        max = 1000,
        default = 10,
        unit = Milliseconds
    )]
    pub dwell_ms: i32,
    #[field(
        display_name = "Delay Time",
        min = 1,
        max = 1000,
        default = 10,
        unit = Milliseconds
    )]
    pub delay_ms: i32,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, FireModeConfig)]
pub struct SemiAutoConfig {
    #[field(
        display_name = "Dwell Time",
        min = 1,
        max = 1000,
        default = 10,
        unit = Milliseconds
    )]
    pub dwell_ms: i32,
    #[field(
        display_name = "Delay Time",
        min = 1,
        max = 1000,
        default = 10,
        unit = Milliseconds
    )]
    pub delay_ms: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, FireModeConfig)]
pub struct BurstConfig {
    #[field(
        display_name = "Dwell Time",
        min = 1,
        max = 1000,
        default = 10,
        unit = Milliseconds
    )]
    pub dwell_ms: i32,
    #[field(
        display_name = "Next Burst Delay",
        min = 1,
        max = 1000,
        default = 10,
        unit = Milliseconds
    )]
    pub next_burst_delay: i32,
    #[field(
        display_name = "Burst Count",
        min = 1,
        max = 100,
        default = 3,
        unit = Number
    )]
    pub burst_count: i32,
    #[field(
        display_name = "Next Shot Delay",
        min = 1,
        max = 1000,
        default = 10,
        unit = Milliseconds
    )]
    pub next_shot_delay: i32,
    #[field(display_name = "Continuous Burst", default = false)]
    pub continuous: bool,
}

define_firemode_system! {
    pub enum FireMode,
    {
        Safe,
        FullAuto(FullAutoConfig),
        SemiAuto(SemiAutoConfig),
        Burst(BurstConfig),
    }
}
