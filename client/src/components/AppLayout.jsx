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
  return (
    <div
      id="yt-hidden-player"
      style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
    />
  )
}

function ShortcutToast({ label, icon }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium">
      <span className="text-lg">{icon}</span> {label}
    </div>
  )
}

function KeyboardShortcuts() {
  const {
    togglePlay, next, previous, setVolume, toggleMute, seek,
    isPlaying, volume, isMuted, progress,
    toggleShuffle, cycleRepeat, isShuffled, repeatMode,
  } = usePlayer()

  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlay()
          toast(<ShortcutToast icon={isPlaying ? '⏸' : '▶️'} label={isPlaying ? 'Paused' : 'Playing'} />, { duration: 800 })
          break
        case 'ArrowRight':
          if (e.altKey) { e.preventDefault(); next(); toast(<ShortcutToast icon="⏭" label="Next song" />, { duration: 800 }) }
          else if (e.shiftKey) { e.preventDefault(); seek(Math.min(progress + 0.05, 1)) }
          break
        case 'ArrowLeft':
          if (e.altKey) { e.preventDefault(); previous(); toast(<ShortcutToast icon="⏮" label="Previous song" />, { duration: 800 }) }
          else if (e.shiftKey) { e.preventDefault(); seek(Math.max(progress - 0.05, 0)) }
          break
        case 'ArrowUp':
          if (!e.altKey && !e.shiftKey) {
            e.preventDefault()
            const v = Math.min(volume + 10, 100)
            setVolume(v)
            toast(<ShortcutToast icon="🔊" label={`Volume ${v}%`} />, { duration: 600 })
          }
          break
        case 'ArrowDown':
          if (!e.altKey && !e.shiftKey) {
            e.preventDefault()
            const v = Math.max(volume - 10, 0)
            setVolume(v)
            toast(<ShortcutToast icon="🔉" label={`Volume ${v}%`} />, { duration: 600 })
          }
          break
        case 'KeyM':
          e.preventDefault()
          toggleMute()
          toast(<ShortcutToast icon={isMuted ? '🔊' : '🔇'} label={isMuted ? 'Unmuted' : 'Muted'} />, { duration: 800 })
          break
        case 'KeyS':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            toggleShuffle()
            toast(<ShortcutToast icon="🔀" label={isShuffled ? 'Shuffle off' : 'Shuffle on'} />, { duration: 800 })
          }
          break
        case 'KeyR':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            cycleRepeat()
            const modes = { none: 'Repeat off', all: 'Repeat all', one: 'Repeat one' }
            toast(<ShortcutToast icon="🔁" label={modes[repeatMode] || 'Repeat'} />, { duration: 800 })
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

  return (
    <div className="app-root bg-surface">
      <YouTubePlayerMount />
      <KeyboardShortcuts />

      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-surface-2 border-b border-white/10 shrink-0 z-10">
        <button
          onClick={() => setSidebarOpen(v => !v)}
          className="touch-target p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <span className="text-base font-bold text-brand tracking-tight">SoundWave</span>
        <div className="w-10" />
      </div>

      {/* Body: sidebar + main */}
      <div className="app-body">
        {/* Sidebar — on mobile: fixed overlay below the top bar */}
        <div className={`
          sidebar fixed lg:relative z-20 lg:z-auto
          top-[49px] lg:top-auto bottom-0 lg:bottom-auto
          h-[calc(100%-49px)] lg:h-auto
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
        </div>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="sidebar-overlay lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main scrollable content */}
        <main className="app-main bg-gradient-to-b from-surface-2 to-surface">
          <Outlet />
        </main>
      </div>

      {/* Player — always at bottom, never scrolled away */}
      <div className="app-player">
        <Player />
      </div>
    </div>
  )
}
