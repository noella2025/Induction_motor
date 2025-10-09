import { useEffect, useState } from 'react'
import Dashboard from './components/Dashboard'
import mqtt from './mqtt'
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

  const [activeSection, setActiveSection] = useState('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)

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
    <div className="app">
      {/* Main Header - Always Visible */}
      <div className="dashboard-header">
        <h1 className="dashboard-title d-none d-lg-block">Three Phase Induction Motor</h1>
        <h2 className="dashboard-subtitle d-none d-lg-block">Temperature Monitoring System</h2>
      </div>

      {/* Mobile Header with Hamburger Menu */}
      <div className="mobile-header d-lg-none">
        <div className="mobile-title">
          <h1 className="app-title">Three Phase Motor Monitor</h1>
          <span className="app-subtitle">Temperature Monitoring</span>
        </div>
        <button 
          className="hamburger-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger-line ${menuOpen ? 'active' : ''}`}></span>
          <span className={`hamburger-line ${menuOpen ? 'active' : ''}`}></span>
          <span className={`hamburger-line ${menuOpen ? 'active' : ''}`}></span>
        </button>
      </div>

      {/* Mobile Sidebar Menu */}
      <div className={`mobile-sidebar d-lg-none ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-overlay" onClick={() => setMenuOpen(false)}></div>
        <div className="sidebar-content">
          <div className="sidebar-header">
            <h3>Menu</h3>
            <button className="close-btn" onClick={() => setMenuOpen(false)}>×</button>
          </div>
          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
              onClick={() => {setActiveSection('dashboard'); setMenuOpen(false)}}
            >
              📊 Dashboard
            </button>
            <button 
              className={`nav-item ${activeSection === 'controls' ? 'active' : ''}`}
              onClick={() => {setActiveSection('controls'); setMenuOpen(false)}}
            >
              🎛️ Controls
            </button>
            <button 
              className={`nav-item ${activeSection === 'settings' ? 'active' : ''}`}
              onClick={() => {setActiveSection('settings'); setMenuOpen(false)}}
            >
              ⚙️ Settings
            </button>
            <button 
              className={`nav-item ${activeSection === 'chart' ? 'active' : ''}`}
              onClick={() => {setActiveSection('chart'); setMenuOpen(false)}}
            >
              📈 Temperature Trend
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content with Proper Margins */}
      <div className="dashboard-container">
        <Dashboard 
          realTimeData={realTimeData} 
          setRealTimeData={setRealTimeData} 
          activeSection={activeSection}
          connectionStatus={connectionStatus}
          getStatusIndicatorClass={getStatusIndicatorClass}
        />
      </div>
    </div>
  )
}