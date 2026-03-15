# 📟 Guía Extendida: ESP8266 + VoltioPR

El **ESP8266 (NodeMCU/Wemos D1)** es ideal para proyectos económicos de automatización. Aquí tienes cómo conectarlo de forma segura con los nuevos protocolos.

## 1. Protocolos Soportados en ESP8266

Aunque es menos potente que el ESP32, puede manejar:
*   **DIGITAL_OUT**: Relés y luces.
*   **PWM**: Dimmers de intensidad (Software PWM, 0 a 1023).
*   **ANALOG_IN**: Solo tiene **1 pin (A0)**. Ideal para un sensor de luz o batería.
*   **I2C**: Usando los pines D1 (SCL) y D2 (SDA).
*   **WIFI / RSSI**: Monitoreo de señal inalámbrica.

---

## 2. Código Arduino Optimizado (Simple y Seguro)

Este código incluye la nueva **X-API-KEY** de seguridad y soporte para múltiples pines.

```cpp
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>

// --- DATOS WIFI ---
const char* ssid = "TU_WIFI";
const char* password = "TU_PASSWORD";
const char* host = "http://tu-app.voltiopr.pages.dev/api/hardware";
const char* apiKey = "v0ltio_Acc3ss_2026_Secur3"; // Llave configurada en el servidor

void setup() {
  Serial.begin(115200);
  pinMode(D1, OUTPUT); // Pin para Relé/LED
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\n¡Conectado!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client; // Usamos http para ESP8266 por simplicidad de memoria
    HTTPClient http;

    // 1. ENVIAR SEÑAL WIFI (Telemetría)
    http.begin(client, host);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-KEY", apiKey);

    StaticJsonDocument<200> postDoc;
    postDoc["id_dispositivo"] = "esp8266-wifi";
    postDoc["valor"] = String(WiFi.RSSI()); // Envía potencia de señal

    String jsonStr;
    serializeJson(postDoc, jsonStr);
    http.POST(jsonStr);
    http.end();

    // 2. RECIBIR ÓRDENES (Control)
    http.begin(client, host);
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

        if (id == "rele-terraza") {
          digitalWrite(D1, (val == "1") ? HIGH : LOW);
        }
      }
    }
    http.end();
  }
  delay(3000); // Sincroniza cada 3 segundos
}
```

---

## 3. Tabla de Referencia de Pines (GPIO)

| Serigrafía | GPIO (Número en Web) | Función Recomendada |
| :--- | :--- | :--- |
| **D1** | **5** | I2C (SCL) o Salida Digital |
| **D2** | **4** | I2C (SDA) o Salida Digital |
| **D5** | **14** | SPI (CLK) o PWM |
| **D6** | **12** | SPI (MISO) o PWM |
| **A0** | **0 (Analógico)** | Lectura de Sensores (0 a 3.3V) |

> [!CAUTION]
> No uses el pin **D3 (GPIO 0)** o **D4 (GPIO 2)** como entradas que puedan estar activas al encender, ya que el ESP8266 no arrancará correctamente.
