import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Search, Library, Plus, LogOut, User, Settings, Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { getUserPlaylists, createPlaylist } from '../services/playlistService'
import toast from 'react-hot-toast'

export default function Sidebar({ onNavigate }) {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()
  const [playlists, setPlaylists] = useState([])
  const [profilePic, setProfilePic] = useState(profile?.profilePicUrl || null)

  useEffect(() => {
    if (user) getUserPlaylists(user.uid).then(setPlaylists)
  }, [user])

  // Profile picture sync with cache - improved
  useEffect(() => {
    console.log('Sidebar: Profile picture sync check', { 
      profilePicUrl: profile?.profilePicUrl, 
      userId: user?.uid 
    })
    
    if (profile?.profilePicUrl) {
      console.log('Sidebar: Setting profile picture from database:', profile.profilePicUrl)
      setProfilePic(profile.profilePicUrl)
    } else if (user?.uid) {
      // Load cached profile picture as fallback
      const cachedPic = localStorage.getItem(`sw_profile_pic_${user.uid}`)
      console.log('Sidebar: Checking cached profile picture:', !!cachedPic)
      if (cachedPic) {
        console.log('Sidebar: Loading cached profile picture:', cachedPic)
        setProfilePic(cachedPic)
      }
    }
  }, [profile?.profilePicUrl, user?.uid])

  const handleCreatePlaylist = async () => {
    const name = prompt('Playlist name:')
    if (!name?.trim()) return
    const id = await createPlaylist(user.uid, name.trim())
    toast.success('Playlist created')
    setPlaylists(prev => [...prev, { id, name: name.trim(), songIds: [] }])
    navigate(`/playlist/${id}`)
    onNavigate?.() // Close mobile sidebar
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    onNavigate?.() // Close mobile sidebar
  }

  const navClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
      isActive ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`

  return (
    <aside className="w-64 bg-black flex flex-col shrink-0 overflow-hidden h-full">
      {/* Logo - hidden on mobile since it's in the header */}
      <div className="px-6 py-5 hidden lg:block">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎵</span>
          <span className="text-xl font-bold text-white">SoundWave</span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="px-3 space-y-1 pt-4 lg:pt-0">
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

      <div className="mx-3 my-4 border-t border-white/10" />

      {/* Liked Songs shortcut */}
      <div className="px-3 mb-2">
        <NavLink to="/library" onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-400 to-pink-500 flex items-center justify-center shrink-0">
            <Heart size={12} fill="white" className="text-white" />
          </div>
          Liked Songs
        </NavLink>
      </div>

      {/* Playlists */}
      <div className="px-3 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Playlists</span>
          <button
            onClick={handleCreatePlaylist}
            className="text-gray-400 hover:text-white transition-colors"
            title="Create playlist"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="space-y-0.5">
          {playlists.map(pl => (
            <NavLink
              key={pl.id}
              to={`/playlist/${pl.id}`}
              onClick={onNavigate}
              className={({ isActive }) =>
                `block px-2 py-2 rounded text-sm truncate transition-all ${
                  isActive ? 'text-white' : 'text-gray-400 hover:text-white'
                }`
              }
            >
              {pl.name}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Bottom: profile + settings + logout */}
      <div className="p-3 border-t border-white/10 space-y-0.5">
        <NavLink to="/profile" onClick={onNavigate} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-all group">
          <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand text-sm font-bold shrink-0 overflow-hidden">
            {profilePic
              ? <img src={profilePic} alt="" className="w-full h-full object-cover" />
              : <User size={14} />
            }
          </div>
          <span className="text-sm text-gray-300 group-hover:text-white truncate flex-1">Your Library</span>
        </NavLink>
        <NavLink to="/settings" onClick={onNavigate}
          className={({ isActive }) => `flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
          <Settings size={16} /> Settings
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-2 py-2 w-full rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </aside>
  )
}
