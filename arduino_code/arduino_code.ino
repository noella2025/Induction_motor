#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ================= WiFi & MQTT Configuration =================
const char* ssid = "Didy@26";           // Replace with your WiFi SSID
const char* password = "didy0123";   // Replace with your WiFi password
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
  
  // Configure pins
  setupPins();
  
  // Connect to WiFi
  setupWiFi();
  
  // Setup MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  
  Serial.println("✅ System Ready: NORMAL mode (Motor OFF, Fan+Buzzer OFF, Green LED ON)");
}

// ================= Pin Setup =================
void setupPins() {
  // Configure MAX6675 Pins
  pinMode(CS, OUTPUT); digitalWrite(CS, HIGH);
  pinMode(SCK, OUTPUT);
  pinMode(SO, INPUT);

  // Relay Pins setup (Active LOW: LOW = ON, HIGH = OFF)
  pinMode(RELAY1, OUTPUT); digitalWrite(RELAY1, HIGH);  // Motor OFF
  pinMode(RELAY2, OUTPUT); digitalWrite(RELAY2, HIGH);
  pinMode(RELAY3, OUTPUT); digitalWrite(RELAY3, HIGH);
  pinMode(RELAY4, OUTPUT); digitalWrite(RELAY4, HIGH);  // Fan+Buzzer OFF

  // LED initial states
  pinMode(LED_GREEN, OUTPUT); digitalWrite(LED_GREEN, HIGH); // Green ON
  pinMode(LED_RED, OUTPUT); digitalWrite(LED_RED, LOW);       // Red OFF
}

// ================= WiFi Setup =================
void setupWiFi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

