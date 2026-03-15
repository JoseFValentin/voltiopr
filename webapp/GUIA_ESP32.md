# 🚀 Guía Maestra: ESP32 + VoltioPR (Protocolos Totales)

El **ESP32** es la joya de la corona para IoT. Esta guía te enseña a implementar desde lo básico hasta protocolos industriales y multimedia.

## 1. Tipos de Interfaz Soportados en VoltioPR

Al configurar tu ESP32 en la web, elige el tipo correcto para habilitar el control adecuado:

### A. Básicos (Control Directo)
*   **DIGITAL_OUT**: Luces, Motores (On/Off).
*   **DIGITAL_IN**: Botones, Sensores PIR.
*   **PWM**: Control de brillo de LEDs o velocidad de motores DC.
*   **ANALOG_IN (ADC)**: Sensores de voltaje, potenciómetros, LDR.
*   **DAC**: Salida analógica pura (Conversión Digital a Analógico) para audio o voltajes precisos.

### B. Comunicación Industrial y Sensores
*   **I2C / SPI / SERIAL**: Pantallas OLED, sensores de presión, básculas.
*   **ONEWIRE**: Sensores de temperatura `DS18B20`.
*   **CAN BUS (TWAI)**: El ESP32 tiene un controlador CAN nativo para diagnósticos automotrices.

### C. Sensores Internos del ESP32
*   **TOUCH**: Pines que detectan el toque humano sin botones físicos.
*   **HALL**: Sensor integrado que detecta campos magnéticos (imanes).

### D. Inalámbrico
*   **WIFI / RSSI**: Monitorea la calidad de la señal en tiempo real.

---

## 2. Ejemplo de Código "Todo en Uno"

Este programa demuestra cómo enviar y recibir datos de múltiples protocolos simultáneamente.

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h> // Para I2C

// --- DATOS DEL USUARIO ---
const char* ssid = "TU_WIFI";
const char* password = "TU_PASSWORD";
const char* serverUrl = "https://tu-app.voltiopr.pages.dev/api/hardware";
const char* apiKey = "v0ltio_Acc3ss_2026_Secur3"; // Tu llave de seguridad

void setup() {
  Serial.begin(115200);
  
  // 1. Configurar Pines Básicos
  pinMode(2, OUTPUT);    // LED Interno (Digital Out)
  pinMode(4, INPUT);     // Sensor Puerta (Digital In)
  
  // 2. Configurar PWM (Cercano a PIN 25)
  ledcSetup(0, 5000, 8); // Canal 0, 5kHz, 8 bits
  ledcAttachPin(25, 0);  // GPIO 25
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\n¡Conectado!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure client;
    client.setInsecure(); // Para pruebas rápidas
    HTTPClient http;

    // --- PASO 1: ENVIAR TELEMETRÍA (POST) ---
    // Aquí enviamos valores de Sensores Táctiles, Magnéticos y WiFi
    http.begin(client, serverUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-KEY", apiKey);

    StaticJsonDocument<512> postDoc;
    
    // Hall Sensor (Magnético)
    int hallVal = hallRead(); 
    // Touch Sensor (Capacitivo en GPIO 12)
    int touchVal = touchRead(T5); 
    // WiFi Signal (Inalámbrico)
    int rssi = WiFi.RSSI();

    // Enviamos un ejemplo de sensor Hall
    postDoc["id_dispositivo"] = "sensor-magnetico";
    postDoc["valor"] = String(hallVal);
    
    // Enviamos el RSSI del WiFi
    // postDoc["id_dispositivo"] = "wifi-status"; // Podrías enviar varios en bucle
    // postDoc["valor"] = String(rssi);

    String jsonStr;
    serializeJson(postDoc, jsonStr);
    http.POST(jsonStr);
    http.end();

    // --- PASO 2: RECIBIR ÓRDENES (GET) ---
    http.begin(client, serverUrl);
    http.addHeader("X-API-KEY", apiKey);
    
    int httpCode = http.GET();
    if (httpCode == 200) {
      String payload = http.getString();
      DynamicJsonDocument doc(2048);
      deserializeJson(doc, payload);

      JsonArray items = doc["datos_iot"];
      for (JsonObject item : items) {
        String id = item["id"];
        String val = item["valor_actual"];

        // Control de PWM (Dimmer)
        if (id == "led-dimmer") {
          int power = val.toInt();
          ledcWrite(0, map(power, 0, 100, 0, 255));
        }
        
        // Control de Salida Analógica (DAC en GPIO 26)
        if (id == "voltaje-salida") {
          dacWrite(26, val.toInt()); // 0 a 255 directos
        }
      }
    }
    http.end();
  }
  delay(2000); // Sincroniza cada 2 segundos
}
```

## 3. Tabla de Pines Recomendados (ESP32)

| Función | Pines Ideales | Notas |
| :--- | :--- | :--- |
| **ADC (Analog In)** | 32, 33, 34, 35 | Son los más estables. |
| **DAC (Analog Out)** | 25, 26 | Únicos pines con salida analógica real. |
| **Touch** | 4, 12, 13, 14, 15, 27 | Detectan tacto humano. |
| **I2C** | SDA: 21, SCL: 22 | Se pueden remapear a otros si es necesario. |
| **PWM** | Casi cualquier pin | Muy flexible en ESP32. |

> [!CAUTION]
> Evita los pines **GPIO 0, 2, 5, 12, y 15** para entradas críticas, ya que pueden afectar el arranque (boot) del ESP32 si están en el estado incorrecto al encender.
