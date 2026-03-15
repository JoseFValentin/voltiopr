-- ==============================================================
-- DATOS DE PRUEBA V2 (Protocolos Completos ESP)
-- ==============================================================
-- Estos datos insertan ejemplos de todos los nuevos protocolos
-- para que el dashboard se vea increíble desde el primer momento.

-- 1. Buses de Datos (Actividad Animada)
INSERT OR IGNORE INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('bus-i2c-sensor', 1, 'Sensor BME280', 'I2C', 'GPIO 21/22', 'OK', 'Bus de sensores ambientales');

INSERT OR IGNORE INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('telemetria-can', 1, 'Auto-OBDII', 'CAN', 'GPIO 4/5', '100kbps', 'Datos del motor vía CAN Bus');

-- 2. Sensores Especiales ESP (Barras Neón Púrpura)
INSERT OR IGNORE INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('toque-capacitivo', 1, 'Boton Touch', 'TOUCH', 'GPIO 15', '15', 'Botón táctil de la carcasa');

INSERT OR IGNORE INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('sensor-hall-puerta', 1, 'Puerta Taller', 'HALL', 'Internal', '42', 'Sensor magnético interno del ESP32');

-- 3. Inalámbrico (Indicador RSSI)
INSERT OR IGNORE INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('wifi-signal-main', 1, 'Calidad WiFi', 'WIFI', 'Radio', '-52', 'Potencia de señal del router principal');

-- 4. Multimedia y Audio (Ecualizador)
INSERT OR IGNORE INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('audio-stream-0', 1, 'Musica Living', 'I2S', 'GPIO 25/26', 'ACTIVE', 'Stream de audio digital');

-- 5. Avanzado (Terminales y Contadores)
INSERT OR IGNORE INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('caudalimetro', 1, 'Flujo de Agua', 'PCNT', 'GPIO 12', '1250', 'Frecuencímetro de pulsos');

INSERT OR IGNORE INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('receptor-ir-tv', 1, 'Control Remoto', 'IR', 'GPIO 33', 'RC5', 'Mando a distancia de la TV');

-- 6. Precisión DAC (Slider Esmeralda)
INSERT OR IGNORE INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('voltaje-referencia', 1, 'Salida DAC 1', 'DAC', 'GPIO 25', '128', 'Salida de voltaje variable 0-3.3V');
