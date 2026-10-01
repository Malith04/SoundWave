import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Search, Library, Plus, LogOut, User, Settings, Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect, useRef } from 'react'
import { getUserPlaylists, createPlaylist } from '../services/playlistService'
import CreatePlaylistModal from './CreatePlaylistModal'
import toast from 'react-hot-toast'

export default function Sidebar({ onNavigate }) {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()
  const [playlists, setPlaylists] = useState([])
  const [imgError, setImgError] = useState(false)
  const activeAvatar = profile?.profilePicUrl || user?.profilePicUrl || user?.photoURL || localStorage.getItem(`sw_profile_pic_${user?.uid}`) || null

  useEffect(() => {
    if (user) getUserPlaylists(user.uid).then(setPlaylists)
  }, [user])

  useEffect(() => {
    setImgError(false)
  }, [activeAvatar])

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [anchorRect, setAnchorRect] = useState(null)
  const plusButtonRef = useRef(null)

  const handleOpenCreateModal = () => {
    if (plusButtonRef.current) {
      setAnchorRect(plusButtonRef.current.getBoundingClientRect())
    }
    setShowCreateModal(true)
  }

  const handleCreatePlaylist = async (name) => {
    if (!name?.trim()) return
    const id = await createPlaylist(user.uid, name.trim())
    toast.success('Playlist created')
    setPlaylists(prev => [...prev, { id, name: name.trim(), songIds: [] }])
    navigate(`/playlist/${id}`)
    onNavigate?.() // Close mobile sidebar
  }

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Signed out successfully')
      navigate('/login')
      onNavigate?.() // Close mobile sidebar
    } catch (err) {
      toast.error('Failed to sign out')
    }
  }

  const navClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
      isActive ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`

  return (
    <aside className="w-64 bg-[#0a0a0a] flex flex-col shrink-0 h-full overflow-hidden border-r border-white/5">
      {/* Logo - desktop only */}
      <div className="px-6 py-5 hidden lg:block shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎵</span>
          <span className="text-xl font-bold text-white">SoundWave</span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="px-3 space-y-1 pt-4 lg:pt-0 shrink-0">
        <NavLink to="/" end className={navClass} onClick={onNavigate}>
          <Home size={20} /> Home
        </NavLink>
        <NavLink to="/search" className={navClass} onClick={onNavigate}>
          <Search size={20} /> Search
        </NavLink>
        <NavLink to="/library" className={navClass} onClick={onNavigate}>
          <Library size={20} /> Your Library
        </NavLink>
      </nav>

      <div className="mx-3 my-3 border-t border-white/10 shrink-0" />

      {/* Liked Songs shortcut */}
      <div className="px-3 mb-2 shrink-0">
        <NavLink to="/library" onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-400 to-pink-500 flex items-center justify-center shrink-0">
            <Heart size={12} fill="white" className="text-white" />
          </div>
          Liked Songs
        </NavLink>
      </div>

      {/* Playlists — scrollable middle section */}
      <div className="px-3 flex-1 overflow-y-auto min-h-0">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Playlists</span>
          <button
            ref={plusButtonRef}
            onClick={handleOpenCreateModal}
            className="text-gray-400 hover:text-white transition-colors touch-target"
            title="Create playlist"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="space-y-0.5 pb-2">
          {playlists.map(pl => (
            <NavLink key={pl.id} to={`/playlist/${pl.id}`} onClick={onNavigate}
              className={({ isActive }) =>
                `block px-2 py-2 rounded text-sm truncate transition-all ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`
              }>
              {pl.name}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Bottom: profile + settings + logout — always visible */}
      <div className="px-3 py-3 border-t border-white/10 space-y-0.5 shrink-0 bg-[#0a0a0a]">
        <NavLink to="/profile" onClick={onNavigate}
          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-all group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand/40 to-brand/80 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden ring-1 ring-white/20 shadow-sm">
            {activeAvatar && !imgError ? (
              <img
                src={activeAvatar}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <span>{(user?.displayName?.[0] || user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}</span>
            )}
          </div>
          <span className="text-sm font-medium text-gray-300 group-hover:text-white truncate flex-1">
            {user?.displayName || user?.name || 'Profile'}
          </span>
        </NavLink>
        <NavLink to="/settings" onClick={onNavigate}
          className={({ isActive }) => `flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
          <Settings size={16} /> Settings
        </NavLink>
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-2 py-2 w-full rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all text-left">
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <CreatePlaylistModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setAnchorRect(null)
        }}
        onCreate={handleCreatePlaylist}
        anchorRect={anchorRect}
      />
    </aside>
  )
}
