# 📟 Guía de Configuración: ESP8266 + VoltioPR

Esta guía detalla cómo vincular tu hardware **ESP8266 (NodeMCU/Wemos D1)** con la plataforma VoltioPR.

## 1. Entendiendo los Campos de la Pantalla de Pines

Cuando entras a la sección de **Configuración de Pines** en VoltioPR, verás un formulario. Aquí te explicamos cómo llenarlo correctamente para un ESP8266:

### A. Nombre del Dispositivo
*   **Qué poner:** Un nombre descriptivo para identificarlo en el Dashboard.
*   **Ejemplo:** `Luz Terraza`, `Ventilador Oficina`, `Sensor Humedad`.

### B. ID del Dispositivo (Hardware ID)
*   **Qué poner:** Una clave única alfanumérica (sin espacios) que será la que uses en el código de Arduino para que la web reconozca el hardware.
*   **Ejemplo:** `esp8266_relay_01` o `nodo_principal`.

### C. Pin de Hardware (GPIO)
*   **¡IMPORTANTE!** En ESP8266, la serigrafía de la placa (D1, D2, D8) **NO** coincide con el número de GPIO que entiende el software. Debes poner el número de **GPIO**.
*   **Tabla de Referencia ESP8266:**
    *   `D1` = **5**
    *   `D2` = **4**
    *   `D5` = **14**
    *   `D8` = **15**
*   **Ejemplo:** Si conectas un relé al pin físico **D1**, en la web debes escribir **5**.

### D. Tipo de Señal
*   **DIGITAL_OUT:** Para prender/apagar algo (Relés, LEDs).
*   **PWM:** Para regular intensidad (Dimmer de luces, velocidad de motor).
*   **ANALOG_IN:** Para leer sensores (Solo pin A0 en ESP8266).

---

## 2. Ejemplo Práctico: Control de un Relé (D1)

### Configuración en la Web:
1.  **Nombre:** `Bombilla Taller`
2.  **ID:** `esp8266_luz_1`
3.  **Pin:** `5` (porque usaremos D1)
4.  **Tipo:** `DIGITAL_OUT`

### Código Arduino para ESP8266:
Asegúrate de tener instalada la librería `ArduinoJson` y configurar tu WiFi.

```cpp
#include <ESP8266WiFi.h>
#include <ArduinoJson.h>

const char* ssid = "TU_WIFI";
const char* password = "TU_PASSWORD";
const char* api_url = "/api/hardware?id=esp8266_luz_1";
const char* apiKey = "v0ltio_Acc3ss_2026_Secur3";

void setup() {
  Serial.begin(115200);
  pinMode(5, OUTPUT); // Corresponde al Pin 5 de la web
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure client;
    client.setInsecure(); // Simplificado para este ejemplo
    
    // Obtener estado desde VoltioPR
    if (client.connect("tu-app.voltiopr.pages.dev", 443)) {
      client.print(String("GET ") + api_url + " HTTP/1.1\r\n" +
                   "Host: tu-app.voltiopr.pages.dev\r\n" +
                   "X-API-KEY: " + apiKey + "\r\n" + 
                   "Connection: close\r\n\r\n");
                   
      // Leer respuesta y aplicar al pin
      // (Lógica simplificada para detectar si es '1' o '0')
      // digitalWrite(5, estado_detectado);
    }
  }
  delay(5000); // Revisar cada 5 segundos
}
```

> [!TIP]
> Recuerda que el ESP8266 tiene poca potencia comparado con el ESP32. Úsalo principalmente para tareas sencillas de encendido/apagado.
