-- ==============================================================
-- ESTRUCTURA DE LA BASE DE DATOS D1 (TABLAS Y COLUMNAS)
-- ==============================================================
-- Nota para no programadores:
-- Este archivo es como el diseño de las hojas de Excel donde
-- guardaremos la información de VoltioPR de forma organizada.
-- No guarda los datos en sí, solo define cómo se deben guardar.

-- 1. Si ya existe la hoja 'usuarios', la borramos para empezar limpio (solo para desarrollo inicial)
DROP TABLE IF EXISTS usuarios;

-- 2. Creamos la hoja (tabla) para los Usuarios
CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,   -- Un número único e irrepetible para cada usuario (1, 2, 3...)
    username TEXT NOT NULL,                 -- El nombre del usuario 
    email TEXT UNIQUE NOT NULL,             -- El correo de la persona (UNIQUE: No puede haber dos iguales)
    password_hash TEXT NOT NULL,            -- La contraseña oculta/encriptada (¡Nunca se guarda en texto normal por seguridad!)
    es_admin BOOLEAN DEFAULT FALSE,         -- ¿Es administrador avanzado? (Verdadero o Falso)
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP -- Cuándo se creó la cuenta
);

-- 3. Si ya existe la hoja 'dispositivos', la borramos para empezar limpio
DROP TABLE IF EXISTS dispositivos;

-- 4. Creamos la hoja (tabla) para los Interruptores Físicos (IoT/NodeMCU)
CREATE TABLE dispositivos (
    id TEXT PRIMARY KEY,                    -- Nombre único (ej. 'reactor-toggle' o 'cooling-toggle')
    estado_encendido BOOLEAN DEFAULT FALSE, -- ¿Está prendido? Verdadero(On) o Falso(Off)
    poder_porcentaje INTEGER DEFAULT 0,     -- Qué tanta potencia (0% a 100%)
    ultima_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================
-- DATOS DE PRUEBA (Para cuando arranque el sistema la primera vez)
-- ==============================================================
-- Insertamos los dos interruptores que tienes en tu diseño HTML para que existan
INSERT INTO dispositivos (id, estado_encendido, poder_porcentaje) VALUES ('reactor-toggle', false, 45);
INSERT INTO dispositivos (id, estado_encendido, poder_porcentaje) VALUES ('cooling-toggle', false, 82);
-- Insertar un usuario de prueba (contraseña sin encriptar solo como demostración básica por ahora)
-- NOTA REAL: El backend encriptará las futuras contraseñas.
INSERT INTO usuarios (username, email, password_hash) VALUES ('Admin', 'admin@voltiopr.com', '123456');
