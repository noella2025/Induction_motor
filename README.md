# Three-Phase Induction Motor Temperature Monitoring System

A comprehensive real-time temperature monitoring dashboard for three-phase induction motors with Arduino ESP8266 integration, automatic safety controls, and MQTT communication.

## Features

### 🌡️ **Real-time Temperature Monitoring**
- Live temperature chart with 30-point history
- Temperature trend visualization with Chart.js
- Real-time temperature thresholds and alerts
- Mobile-responsive chart display

### 🔧 **Motor Control System**
- Manual motor start/stop controls via dashboard
- Automatic safety shutdown at critical temperature (70°C)
- Fan control with automatic activation at 65°C
- Emergency stop functionality
- Hysteresis control to prevent relay chattering

### 🤖 **Arduino ESP8266 Integration**
- MAX6675 thermocouple sensor integration
- 4-channel relay control for motor phases and fan
- WiFi connectivity for IoT integration
- Automatic/Manual control modes
- LED status indicators (Green/Red)
- Built-in safety overrides and fault detection

### 📱 **Responsive Dashboard**
- Bootstrap-based responsive UI
- Mobile hamburger menu navigation
- Touch-friendly controls
- Real-time status indicators
- Connection monitoring

### 🌐 **MQTT Communication**
- Public MQTT broker integration (test.mosquitto.org)
- Real-time bidirectional communication
- JSON message format for structured data
- Automatic reconnection handling

## Architecture

- **Frontend**: React 18 + Vite + Bootstrap 5 + Chart.js
- **Backend**: Node.js + Express + Socket.IO + MQTT
- **Hardware**: ESP8266 NodeMCU + MAX6675 + Relays + LEDs
- **Communication**: MQTT → Socket.IO → React (real-time pipeline)
- **Deployment**: Render.com with automatic GitHub integration

## Hardware Requirements

### Components:
- ESP8266 NodeMCU or similar
- MAX6675 Thermocouple Amplifier
- K-Type Thermocouple sensor
- 4-Channel Relay Module
- Green and Red LEDs
- Buzzer (optional)
- Resistors and jumper wires

See **[ARDUINO_SETUP.md](./ARDUINO_SETUP.md)** for complete wiring diagram and setup instructions.

## Software Setup

### Prerequisites
- Node.js (v16+)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

### Running the Application

#### Method 1: Development Mode (Recommended)

1. **Start the Backend Server** (Terminal 1):
```bash
npm run start-server
```
This starts the Express server with MQTT integration on port 3001.

2. **Start the Frontend** (Terminal 2):
```bash
npm run dev
```
This starts the Vite development server (usually on port 5173).

3. **Open your browser** to the URL shown by Vite (typically `http://localhost:5173`)

#### Method 2: Production Build

```bash
npm run build
npm run start-server
```
Then open `http://localhost:3001`

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# MQTT Broker Configuration
MQTT_URL=mqtt://test.mosquitto.org:1883
MQTT_TOPIC_PREFIX=motor

# Server Configuration
PORT=3001
VITE_SERVER_URL=http://localhost:3001
```

### MQTT Topics

The system uses the following MQTT topics:

- `motor/temp` - Temperature readings (JSON: `{time, temp}`)
- `motor/state` - Motor state (JSON: `{state, reason}`)
- `motor/control` - Control commands (JSON: `{action}`)
- `motor/settings` - Settings updates (JSON: `{maxTemp, warnTemp}`)

## Usage

### Dashboard Controls

1. **Start/Stop Motor**: Use the green "Start Motor" and red "Stop Motor" buttons
2. **Fan Control**: Toggle the fan on/off with the blue "Turn Fan On/Off" button
3. **Temperature Settings**: 
   - Set warning temperature threshold (default: 70°C)
   - Set maximum temperature threshold (default: 90°C)

### Safety Features

- **Warning Alert**: When temperature exceeds warning threshold, a yellow warning appears
- **Auto-Stop**: When temperature reaches maximum threshold, motor automatically stops
- **Visual Feedback**: Real-time temperature chart shows current trends

### MQTT Integration

The system can integrate with external MQTT-enabled devices:

- **Publish** temperature readings to `motor/temp`
- **Subscribe** to control commands on `motor/control`
- **Subscribe** to settings changes on `motor/settings`

## Project Structure

```
├── public/           # Static assets
├── routes/
│   └── server.js     # Express + MQTT + Socket.IO server
├── src/
│   ├── components/   # React components
│   │   ├── Controls.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Settings.jsx
│   │   └── TemperatureChart.jsx
│   ├── App.jsx       # Main React app
│   ├── main.jsx      # React entry point
│   ├── mqtt.js       # Frontend MQTT/Socket.IO connector
│   └── motorSimulator.js  # Motor simulation logic
├── package.json
└── README.md
```

## Dependencies

### Frontend
- React 18.2.0
- Bootstrap 5.3.0
- Chart.js 4.4.0
- Socket.IO Client 4.7.1

### Backend
- Express 4.18.2
- Socket.IO 4.7.1
- MQTT 4.3.8

## Development

### Adding New Features

1. **Frontend Components**: Add new React components in `src/components/`
2. **MQTT Topics**: Update both server.js and components for new topics
3. **Motor Logic**: Modify `motorSimulator.js` for new motor behaviors

### Testing MQTT

You can test MQTT integration using tools like:
- MQTT.fx
- mosquitto_pub/mosquitto_sub
- Any MQTT client

Example commands:
```bash
# Publish temperature reading
mosquitto_pub -h test.mosquitto.org -t "motor/temp" -m '{"time":1234567890,"temp":75.5}'

# Subscribe to control commands
mosquitto_sub -h test.mosquitto.org -t "motor/control"
```

## Troubleshooting

### Common Issues

1. **Port already in use**: Kill existing processes or change ports in configuration
2. **MQTT connection failed**: Verify MQTT broker URL and network connectivity
3. **Frontend not connecting**: Ensure backend server is running on the correct port

### Debug Mode

Set environment variable for verbose logging:
```bash
DEBUG=socket.io* npm run start-server
```
