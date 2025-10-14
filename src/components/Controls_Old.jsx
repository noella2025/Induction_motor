import { useEffect, useState } from 'react'
import mqtt from '../../routes/mqtt'

export default function Controls({ realTimeData, setRealTimeData }) {
  const [motorRunning, setMotorRunning] = useState(false)
  const [fanOn, setFanOn] = useState(false)
  const [warning, setWarning] = useState('')
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Check connection status
    setIsConnected(mqtt.socket?.connected || false)
    
    // Listen for mqtt relayed messages
    const off = mqtt.onMqtt(({ topic, message }) => {
      if (topic.endsWith('/state')) {
        try {
          const payload = JSON.parse(message)
          const state = payload.state || payload
          
          if (state === 'warning') {
            setWarning('⚠️ Motor overheating detected!')
          } else if (state === 'stopped-by-max') {
            setWarning('� Motor auto-stopped - Maximum temperature reached!')
            setMotorRunning(false)
            if (setRealTimeData) {
              setRealTimeData(prev => ({ ...prev, motorStatus: 'stopped' }))
            }
          } else {
            setWarning('')
          }
        } catch (e) {
          console.error('Error parsing state message:', e)
        }
      }
    })
    
    return off
  }, [setRealTimeData])

  function startMotor() {
    if (!isConnected) {
      setWarning('❌ Cannot start motor - Server disconnected')
      return
    }
    mqtt.sendControl({ action: 'start' })
    setMotorRunning(true)
    setWarning('')
    if (setRealTimeData) {
      setRealTimeData(prev => ({ ...prev, motorStatus: 'running' }))
    }
  }

  function stopMotor() {
    mqtt.sendControl({ action: 'stop' })
    setMotorRunning(false)
    setWarning('')
    if (setRealTimeData) {
      setRealTimeData(prev => ({ ...prev, motorStatus: 'stopped' }))
    }
  }

  function toggleFan() {
    if (!isConnected) {
      setWarning('❌ Cannot control fan - Server disconnected')
      return
    }
    const action = fanOn ? 'fan-off' : 'fan-on'
    mqtt.sendControl({ action })
    setFanOn(s => !s)
    if (setRealTimeData) {
      setRealTimeData(prev => ({ ...prev, fanStatus: fanOn ? 'off' : 'on' }))
    }
  }

  return (
    <div>
      {/* Connection Status Alert */}
      {!isConnected && (
        <div className="alert alert-danger mb-3">
          🔌 Server Disconnected - Controls may not respond
        </div>
      )}

      {/* Warning Alert */}
      {warning && (
        <div className={`alert ${warning.includes('auto-stopped') ? 'alert-danger' : 'alert-warning'} mb-3`}>
          {warning}
        </div>
      )}

      {/* Motor Status Display */}
      <div className="realtime-data mb-3">
        <div className="data-item">
          <span className="data-value" style={{color: motorRunning ? 'var(--success)' : 'var(--danger)'}}>
            {motorRunning ? '🟢' : '🔴'}
          </span>
          <div className="data-label">Motor Status</div>
        </div>
        <div className="data-item">
          <span className="data-value" style={{color: fanOn ? 'var(--info)' : 'var(--warning)'}}>
            {fanOn ? '🌀' : '⭕'}
          </span>
          <div className="data-label">Cooling Fan</div>
        </div>
        <div className="data-item">
          <span className="data-value" style={{color: isConnected ? 'var(--success)' : 'var(--danger)'}}>
            {isConnected ? '📡' : '📵'}
          </span>
          <div className="data-label">Connection</div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="d-flex gap-2" style={{flexWrap: 'wrap'}}>
        <button 
          className={`btn-modern ${motorRunning ? 'btn-danger' : 'btn-success'}`}
          onClick={motorRunning ? stopMotor : startMotor}
          disabled={!isConnected}
          style={{flex: '1 1 140px'}}
        >
          {motorRunning ? '⏹️ Stop Motor' : '▶️ Start Motor'}
        </button>
        
        <button 
          className="btn-modern btn-primary"
          onClick={toggleFan}
          disabled={!isConnected}
          style={{flex: '1 1 140px'}}
        >
          {fanOn ? '🔄 Fan Off' : '🌀 Fan On'}
        </button>
      </div>

      {/* Quick Actions */}
      <div className="mt-3">
        <small style={{color: 'var(--light-gray)', display: 'block', marginBottom: '0.5rem'}}>
          Quick Actions:
        </small>
        <div className="d-flex gap-2" style={{flexWrap: 'wrap'}}>
          <button 
            className="btn-modern btn-danger"
            onClick={() => {
              stopMotor()
              setFanOn(false)
              mqtt.sendControl({ action: 'fan-off' })
              if (setRealTimeData) {
                setRealTimeData(prev => ({ ...prev, fanStatus: 'off' }))
              }
            }}
            disabled={!isConnected}
            style={{fontSize: '0.8rem', padding: '0.5rem 1rem'}}
          >
            🚨 Emergency Stop
          </button>
          <button 
            className="btn-modern btn-primary"
            onClick={() => {
              if (!motorRunning) startMotor()
              if (!fanOn) toggleFan()
            }}
            disabled={!isConnected || motorRunning}
            style={{fontSize: '0.8rem', padding: '0.5rem 1rem'}}
          >
            � Start All
          </button>
        </div>
      </div>
    </div>
  )
}
