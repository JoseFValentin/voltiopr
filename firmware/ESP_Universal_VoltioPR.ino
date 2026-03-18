/*
  ==============================================================
  VOLTIOPR - FIRMWARE UNIVERSAL (ESP32 / ESP8266)
  ==============================================================
  Este programa sincroniza tu hardware con el Dashboard de VoltioPR.
  Soporta todos los nuevos protocolos: Digital, PWM, ADC, DAC, Touch, RSSI, etc.
  
  Seguridad: Requiere X-API-KEY.
  ==============================================================
*/

#if defined(ESP32)
  #include <WiFi.h>
  #include <HTTPClient.h>
  #include <HTTPUpdate.h>
#else
  #include <ESP8266WiFi.h>
  #include <ESP8266HTTPClient.h>
  #include <ESP8266httpUpdate.h>
#endif
#include <ArduinoJson.h>

// --- 1. CONFIGURACIÓN WIFI Y SERVIDOR ---
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";
const char* apiUrl = "https://tu-app.voltiopr.pages.dev/api/hardware"; 
const char* apiOtaUrl = "https://tu-app.voltiopr.pages.dev/api/ota"; 
const char* apiKey = "v0ltio_Acc3ss_2026_Secur3"; // Debe coincidir con el servidor
const char* currentVersion = "1.0.0"; // Versión actual del firmware

// --- 2. ASIGNACIÓN DE PINES ---
#if defined(ESP32)
  const int PIN_LED = 2;      // LED interno
  const int PIN_PWM = 25;     // GPIO 25 para Dimmer
  const int PIN_DAC = 26;     // GPIO 26 para Salida Analógica Real
  const int PIN_TOUCH = T3;   // GPIO 15 (Touch Sensor)
#else
  const int PIN_LED = D1;     // GPIO 5 (NodeMCU)
  const int PIN_PWM = D2;     // GPIO 4
  const int PIN_ADC = A0;     // Único analógico en ESP8266
#endif

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED, OUTPUT);
  
  #if defined(ESP32)
    ledcSetup(0, 5000, 8); // Canal 0, 5kHz, 8 bits
    ledcAttachPin(PIN_PWM, 0);
  #endif

  conectarWiFi();
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    sincronizarConVoltioPR();
  } else {
    conectarWiFi();
  }
  delay(3000); // Sincroniza cada 3 segundos
}

void conectarWiFi() {
  Serial.print("\nConectando a " + String(ssid));
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n¡WiFi Conectado!");
}

void sincronizarConVoltioPR() {
  WiFiClientSecure client;
  client.setInsecure(); // Simplificado (evita cargar certificados)
  HTTPClient http;

  // --- PASO A: ENVIAR DATOS (POST) - Telemetría ---
  http.begin(client, apiUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-KEY", apiKey);

  StaticJsonDocument<512> postDoc;
  
  // 1. Enviamos Calidad de Señal WiFi (Protocolo WIFI)
  postDoc["id_dispositivo"] = "wifi-esp";
  postDoc["valor"] = String(WiFi.RSSI());
  
  // 2. Si es ESP32, enviamos valor del sensor táctil (Protocolo TOUCH)
  #if defined(ESP32)
    // postDoc["id_dispositivo"] = "sensor-toque";
    // postDoc["valor"] = String(touchRead(PIN_TOUCH));
  #endif

  String jsonStr;
  serializeJson(postDoc, jsonStr);
  http.POST(jsonStr);
  http.end();

  // --- PASO B: RECIBIR ÓRDENES (GET) - Control ---
  http.begin(client, apiUrl);
  http.addHeader("X-API-KEY", apiKey);
  
  int httpCode = http.GET();
  if (httpCode == 200) {
    String payload = http.getString();
    DynamicJsonDocument doc(2048);
    deserializeJson(doc, payload);

    JsonArray items = doc["datos_iot"];
    for(JsonObject item : items) {
       String id = item["id"];
       String val = item["valor_actual"];

       // Control Digital (Switch)
       if (id == "luz-led") {
          digitalWrite(PIN_LED, (val == "1") ? HIGH : LOW);
       }
       
       // Control PWM (Dimer)
       if (id == "dimmer-ventilador") {
          int power = val.toInt();
          #if defined(ESP32)
            ledcWrite(0, map(power, 0, 100, 0, 255));
          #else
            analogWrite(PIN_PWM, map(power, 0, 100, 0, 1023));
          #endif
       }

       // Control DAC (Salida Analógica ESP32)
       #if defined(ESP32)
       if (id == "audio-out") {
          dacWrite(PIN_DAC, val.toInt()); // 0-255
       }
       #endif
    }
  }
  http.end();
  
  // --- PASO C: VERIFICAR Y APLICAR ACTUALIZACIONES OTA (Over-The-Air) ---
  verificarActualizacionOTA(client);
}

void verificarActualizacionOTA(WiFiClientSecure& client) {
  HTTPClient http;
  String checkUrl = String(apiOtaUrl) + "?action=check&version=" + currentVersion;
  
  http.begin(client, checkUrl);
  http.addHeader("X-API-KEY", apiKey);
  
  int code = http.GET();
  if (code == 200) {
      String payload = http.getString();
      DynamicJsonDocument doc(512);
      deserializeJson(doc, payload);
      
      bool isUpdateAvailable = doc["update_available"];
      String targetVersion = doc["latest_version"].as<String>();
      
      if (isUpdateAvailable) {
          Serial.println(">>> ACTUALIZACIÓN OTA DISPONIBLE: v" + targetVersion);
          Serial.println(">>> Iniciando descarga e instalación...");
          
          String downloadUrl = String(apiOtaUrl) + "?action=download";
          
          #if defined(ESP32)
            t_httpUpdate_return ret = httpUpdate.update(client, downloadUrl);
          #else
            t_httpUpdate_return ret = ESPhttpUpdate.update(client, downloadUrl);
          #endif
          
          switch (ret) {
            case HTTP_UPDATE_FAILED:
              #if defined(ESP32)
                Serial.printf("OTA Falló: %s\n", httpUpdate.getLastErrorString().c_str());
              #else
                Serial.printf("OTA Falló: %s\n", ESPhttpUpdate.getLastErrorString().c_str());
              #endif
              break;
            case HTTP_UPDATE_NO_UPDATES:
              Serial.println("OTA: No hay actualizaciones (Cancelado)");
              break;
            case HTTP_UPDATE_OK:
              Serial.println("OTA: Completado con éxito. Reiniciando...");
              break;
          }
      }
  }
  http.end();
}
