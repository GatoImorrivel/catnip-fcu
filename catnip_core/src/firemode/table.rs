use std::collections::HashMap;

use super::FireMode;

/// Per-selector-position fire mode assignments with optional defaults for unset slots.
pub struct FireModePositionTable<M>
where
    M: FireMode,
{
    overrides: HashMap<usize, M>,
    defaults: HashMap<usize, M>,
}

impl<M> FireModePositionTable<M>
where
    M: FireMode + Clone + 'static,
{
    pub fn new(defaults: HashMap<usize, M>) -> Self {
        Self {
            overrides: HashMap::new(),
            defaults,
        }
    }

    pub fn get(&self, position: usize) -> M {
        if let Some(entry) = self.overrides.get(&position) {
            return entry.clone();
        }
        if let Some(entry) = self.defaults.get(&position) {
            return entry.clone();
        }
        M::supported()
            .into_iter()
            .next()
            .expect("fire mode system must declare at least one mode")
    }

    pub fn set(&mut self, position: usize, assignment: M) {
        self.overrides.insert(position, assignment);
    }

    pub fn supported(&self) -> Vec<M> {
        M::supported().to_vec()
    }

    pub fn load_from_storage(
        &mut self,
        storage: &impl crate::PositionAssignmentStorage,
        num_positions: usize,
    ) -> anyhow::Result<()> {
        for position in 0..num_positions {
            if let Some(assignment) = storage.load_assignment(position)? {
                self.set(position, assignment);
            }
        }
        Ok(())
    }
}
