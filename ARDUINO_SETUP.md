# Arduino Setup Guide for Motor Temperature Dashboard

## Hardware Requirements

### Components Needed:
1. **ESP8266 NodeMCU** (or similar WiFi-enabled microcontroller)
2. **MAX6675 Thermocouple Amplifier Module**
3. **K-Type Thermocouple** (temperature sensor)
4. **4x Relay Module** (for controlling motor phases and fan)
5. **2x LEDs** (Green and Red for status indication)
6. **Resistors** (220Ω for LEDs)
7. **Buzzer** (optional, can be connected with fan relay)
8. **Breadboard and jumper wires**

### Wiring Diagram:

```
ESP8266 NodeMCU Pin Connections:

MAX6675 Thermocouple:
- VCC → 3.3V
- GND → GND
- CS  → D5
- SCK → D4  
- SO  → D6

4-Channel Relay Module:
- VCC → 5V (or 3.3V depending on relay module)
- GND → GND
- IN1 → D0 (Motor Phase 1)
- IN2 → D1 (Motor Phase 2) 
- IN3 → D2 (Motor Phase 3)
- IN4 → D3 (Fan + Buzzer)

Status LEDs:
- Green LED: D7 → 220Ω resistor → LED → GND
- Red LED:   D8 → 220Ω resistor → LED → GND
```

## Software Setup

### 1. Install Required Libraries
Open Arduino IDE and install these libraries via Library Manager:

```
- ESP8266WiFi (usually pre-installed with ESP8266 board package)
- PubSubClient (for MQTT communication)
- ArduinoJson (for JSON message handling)
```

### 2. Board Configuration
1. Install ESP8266 board package in Arduino IDE
2. Select Board: "NodeMCU 1.0 (ESP-12E Module)"
3. Select correct COM port

### 3. Update WiFi Credentials
In the Arduino code, update these lines:
```cpp
const char* ssid = "YOUR_WIFI_SSID";           // Your WiFi network name
const char* password = "YOUR_WIFI_PASSWORD";   // Your WiFi password
```

### 4. MQTT Topics Used
The system uses these MQTT topics on `test.mosquitto.org`:
- `motor/temp` - Temperature readings
- `motor/status` - System status (motor state, fan state, mode)
- `motor/control` - Control commands from dashboard

## Safety Features

### Temperature Thresholds:
- **65°C**: Fan and buzzer activate
- **70°C**: Critical temperature - motor automatically stops
- **68°C**: Motor stops (hysteresis)
- **65°C**: Motor can restart (hysteresis)
- **63°C**: Fan stops (hysteresis)

### Control Modes:
1. **Automatic Mode**: Arduino controls everything based on temperature
2. **Manual Mode**: Dashboard can override (except critical temperature safety)

### Safety Overrides:
- Critical temperature always forces motor OFF and fan ON
- Sensor fault detection stops motor and activates fan
- Rate-of-change spike detection prevents false readings

## Dashboard Integration

### Real-time Features:
✅ Live temperature monitoring with 30-point history
✅ Automatic temperature-based control
✅ Manual override capability
✅ Emergency stop function
✅ System status indicators
✅ Connection monitoring

### Mobile Responsive:
✅ Hamburger menu navigation
✅ Touch-friendly controls
✅ Optimized chart display
✅ Section-based mobile layout

## Deployment

### Local Testing:
1. Upload Arduino code to ESP8266
2. Run dashboard: `npm run dev`
3. Check serial monitor for debugging

### Production:
- Dashboard deployed at: https://three-phase-induction-motor-temperature.onrender.com
- Uses public MQTT broker: test.mosquitto.org
- Automatic deployment via GitHub

## Troubleshooting

### Common Issues:

1. **WiFi Connection Failed**
   - Check SSID and password
   - Ensure 2.4GHz network (ESP8266 doesn't support 5GHz)

2. **MQTT Not Connecting**
   - Check internet connection
   - Verify broker URL: test.mosquitto.org

3. **Temperature Reading Issues**
   - Check thermocouple connections
   - Verify MAX6675 wiring
   - Look for "Thermocouple not connected" message

4. **Relay Not Working**
   - Check relay module power supply
   - Verify active LOW configuration
   - Test with multimeter

5. **Dashboard Not Updating**
   - Check browser console for errors
   - Verify MQTT connection in dashboard
   - Check server logs

### Serial Monitor Output Example:
```
✅ System Ready: NORMAL mode (Motor OFF, Fan+Buzzer OFF, Green LED ON)
WiFi connected
IP address: 192.168.1.100
Attempting MQTT connection...connected
🌡️ Temp: 45.25 °C | MODE: NORMAL | Motor: OFF | Fan+Buzzer: OFF | Control: AUTO
🌡️ Temp: 67.50 °C | MODE: WARNING | Motor: OFF | Fan+Buzzer: ON | Control: AUTO
🌡️ Temp: 72.00 °C | MODE: CRITICAL | Motor: OFF | Fan+Buzzer: ON | Control: AUTO
```

## Next Steps

1. Upload the Arduino code to your ESP8266
2. Update WiFi credentials
3. Wire the components according to the diagram
4. Test with the live dashboard
5. Monitor serial output for debugging
6. Deploy to your motor setup with proper safety precautions

⚠️ **Safety Warning**: Always test with a safe load before connecting to actual motor equipment. Ensure proper electrical safety measures are in place.