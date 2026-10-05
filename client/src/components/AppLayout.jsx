import { Outlet, NavLink, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import Player from './Player'
import SoundWaveLogo from './SoundWaveLogo'
import { usePlayer } from '../context/PlayerContext'
import { Menu, X, Home, Search, Library, User } from 'lucide-react'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

function YouTubePlayerMount() {
  const { initYTPlayer } = usePlayer()
  useEffect(() => { initYTPlayer('yt-hidden-player') }, [initYTPlayer])
  return (
    <div
      id="yt-hidden-player"
      aria-hidden="true"
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: '200px',
        height: '200px',
        opacity: 0.002,
        pointerEvents: 'none',
        zIndex: -9999,
      }}
    />
  )
}

export default function AppLayout() {
  useKeyboardShortcuts()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Lock body scroll when mobile sidebar drawer is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  const mobileNavClass = ({ isActive }) =>
    `flex flex-col items-center justify-center flex-1 py-1.5 text-[11px] font-semibold transition-all ${
      isActive ? 'text-brand' : 'text-gray-400 hover:text-white'
    }`

  return (
    <div className="app-root bg-surface">
      <YouTubePlayerMount />

      {/* Mobile top bar with safe-area padding */}
      <div
        className="lg:hidden flex items-center justify-between px-3.5 sm:px-4 py-2 bg-surface-2/95 backdrop-blur-md border-b border-white/10 shrink-0 z-20"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}
      >
        <button
          onClick={() => setSidebarOpen(v => !v)}
          className="touch-target p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Link to="/" onClick={() => setSidebarOpen(false)} className="inline-flex items-center">
          <SoundWaveLogo size={26} showText animated glow textClassName="text-sm font-extrabold tracking-tight" />
        </Link>

        <Link
          to="/search"
          className="touch-target p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-gray-300 hover:text-white"
          aria-label="Search"
        >
          <Search size={18} />
        </Link>
      </div>

      {/* Body: sidebar + main */}
      <div className="app-body">
        {/* Sidebar — on mobile: fixed full-height slide drawer with z-[150] above player and bottom nav */}
        <div className={`
          sidebar fixed lg:relative z-[150] lg:z-auto
          inset-y-0 left-0
          w-[280px] max-w-[85vw] lg:w-64 lg:max-w-none
          h-full
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
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

      {/* Player — always at bottom */}
      <div className="app-player">
        <Player />

        {/* Mobile Bottom Navigation Bar (Hidden on desktop lg:) */}
        <nav
          className="lg:hidden flex items-center justify-around bg-[#0a0a0d]/95 backdrop-blur-xl border-t border-white/[0.08] shrink-0 z-30"
          style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom, 0px))' }}
        >
          <NavLink to="/" end className={mobileNavClass}>
            {({ isActive }) => (
              <>
                <Home size={19} className={`mb-0.5 ${isActive ? 'text-brand scale-110' : ''}`} />
                <span>Home</span>
              </>
            )}
          </NavLink>
          <NavLink to="/search" className={mobileNavClass}>
            {({ isActive }) => (
              <>
                <Search size={19} className={`mb-0.5 ${isActive ? 'text-brand scale-110' : ''}`} />
                <span>Search</span>
              </>
            )}
          </NavLink>
          <NavLink to="/library" className={mobileNavClass}>
            {({ isActive }) => (
              <>
                <Library size={19} className={`mb-0.5 ${isActive ? 'text-brand scale-110' : ''}`} />
                <span>Library</span>
              </>
            )}
          </NavLink>
          <NavLink to="/profile" className={mobileNavClass}>
            {({ isActive }) => (
              <>
                <User size={19} className={`mb-0.5 ${isActive ? 'text-brand scale-110' : ''}`} />
                <span>Profile</span>
              </>
            )}
          </NavLink>
        </nav>
      </div>
    </div>
  )
}
