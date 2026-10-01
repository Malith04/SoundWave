import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { Toaster } from 'react-hot-toast'

// Register service worker for PWA functionality only in production
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
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
  } else {
    // In local development, unregister any active service worker to avoid caching conflicts with Vite HMR
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister()
        console.log('Unregistered development Service Worker')
      }
    })
  }
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
        position="top-center"
        containerStyle={{
          top: 24,
          left: 16,
          right: 16,
          zIndex: 99999,
        }}
        toastOptions={{
          duration: 3500,
          style: {
            background: 'rgba(22, 22, 26, 0.92)',
            color: '#FFFFFF',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '9999px',
            padding: '10px 22px',
            fontSize: '13.5px',
            fontWeight: '600',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            letterSpacing: '-0.01em',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.7), 0 0 25px rgba(29, 185, 84, 0.15)',
            maxWidth: '520px',
            textAlign: 'center',
          },
          success: {
            iconTheme: {
              primary: '#1DB954',
              secondary: '#000000',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#FFFFFF',
            },
          },
        }}
      />
    </BrowserRouter>
  </ErrorBoundary>
)
