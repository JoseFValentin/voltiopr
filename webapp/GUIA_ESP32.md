# 🚀 Guía de Configuración: ESP32 + VoltioPR

El **ESP32** es mucho más potente y flexible que el ESP8266. Aquí te explicamos cómo aprovecharlo con VoltioPR.

## 1. Configuración de Campos en la Pantalla de Pines

### A. Nombre del Dispositivo
*   **Ejemplo:** `Aire Acondicionado`, `Dimmer Sala`, `Medidor Voltaje`.

### B. ID del Dispositivo (Hardware ID)
*   **Importante:** Este ID debe coincidir exactamente con el que pongas en tu código Arduino.
*   **Ejemplo:** `esp32_central_01`.

### C. Pin de Hardware (GPIO)
*   **Ventaja:** En ESP32, la mayoría de las veces el número impreso en la placa (G2, G4, G12) es el número real del **GPIO**.
*   **Pines Favoritos:**
    *   `GPIO 2` (Suelen tener un LED integrado en la placa).
    *   `GPIO 4, 5, 12, 13, 14, 25, 26, 27` (Pines seguros para salida).
*   **Ejemplo:** Si usas el pin **G4**, en la web escribe **4**.

### D. Tipo de Señal
*   **DIGITAL_OUT:** Relés, electroválvulas.
*   **PWM:** El ESP32 es excelente para esto. Se usa para dimers de LEDs o ventiladores.
*   **ANALOG_IN:** El ESP32 tiene muchos pines analógicos (ADC). Ideales para voltímetros o sensores de temperatura analógicos.

---

## 2. Ejemplo Práctico: Control de Intensidad LED (PWM)

En este ejemplo, configuraremos un LED para variar su brillo desde la web de VoltioPR.

### Configuración en la Web:
1.  **Nombre:** `Luz Regulable`
2.  **ID:** `esp32_dimmer_01`
3.  **Pin:** `4`
4.  **Tipo:** `PWM` (Esto habilitará un control deslizante/slider en el Dashboard).

### Código Arduino para ESP32:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "TU_WIFI";
const char* password = "TU_PASSWORD";
const char* host = "https://tu-app.voltiopr.pages.dev/api/hardware?id=esp32_dimmer_01";

// Configuración PWM ESP32
const int ledPin = 4; // GPIO 4 (Vínculo con la Web)
const int freq = 5000;
const int ledChannel = 0;
const int resolution = 8; // 0 a 255

void setup() {
  Serial.begin(115200);
  
  // Configurar canal PWM
  ledcSetup(ledChannel, freq, resolution);
  ledcAttachPin(ledPin, ledChannel);
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(host);
    
    int httpCode = http.GET();
    if (httpCode > 0) {
      String payload = http.getString();
      StaticJsonDocument<200> doc;
      deserializeJson(doc, payload);
      
      // Obtener el valor de la web (0-100%)
      int valorPorcentaje = doc["valor"]; 
      
      // Convertir 0-100% a 0-255 (resolución 8bits)
      int dutyCycle = map(valorPorcentaje, 0, 100, 0, 255);
      
      ledcWrite(ledChannel, dutyCycle);
      Serial.print("Brillo actualizado: ");
      Serial.println(valorPorcentaje);
    }
    http.end();
  }
  delay(2000); // Revisar cada 2 segundos
}
```

---

## 3. Resumen de Diferencias (Configuración Web)

| Característica | ESP8266 | ESP32 |
| :--- | :--- | :--- |
| **Referencia Pin** | Usar Tabla (D1=5) | Usar número serigrafía (G4=4) |
| **Pines Analógicos** | Solo 1 (A0) | Múltiples (ADC1, ADC2) |
| **PWM** | Software (Limitado) | Hardware (Preciso y potente) |
| **Velocidad Sync** | Recomendado 5s+ | Recomendado 1s - 3s |

> [!IMPORTANT]
> Siempre usa el **Hardware ID** idéntico tanto en el código como en la web, de lo contrario los comandos se perderán en la base de datos.
