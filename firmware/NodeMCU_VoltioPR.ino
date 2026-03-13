/*
  ==============================================================
  VOLTIOPR - FIRMWARE NodeMCU (V3 ESP8266)
  ==============================================================
  Este programa conecta tu ESP8266 al Dashboard de Cloudflare.
  Simplificado para mayor estabilidad en hardware antiguo.
  
  Dependencias: 
  - ArduinoJson
  - ESP8266WiFi
  - ESP8266HTTPClient
*/

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>

// --- CONFIGURACIÓN WIFI ---
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";

// --- CONFIGURACIÓN CLOUDFLARE ---
// Cambia esto por tu URL de Cloudflare real
const char* apiUrl = "http://tu-dominio.com/api/hardware"; 

// --- PINES NodeMCU ---
const int PIN_RELE = D1;        // Salida Digital (GPIO5)
const int PIN_PWM = D2;         // Salida PWM (GPIO4)
const int PIN_POT = A0;        // Único Pin Analógico en ESP8266

void setup() {
  Serial.begin(115200);
  
  pinMode(PIN_RELE, OUTPUT);
  pinMode(PIN_PWM, OUTPUT); // En ESP8266 analogWrite se puede usar en casi cualquier pin digital

  conectarWiFi();
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    // Sincronizar con el servidor
    sincronizarDashboard();
  }
  delay(3000); 
}

void conectarWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Conectando a WiFi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi OK!");
}

void sincronizarDashboard() {
  WiFiClient client;
  HTTPClient http;
  
  // 1. OBTENER ÓRDENES (GET)
  http.begin(client, apiUrl);
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    DynamicJsonDocument doc(2048);
    deserializeJson(doc, payload);

    JsonArray items = doc["datos_iot"];
    for(JsonObject item : items) {
       String id = item["id"];
       String val = item["valor_actual"];

       if (id == "rele-1") {
          digitalWrite(PIN_RELE, (val == "1") ? HIGH : LOW);
       }
       if (id == "dimmer-1") {
          int intensity = val.toInt();
          // analogWrite en ESP8266 va de 0 a 1023
          analogWrite(PIN_PWM, map(intensity, 0, 100, 0, 1023));
       }
    }
  }
  http.end();

  // 2. ENVIAR TELEMETRÍA (POST)
  http.begin(client, apiUrl);
  http.addHeader("Content-Type", "application/json");
  
  int analogValue = analogRead(PIN_POT);
  
  DynamicJsonDocument postDoc(256);
  postDoc["id_dispositivo"] = "sensor-presion";
  postDoc["valor"] = String(map(analogValue, 0, 1023, 0, 100)); // Enviar en porcentaje
  
  String json;
  serializeJson(postDoc, json);
  
  http.POST(json);
  http.end();
}

/*
  NOTA SOBRE I2S EN ESP8266:
  El ESP8266 tiene soporte I2S limitado a través del pin I2SOUT (GPIO3/RX).
  Para usarlo se requiere la librería <i2s.h> incluida en el core de ESP8266.
  Se recomienda usar ESP32 si el proyecto requiere I2S robusto.
*/