// ================= MQTT Callback =================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  Serial.println(message);

  // Parse control commands
  if (String(topic) == control_topic) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, message);
    
    if (doc.containsKey("motor")) {
      manualControl = true;
      bool requestedState = doc["motor"];
      if (!criticalMode) { // Only allow manual control if not in critical mode
        motorState = requestedState;
        updateRelays();
        Serial.println(motorState ? "🔧 Manual: Motor ON" : "🔧 Manual: Motor OFF");
      } else {
        Serial.println("⚠️ Manual control blocked - Critical temperature!");
      }
    }
    
    if (doc.containsKey("fan")) {
      bool requestedFanState = doc["fan"];
      if (!criticalMode) {
        fanBuzzerState = requestedFanState;
        updateRelays();
        Serial.println(fanBuzzerState ? "🔧 Manual: Fan+Buzzer ON" : "🔧 Manual: Fan+Buzzer OFF");
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
  
  // Parse settings updates
  if (String(topic) == settings_topic) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, message);
    
    if (doc.containsKey("action") && doc["action"] == "update_thresholds") {
      if (doc.containsKey("warning_temp")) {
        warningTemp = doc["warning_temp"];
        Serial.print("🎯 Warning temp updated: ");
        Serial.println(warningTemp);
      }
      if (doc.containsKey("fan_temp")) {
        fanStartTemp = doc["fan_temp"];
        Serial.print("🌀 Fan temp updated: ");
        Serial.println(fanStartTemp);
      }
      if (doc.containsKey("critical_temp")) {
        criticalTemp = doc["critical_temp"];
        Serial.print("🚨 Critical temp updated: ");
        Serial.println(criticalTemp);
      }
      Serial.println("✅ Temperature thresholds updated from dashboard");
      sendStatus(); // Send updated status
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
      
      // Send initial status
      sendStatus();
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

// ================= MAX6675 Read Function =================
uint16_t readMAX6675() {
  uint16_t value = 0;
  digitalWrite(CS, LOW);
  delayMicroseconds(1);

  for (int i = 15; i >= 0; i--) {
    digitalWrite(SCK, HIGH);
    delayMicroseconds(1);
    if (digitalRead(SO)) value |= (1 << i);
    digitalWrite(SCK, LOW);
    delayMicroseconds(1);
  }

  digitalWrite(CS, HIGH);
  return value;
}

// ================= Convert to Celsius =================
float readTemperatureC() {
  uint16_t raw = readMAX6675();
  if (raw & 0x4) {
    Serial.println("⚠️ Thermocouple not connected!");
    return NAN;
  }
  int tempData = raw >> 3;
  return tempData * 0.25;
}

// ================= Update Relays =================
void updateRelays() {
  digitalWrite(RELAY1, motorState ? LOW : HIGH);
  digitalWrite(RELAY2, motorState ? LOW : HIGH);
  digitalWrite(RELAY3, motorState ? LOW : HIGH);
  digitalWrite(RELAY4, fanBuzzerState ? LOW : HIGH);
}

// ================= Send Temperature Data =================
void sendTemperatureData(float temp) {
  DynamicJsonDocument doc(1024);
  doc["temp"] = temp;
  doc["time"] = millis();
  doc["raw"] = temp; // For backward compatibility
  
  String output;
  serializeJson(doc, output);
  client.publish(temp_topic, output.c_str());
}

// ================= Send Status Data =================
void sendStatus() {
  DynamicJsonDocument doc(1024);
  doc["motor"] = motorState;
  doc["fan"] = fanBuzzerState;
  
  // Determine current mode based on temperature thresholds
  String currentMode = "normal";
  if (criticalMode) {
    currentMode = "critical";
  } else if (smoothedTemp >= fanStartTemp) {
    currentMode = "cooling";
  } else if (warningMode || smoothedTemp >= warningTemp) {
    currentMode = "warning";
  }
  
  doc["mode"] = currentMode;
  doc["manual"] = manualControl;
  doc["temp"] = smoothedTemp;
  doc["warning_temp"] = warningTemp;
  doc["fan_temp"] = fanStartTemp;
  doc["critical_temp"] = criticalTemp;
  doc["uptime"] = millis();
  
  String output;
  serializeJson(doc, output);
  client.publish(status_topic, output.c_str());
}

// ================= Main Loop =================
void loop() {
  // Maintain MQTT connection
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();
  
  unsigned long currentMillis = millis();
  float tempC = readTemperatureC();

  // ==== Sensor fault safety ====
  if (isnan(tempC)) {
    digitalWrite(RELAY1, HIGH);
    digitalWrite(RELAY2, HIGH);
    digitalWrite(RELAY3, HIGH);
    digitalWrite(RELAY4, LOW);   // Fan+Buzzer ON (Active LOW)
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_RED, LOW);
    Serial.println("⚠️ Sensor Fault! Motor OFF, Fan+Buzzer ON");
    
    // Send fault status via MQTT
    DynamicJsonDocument doc(512);
    doc["error"] = "sensor_fault";
    doc["temp"] = -999;
    String output;
    serializeJson(doc, output);
    client.publish(temp_topic, output.c_str());
    
    previousTemp = 0;
    previousMillis = currentMillis;
    smoothedTemp = 0;
    criticalMode = false;
    delay(1000);
    return;
  }

  // ==== Exponential smoothing ====
  if (smoothedTemp == 0.0) smoothedTemp = tempC;
  smoothedTemp = alpha * tempC + (1 - alpha) * smoothedTemp;

  // ==== Rate of rise ====
  float deltaTime = (currentMillis - previousMillis) / 1000.0;
  float rate = 0.0;
  if (previousTemp != 0.0 && deltaTime > 0) {
    rate = (smoothedTemp - previousTemp) / deltaTime;
    if (rate > maxRate) {
      Serial.println("⚠️ Spike detected, ignored for this cycle");
      rate = 0;
    }
  }

  // ==== Automatic Control (only if not in manual mode) ====
  if (!manualControl) {
    if (smoothedTemp >= criticalTemp) {
      criticalMode = true;
      warningMode = false;
      motorState = false;
      fanBuzzerState = true;
      digitalWrite(LED_GREEN, LOW);
      digitalWrite(LED_RED, HIGH);
    } else {
      criticalMode = false;
      
      // Check if in warning mode
      warningMode = (smoothedTemp >= warningTemp);

      // Motor hysteresis: OFF above (critical-2), ON below (fanStart-2)
      if (smoothedTemp > (criticalTemp - 2.0)) motorState = false;
      else if (smoothedTemp < (fanStartTemp - 2.0)) motorState = true;

      // Fan+Buzzer hysteresis: ON above fanStartTemp, OFF below (fanStart-2)
      if (smoothedTemp > fanStartTemp) fanBuzzerState = true;
      else if (smoothedTemp < (fanStartTemp - 2.0)) fanBuzzerState = false;

      // LEDs
      digitalWrite(LED_GREEN, HIGH);
      digitalWrite(LED_RED, LOW);
    }
    
    // Apply relay states
    updateRelays();
  } else {
    // In manual mode, still check for critical temperature override
    if (smoothedTemp >= criticalTemp) {
      criticalMode = true;
      motorState = false; // Force motor OFF in critical mode
      fanBuzzerState = true; // Force fan ON in critical mode
      updateRelays();
      digitalWrite(LED_GREEN, LOW);
      digitalWrite(LED_RED, HIGH);
      Serial.println("🚨 Critical override: Motor forced OFF, Fan forced ON");
    } else {
      criticalMode = false;
      digitalWrite(LED_GREEN, HIGH);
      digitalWrite(LED_RED, LOW);
    }
  }

  // ==== Send MQTT Data every 2 seconds ====
  if (currentMillis - lastMqttSend >= 2000) {
    sendTemperatureData(smoothedTemp);
    sendStatus();
    lastMqttSend = currentMillis;
  }

  // ==== Serial Monitor Output ====
  Serial.print("🌡️ Temp: ");
  Serial.print(smoothedTemp, 2);
  Serial.print(" °C | MODE: ");

  if (criticalMode) Serial.print("CRITICAL | ");
  else if (smoothedTemp >= fanStartTemp) Serial.print("COOLING | ");
  else if (smoothedTemp >= warningTemp) Serial.print("WARNING | ");
  else Serial.print("NORMAL | ");

  Serial.print("Motor: "); Serial.print(motorState ? "ON" : "OFF");
  Serial.print(" | Fan+Buzzer: "); Serial.print(fanBuzzerState ? "ON" : "OFF");
  Serial.print(" | Control: "); Serial.print(manualControl ? "MANUAL" : "AUTO");
  Serial.print(" | Thresholds: W");
  Serial.print(warningTemp, 0);
  Serial.print("/F");
  Serial.print(fanStartTemp, 0);
  Serial.print("/C");
  Serial.print(criticalTemp, 0);
  Serial.println();

  previousTemp = smoothedTemp;
  previousMillis = currentMillis;

  delay(1000);
}