import { useEffect, useState } from 'react'
import mqtt from '../mqtt'

export default function Controls({ realTimeData, setRealTimeData }) {
  const [motorRunning, setMotorRunning] = useState(false)
  const [fanOn, setFanOn] = useState(false)
  const [controlMode, setControlMode] = useState('auto') // 'auto' or 'manual'
  const [warning, setWarning] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [systemStatus, setSystemStatus] = useState('normal')

  useEffect(() => {
    // Check connection status
    setIsConnected(mqtt.socket?.connected || false)
    
    // Listen for mqtt relayed messages
    const off = mqtt.onMqtt(({ topic, message }) => {
      try {
        // Handle status updates from Arduino
        if (topic.endsWith('/status')) {
          const payload = JSON.parse(message)
          setMotorRunning(payload.motor || false)
          setFanOn(payload.fan || false)
          setControlMode(payload.manual ? 'manual' : 'auto')
          setSystemStatus(payload.mode || 'normal')
          
          // Update warning based on system status
          if (payload.mode === 'critical') {
            setWarning('🚨 CRITICAL TEMPERATURE - Motor auto-stopped!')
          } else if (payload.mode === 'warning') {
            // Warning: thermostat reached warning setpoint, fan not necessarily on yet
            setWarning('⚠️ Warning: temperature exceeded warning setpoint')
          } else if (payload.mode === 'cooling' || payload.mode === 'cool') {
            // Cooling/fan active
            setWarning('🌀 Cooling active - Fan is ON')
          } else {
            setWarning('')
          }
          
          // Update real-time data
          if (setRealTimeData) {
            setRealTimeData(prev => ({ 
              ...prev, 
              motorStatus: payload.motor ? 'running' : 'stopped',
              fanStatus: payload.fan ? 'on' : 'off',
              mode: payload.mode || 'normal'
            }))
          }
        }
        
        // Handle temperature data
        if (topic.endsWith('/temp')) {
          const payload = JSON.parse(message)
          if (payload.error === 'sensor_fault') {
            setWarning('⚠️ Sensor fault detected - Check thermocouple connection!')
          }
        }
      } catch (e) {
        console.error('Error parsing MQTT message:', e)
      }
    })
    
    return off
  }, [setRealTimeData])

  function startMotor() {
    if (!isConnected) {
      setWarning('❌ Cannot start motor - Server disconnected')
      return
    }
    mqtt.sendControl({ motor: true, mode: 'manual' })
    setControlMode('manual')
    setWarning('')
  }

  function stopMotor() {
    mqtt.sendControl({ motor: false, mode: 'manual' })
    setControlMode('manual')
    setWarning('')
  }

  function toggleFan() {
    if (!isConnected) {
      setWarning('❌ Cannot control fan - Server disconnected')
      return
    }
    mqtt.sendControl({ fan: !fanOn })
  }

  function switchToAuto() {
    mqtt.sendControl({ mode: 'auto' })
    setControlMode('auto')
    setWarning('🔄 Switched to automatic mode')
  }

  function emergencyStop() {
    mqtt.sendControl({ motor: false, fan: true, mode: 'manual' })
    setControlMode('manual')
    setWarning('🚨 Emergency stop activated')
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return 'var(--danger)'
      case 'warning': return 'var(--warning)'
      case 'normal': return 'var(--success)'
      default: return 'var(--light-gray)'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'critical': return '🚨'
      case 'warning': return '⚠️'
      case 'normal': return '🟢'
      default: return '❓'
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
        <div className={`alert ${warning.includes('CRITICAL') || warning.includes('Emergency') ? 'alert-danger' : 'alert-warning'} mb-3`}>
          {warning}
        </div>
      )}

      {/* System Status Display */}
      <div className="realtime-data mb-3">
        <div className="data-item">
          <span className="data-value" style={{color: getStatusColor(systemStatus)}}>
            {getStatusIcon(systemStatus)}
          </span>
          <div className="data-label">System Status</div>
        </div>
        <div className="data-item">
          <span className="data-value" style={{color: motorRunning ? 'var(--success)' : 'var(--danger)'}}>
            {motorRunning ? '🟢' : '🔴'}
          </span>
          <div className="data-label">Motor</div>
        </div>
        <div className="data-item">
          <span className="data-value" style={{color: fanOn ? 'var(--info)' : 'var(--light-gray)'}}>
            {fanOn ? '🌀' : '⭕'}
          </span>
          <div className="data-label">Fan + Buzzer</div>
        </div>
        <div className="data-item">
          <span className="data-value" style={{color: controlMode === 'auto' ? 'var(--success)' : 'var(--warning)'}}>
            {controlMode === 'auto' ? '🤖' : '👤'}
          </span>
          <div className="data-label">Control Mode</div>
        </div>
      </div>

      {/* Control Mode Toggle */}
      <div className="mb-3">
        <div className="d-flex gap-2 align-items-center">
          <span style={{fontSize: '0.9rem', color: 'var(--light-gray)'}}>Control Mode:</span>
          <button 
            className={`btn-modern ${controlMode === 'auto' ? 'btn-success' : 'btn-outline-success'}`}
            onClick={switchToAuto}
            disabled={!isConnected}
            style={{fontSize: '0.8rem', padding: '0.4rem 0.8rem'}}
          >
            🤖 Auto
          </button>
          <span style={{fontSize: '0.8rem', color: 'var(--light-gray)'}}>
            {controlMode === 'auto' ? 'Arduino controls based on temperature' : 'Manual dashboard control'}
          </span>
        </div>
      </div>

      {/* Manual Control Buttons */}
      {controlMode === 'manual' && (
        <div className="d-flex gap-2 mb-3" style={{flexWrap: 'wrap'}}>
          <button 
            className={`btn-modern ${motorRunning ? 'btn-danger' : 'btn-success'}`}
            onClick={motorRunning ? stopMotor : startMotor}
            disabled={!isConnected || systemStatus === 'critical'}
            style={{flex: '1 1 140px'}}
          >
            {motorRunning ? '⏹️ Stop Motor' : '▶️ Start Motor'}
          </button>
          
          <button 
            className={`btn-modern ${fanOn ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={toggleFan}
            disabled={!isConnected}
            style={{flex: '1 1 140px'}}
          >
            {fanOn ? '🔄 Fan Off' : '🌀 Fan On'}
          </button>
        </div>
      )}

      {/* Emergency and Quick Actions */}
      <div className="mt-3">
        <small style={{color: 'var(--light-gray)', display: 'block', marginBottom: '0.5rem'}}>
          Emergency Controls:
        </small>
        <div className="d-flex gap-2" style={{flexWrap: 'wrap'}}>
          <button 
            className="btn-modern btn-danger"
            onClick={emergencyStop}
            disabled={!isConnected}
            style={{fontSize: '0.8rem', padding: '0.5rem 1rem'}}
          >
            🚨 Emergency Stop
          </button>
          {controlMode === 'manual' && (
            <button 
              className="btn-modern btn-primary"
              onClick={() => {
                mqtt.sendControl({ motor: true, fan: true })
              }}
              disabled={!isConnected || systemStatus === 'critical'}
              style={{fontSize: '0.8rem', padding: '0.5rem 1rem'}}
            >
              🚀 Start All
            </button>
          )}
        </div>
      </div>

      {/* System Information */}
      <div className="mt-3 p-2" style={{backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px'}}>
        <small style={{color: 'var(--light-gray)', fontSize: '0.75rem'}}>
          <strong>Temperature Thresholds:</strong><br/>
          • Fan starts at 65°C<br/>
          • Critical shutdown at 70°C<br/>
          • Motor hysteresis: 65-68°C<br/>
          • Fan hysteresis: 63-65°C
        </small>
      </div>
    </div>
  )
}