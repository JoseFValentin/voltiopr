-- ==============================================================
-- VOLTIOPR - ESQUEMA MAESTRO DE BASE DE DATOS (V2.1+)
-- ==============================================================

-- 1. LIMPIEZA INICIAL (PARA EVITAR PROBLEMAS DE FOREIGN KEYS)
DROP TABLE IF EXISTS user_metadata;
DROP TABLE IF EXISTS iot_config;
DROP TABLE IF EXISTS usuarios;

-- 2. TABLA DE USUARIOS
CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    es_admin BOOLEAN DEFAULT FALSE,
    reset_token TEXT,             -- Para recuperación de contraseña
    reset_token_expiry TEXT,      -- Cuándo expira el token
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA DE CONFIGURACIÓN IOT (Pines y Protocolos)
CREATE TABLE iot_config (
    id TEXT PRIMARY KEY,           -- ID único (slug)
    usuario_id INTEGER,            -- Dueño del componente
    nombre TEXT NOT NULL,          -- Nombre amigable
    tipo TEXT NOT NULL,            -- DIGITAL_OUT, PWM, I2C, SPI, WIFI, etc.
    pin TEXT NOT NULL,             -- GPIO físico
    valor_actual TEXT DEFAULT '0', -- Estado en vivo
    descripcion TEXT,              -- Notas adicionales
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- 4. TABLA DE METADATA
CREATE TABLE user_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    consent_cookies INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES usuarios(id)
);

-- 5. TABLA DE FIRMWARE OTA (Over-The-Air Updates)
CREATE TABLE firmwares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    version TEXT NOT NULL,         -- e.g., '1.1.0'
    descripcion TEXT,              -- Registro de cambios
    binario_base64 TEXT NOT NULL,  -- El compilado .bin en Base64
    fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT FALSE,  -- Solo un firmware debería estar marcado activo a la vez
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);


-- ==============================================================
-- SEMILLAS (DATOS INICIALES PARA EL USUARIO ADMIN)
-- ==============================================================

-- Usuario Admin por defecto
INSERT INTO usuarios (id, username, email, password_hash, es_admin) 
VALUES (1, 'Admin', 'admin@voltiopr.com', '123456', 1);

-- Ejemplos de Protocolos Avanzados (Coherentes con Dashboard V2)
-- Básico
INSERT INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('foco-sala', 1, 'Iluminación Sala', 'DIGITAL_OUT', 'D1', '0', 'Interruptor principal de luz');

INSERT INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('dimmer-cocina', 1, 'Intensidad Cocina', 'PWM', 'D2', '75', 'Control de brillo 0-100%');

-- Buses
INSERT INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('sensor-aire', 1, 'BME280 Ambiente', 'I2C', 'GPIO 21/22', 'Sincronizado', 'Bus de temperatura y humedad');

INSERT INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('pantalla-tft', 1, 'Display Status', 'SPI', 'GPIO 13/14', 'Activo', 'Pantalla principal de información');

INSERT INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('can-bus-auto', 1, 'OBDII Telemetry', 'CAN', 'GPIO 4/5', '100 kbps', 'Datos del bus de motor');

-- Audio y Comunicaciones
INSERT INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('speaker-out', 1, 'Salida Audio', 'I2S', 'GPIO 25/26', 'Buffer OK', 'Audio digital I2S');

INSERT INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('consola-debug', 1, 'Serial Monitor', 'SERIAL', 'TX/RX', 'Waiting...', 'Consola de depuración UART');

INSERT INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('sonda-termica', 1, 'Tanque Agua', 'ONEWIRE', 'GPIO 15', '45.6°C', 'Sensores de temperatura DS18B20');

-- Sensores Internos ESP32
INSERT INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('boton-tactil', 1, 'Touch Panel', 'TOUCH', 'T0', '20', 'Sensor capacitivo de toque');

INSERT INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('iman-seguridad', 1, 'Sensor Puerta', 'HALL', 'Internal', '62', 'Detector de campo magnético');

-- Inalámbrico
INSERT INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('wifi-signal', 1, 'Red VoltioPR', 'WIFI', 'Internal', '-55', 'Potencia de señal WiFi (RSSI)');

-- Precisión
INSERT INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('voltaje-vca', 1, 'Control DAC', 'DAC', 'GPIO 25', '128', 'Salida analógica real 0-255');
