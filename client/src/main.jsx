import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { Toaster } from 'react-hot-toast'

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration)
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available, show update notification
              if (confirm('New version available! Reload to update?')) {
                window.location.reload()
              }
            }
          })
        })
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError)
      })
  })
}

class ErrorBoundary extends React.Component {
  state = { error: null, info: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('App crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', background: '#121212', color: '#fff',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: 32, fontFamily: 'monospace'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💥</div>
          <h2 style={{ color: '#1DB954', marginBottom: 8, fontSize: 20 }}>App crashed</h2>
          <pre style={{
            background: '#1E1E1E', padding: 16, borderRadius: 8,
            maxWidth: 700, width: '100%', overflow: 'auto',
            fontSize: 12, color: '#ff6b6b', marginBottom: 16
          }}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.info?.componentStack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#1DB954', color: '#000', border: 'none',
              padding: '10px 28px', borderRadius: 24,
              fontWeight: 'bold', cursor: 'pointer', fontSize: 14
            }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1E1E1E', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
        }}
      />
    </BrowserRouter>
  </ErrorBoundary>
)
