// Simple motor temperature simulator and controller
import mqtt from './routes/mqtt'

const state = {
  running: false,
  fanOn: false,
  temp: 25,
  warnTemp: 70,
  maxTemp: 90,
}

let interval = null

function broadcastSample(){
  // Send via MQTT instead of window events
  if (typeof mqtt !== 'undefined' && mqtt.sendControl) {
    // Use a custom mqtt publish for temperature data
    mqtt.socket?.emit('temperature', { time: Date.now(), temp: Number(state.temp.toFixed(2)) })
  }
}

function broadcastState(reason){
  let stateLabel = 'ok'
  if(!state.running) stateLabel = 'stopped'
  if(state.running && state.temp >= state.warnTemp && state.temp < state.maxTemp) stateLabel = 'warning'
  if(state.running && state.temp >= state.maxTemp) stateLabel = 'stopped-by-max'
  
  // Send via MQTT instead of window events
  if (typeof mqtt !== 'undefined' && mqtt.sendControl) {
    mqtt.socket?.emit('state', { state: stateLabel, reason })
  }
}

function start() {
  if(state.running) return
  state.running = true
  broadcastState('started')
  if(interval) clearInterval(interval)
  interval = setInterval(step, 1000)
}

function stop(){
  if(!state.running) return
  state.running = false
  broadcastState('stopped by user')
}

function fanOn(){ state.fanOn = true }
function fanOff(){ state.fanOn = false }

function step(){
  // temperature dynamics
  const ambient = 25
  if(state.running){
    // heat generation depends on motor load; simulated as random
    const heatGain = 0.5 + Math.random() * 1.5
    state.temp += heatGain - (state.fanOn ? 2.0 : 0.5)
  } else {
    // cool towards ambient
    state.temp += (ambient - state.temp) * 0.05
  }

  // clamp
  if(state.temp < ambient) state.temp = ambient

  broadcastSample()

  // auto-stop at max
  if(state.temp >= state.maxTemp){
    // stop motor
    state.running = false
    broadcastState('auto-stopped: reached maxTemp')
    return
  }

  if(state.running && state.temp >= state.warnTemp){
    broadcastState('warning')
  } else {
    broadcastState()
  }
}

// Listen for MQTT control messages instead of window events
if (typeof mqtt !== 'undefined' && mqtt.onMqtt) {
  mqtt.onMqtt(({ topic, message }) => {
    if (topic.endsWith('/control')) {
      try {
        const { action } = JSON.parse(message)
        if(action === 'start') start()
        if(action === 'stop') stop()
        if(action === 'fan-on') { fanOn(); broadcastState('fan on') }
        if(action === 'fan-off') { fanOff(); broadcastState('fan off') }
      } catch (e) {
        console.error('Error parsing control message:', e)
      }
    }
    
    if (topic.endsWith('/settings')) {
      try {
        const { maxTemp, warnTemp } = JSON.parse(message)
        if(Number.isFinite(maxTemp)) state.maxTemp = maxTemp
        if(Number.isFinite(warnTemp)) state.warnTemp = warnTemp
      } catch (e) {
        console.error('Error parsing settings message:', e)
      }
    }
  })
}

// start broadcasting ambient samples even when stopped
setInterval(broadcastSample, 5000)

export default state
