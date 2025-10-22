import { useEffect, useState } from 'react'
import mqtt from '../mqtt'

export default function Settings() {
  // Three temperature setpoints
  const [warningTemp, setWarningTemp] = useState(50) // Start showing warnings
  const [fanTemp, setFanTemp] = useState(65) // Turn on fan
  const [criticalTemp, setCriticalTemp] = useState(70) // Turn off motor
  
  const [isConnected, setIsConnected] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('motorSettings')
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        setWarningTemp(settings.warningTemp || 50)
        setFanTemp(settings.fanTemp || 65)
        setCriticalTemp(settings.criticalTemp || 70)
      } catch (e) {
        console.error('Error loading saved settings:', e)
      }
    }
  }, [])

  // Track connection status
  useEffect(() => {
    setIsConnected(mqtt.socket?.connected || false)
  }, [])

  // Mark as having unsaved changes when any setting changes
  useEffect(() => {
    setHasUnsavedChanges(true)
  }, [warningTemp, fanTemp, criticalTemp])

  const validateTemperatures = () => {
    const errors = []
    
    if (warningTemp >= fanTemp) {
      errors.push('Warning temperature must be less than fan temperature')
    }
    if (fanTemp >= criticalTemp) {
      errors.push('Fan temperature must be less than critical temperature')
    }
    if (warningTemp < 20 || warningTemp > 150) {
      errors.push('Warning temperature must be between 20-150°C')
    }
    if (fanTemp < 30 || fanTemp > 150) {
      errors.push('Fan temperature must be between 30-150°C')
    }
    if (criticalTemp < 31 || criticalTemp > 200) {
      errors.push('Critical temperature must be between 40-200°C')
    }
    
    return errors
  }

  const handleSaveSettings = () => {
    const errors = validateTemperatures()
    
    if (errors.length > 0) {
      setSaveStatus(`❌ ${errors[0]}`)
      setTimeout(() => setSaveStatus(''), 4000)
      return
    }

    const settings = {
      warningTemp,
      fanTemp,
      criticalTemp,
      timestamp: new Date().toISOString()
    }

    try {
      // Save to localStorage (browser storage)
      localStorage.setItem('motorSettings', JSON.stringify(settings))
      
      // Send to Arduino via MQTT
      if (isConnected) {
        mqtt.sendSettings({
          warning_temp: warningTemp,
          fan_temp: fanTemp,
          critical_temp: criticalTemp,
          action: 'update_thresholds'
        })
      }

      // Update status
      setSaveStatus('✅ Settings saved successfully!')
      setHasUnsavedChanges(false)
      
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (e) {
      setSaveStatus('❌ Error saving settings')
      setTimeout(() => setSaveStatus(''), 3000)
    }
  }

  const handleTempChange = (type, value) => {
    const numValue = Number(value)
    
    switch (type) {
      case 'warning':
        setWarningTemp(numValue)
        break
      case 'fan':
        setFanTemp(numValue)
        break
      case 'critical':
        setCriticalTemp(numValue)
        break
    }
  }

  const applyPreset = (preset) => {
    switch (preset) {
      case 'conservative':
        setWarningTemp(45)
        setFanTemp(60)
        setCriticalTemp(75)
        break
      case 'standard':
        setWarningTemp(50)
        setFanTemp(65)
        setCriticalTemp(70)
        break
      case 'performance':
        setWarningTemp(55)
        setFanTemp(70)
        setCriticalTemp(80)
        break
      case 'high_performance':
        setWarningTemp(60)
        setFanTemp(75)
        setCriticalTemp(90)
        break
    }
  }

  const resetToDefaults = () => {
    setWarningTemp(50)
    setFanTemp(65)
    setCriticalTemp(70)
  }

  const validationErrors = validateTemperatures()

  return (
    <div>
      {/* Connection Status */}
      {!isConnected && (
        <div className="alert alert-warning mb-3">
          ⚠️ Arduino disconnected - Settings will be saved locally only
        </div>
      )}

      {/* Save Status */}
      {saveStatus && (
        <div className={`alert ${saveStatus.includes('❌') ? 'alert-danger' : 'alert-success'} mb-3`}>
          {saveStatus}
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="alert alert-danger mb-3">
          <strong>⚠️ Configuration Error:</strong>
          <ul className="mb-0 mt-1">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Unsaved Changes Indicator */}
      {hasUnsavedChanges && (
        <div className="alert alert-info mb-3">
          💾 You have unsaved changes. Click "Save Settings" to apply them.
        </div>
      )}

      <h5 className="mb-3" style={{color: 'var(--navy-light)'}}>
        🎯 Temperature Control Settings
      </h5>

      {/* Warning Temperature Setting */}
      <div className="form-group">
        <label className="form-label">
          <span style={{color: '#f39c12'}}>⚠️</span> Warning Temperature
        </label>
        <div className="d-flex align-items-center gap-2">
          <input 
            type="number" 
            className="form-control" 
            value={warningTemp} 
            onChange={e => handleTempChange('warning', e.target.value)}
            min="20"
            max="150"
            style={{flex: 1}}
          />
          <span className="data-unit">°C</span>
        </div>
        <small style={{color: 'var(--light-gray)', fontSize: '0.85rem'}}>
          Temperature at which system starts showing warnings to user
        </small>
      </div>

      {/* Fan Temperature Setting */}
      <div className="form-group">
        <label className="form-label">
          <span style={{color: '#3498db'}}>🌀</span> Fan Activation Temperature
        </label>
        <div className="d-flex align-items-center gap-2">
          <input 
            type="number" 
            className="form-control" 
            value={fanTemp} 
            onChange={e => handleTempChange('fan', e.target.value)}
            min="30"
            max="150"
            style={{flex: 1}}
          />
          <span className="data-unit">°C</span>
        </div>
        <small style={{color: 'var(--light-gray)', fontSize: '0.85rem'}}>
          Temperature at which cooling fan and buzzer automatically turn on
        </small>
      </div>

      {/* Critical Temperature Setting */}
      <div className="form-group">
        <label className="form-label">
          <span style={{color: '#e74c3c'}}>🚨</span> Critical Temperature
        </label>
        <div className="d-flex align-items-center gap-2">
          <input 
            type="number" 
            className="form-control" 
            value={criticalTemp} 
            onChange={e => handleTempChange('critical', e.target.value)}
            min="40"
            max="200"
            style={{flex: 1}}
          />
          <span className="data-unit">°C</span>
        </div>
        <small style={{color: 'var(--light-gray)', fontSize: '0.85rem'}}>
          Temperature at which motor automatically shuts down for safety
        </small>
      </div>

      {/* Save Button */}
      <div className="form-group">
        <button 
          className={`btn-modern ${hasUnsavedChanges ? 'btn-success' : 'btn-outline-success'}`}
          onClick={handleSaveSettings}
          disabled={validationErrors.length > 0}
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            fontWeight: '600'
          }}
        >
          💾 Save Settings
          {hasUnsavedChanges && <span className="ms-2">•</span>}
        </button>
      </div>

      {/* Temperature Range Display */}
      <div className="realtime-data mb-3">
        <div className="data-item">
          <span className="data-value" style={{color: '#f39c12'}}>{warningTemp}°C</span>
          <div className="data-label">Warning</div>
        </div>
        <div className="data-item">
          <span className="data-value" style={{color: '#3498db'}}>{fanTemp}°C</span>
          <div className="data-label">Fan On</div>
        </div>
        <div className="data-item">
          <span className="data-value" style={{color: '#e74c3c'}}>{criticalTemp}°C</span>
          <div className="data-label">Critical</div>
        </div>
      </div>

      {/* Temperature Scale Visualization */}
      <div className="mb-3">
        <label className="form-label">📊 Temperature Scale</label>
        <div style={{
          background: 'linear-gradient(90deg, #27ae60 0%, #f39c12 40%, #3498db 60%, #e74c3c 100%)',
          height: '25px',
          borderRadius: '12px',
          position: 'relative',
          margin: '10px 0'
        }}>
          {/* Warning marker */}
          <div style={{
            position: 'absolute',
            left: `${(warningTemp / 200) * 100}%`,
            top: '-8px',
            width: '3px',
            height: '40px',
            background: '#f39c12',
            borderRadius: '2px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}></div>
          {/* Fan marker */}
          <div style={{
            position: 'absolute',
            left: `${(fanTemp / 200) * 100}%`,
            top: '-8px',
            width: '3px',
            height: '40px',
            background: '#3498db',
            borderRadius: '2px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}></div>
          {/* Critical marker */}
          <div style={{
            position: 'absolute',
            left: `${(criticalTemp / 200) * 100}%`,
            top: '-8px',
            width: '3px',
            height: '40px',
            background: '#e74c3c',
            borderRadius: '2px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}></div>
        </div>
        <div className="d-flex justify-content-between" style={{fontSize: '0.8rem', color: 'var(--light-gray)'}}>
          <span>0°C</span>
          <span>100°C</span>
          <span>200°C</span>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="mb-3">
        <label className="form-label">⚡ Quick Presets</label>
        <div className="d-flex gap-2" style={{flexWrap: 'wrap'}}>
          <button 
            className="btn-modern btn-success"
            onClick={() => applyPreset('conservative')}
            style={{fontSize: '0.8rem', padding: '0.5rem 1rem'}}
          >
            🟢 Conservative<br/>
            <small>45/60/75°C</small>
          </button>
          <button 
            className="btn-modern btn-primary"
            onClick={() => applyPreset('standard')}
            style={{fontSize: '0.8rem', padding: '0.5rem 1rem'}}
          >
            🔵 Standard<br/>
            <small>50/65/70°C</small>
          </button>
          <button 
            className="btn-modern btn-warning"
            onClick={() => applyPreset('performance')}
            style={{fontSize: '0.8rem', padding: '0.5rem 1rem', color: 'var(--white)'}}
          >
            🟡 Performance<br/>
            <small>55/70/80°C</small>
          </button>
          <button 
            className="btn-modern btn-danger"
            onClick={() => applyPreset('high_performance')}
            style={{fontSize: '0.8rem', padding: '0.5rem 1rem'}}
          >
            🔴 High Perf<br/>
            <small>60/75/90°C</small>
          </button>
        </div>
      </div>

      {/* Reset Button */}
      <div className="mb-3">
        <button 
          className="btn-modern btn-outline-secondary"
          onClick={resetToDefaults}
          style={{fontSize: '0.9rem', padding: '0.5rem 1rem'}}
        >
          🔄 Reset to Defaults
        </button>
      </div>

      {/* Operating Modes Information */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '1rem',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h6 style={{color: 'var(--navy-light)', marginBottom: '0.5rem'}}>🛡️ Operating Modes</h6>
        <div style={{color: 'var(--light-gray)', fontSize: '0.85rem', lineHeight: '1.5'}}>
          <div className="mb-2">
            <strong style={{color: '#27ae60'}}>🟢 Normal Mode:</strong> Temperature below {warningTemp}°C
            <br/>• All systems operate normally
            <br/>• Green LED indicator
          </div>
          
          <div className="mb-2">
            <strong style={{color: '#f39c12'}}>⚠️ Warning Mode:</strong> Temperature {warningTemp}°C - {fanTemp}°C
            <br/>• Warning alerts displayed to user
            <br/>• System monitoring increased
          </div>
          
          <div className="mb-2">
            <strong style={{color: '#3498db'}}>🌀 Cooling Mode:</strong> Temperature {fanTemp}°C - {criticalTemp}°C
            <br/>• Fan and buzzer automatically activated
            <br/>• Active cooling in progress
          </div>
          
          <div>
            <strong style={{color: '#e74c3c'}}>🚨 Critical Mode:</strong> Temperature ≥ {criticalTemp}°C
            <br/>• Motor automatically shut down
            <br/>• Fan forced on, red LED indicator
            <br/>• Manual restart required after cooling
          </div>
        </div>
      </div>

      {/* Storage Information */}
      <div className="mt-3" style={{
        background: 'rgba(52, 152, 219, 0.1)',
        padding: '0.75rem',
        borderRadius: '8px',
        border: '1px solid rgba(52, 152, 219, 0.3)'
      }}>
        <small style={{color: 'var(--light-gray)', fontSize: '0.8rem'}}>
          📁 <strong>Settings Storage:</strong> Your settings are saved in your browser's local storage 
          and sent to the Arduino when connected. Settings persist between browser sessions.
        </small>
      </div>
    </div>
  )
}