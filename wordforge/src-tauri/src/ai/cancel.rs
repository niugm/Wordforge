use std::collections::HashSet;
use std::sync::{Arc, Mutex};

use crate::error::{AppError, AppResult};

#[derive(Clone, Default)]
pub struct AiStreamCancels {
    request_ids: Arc<Mutex<HashSet<String>>>,
}

impl AiStreamCancels {
    pub fn cancel(&self, request_id: String) -> AppResult<()> {
        let mut request_ids = self
            .request_ids
            .lock()
            .map_err(|_| AppError::InvalidInput("ai stream cancel state is unavailable".into()))?;
        request_ids.insert(request_id);
        Ok(())
    }

    pub fn is_cancelled(&self, request_id: &str) -> AppResult<bool> {
        let request_ids = self
            .request_ids
            .lock()
            .map_err(|_| AppError::InvalidInput("ai stream cancel state is unavailable".into()))?;
        Ok(request_ids.contains(request_id))
    }

    pub fn clear(&self, request_id: &str) -> AppResult<()> {
        let mut request_ids = self
            .request_ids
            .lock()
            .map_err(|_| AppError::InvalidInput("ai stream cancel state is unavailable".into()))?;
        request_ids.remove(request_id);
        Ok(())
    }
}
