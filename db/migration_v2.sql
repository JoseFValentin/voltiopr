-- ==============================================================
-- MIGRACIÓN V2: Columnas y Tablas Faltantes para Login/Reset
-- ==============================================================
-- Nota para no programadores:
-- Este archivo agrega las "gavetas" que le faltan a tu base de datos
-- para que el login, las cookies y la recuperación de contraseña funcionen.
-- Ejecútalo UNA SOLA VEZ con:
--   npx wrangler d1 execute voltiopr_db --remote --file=db/migration_v2.sql

-- 1. Agregar columnas de reset de contraseña a la tabla usuarios
--    (Si ya existen, SQLite no da error con esta sintaxis)
ALTER TABLE usuarios ADD COLUMN reset_token TEXT;
ALTER TABLE usuarios ADD COLUMN reset_token_expiry TEXT;

-- 2. Crear tabla para guardar metadata de sesiones (IP, navegador, cookies)
CREATE TABLE IF NOT EXISTS user_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,              -- ¿De quién es esta sesión?
    user_agent TEXT,                        -- ¿Desde qué navegador entró?
    ip_address TEXT,                        -- ¿Desde qué IP?
    consent_cookies INTEGER DEFAULT 0,     -- ¿Aceptó las cookies? (1=Sí, 0=No)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES usuarios(id)
);
