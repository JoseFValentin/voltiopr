INSERT OR IGNORE INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('terminal-debug', 1, 'Consola Debug', 'SERIAL', 'TX/RX', '', 'Monitor serial');

INSERT OR IGNORE INTO iot_config (id, usuario_id, nombre, tipo, pin, valor_actual, descripcion) 
VALUES ('audio-output', 1, 'Stream Audio', 'I2S', 'GPIO25/26', '', 'Salida de audio I2S');
