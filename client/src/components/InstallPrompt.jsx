import { useState, useEffect } from 'react'
import { Download, X, Smartphone, Monitor } from 'lucide-react'
import toast from 'react-hot-toast'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if running as installed PWA
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                            window.navigator.standalone === true

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    
    setIsStandalone(isStandaloneMode)
    setIsIOS(iOS)

    // Don't show prompt if already installed
    if (isStandaloneMode) {
      console.log('PWA: Already installed, not showing prompt')
      return
    }

    console.log('PWA: Setting up install prompt listeners')

    // Listen for install prompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e) => {
      console.log('PWA: beforeinstallprompt event fired')
      e.preventDefault()
      setDeferredPrompt(e)
      
      // Show our custom prompt immediately for testing
      setTimeout(() => {
        const dismissed = localStorage.getItem('pwa-install-dismissed')
        if (!dismissed) {
          console.log('PWA: Showing install prompt')
          setShowPrompt(true)
        }
      }, 3000) // Reduced to 3 seconds for testing
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // For iOS, show manual instructions
    if (iOS && !isStandaloneMode) {
      setTimeout(() => {
        const dismissed = localStorage.getItem('pwa-install-dismissed-ios')
        if (!dismissed) {
          console.log('PWA: Showing iOS install prompt')
          setShowPrompt(true)
        }
      }, 5000) // Show after 5 seconds on iOS
    }

    // Force show prompt for testing (remove in production)
    if (!iOS && !isStandaloneMode) {
      setTimeout(() => {
        console.log('PWA: Force showing prompt for testing')
        setShowPrompt(true)
      }, 8000) // Force show after 8 seconds for testing
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      console.log('PWA: No deferred prompt available')
      return
    }

    try {
      console.log('PWA: Triggering install prompt')
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      console.log('PWA: User choice:', outcome)
      if (outcome === 'accepted') {
        toast.success('🎉 SoundWave installed successfully!')
      } else {
        toast('Maybe next time! 😊')
      }
      
      setDeferredPrompt(null)
      setShowPrompt(false)
    } catch (error) {
      console.error('PWA: Install failed:', error)
      toast.error('Installation failed. Please try again.')
    }
  }

  const handleDismiss = () => {
    console.log('PWA: User dismissed install prompt')
    setShowPrompt(false)
    const key = isIOS ? 'pwa-install-dismissed-ios' : 'pwa-install-dismissed'
    localStorage.setItem(key, 'true')
    toast('You can always install later from your browser menu! 📱')
  }

  // Don't show if already installed
  if (isStandalone) {
    console.log('PWA: App is standalone, not showing prompt')
    return null
  }
  
  if (!showPrompt) {
    return null
  }

  console.log('PWA: Rendering install prompt', { isIOS, deferredPrompt: !!deferredPrompt })

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-gradient-to-r from-brand/90 to-green-600/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-white/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            {isIOS ? <Smartphone size={20} className="text-white" /> : <Download size={20} className="text-white" />}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm mb-1">
              Install SoundWave App
            </h3>
            
            {isIOS ? (
              <div className="text-xs text-white/90 space-y-1">
                <p>Add to your home screen for the best experience:</p>
                <div className="flex items-center gap-1">
                  <span>1. Tap</span>
                  <div className="w-4 h-4 bg-white/30 rounded flex items-center justify-center">
                    <span className="text-xs">⬆️</span>
                  </div>
                  <span>Share button</span>
                </div>
                <p>2. Select "Add to Home Screen"</p>
              </div>
            ) : (
              <p className="text-xs text-white/90">
                Get the full app experience with offline support, faster loading, and native feel.
              </p>
            )}
          </div>
          
          <button 
            onClick={handleDismiss}
            className="text-white/70 hover:text-white transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>
        
        {!isIOS && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={deferredPrompt ? handleInstall : handleDismiss}
              className="flex-1 bg-white text-green-600 font-bold py-2 px-4 rounded-lg text-sm hover:bg-white/90 transition-colors"
            >
              {deferredPrompt ? 'Install Now' : 'Add to Home Screen'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-white/80 hover:text-white text-sm transition-colors"
            >
              Later
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Hook to check if app is installed
export function useIsInstalled() {
  const [isInstalled, setIsInstalled] = useState(false)
  
  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          window.navigator.standalone === true
      setIsInstalled(isStandalone)
    }
    
    checkInstalled()
    window.addEventListener('resize', checkInstalled)
    return () => window.removeEventListener('resize', checkInstalled)
  }, [])
  
  return isInstalled
}