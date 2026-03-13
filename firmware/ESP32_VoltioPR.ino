/*
  ==============================================================
  VOLTIOPR - FIRMWARE ESP32 (INDUSTRIAL EDITION)
  ==============================================================
  Este programa conecta tu ESP32 al Dashboard de Cloudflare.
  Soporta: Digital, PWM, Analógico, Serial e I2S.
  
  Dependencias: 
  - ArduinoJson (Instalar desde el Gestor de Librerías)
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "driver/i2s.h" // Librería nativa para I2S en ESP32

// --- CONFIGURACIÓN WIFI ---
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";

// --- CONFIGURACIÓN CLOUDFLARE ---
// Cambia esto por tu URL real de Cloudflare Pages (ej: https://voltiopr.pages.dev)
const char* apiUrl = "http://127.0.0.1:8788/api/hardware"; 

// --- PINES ---
const int PIN_RELE = 2;       // Salida Digital
const int PIN_PWM = 4;        // Salida PWM (LED/Ventilador)
const int PIN_SENSOR = 34;    // Entrada Analógica (ADC)
const int PIN_BOTON = 5;      // Entrada Digital

// Configuración PWM ESP32
const int freq = 5000;
const int ledChannel = 0;
const int resolution = 8; // 0-255

void setup() {
  Serial.begin(115200);
  
  // Configuración de Pines
  pinMode(PIN_RELE, OUTPUT);
  pinMode(PIN_BOTON, INPUT_PULLUP);
  
  // Setup PWM (Nativo ESP32)
  ledcSetup(ledChannel, freq, resolution);
  ledcAttachPin(PIN_PWM, ledChannel);

  // --- CONFIGURACIÓN I2S (AUDIO/DATA BUS) ---
  setupI2S();

  // Conexión WiFi
  conectarWiFi();
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    // 1. Preguntamos al Dashboard: "¿Qué debo hacer?" (GET)
    actualizarDesdeDashboard();

    // 2. Le decimos al Dashboard: "Así están mis sensores" (POST)
    enviarSensoresAlDashboard();
  }
  
  delay(5000); // Revisamos cada 5 segundos para no saturar
}

void conectarWiFi() {
  Serial.print("Conectando a WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Conectado!");
}

void actualizarDesdeDashboard() {
  HTTPClient http;
  http.begin(apiUrl);
  
  int httpCode = http.GET();
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    StaticJsonDocument<1024> doc;
    deserializeJson(doc, payload);

    JsonArray devices = doc["datos_iot"];
    for (JsonObject dev : devices) {
      String id = dev["id"];
      String valor = dev["valor_actual"];

      // Ejemplo: Si el ID es 'bomba-agua' y es DIGITAL_OUT
      if (id == "bomba-agua") {
        digitalWrite(PIN_RELE, valor == "1" ? HIGH : LOW);
        Serial.printf("Dispositivo %s actualizado a %s\n", id.c_str(), valor.c_str());
      }
      
      // Ejemplo: Si el ID es 'ventilador' y es PWM
      if (id == "ventilador") {
        int pwmVal = valor.toInt();
        ledcWrite(ledChannel, pwmVal);
        Serial.printf("PWM Ventilador a %d%%\n", pwmVal);
      }
    }
  }
  http.end();
}

void enviarSensoresAlDashboard() {
  HTTPClient http;
  http.begin(apiUrl);
  http.addHeader("Content-Type", "application/json");

  // Leemos un sensor analógico (ej: LDR o Potenciómetro)
  int valorAnalogico = analogRead(PIN_SENSOR);
  
  StaticJsonDocument<200> doc;
  doc["id_dispositivo"] = "sensor-luz"; // El ID que configuraste en /config.html
  doc["valor"] = String(valorAnalogico);
  
  String json;
  serializeJson(doc, json);
  
  int httpCode = http.POST(json);
  if (httpCode > 0) {
    Serial.println("Datos del sensor enviados con éxito.");
  }
  http.end();
}

void setupI2S() {
  // Esta es la base para I2S. Útil para micrófonos digitales o DACs de audio.
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate = 44100,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT,
    .communication_format = I2S_COMM_FORMAT_I2S,
    .intr_alloc_flags = 0,
    .dma_buf_count = 8,
    .dma_buf_len = 64,
    .use_apll = false
  };
  // Pinout típico de I2S (Cambiar según hardware)
  i2s_pin_config_t pin_config = {
    .bck_io_num = 26,
    .ws_io_num = 25,
    .data_out_num = 22,
    .data_in_num = I2S_PIN_NO_CHANGE
  };
  i2s_driver_install(I2S_NUM_0, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_NUM_0, &pin_config);
  Serial.println("Bus I2S Inicializado");
}
