#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ================= WiFi & MQTT Configuration =================
const char* ssid = "iPhone";           // Replace with your WiFi SSID
const char* password = "123456688";    // Replace with your WiFi password
const char* mqtt_server = "test.mosquitto.org";
const int mqtt_port = 1883;
const char* mqtt_client_id = "motor_controller_001";

// MQTT Topics
const char* temp_topic = "motor/temp";
const char* status_topic = "motor/status";
const char* control_topic = "motor/control";
const char* settings_topic = "motor/settings";

WiFiClient espClient;
PubSubClient client(espClient);

// ================= Pin Definitions =================
#define CS D5          // MAX6675 Chip Select pin
#define SCK D4         // MAX6675 Clock pin
#define SO D6          // MAX6675 Data Out (MISO) pin

// Relay Pins (Active LOW)
#define RELAY1 D0      // Phase 1 relay (Motor)
#define RELAY2 D1      // Phase 2 relay (Motor)
#define RELAY3 D2      // Phase 3 relay (Motor)
#define RELAY4 D3      // Fan + Buzzer relay (combined)

// LED Pins (Only Green and Red)
#define LED_GREEN D7   // Normal temperature LED
#define LED_RED D8     // Critical temperature LED

// ================= Temperature Settings =================
float warningTemp = 50.0;        // Start showing warnings at 50 °C
float fanStartTemp = 65.0;       // Turn Fan+Buzzer ON at 65 °C
float criticalTemp = 70.0;       // Critical temperature threshold

// ================= Reliability Settings =================
const float maxRate = 10.0;      // Max allowed temp rise (°C/sec) to ignore spikes

// ================= State Tracking =================
bool criticalMode = false;
bool warningMode = false;
bool motorState = false;
bool fanBuzzerState = false;
bool manualControl = false;      // Flag for manual control via dashboard
float previousTemp = 0.0;
unsigned long previousMillis = 0;
unsigned long lastMqttSend = 0;
float smoothedTemp = 0.0;
const float alpha = 0.3;

// ================= Setup Function =================
void setup() {
  Serial.begin(115200);
  setupPins();
  setupWiFi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  Serial.println("✅ System Ready: NORMAL mode (Motor OFF, Fan+Buzzer OFF, Green LED ON)");
}

// ================= Pin Setup =================
void setupPins() {
  pinMode(CS, OUTPUT); digitalWrite(CS, HIGH);
  pinMode(SCK, OUTPUT);
  pinMode(SO, INPUT);

  pinMode(RELAY1, OUTPUT); digitalWrite(RELAY1, HIGH);
  pinMode(RELAY2, OUTPUT); digitalWrite(RELAY2, HIGH);
  pinMode(RELAY3, OUTPUT); digitalWrite(RELAY3, HIGH);
  pinMode(RELAY4, OUTPUT); digitalWrite(RELAY4, HIGH);

  pinMode(LED_GREEN, OUTPUT); digitalWrite(LED_GREEN, HIGH);
  pinMode(LED_RED, OUTPUT); digitalWrite(LED_RED, LOW);
}

// ================= WiFi Setup =================
void setupWiFi() {
  Serial.print("Connecting to "); Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.println("\nWiFi connected");
  Serial.print("IP address: "); Serial.println(WiFi.localIP());
}

// ================= MQTT Callback =================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (int i = 0; i < length; i++) message += (char)payload[i];
  
  Serial.print("Message arrived ["); Serial.print(topic); Serial.print("] "); Serial.println(message);

  // Manual Control
  if (String(topic) == control_topic) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, message);
    if (doc.containsKey("motor")) {
      manualControl = true;
      bool requestedState = doc["motor"];
      if (!criticalMode) {
        motorState = requestedState;
        updateRelays();
      } else Serial.println("⚠️ Manual control blocked - Critical temperature!");
    }
    if (doc.containsKey("fan")) {
      bool requestedFanState = doc["fan"];
      if (!criticalMode) {
        fanBuzzerState = requestedFanState;
        updateRelays();
      }
    }
    if (doc.containsKey("mode")) {
      String mode = doc["mode"];
      if (mode == "auto") {
        manualControl = false;
        Serial.println("🔄 Switched to AUTO mode");
      }
    }
  }

  // Settings updates
  if (String(topic) == settings_topic) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, message);
    if (doc["action"] == "update_thresholds") {
      if (doc.containsKey("warning_temp")) warningTemp = doc["warning_temp"];
      if (doc.containsKey("fan_temp")) fanStartTemp = doc["fan_temp"];
      if (doc.containsKey("critical_temp")) criticalTemp = doc["critical_temp"];
      Serial.println("✅ Thresholds updated from dashboard");
      sendStatus();
    }
  }
}

