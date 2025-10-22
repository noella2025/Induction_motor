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
  const [isEditing, setIsEditing] = useState(true)
  // input string states used while editing (start empty so user types fresh)
  const [inputWarning, setInputWarning] = useState('')
  const [inputFan, setInputFan] = useState('')
  const [inputCritical, setInputCritical] = useState('')

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('motorSettings')
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        setWarningTemp(settings.warningTemp || 50)
        setFanTemp(settings.fanTemp || 65)
        setCriticalTemp(settings.criticalTemp || 70)
  // If saved settings exist, start in view mode (not editing)
  setIsEditing(false)
      } catch (e) {
        console.error('Error loading saved settings:', e)
      }
    }
  }, [])

  // Track connection status
  useEffect(() => {
    setIsConnected(mqtt.socket?.connected || false)
  }, [])

  // Clear input fields when editing starts (we want empty inputs so user can type)
  useEffect(() => {
    if (isEditing) {
      setInputWarning('')
      setInputFan('')
      setInputCritical('')
    }
  }, [isEditing])

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
    // Parse candidate inputs; if empty use existing numeric values
    const candidateWarning = inputWarning.trim() === '' ? warningTemp : Number(inputWarning)
    const candidateFan = inputFan.trim() === '' ? fanTemp : Number(inputFan)
    const candidateCritical = inputCritical.trim() === '' ? criticalTemp : Number(inputCritical)

    // Temporarily set these values for validation
    const oldWarning = warningTemp
    const oldFan = fanTemp
    const oldCritical = criticalTemp
    setWarningTemp(candidateWarning)
    setFanTemp(candidateFan)
    setCriticalTemp(candidateCritical)

    const errors = validateTemperatures()
    if (errors.length > 0) {
      // revert to old values
      setWarningTemp(oldWarning)
      setFanTemp(oldFan)
      setCriticalTemp(oldCritical)
      setSaveStatus(`❌ ${errors[0]}`)
      setTimeout(() => setSaveStatus(''), 4000)
      return
    }

    const settings = {
      warningTemp: candidateWarning,
      fanTemp: candidateFan,
      criticalTemp: candidateCritical,
      timestamp: new Date().toISOString()
    }

    try {
      // Save to localStorage (browser storage)
      localStorage.setItem('motorSettings', JSON.stringify(settings))

      // Send to Arduino via MQTT
      if (isConnected) {
        mqtt.sendSettings({
          warning_temp: candidateWarning,
          fan_temp: candidateFan,
          critical_temp: candidateCritical,
          action: 'update_thresholds'
        })
      }

      // Update status
      setSaveStatus('✅ Settings saved successfully!')
      setHasUnsavedChanges(false)
      // Disable editing until user clicks Edit
      setIsEditing(false)
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (e) {
      setSaveStatus('❌ Error saving settings')
      setTimeout(() => setSaveStatus(''), 3000)
    }
  }

  // Helper: sanitize numeric input string — remove non-digits and leading zeros
  const sanitizeInput = (raw) => {
    if (raw == null) return ''
    let s = String(raw).trim()
    if (s === '') return ''
    // Remove any non-digit characters
    s = s.replace(/[^0-9]/g, '')
    // Strip leading zeros but keep single zero if user types '0'
    s = s.replace(/^0+(?=\d)/, '')
    return s
  }

  // While editing we capture raw input (string). Save will parse and validate numbers.
  const handleTempChange = (type, value) => {
    setHasUnsavedChanges(true)
    const v = sanitizeInput(value)
    switch (type) {
      case 'warning': setInputWarning(v); break
      case 'fan': setInputFan(v); break
      case 'critical': setInputCritical(v); break
      default: break
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
  // mark as editing since presets updated values
  setIsEditing(true)
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
    setIsEditing(true)
  }

  // validationErrors will be computed for the current numeric values (used for display when not editing)
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
            value={isEditing ? inputWarning : String(warningTemp)}
            placeholder={String(warningTemp)}
            onChange={e => handleTempChange('warning', e.target.value)}
            onFocus={() => { if (isEditing && inputWarning === '') setInputWarning(String(warningTemp)) }}
            onBlur={() => setInputWarning(sanitizeInput(inputWarning))}
            min="20"
            max="150"
            style={{flex: 1}}
            disabled={!isEditing}
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
            value={isEditing ? inputFan : String(fanTemp)}
            placeholder={String(fanTemp)}
            onChange={e => handleTempChange('fan', e.target.value)}
            onFocus={() => { if (isEditing && inputFan === '') setInputFan(String(fanTemp)) }}
            onBlur={() => setInputFan(sanitizeInput(inputFan))}
            min="30"
            max="150"
            style={{flex: 1}}
            disabled={!isEditing}
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
            value={isEditing ? inputCritical : String(criticalTemp)}
            placeholder={String(criticalTemp)}
            onChange={e => handleTempChange('critical', e.target.value)}
            onFocus={() => { if (isEditing && inputCritical === '') setInputCritical(String(criticalTemp)) }}
            onBlur={() => setInputCritical(sanitizeInput(inputCritical))}
            min="40"
            max="200"
            style={{flex: 1}}
            disabled={!isEditing}
          />
          <span className="data-unit">°C</span>
        </div>
        <small style={{color: 'var(--light-gray)', fontSize: '0.85rem'}}>
          Temperature at which motor automatically shuts down for safety
        </small>
      </div>

      {/* Save / Edit Buttons */}
      <div className="form-group d-flex gap-2">
        <button 
          className={`btn-modern ${hasUnsavedChanges ? 'btn-success' : 'btn-outline-success'}`}
          onClick={handleSaveSettings}
          disabled={validationErrors.length > 0 || !isEditing}
          style={{
            flex: 1,
            padding: '0.75rem',
            fontSize: '1rem',
            fontWeight: '600'
          }}
        >
          💾 {isEditing ? 'Save Settings' : 'Saved'}
          {hasUnsavedChanges && isEditing && <span className="ms-2">•</span>}
        </button>

        <button
          className={`btn-modern ${isEditing ? 'btn-outline-secondary' : 'btn-primary'}`}
          onClick={() => {
            if (!isEditing) {
              // enable editing
              setIsEditing(true)
              setHasUnsavedChanges(true)
            } else {
              // cancel edits and reload saved values
              const saved = localStorage.getItem('motorSettings')
              if (saved) {
                try {
                  const s = JSON.parse(saved)
                  setWarningTemp(s.warningTemp || 50)
                  setFanTemp(s.fanTemp || 65)
                  setCriticalTemp(s.criticalTemp || 70)
                  setHasUnsavedChanges(false)
                } catch (e) { console.error(e) }
              }
              setIsEditing(false)
            }
          }}
          style={{
            padding: '0.75rem',
            fontSize: '1rem',
            fontWeight: '600',
            minWidth: '120px'
          }}
        >
          {isEditing ? 'Cancel' : 'Edit'}
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

      {/* Manual-only mode: no presets */}
      <div className="mb-3">
        <label className="form-label">⚡ Quick Presets</label>
        <div style={{color: 'var(--light-gray)', fontSize: '0.9rem'}}>
          Presets have been removed — please enter your desired setpoints manually and click "Save Settings".
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