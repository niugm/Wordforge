use serde::ser::SerializeStruct;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("migration error: {0}")]
    Migration(#[from] sqlx::migrate::MigrateError),

    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("tauri error: {0}")]
    Tauri(#[from] tauri::Error),

    #[error("keyring error: {0}")]
    Keyring(#[from] keyring::Error),

    #[error("network error: {0}")]
    Network(#[from] reqwest::Error),

    #[error("not found: {0}")]
    NotFound(String),

    #[error("invalid input: {0}")]
    InvalidInput(String),
}

impl serde::Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        let mut st = s.serialize_struct("AppError", 2)?;
        let code = match self {
            Self::Database(_) => "Database",
            Self::Migration(_) => "Migration",
            Self::Io(_) => "Io",
            Self::Tauri(_) => "Tauri",
            Self::Keyring(_) => "Keyring",
            Self::Network(_) => "Network",
            Self::NotFound(_) => "NotFound",
            Self::InvalidInput(_) => "InvalidInput",
        };
        st.serialize_field("code", code)?;
        st.serialize_field("message", &self.to_string())?;
        st.end()
    }
}

pub type AppResult<T> = Result<T, AppError>;
