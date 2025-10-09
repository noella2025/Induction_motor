import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip
} from 'chart.js'
import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import mqtt from '../mqtt'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default function TemperatureChart({ isMobile = false }) {
  const [dataPoints, setDataPoints] = useState([])
  const [labels, setLabels] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  // Subscribe to temperature data
  useEffect(() => {
    // Check connection status
    setIsConnected(mqtt.socket?.connected || false)
    
    const off = mqtt.onMqtt(({ topic, message }) => {
      if (topic.endsWith('/temp')) {
        try {
          let obj
          try { 
            obj = JSON.parse(message) 
          } catch (_) { 
            obj = { time: Date.now(), temp: Number(message) } 
          }
          
          const { time = Date.now(), temp } = obj
          const tempValue = Number(temp)
          
          setDataPoints(d => [...d.slice(-29), tempValue]) // Keep last 30 points
          setLabels(l => [...l.slice(-29), new Date(time).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })])
          setLastUpdate(new Date(time))
          setIsConnected(true)
        } catch (e) {
          console.error('Error parsing temperature data:', e)
        }
      }
    })
    
    return off
  }, [])

  // Create gradient for the chart
  const createGradient = (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400)
    gradient.addColorStop(0, 'rgba(52, 152, 219, 0.8)')
    gradient.addColorStop(0.5, 'rgba(52, 152, 219, 0.4)')
    gradient.addColorStop(1, 'rgba(52, 152, 219, 0.1)')
    return gradient
  }

  const chartData = {
    labels,
    datasets: [
      {
        label: '🌡️ Temperature',
        data: dataPoints,
        borderColor: '#3498db',
        backgroundColor: (context) => {
          const chart = context.chart
          const { ctx } = chart
          return createGradient(ctx)
        },
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#3498db',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#2980b9',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3,
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#ecf0f1',
          font: {
            size: 14,
            weight: '600'
          },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(44, 62, 80, 0.95)',
        titleColor: '#ecf0f1',
        bodyColor: '#ecf0f1',
        borderColor: '#3498db',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context) => `Time: ${context[0].label}`,
          label: (context) => `Temperature: ${context.parsed.y.toFixed(1)}°C`,
          afterLabel: (context) => {
            const temp = context.parsed.y
            if (temp >= 90) return '🚨 CRITICAL - Motor will stop!'
            if (temp >= 70) return '⚠️ WARNING - High temperature'
            if (temp >= 50) return '🟡 NORMAL - Good operating range'
            return '🟢 COOL - Safe temperature'
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#ecf0f1',
          font: {
            size: 11
          },
          maxTicksLimit: 8
        }
      },
      y: {
        beginAtZero: true,
        max: 120,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#ecf0f1',
          font: {
            size: 11
          },
          callback: (value) => `${value}°C`
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    elements: {
      point: {
        hoverRadius: 8
      }
    }
  }

  const currentTemp = dataPoints[dataPoints.length - 1] || 0
  const tempStatus = currentTemp >= 90 ? 'critical' : currentTemp >= 70 ? 'warning' : 'normal'
  const statusColors = {
    critical: '#e74c3c',
    warning: '#f39c12',
    normal: '#27ae60'
  }

  return (
    <div>
      {/* Chart Header with Status */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <span style={{color: statusColors[tempStatus], fontSize: '1.2rem'}}>
              {tempStatus === 'critical' ? '🚨' : tempStatus === 'warning' ? '⚠️' : '🟢'}
            </span>
            <span style={{fontSize: '1.1rem', fontWeight: '600'}}>
              Current: {currentTemp.toFixed(1)}°C
            </span>
          </div>
          {lastUpdate && (
            <small style={{color: 'var(--light-gray)', fontSize: '0.85rem'}}>
              Last reading: {lastUpdate.toLocaleTimeString()}
            </small>
          )}
        </div>
        
        <div className="text-right">
          <div className={`status-indicator ${isConnected ? 'status-connected' : 'status-disconnected'}`} 
               style={{display: 'inline-block', marginRight: '0.5rem'}}></div>
          <small style={{color: 'var(--light-gray)'}}>
            {isConnected ? 'Live Data' : 'Disconnected'}
          </small>
        </div>
      </div>

      {/* Temperature Zones Legend */}
      <div className="realtime-data mb-3">
        <div className="data-item" style={{borderLeft: '3px solid #27ae60'}}>
          <span className="data-value" style={{color: '#27ae60', fontSize: '1rem'}}>0-69°C</span>
          <div className="data-label">Safe Zone</div>
        </div>
        <div className="data-item" style={{borderLeft: '3px solid #f39c12'}}>
          <span className="data-value" style={{color: '#f39c12', fontSize: '1rem'}}>70-89°C</span>
          <div className="data-label">Warning Zone</div>
        </div>
        <div className="data-item" style={{borderLeft: '3px solid #e74c3c'}}>
          <span className="data-value" style={{color: '#e74c3c', fontSize: '1rem'}}>90+°C</span>
          <div className="data-label">Critical Zone</div>
        </div>
      </div>

      {/* Chart Container */}
      <div style={{height: isMobile ? '300px' : '400px', position: 'relative', width: '100%'}}>
        {dataPoints.length > 0 ? (
          <Line data={chartData} options={options} />
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--light-gray)',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{fontSize: '3rem'}}>📊</div>
            <div>
              <h5>Waiting for temperature data...</h5>
              <p>Start the motor to begin monitoring</p>
            </div>
          </div>
        )}
      </div>

      {/* Chart Statistics */}
      {dataPoints.length > 0 && (
        <div className="realtime-data mt-3">
          <div className="data-item">
            <span className="data-value">{Math.min(...dataPoints).toFixed(1)}°C</span>
            <div className="data-label">Minimum</div>
          </div>
          <div className="data-item">
            <span className="data-value">{Math.max(...dataPoints).toFixed(1)}°C</span>
            <div className="data-label">Maximum</div>
          </div>
          <div className="data-item">
            <span className="data-value">
              {(dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length).toFixed(1)}°C
            </span>
            <div className="data-label">Average</div>
          </div>
          <div className="data-item">
            <span className="data-value">{dataPoints.length}</span>
            <div className="data-label">Data Points</div>
          </div>
        </div>
      )}
    </div>
  )
}
