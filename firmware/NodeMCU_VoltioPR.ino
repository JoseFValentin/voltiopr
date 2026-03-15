/*
  ==============================================================
  VOLTIOPR - FIRMWARE NodeMCU (ESP8266)
  ==============================================================
  NOTA: Se recomienda usar 'ESP_Universal_VoltioPR.ino' para 
  obtener todas las nuevas funciones multi-protocolo. 
  
  Este archivo se mantiene por compatibilidad.
*/

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "TU_WIFI";
const char* password = "TU_PASSWORD";
const char* host = "https://tu-app.voltiopr.pages.dev/api/hardware";
const char* apiKey = "v0ltio_Acc3ss_2026_Secur3";

void setup() {
  Serial.begin(115200);
  pinMode(D1, OUTPUT); 
  WiFi.begin(ssid, password);
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;

    http.begin(client, host);
    http.addHeader("X-API-KEY", apiKey);
    
    int httpCode = http.GET();
    if (httpCode == 200) {
      String payload = http.getString();
      DynamicJsonDocument doc(2048);
      deserializeJson(doc, payload);
      JsonArray items = doc["datos_iot"];
      for (JsonObject item : items) {
        if (item["id"] == "rele-1") {
          digitalWrite(D1, (item["valor_actual"] == "1") ? HIGH : LOW);
        }
      }
    }
    http.end();
  }
  delay(3000);
}
