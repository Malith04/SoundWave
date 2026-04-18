import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import Player from './Player'
import { usePlayer } from '../context/PlayerContext'
import { Menu, X } from 'lucide-react'
import toast from 'react-hot-toast'

function YouTubePlayerMount() {
  const { initYTPlayer } = usePlayer()
  useEffect(() => { initYTPlayer('yt-hidden-player') }, [initYTPlayer])
  return <div id="yt-hidden-player" style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }} />
}

// ── Keyboard shortcut toast ───────────────────────────────────
function ShortcutToast({ label, icon }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium">
      <span className="text-lg">{icon}</span> {label}
    </div>
  )
}

// ── Keyboard shortcuts ────────────────────────────────────────
function KeyboardShortcuts() {
  const { togglePlay, next, previous, setVolume, toggleMute, seek,
          isPlaying, volume, isMuted, progress, currentSong,
          toggleShuffle, cycleRepeat, isShuffled, repeatMode } = usePlayer()

  useEffect(() => {
    const handler = (e) => {
      // Don't fire when typing in an input/textarea
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlay()
          toast(<ShortcutToast icon={isPlaying ? '⏸' : '▶️'} label={isPlaying ? 'Paused' : 'Playing'} />,
            { duration: 800, style: { background: '#1E1E1E', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } })
          break

        case 'ArrowRight':
          if (e.altKey) {
            e.preventDefault()
            next()
            toast(<ShortcutToast icon="⏭" label="Next song" />, { duration: 800, style: { background: '#1E1E1E', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } })
          } else if (e.shiftKey) {
            e.preventDefault()
            seek(Math.min(progress + 0.05, 1))
          }
          break

        case 'ArrowLeft':
          if (e.altKey) {
            e.preventDefault()
            previous()
            toast(<ShortcutToast icon="⏮" label="Previous song" />, { duration: 800, style: { background: '#1E1E1E', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } })
          } else if (e.shiftKey) {
            e.preventDefault()
            seek(Math.max(progress - 0.05, 0))
          }
          break

        case 'ArrowUp':
          if (!e.altKey && !e.shiftKey) {
            e.preventDefault()
            const newVol = Math.min(volume + 10, 100)
            setVolume(newVol)
            toast(<ShortcutToast icon="🔊" label={`Volume ${newVol}%`} />, { duration: 600, style: { background: '#1E1E1E', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } })
          }
          break

        case 'ArrowDown':
          if (!e.altKey && !e.shiftKey) {
            e.preventDefault()
            const newVol2 = Math.max(volume - 10, 0)
            setVolume(newVol2)
            toast(<ShortcutToast icon={isMuted ? '🔊' : '🔇'} label={isMuted ? 'Unmuted' : 'Muted'} />, { duration: 600, style: { background: '#1E1E1E', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } })
          }
          break

        case 'KeyM':
          e.preventDefault()
          toggleMute()
          toast(<ShortcutToast icon={isMuted ? '🔊' : '🔇'} label={isMuted ? 'Unmuted' : 'Muted'} />, { duration: 800, style: { background: '#1E1E1E', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } })
          break

        case 'KeyS':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            toggleShuffle()
            toast(<ShortcutToast icon="🔀" label={isShuffled ? 'Shuffle off' : 'Shuffle on'} />, { duration: 800, style: { background: '#1E1E1E', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } })
          }
          break

        case 'KeyR':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            cycleRepeat()
            const modes = { none: 'Repeat off', all: 'Repeat all', one: 'Repeat one' }
            toast(<ShortcutToast icon="🔁" label={modes[repeatMode] || 'Repeat'} />, { duration: 800, style: { background: '#1E1E1E', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } })
          }
          break

        case 'Digit0':
        case 'Numpad0':
          e.preventDefault()
          seek(0)
          break

        default: break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePlay, next, previous, setVolume, toggleMute, seek, isPlaying, volume, isMuted, progress, toggleShuffle, cycleRepeat, isShuffled, repeatMode])

  return null
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sidebarOpen && !e.target.closest('.sidebar') && !e.target.closest('.sidebar-toggle')) {
        setSidebarOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [sidebarOpen])

  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden">
      <YouTubePlayerMount />
      <KeyboardShortcuts />
      
      {/* Mobile header with menu button */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-surface-2 border-b border-white/10 shrink-0">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="sidebar-toggle p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="text-lg font-bold text-brand">SoundWave</h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar - hidden on mobile by default, overlay when open */}
        <div className={`
          sidebar fixed lg:relative z-50 lg:z-auto
          w-64 h-full lg:h-auto
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          lg:block
        `}>
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
        </div>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-surface-2 to-surface">
          <Outlet />
        </main>
      </div>
      
      <Player />
    </div>
  )
}
