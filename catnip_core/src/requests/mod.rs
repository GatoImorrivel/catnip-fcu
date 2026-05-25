use crate::Characteristics;
use crate::FireMode;
use crate::FireModeConfigFields;
use crate::requests::errors::UpdateFireModeConfigError;

#[macro_use]
mod macros;
pub mod errors;

pub mod push_events;

define_requests! {
    requests HostToFCURequest,
    responses HostToFCUResponse,
    {
        GetCharacteristcs => Characteristics,
        GetFireModeConfig {firemode: FireMode} => Option<FireModeConfigFields>,
        GetCurrentFireMode => FireMode,
        UpdateFireModeConfig {firemode:FireMode} => Option<UpdateFireModeConfigError>
    }
}