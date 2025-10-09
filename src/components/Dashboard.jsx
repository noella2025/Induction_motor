import Controls from "./Controls";
import Settings from "./Settings";
import TemperatureChart from "./TemperatureChart";

export default function Dashboard({ 
  realTimeData, 
  setRealTimeData, 
  activeSection = "dashboard", 
  connectionStatus, 
  getStatusIndicatorClass 
}) {
  return (
    <div className="dashboard-content">
      {/* Desktop Layout - Show All */}
      <div className="d-none d-lg-block">
        {/* Status Bar - Always Visible on Desktop */}
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

        {/* Real-time Data Display - Always Visible on Desktop */}
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

          <div className="col-side">
            {/* Settings Card */}
            <div className="dashboard-card">
              <div className="card-header">
                <h3 className="card-title">⚙️ Settings</h3>
                <div className="card-icon">🔧</div>
              </div>
              <Settings />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout - Conditional Sections */}
      <div className="d-lg-none mobile-sections">
        {/* Dashboard Section - Status and Real-time Data */}
        {activeSection === "dashboard" && (
          <>
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
          </>
        )}
        {/* Controls Section */}
        {activeSection === "controls" && (
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title">🎮 Motor Controls</h3>
              <div className="card-icon">⚙️</div>
            </div>
            <Controls realTimeData={realTimeData} setRealTimeData={setRealTimeData} />
          </div>
        )}

        {/* Settings Section */}
        {activeSection === "settings" && (
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title">⚙️ Settings</h3>
              <div className="card-icon">🔧</div>
            </div>
            <Settings />
          </div>
        )}

        {/* Temperature Chart Section */}
        {activeSection === "chart" && (
          <div className="mobile-chart-section">
            <div className="chart-header">
              <h3 className="chart-title">📊 Temperature Trend</h3>
            </div>
            <div className="mobile-chart-container">
              <TemperatureChart isMobile={true} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