// ================= MQTT Reconnect =================
void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect(mqtt_client_id)) {
      Serial.println("connected");
      client.subscribe(control_topic);
      client.subscribe(settings_topic);
      sendStatus();
    } else {
      Serial.print("failed, rc="); Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

// ================= MAX6675 Read Function =================
uint16_t readMAX6675() {
  uint16_t value = 0;
  digitalWrite(CS, LOW); delayMicroseconds(1);
  for (int i = 15; i >= 0; i--) {
    digitalWrite(SCK, HIGH); delayMicroseconds(1);
    if (digitalRead(SO)) value |= (1 << i);
    digitalWrite(SCK, LOW); delayMicroseconds(1);
  }
  digitalWrite(CS, HIGH);
  return value;
}

float readTemperatureC() {
  uint16_t raw = readMAX6675();
  if (raw & 0x4) {
    Serial.println("⚠️ Thermocouple not connected!");
    return NAN;
  }
  int tempData = raw >> 3;
  return tempData * 0.25;
}

// ================= Relay & MQTT Functions =================
void updateRelays() {
  digitalWrite(RELAY1, motorState ? LOW : HIGH);
  digitalWrite(RELAY2, motorState ? LOW : HIGH);
  digitalWrite(RELAY3, motorState ? LOW : HIGH);
  digitalWrite(RELAY4, fanBuzzerState ? LOW : HIGH);
}

void sendTemperatureData(float temp) {
  DynamicJsonDocument doc(512);
  doc["temp"] = temp;
  doc["time"] = millis();
  String output;
  serializeJson(doc, output);
  client.publish(temp_topic, output.c_str());
}

void sendStatus() {
  DynamicJsonDocument doc(512);
  doc["motor"] = motorState;
  doc["fan"] = fanBuzzerState;
  String mode = "normal";
  if (criticalMode) mode = "critical";
  else if (smoothedTemp >= fanStartTemp) mode = "cooling";
  else if (smoothedTemp >= warningTemp) mode = "warning";
  doc["mode"] = mode;
  doc["manual"] = manualControl;
  doc["temp"] = smoothedTemp;
  doc["warning_temp"] = warningTemp;
  doc["fan_temp"] = fanStartTemp;
  doc["critical_temp"] = criticalTemp;
  String output;
  serializeJson(doc, output);
  client.publish(status_topic, output.c_str());
}

// ================= Main Loop =================
void loop() {
  if (!client.connected()) reconnectMQTT();
  client.loop();

  unsigned long currentMillis = millis();
  float tempC = readTemperatureC();

  if (isnan(tempC)) {
    Serial.println("⚠️ Sensor Fault! Motor OFF, Fan+Buzzer ON");
    digitalWrite(RELAY1, HIGH);
    digitalWrite(RELAY2, HIGH);
    digitalWrite(RELAY3, HIGH);
    digitalWrite(RELAY4, LOW);
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_RED, LOW);
    delay(1000);
    return;
  }

  if (smoothedTemp == 0.0) smoothedTemp = tempC;
  smoothedTemp = alpha * tempC + (1 - alpha) * smoothedTemp;

  if (!manualControl) {
    // ==== AUTO MODE ====
    if (smoothedTemp >= criticalTemp) {
      criticalMode = true;
      warningMode = false;
      motorState = false;
      fanBuzzerState = true;
      digitalWrite(LED_GREEN, LOW);
      digitalWrite(LED_RED, HIGH);
    } else {
      criticalMode = false;
      warningMode = (smoothedTemp >= warningTemp);

      // === Corrected Logic ===
      // Motor stays ON until critical temperature
      motorState = true;
      if (smoothedTemp >= criticalTemp) motorState = false;

      // Fan+Buzzer ON from fanStartTemp upward (with small hysteresis)
      if (smoothedTemp >= fanStartTemp) fanBuzzerState = true;
      else if (smoothedTemp < (fanStartTemp - 2.0)) fanBuzzerState = false;

      digitalWrite(LED_GREEN, HIGH);
      digitalWrite(LED_RED, LOW);
    }

    updateRelays();
  } else {
    // ==== MANUAL MODE ====
    if (smoothedTemp >= criticalTemp) {
      criticalMode = true;
      motorState = false;
      fanBuzzerState = true;
      updateRelays();
      digitalWrite(LED_GREEN, LOW);
      digitalWrite(LED_RED, HIGH);
    } else {
      criticalMode = false;
      if (smoothedTemp >= fanStartTemp) fanBuzzerState = true;
      updateRelays();
      digitalWrite(LED_GREEN, HIGH);
      digitalWrite(LED_RED, LOW);
    }
  }

  if (currentMillis - lastMqttSend >= 2000) {
    sendTemperatureData(smoothedTemp);
    sendStatus();
    lastMqttSend = currentMillis;
  }

  Serial.print("🌡️ Temp: "); Serial.print(smoothedTemp, 2);
  Serial.print(" °C | MODE: ");
  if (criticalMode) Serial.print("CRITICAL | ");
  else if (smoothedTemp >= fanStartTemp) Serial.print("COOLING | ");
  else if (smoothedTemp >= warningTemp) Serial.print("WARNING | ");
  else Serial.print("NORMAL | ");
  Serial.print("Motor: "); Serial.print(motorState ? "ON" : "OFF");
  Serial.print(" | Fan+Buzzer: "); Serial.print(fanBuzzerState ? "ON" : "OFF");
  Serial.print(" | Control: "); Serial.println(manualControl ? "MANUAL" : "AUTO");

  previousTemp = smoothedTemp;
  previousMillis = currentMillis;
  delay(1000);
}
