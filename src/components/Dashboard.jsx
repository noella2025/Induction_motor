import Controls from './Controls'
import Settings from './Settings'
import TemperatureChart from './TemperatureChart'

export default function Dashboard({ realTimeData, setRealTimeData }) {
  return (
    <div className="row">
      <div className="col-main">
                {/* Controls Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">🎮 Motor Controls</h3>
            <div className="card-icon">⚙️</div>
          </div>
          <Controls realTimeData={realTimeData} setRealTimeData={setRealTimeData} />
        </div>


        {/* Temperature Chart Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">📊 Temperature Trend</h3>
            <div className="card-icon">🌡️</div>
          </div>
          <div className="chart-container">
            <TemperatureChart />
          </div>
        </div>


      </div>

      <div className="col-sidebar">
        {/* Settings Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">⚙️ Settings</h3>
            <div className="card-icon">🔧</div>
          </div>
          <Settings />
        </div>

        {/* System Information Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">💻 System Info</h3>
            <div className="card-icon">📈</div>
          </div>
          <div className="realtime-data">
            <div className="data-item">
              <span className="data-value">24/7</span>
              <div className="data-label">Uptime</div>
            </div>
            <div className="data-item">
              <span className="data-value">1.2ms</span>
              <div className="data-label">Latency</div>
            </div>
          </div>
          <div className="mt-3">
            <small style={{color: 'var(--light-gray)', fontSize: '0.85rem'}}>
              🔄 Last data sync: {new Date().toLocaleTimeString()}<br/>
              📡 MQTT Broker: test.mosquitto.org<br/>
              🌐 Server: localhost:3001
            </small>
          </div>
        </div>
      </div>
    </div>
  )
}
