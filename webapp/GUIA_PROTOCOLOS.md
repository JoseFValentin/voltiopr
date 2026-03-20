# 🧠 Guía Profunda de Protocolos: VoltioPR + ESP32/ESP8266

Esta guía explica técnicamente cómo implementar los protocolos avanzados disponibles en la plataforma VoltioPR.

---

## 🏎️ 1. CAN Bus (TWAI - Two-Wire Automotive Interface)
El ESP32 tiene un controlador CAN nativo (llamado TWAI por motivos legales). Se usa en coches e industria.

*   **Hardware Requerido**: Necesitas un transceptor CAN (como el **SN65HVD230**).
*   **Pines Recomendados**: TX=GPIO 5, RX=GPIO 4.
*   **Configuración en Web**: Tipo `CAN`. Verás una animación de sincronización de bus.
*   **Código (Librería ESP32-TWAI)**:
```cpp
#include "driver/twai.h"

void setupCAN() {
    twai_general_config_t g_config = TWAI_GENERAL_CONFIG_DEFAULT((gpio_num_t)5, (gpio_num_t)4, TWAI_MODE_NORMAL);
    twai_timing_config_t t_config = TWAI_TIMING_CONFIG_500KBITS(); // Velocidad estándar 500kbps
    twai_filter_config_t f_config = TWAI_FILTER_CONFIG_ACCEPT_ALL();
    twai_driver_install(&g_config, &t_config, &f_config);
    twai_driver_start();
}

void loopCAN() {
    twai_message_t message;
    if (twai_receive(&message, pdMS_TO_TICKS(100)) == ESP_OK) {
        // Enviar a VoltioPR el ID del mensaje recibido
        enviarAWeb("can-status", String(message.identifier));
    }
}
```

---

## 🎵 2. I2S (Audio Digital)
Se usa para transmitir audio de alta fidelidad hacia DACs externos o recibirlo de micrófonos MEMS.

*   **Uso común**: Altavoces Bluetooth o grabación de audio IoT.
*   **Configuración en Web**: Tipo `I2S`. Verás barras de ecualización animadas.
*   **Código Base**:
```cpp
#include "driver/i2s.h"

void setupI2S() {
    i2s_config_t i2s_config = {
        .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
        .sample_rate = 44100,
        .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
        .channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT,
        .communication_format = I2S_COMM_FORMAT_I2S,
        .intr_alloc_flags = 0,
        .dma_buf_count = 8,
        .dma_buf_len = 64
    };
    i2s_driver_install(I2S_NUM_0, &i2s_config, 0, NULL);
}
```

---

## ⛓️ 3. I2C (Sensores y Pantallas)
El protocolo más usado para sensores de temperatura (BME280), presión o pantallas OLED.

*   **Pines Estándar**: SDA (GPIO 21), SCL (GPIO 22).
*   **Configuración en Web**: Tipo `I2C`.
*   **Múltiples Dispositivos**: Puedes conectar hasta 127 dispositivos en los mismos 2 cables.
*   **Lógica**: En VoltioPR, usa el ID del pin para reportar la temperatura leída.

---

## ⚡ 4. SPI (Alta Velocidad)
Para tarjetas SD, Pantallas TFT grandes o módulos Ethernet/LoRa.

*   **Pines**: MOSI, MISO, SCK y CS.
*   **Configuración en Web**: Tipo `SPI`.
*   **Ventaja**: Es mucho más rápido que I2C, ideal para video o transferencia de datos masiva.

---

## 🌡️ 5. OneWire (Bus de 1 solo cable)
Especial para los famosos sensores de temperatura sumergibles **DS18B20**.

*   **Hardware**: Requiere una resistencia de 4.7k ohms entre el cable de datos y VCC.
*   **Configuración en Web**: Tipo `ONEWIRE`.
*   **Magia de OneWire**: Puedes conectar 20 sensores en el mismo pin y cada uno tiene una dirección única de 64 bits.

---

## 👆 6. Sensores Táctiles (Touch) y Hall
Exclusivos del ESP32.

*   **Touch**: Convierte cualquier trozo de metal en un botón táctil.
    *   *Uso*: `touchRead(GPIO)`. Si el valor baja de 40, alguien está tocando el metal.
*   **Hall**: Detecta imanes. 
    *   *Uso*: `hallRead()`. Si el valor sube o baja drásticamente, hay un campo magnético cerca.
*   **Configuración en Web**: Tipo `TOUCH` o `HALL`. Verás barras neón de sensibilidad.

---

## 📻 7. WiFi RSSI (Monitor de Red)
No es un pin físico, sino la potencia del chip.

*   **Importancia**: Sirve para saber si tu dispositivo está demasiado lejos del router y podría desconectarse.
*   **Configuración en Web**: Tipo `WIFI`. Verás un icono de señal con dBm y colores.
*   **Valores**:
    *   `-30 a -60`: Excelente señal.
    *   `-70 a -80`: Señal regular.
    *   `-90+`: Punto crítico de desconexión.

---

## 🔘 8. BUTTON (Momentario / Pulsador)
A diferencia de un interruptor fijo, este botón solo envía un "pulso" o señal momentánea. Ideal para timbres, claxons o disparar eventos únicos.

*   **Configuración en Web**: Tipo `BUTTON`. Verás un botón de acción táctil.
*   **Comportamiento**: Al pulsarlo, envía una acción de tipo `pulse` a la API.

---

## 🎚️ 9. SLIDER (Pure 0-100% Control)
Un control deslizante directo para valores analógicos, intensidades o consignas (setpoints) sin interruptor de encendido.

*   **Configuración en Web**: Tipo `SLIDER`. Deslizador neón azul.
*   **Rango**: 0-100 para PWM o valores de usuario.

---

## 🎨 10. RGB (Color Picker)
Control completo de color para tiras de LED (NeoPixel, WS2812B) o lámparas inteligentes.

*   **Configuración en Web**: Tipo `RGB`. Verás un selector de color circular y un preview.
*   **Código de Color**: Los valores se envían y reciben en formato Hexadecimal (e.g., `#0db9f2`).

---

> [!TIP]
> **VoltioPR** está diseñado para ser agnóstico. Esto significa que mientras tu ESP32 pueda leer el protocolo, solo tienes que enviar el valor resultante mediante `POST /api/hardware` para verlo graficado o monitorizado en tu panel.
