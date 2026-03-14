import React from 'react'
import ReactDOM from 'react-dom/client'
import BillingApp from './BillingApp.jsx'
import { firebaseConfigError, firebaseReady } from './firebase'
import './index.css'

const ConfigErrorScreen = () => (
  <div style={{
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    fontFamily: 'Inter, system-ui, sans-serif',
    background: '#f9fafb'
  }}>
    <div style={{
      width: 'min(680px, 100%)',
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 24,
      boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
    }}>
      <h1 style={{ margin: '0 0 10px', color: '#111827' }}>Deployment Configuration Error</h1>
      <p style={{ margin: '0 0 8px', color: '#374151' }}>
        Billit could not start because Firebase environment variables are missing in this deployment.
      </p>
      <p style={{ margin: 0, color: '#dc2626', fontWeight: 600 }}>
        {firebaseConfigError}
      </p>
      <p style={{ margin: '16px 0 0', color: '#6b7280', fontSize: 14 }}>
        Add the required <code>VITE_FIREBASE_*</code> keys to the build environment and redeploy.
      </p>
    </div>
  </div>
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {firebaseReady ? <BillingApp /> : <ConfigErrorScreen />}
  </React.StrictMode>
)
