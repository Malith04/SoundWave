import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

const InstallContext = createContext(null)

export function InstallProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [showIOSModal, setShowIOSModal] = useState(false)

  useEffect(() => {
    // Check if running as installed standalone PWA
    const checkStandalone = () => {
      const standaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://')
      setIsInstalled(standaloneMode)
      return standaloneMode
    }

    const isAppStandalone = checkStandalone()

    // Detect iOS
    const iOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    setIsIOS(iOSDevice)

    if (isAppStandalone) return

    // Capture beforeinstallprompt event (Desktop Chrome/Edge, Android)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)

      // Only show the floating banner if the user hasn't dismissed it
      const dismissed = localStorage.getItem('sw_pwa_dismissed')
      if (!dismissed) {
        // Wait 15 seconds of pleasant browsing before gently offering the install banner
        const timer = setTimeout(() => {
          if (!localStorage.getItem('sw_pwa_dismissed')) {
            setShowBanner(true)
          }
        }, 15000)
        return () => clearTimeout(timer)
      }
    }

    // App installed event listener
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowBanner(false)
      setDeferredPrompt(null)
      toast.success('🎉 SoundWave installed successfully!')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
          toast.success('🎉 Installing SoundWave...')
          setShowBanner(false)
          setDeferredPrompt(null)
        } else {
          toast('Installation cancelled. You can install anytime from the sidebar! 🎵', {
            duration: 3000,
          })
        }
      } catch (err) {
        console.error('PWA install error:', err)
      }
    } else if (isIOS) {
      setShowIOSModal(true)
    } else {
      toast('To install SoundWave: click your browser menu (⋮ or ⚙) and select "Install SoundWave" or "Add to Home Screen"', {
        duration: 5000,
        icon: '📱',
      })
    }
  }, [deferredPrompt, isIOS])

  const dismissBanner = useCallback((permanent = true) => {
    setShowBanner(false)
    if (permanent) {
      localStorage.setItem('sw_pwa_dismissed', 'true')
    }
  }, [])

  return (
    <InstallContext.Provider
      value={{
        isInstalled,
        canInstall: !!deferredPrompt || isIOS,
        isIOS,
        showBanner,
        setShowBanner,
        showIOSModal,
        setShowIOSModal,
        promptInstall,
        dismissBanner,
      }}
    >
      {children}
    </InstallContext.Provider>
  )
}

export function useInstall() {
  const context = useContext(InstallContext)
  if (!context) {
    return {
      isInstalled: false,
      canInstall: false,
      isIOS: false,
      showBanner: false,
      showIOSModal: false,
      setShowIOSModal: () => {},
      promptInstall: () => {},
      dismissBanner: () => {},
    }
  }
  return context
}
