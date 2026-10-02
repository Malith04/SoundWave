import { useLocation } from 'react-router-dom'
import { Download, X, Share2 } from 'lucide-react'
import { useInstall } from '../context/InstallContext'
import SoundWaveLogo from './SoundWaveLogo'

export default function InstallPrompt() {
  const {
    isInstalled,
    showBanner,
    showIOSModal,
    setShowIOSModal,
    promptInstall,
    dismissBanner,
  } = useInstall()

  const location = useLocation()

  // Suppress on auth & onboarding routes
  const isAuthRoute = [
    '/login',
    '/signup',
    '/forgot-password',
    '/onboarding',
  ].includes(location.pathname)

  if (isInstalled || isAuthRoute) {
    return null
  }

  return (
    <>
      {/* Simplified, elegant floating install banner in top-right area (never obstructs audio player) */}
      {showBanner && (
        <div className="fixed top-4 right-4 sm:top-5 sm:right-6 z-50 max-w-[360px] w-full animate-slide-down">
          <div className="bg-[#121217]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3 sm:p-3.5 shadow-2xl shadow-black/80 flex items-center gap-3">
            {/* App Icon */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand/20 to-brand/40 border border-brand/30 flex items-center justify-center shrink-0 shadow-inner">
              <SoundWaveLogo size={22} animated={false} />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white tracking-tight">SoundWave App</span>
                <span className="text-[10px] bg-brand/20 text-brand px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">Free</span>
              </div>
              <p className="text-[11px] text-gray-400 truncate mt-0.5">
                Fast, offline & native desktop speed
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={promptInstall}
                className="bg-brand hover:bg-brand-dark active:scale-95 text-black font-bold text-xs px-3 py-1.5 rounded-full transition-all flex items-center gap-1 shadow-md shadow-brand/20"
                title="Install SoundWave App"
              >
                <Download size={13} strokeWidth={2.5} />
                <span>Install</span>
              </button>
              <button
                onClick={() => dismissBanner(true)}
                className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Dismiss"
                aria-label="Dismiss install prompt"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Safari Home Screen Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#16161d] border border-white/15 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-brand/20 to-brand/40 border border-brand/30 flex items-center justify-center">
              <SoundWaveLogo size={32} animated={false} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Install SoundWave on iOS</h3>
              <p className="text-xs text-gray-400 mt-1">Add to your Home Screen for the full native app experience</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-3 text-xs text-gray-300">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand/20 text-brand font-bold flex items-center justify-center shrink-0">1</span>
                <span>Tap the <strong>Share</strong> button <Share2 size={13} className="inline text-blue-400 ml-0.5" /> in Safari</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand/20 text-brand font-bold flex items-center justify-center shrink-0">2</span>
                <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand/20 text-brand font-bold flex items-center justify-center shrink-0">3</span>
                <span>Tap <strong>Add</strong> in the top-right corner</span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full bg-brand hover:bg-brand-dark text-black font-bold py-2.5 rounded-xl text-sm transition-all shadow-md shadow-brand/20"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// Backward-compatible hook
export function useIsInstalled() {
  const { isInstalled } = useInstall()
  return isInstalled
}