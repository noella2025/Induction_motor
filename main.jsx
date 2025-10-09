import 'bootstrap/dist/css/bootstrap.min.css'
import { createRoot } from 'react-dom/client'
import './motorSimulator'
import App from './src/App'
import './src/styles/dashboard.css'

const container = document.getElementById('root')
const root = createRoot(container)
root.render(<App />)
