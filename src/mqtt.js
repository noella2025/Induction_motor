import { io } from 'socket.io-client'import { io } from 'socket.io-client'



// Connect to backend Socket.IO (production URL or localhost in dev)// Connect to backend Socket.IO (assumes backend runs on same host:3001 in dev)

const SERVER_URL = import.meta.env.VITE_SERVER_URL || const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

  (import.meta.env.PROD const socket = io(SERVER_URL)

    ? window.location.origin  // Use same origin in production

    : 'http://localhost:3001' // Use localhost in developmentconst listeners = {

  )  mqtt: [],

}

console.log('Connecting to server:', SERVER_URL)

const socket = io(SERVER_URL)socket.on('connect', ()=> console.log('socket connected', socket.id))

socket.on('disconnect', ()=> console.log('socket disconnected'))

const listeners = {

  mqtt: [],socket.on('mqtt', (data)=>{

}  // data: { topic, message }

  listeners.mqtt.forEach(fn => fn(data))

socket.on('connect', ()=> console.log('socket connected', socket.id))})

socket.on('disconnect', ()=> console.log('socket disconnected'))

export function onMqtt(fn){

socket.on('mqtt', (data)=>{  listeners.mqtt.push(fn)

  // data: { topic, message }  return ()=> { listeners.mqtt = listeners.mqtt.filter(f=>f!==fn) }

  listeners.mqtt.forEach(fn => fn(data))}

})

export function sendControl(payload){

export function onMqtt(fn){  socket.emit('control', payload)

  listeners.mqtt.push(fn)}

  return ()=> { listeners.mqtt = listeners.mqtt.filter(f=>f!==fn) }

}export function sendSettings(payload){

  socket.emit('settings', payload)

export function sendControl(payload){}

  socket.emit('control', payload)

}// Export socket for motor simulator

export { socket }

export function sendSettings(payload){

  socket.emit('settings', payload)export default { onMqtt, sendControl, sendSettings, socket }

}

// Export socket for motor simulator
export { socket }

export default { onMqtt, sendControl, sendSettings, socket }