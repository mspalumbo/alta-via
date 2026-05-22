import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { FirmProvider } from './context/FirmContext'
import { AuthProvider } from './context/AuthContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <FirmProvider>
        <App />
      </FirmProvider>
    </AuthProvider>
  </StrictMode>,
)