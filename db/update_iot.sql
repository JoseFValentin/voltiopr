-- ==============================================================
-- EXTENSIÓN DE BASE DE DATOS PARA CONFIGURACIÓN DINÁMICA ESP
-- ==============================================================

CREATE TABLE IF NOT EXISTS iot_config (
    id TEXT PRIMARY KEY,           -- Identificador único (ej: 'bomba-agua')
    usuario_id INTEGER,            -- Dueño de la configuración
    nombre TEXT NOT NULL,          -- Nombre amigable (ej: 'Motor de Enfriamiento')
    tipo TEXT NOT NULL,            -- 'PWM', 'I2S', 'SERIAL', 'ANALOG_IN', 'DAC', 'I2C', 'SPI', 'CAN', 'ONEWIRE', 'IR', 'TOUCH', 'HALL', 'PCNT', 'WIFI', 'BLE'
    pin TEXT NOT NULL,             -- Pin físico del ESP (ej: 'GPIO2', 'A0', 'D1')
    valor_actual TEXT DEFAULT '0', -- El estado o valor actual del pin
    descripcion TEXT,              -- Para qué sirve este pin
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Insertamos ejemplos para que la página no esté vacía al empezar
INSERT OR IGNORE INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('temp-externa', 1, 'Temperatura Externa', 'ANALOG_IN', 'A0', '24.5', 'Sensor de temperatura ambiente');

INSERT OR IGNORE INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('led-notificacion', 1, 'LED de Estado', 'DIGITAL_OUT', 'D4', '0', 'Indicador visual de actividad');

INSERT OR IGNORE INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('velocidad-ventilador', 1, 'Extractor PWM', 'PWM', 'D2', '65', 'Control de velocidad del ventilador secundario');
