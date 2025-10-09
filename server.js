const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const mqtt = require('mqtt')
const path = require('path')

const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

// Configuration via env vars
const MQTT_URL = process.env.MQTT_URL || 'mqtt://test.mosquitto.org:1883'
const MQTT_TOPIC_PREFIX = process.env.MQTT_TOPIC_PREFIX || 'motor'

// Serve Vite build for production
app.use(express.static(path.join(__dirname, 'dist')))

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

// Connect to MQTT broker
const mqttClient = mqtt.connect(MQTT_URL)

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker', MQTT_URL)
  // subscribe to motor topics
  mqttClient.subscribe(`${MQTT_TOPIC_PREFIX}/#`, (err) => {
    if(err) console.error('MQTT subscribe error', err)
  })
})

mqttClient.on('error', (err)=>{
  console.error('MQTT error', err)
})

// When MQTT messages arrive, relay to socket.io clients
mqttClient.on('message', (topic, payload)=>{
  try{
    const msg = payload.toString()
    // topic like motor/temp or motor/state
    io.emit('mqtt', { topic, message: msg })
  }catch(e){ console.error('mqtt message parse error', e) }
})

io.on('connection', (socket)=>{
  console.log('client connected', socket.id)

  // forward incoming control messages from client to MQTT
  socket.on('control', (data)=>{
    // data: { action: 'start' | 'stop' | ... }
    const topic = `${MQTT_TOPIC_PREFIX}/control`
    mqttClient.publish(topic, JSON.stringify(data))
  })

  socket.on('settings', (data)=>{
    const topic = `${MQTT_TOPIC_PREFIX}/settings`
    mqttClient.publish(topic, JSON.stringify(data))
  })

  // Handle temperature data from simulator
  socket.on('temperature', (data)=>{
    const topic = `${MQTT_TOPIC_PREFIX}/temp`
    mqttClient.publish(topic, JSON.stringify(data))
  })

  // Handle state data from simulator
  socket.on('state', (data)=>{
    const topic = `${MQTT_TOPIC_PREFIX}/state`
    mqttClient.publish(topic, JSON.stringify(data))
  })

  socket.on('disconnect', ()=>{
    console.log('client disconnected', socket.id)
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, ()=> console.log(`Server listening on ${PORT}, MQTT -> ${MQTT_URL}`))
