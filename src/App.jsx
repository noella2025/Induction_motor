import { useEffect, useState } from 'react'
import Dashboard from './components/Dashboard'
import mqtt from '../routes/mqtt'
import './styles/dashboard.css'

export default function App() {
  const [connectionStatus, setConnectionStatus] = useState({
    mqtt: 'disconnected',
    server: 'disconnected',
    motor: 'stopped'
  })

  const [realTimeData, setRealTimeData] = useState({
    temperature: 25,
    motorStatus: 'stopped',
    fanStatus: 'off',
    lastUpdate: new Date().toLocaleTimeString()
  })

  useEffect(() => {
    // Monitor MQTT connection status
    const checkConnections = () => {
      setConnectionStatus(prev => ({
        ...prev,
        server: mqtt.socket?.connected ? 'connected' : 'disconnected',
        mqtt: mqtt.socket?.connected ? 'connected' : 'disconnected'
      }))
    }

    // Listen for real-time data updates
    const unsubscribe = mqtt.onMqtt(({ topic, message }) => {
      if (topic.endsWith('/temp')) {
        try {
          const data = JSON.parse(message)
          setRealTimeData(prev => ({
            ...prev,
            temperature: data.temp || Number(message),
            lastUpdate: new Date().toLocaleTimeString()
          }))
        } catch (e) {
          setRealTimeData(prev => ({
            ...prev,
            temperature: Number(message),
            lastUpdate: new Date().toLocaleTimeString()
          }))
        }
      }
      
      if (topic.endsWith('/state')) {
        try {
          const data = JSON.parse(message)
          const status = data.state || data
          setRealTimeData(prev => ({
            ...prev,
            motorStatus: status.includes('stopped') ? 'stopped' : 'running',
            lastUpdate: new Date().toLocaleTimeString()
          }))
          setConnectionStatus(prev => ({
            ...prev,
            motor: status.includes('stopped') ? 'stopped' : 'running'
          }))
        } catch (e) {
          console.error('Error parsing state message:', e)
        }
      }
    })

    checkConnections()
    const interval = setInterval(checkConnections, 5000)

    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }, [])

  const getStatusIndicatorClass = (status) => {
    switch (status) {
      case 'connected':
      case 'running':
        return 'status-connected'
      case 'disconnected':
      case 'stopped':
        return 'status-disconnected'
      default:
        return 'status-warning'
    }
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Motor Temperature Monitor</h1>
        <p className="dashboard-subtitle">Three-Phase Induction Motor Real-Time Monitoring System</p>
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-grid">
          <div className="status-item">
            <div className={`status-indicator ${getStatusIndicatorClass(connectionStatus.server)}`}></div>
            <span>Server: {connectionStatus.server.toUpperCase()}</span>
          </div>
          <div className="status-item">
            <div className={`status-indicator ${getStatusIndicatorClass(connectionStatus.mqtt)}`}></div>
            <span>MQTT: {connectionStatus.mqtt.toUpperCase()}</span>
          </div>
          <div className="status-item">
            <div className={`status-indicator ${getStatusIndicatorClass(connectionStatus.motor)}`}></div>
            <span>Motor: {connectionStatus.motor.toUpperCase()}</span>
          </div>
          <div className="status-item">
            <div className={`status-indicator ${getStatusIndicatorClass(realTimeData.fanStatus === 'on' ? 'running' : 'stopped')}`}></div>
            <span>Fan: {realTimeData.fanStatus.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Real-time Data Display */}
      <div className="dashboard-card">
        <div className="card-header">
          <h3 className="card-title">🔥 Real-Time Data</h3>
          <span className="text-small">Last Update: {realTimeData.lastUpdate}</span>
        </div>
        <div className="realtime-data">
          <div className="data-item">
            <span className="data-value">{realTimeData.temperature.toFixed(1)}<span className="data-unit">°C</span></span>
            <div className="data-label">Temperature</div>
          </div>
          <div className="data-item">
            <span className="data-value" style={{color: realTimeData.motorStatus === 'running' ? 'var(--success)' : 'var(--danger)'}}>
              {realTimeData.motorStatus === 'running' ? '●' : '○'}
            </span>
            <div className="data-label">Motor Status</div>
          </div>
          <div className="data-item">
            <span className="data-value" style={{color: realTimeData.fanStatus === 'on' ? 'var(--info)' : 'var(--warning)'}}>
              {realTimeData.fanStatus === 'on' ? '🌀' : '⭕'}
            </span>
            <div className="data-label">Fan Status</div>
          </div>
          <div className="data-item">
            <span className="data-value">
              {realTimeData.temperature >= 90 ? '🚨' : realTimeData.temperature >= 70 ? '⚠️' : '✅'}
            </span>
            <div className="data-label">Safety Status</div>
          </div>
        </div>
      </div>

      {/* Main Dashboard */}
      <Dashboard realTimeData={realTimeData} setRealTimeData={setRealTimeData} />
    </div>
  )
}