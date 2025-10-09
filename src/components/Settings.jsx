import { useEffect, useState } from 'react'
import mqtt from '../../routes/mqtt'

export default function Settings() {
  const [maxTemp, setMaxTemp] = useState(90)
  const [warnTemp, setWarnTemp] = useState(70)
  const [isConnected, setIsConnected] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')

  useEffect(() => {
    // Check connection status
    setIsConnected(mqtt.socket?.connected || false)
    
    // Send settings to server with save feedback
    const timeoutId = setTimeout(() => {
      mqtt.sendSettings({ maxTemp, warnTemp })
      setSaveStatus('✅ Settings saved')
      setTimeout(() => setSaveStatus(''), 2000)
    }, 500) // Debounce settings updates

    return () => clearTimeout(timeoutId)
  }, [maxTemp, warnTemp])

  const handleTempChange = (type, value) => {
    const numValue = Number(value)
    if (type === 'warn') {
      setWarnTemp(numValue)
      // Ensure warning temp is always less than max temp
      if (numValue >= maxTemp) {
        setMaxTemp(numValue + 10)
      }
    } else {
      setMaxTemp(numValue)
      // Ensure max temp is always greater than warning temp
      if (numValue <= warnTemp) {
        setWarnTemp(numValue - 10)
      }
    }
  }

  return (
    <div>
      {/* Connection Status */}
      {!isConnected && (
        <div className="alert alert-warning mb-3">
          ⚠️ Server disconnected - Settings may not save
        </div>
      )}

      {/* Save Status */}
      {saveStatus && (
        <div className="alert alert-success mb-3">
          {saveStatus}
        </div>
      )}

      {/* Temperature Thresholds */}
      <div className="form-group">
        <label className="form-label">🌡️ Warning Temperature</label>
        <div className="d-flex align-items-center gap-2">
          <input 
            type="number" 
            className="form-control" 
            value={warnTemp} 
            onChange={e => handleTempChange('warn', e.target.value)}
            min="20"
            max="150"
            style={{flex: 1}}
          />
          <span className="data-unit">°C</span>
        </div>
        <small style={{color: 'var(--light-gray)', fontSize: '0.85rem'}}>
          Temperature at which warnings start appearing
        </small>
      </div>

      <div className="form-group">
        <label className="form-label">🚨 Maximum Temperature</label>
        <div className="d-flex align-items-center gap-2">
          <input 
            type="number" 
            className="form-control" 
            value={maxTemp} 
            onChange={e => handleTempChange('max', e.target.value)}
            min="30"
            max="200"
            style={{flex: 1}}
          />
          <span className="data-unit">°C</span>
        </div>
        <small style={{color: 'var(--light-gray)', fontSize: '0.85rem'}}>
          Temperature at which motor automatically stops
        </small>
      </div>

      {/* Temperature Range Display */}
      <div className="realtime-data mb-3">
        <div className="data-item">
          <span className="data-value" style={{color: 'var(--success)'}}>{warnTemp}°C</span>
          <div className="data-label">Warning Level</div>
        </div>
        <div className="data-item">
          <span className="data-value" style={{color: 'var(--danger)'}}>{maxTemp}°C</span>
          <div className="data-label">Critical Level</div>
        </div>
      </div>

      {/* Temperature Scale Visualization */}
      <div className="mb-3">
        <label className="form-label">🎯 Temperature Scale</label>
        <div style={{
          background: 'linear-gradient(90deg, var(--success) 0%, var(--warning) 50%, var(--danger) 100%)',
          height: '20px',
          borderRadius: '10px',
          position: 'relative',
          margin: '10px 0'
        }}>
          <div style={{
            position: 'absolute',
            left: `${(warnTemp / 150) * 100}%`,
            top: '-5px',
            width: '2px',
            height: '30px',
            background: 'var(--white)',
            borderRadius: '1px'
          }}></div>
          <div style={{
            position: 'absolute',
            left: `${(maxTemp / 150) * 100}%`,
            top: '-5px',
            width: '2px',
            height: '30px',
            background: 'var(--white)',
            borderRadius: '1px'
          }}></div>
        </div>
        <div className="d-flex justify-content-between" style={{fontSize: '0.8rem', color: 'var(--light-gray)'}}>
          <span>0°C</span>
          <span>150°C</span>
        </div>
      </div>

      {/* Preset Buttons */}
      <div>
        <label className="form-label">⚡ Quick Presets</label>
        <div className="d-flex gap-2" style={{flexWrap: 'wrap'}}>
          <button 
            className="btn-modern btn-success"
            onClick={() => {
              setWarnTemp(60)
              setMaxTemp(80)
            }}
            style={{fontSize: '0.8rem', padding: '0.5rem 1rem'}}
          >
            🟢 Conservative
          </button>
          <button 
            className="btn-modern btn-primary"
            onClick={() => {
              setWarnTemp(70)
              setMaxTemp(90)
            }}
            style={{fontSize: '0.8rem', padding: '0.5rem 1rem'}}
          >
            🔵 Standard
          </button>
          <button 
            className="btn-modern btn-warning"
            onClick={() => {
              setWarnTemp(80)
              setMaxTemp(100)
            }}
            style={{fontSize: '0.8rem', padding: '0.5rem 1rem', color: 'var(--white)'}}
          >
            🟡 Performance
          </button>
        </div>
      </div>

      {/* Safety Information */}
      <div className="mt-4" style={{
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '1rem',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h6 style={{color: 'var(--navy-light)', marginBottom: '0.5rem'}}>🛡️ Safety Information</h6>
        <small style={{color: 'var(--light-gray)', fontSize: '0.85rem', lineHeight: '1.4'}}>
          • Warning alerts appear when temperature exceeds {warnTemp}°C<br/>
          • Motor automatically stops at {maxTemp}°C to prevent damage<br/>
          • Recommended range: 60-80°C for optimal performance<br/>
          • Maximum safe operating temperature: 100°C
        </small>
      </div>
    </div>
  )
}
