use std::collections::HashMap;

use crate::{
    Characteristics, FireSelectorPosition, firemode::FireModeConfigField,
    requests::errors::UpdateFireModeConfigError,
};

#[macro_use]
mod macros;
pub mod errors;

pub mod push_events;

define_requests! {
    requests HostToFCURequest,
    responses HostToFCUResponse,
    {
        GetCharacteristcs => Characteristics,
        GetCurrentFireSelectorPosition => FireSelectorPosition,
        GetFireModeForPosition { position: FireSelectorPosition } => (String, HashMap<String, String>),
        GetSupportedFireModes => Vec<String>,
        GetFireModeConfigFields {firemode_name:String} => Vec<FireModeConfigField>,
        UpdateFireModeConfig { position: FireSelectorPosition, firemode_name:String, config: HashMap<String, String> } => Result<(), UpdateFireModeConfigError>,
    }
}
