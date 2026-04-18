import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { useState, useEffect } from 'react'
import { User, Music, Heart, Clock, Play } from 'lucide-react'
import { getUser } from '../services/userService'
import { getSongById } from '../services/songService'
import { getUserPlaylists } from '../services/playlistService'
import { Link } from 'react-router-dom'
import SongRow from '../components/SongRow'

const AVATAR_COLORS = [
  { id: 0, from: '#1DB954', to: '#158a3e', label: 'Green'  },
  { id: 1, from: '#8B5CF6', to: '#4338CA', label: 'Purple' },
  { id: 2, from: '#EC4899', to: '#BE123C', label: 'Pink'   },
  { id: 3, from: '#F97316', to: '#B91C1C', label: 'Orange' },
  { id: 4, from: '#3B82F6', to: '#0E7490', label: 'Blue'   },
  { id: 5, from: '#EAB308', to: '#B45309', label: 'Yellow' },
  { id: 6, from: '#14B8A6', to: '#0F766E', label: 'Teal'   },
  { id: 7, from: '#F43F5E', to: '#9F1239', label: 'Red'    },
]

function getAvatarStyle(colorId) {
  const c = AVATAR_COLORS[colorId] || AVATAR_COLORS[0]
  return { background: `linear-gradient(135deg, ${c.from}, ${c.to})` }
}

export default function ProfilePage() {
  const { user, profile } = useAuth()
  const { play } = usePlayer()

  const [tab, setTab]               = useState('overview')
  const [recentSongs, setRecentSongs] = useState([])
  const [likedSongs, setLikedSongs]   = useState([])
  const [playlists, setPlaylists]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [avatarColor, setAvatarColor] = useState(0)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [profilePic, setProfilePic]   = useState(null)

  // Load saved avatar color & profile pic for display only
  useEffect(() => {
    const saved = localStorage.getItem('sw_avatar_color')
    if (saved) setAvatarColor(parseInt(saved))
    
    // Load cached profile picture for display
    const cachedPic = localStorage.getItem(`sw_profile_pic_${user?.uid}`)
    if (cachedPic) {
      setProfilePic(cachedPic)
    } else if (profile?.profilePicUrl) {
      setProfilePic(profile.profilePicUrl)
    }
  }, [user?.uid, profile?.profilePicUrl])

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      try {
        const [p, pls] = await Promise.all([getUser(user.uid), getUserPlaylists(user.uid)])
        setPlaylists(pls)
        const recentIds = (p?.recentlyPlayed || []).slice(0, 10)
        const likedIds  = (p?.favoriteSongs  || []).slice(0, 20)
        const [recent, liked] = await Promise.all([
          Promise.all(recentIds.map(id => getSongById(id))),
          Promise.all(likedIds.map(id => getSongById(id))),
        ])
        setRecentSongs(recent.filter(Boolean))
        setLikedSongs(liked.filter(Boolean))
      } finally { setLoading(false) }
    }
    load()
  }, [user])

  const handleColorPick = async (id) => {
    setAvatarColor(id)
    localStorage.setItem('sw_avatar_color', id)
    setShowColorPicker(false)
  }

  const totalMinutes = Math.round((profile?.recentlyPlayed?.length || 0) * 3.5)
  const colorStyle = getAvatarStyle(avatarColor)

  return (
    <div className="px-6 py-6 pb-10">

      {/* ── Hero banner ── */}
      <div className="relative flex items-end gap-6 mb-8 p-6 rounded-2xl overflow-hidden min-h-[180px]">
        {/* Gradient bg from avatar color */}
        <div className="absolute inset-0 opacity-40" style={colorStyle} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Avatar - no upload functionality */}
        <div className="relative shrink-0 z-10">
          <div className="w-32 h-32 rounded-full overflow-hidden shadow-2xl border-4 border-white/20"
            style={profilePic ? {} : colorStyle}>
            {profilePic
              ? <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-white">
                  <User size={40} />
                </div>
            }
          </div>
        </div>

        {/* Stats only - no name display */}
        <div className="relative z-10 flex-1 min-w-0">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Profile</p>
          <h1 className="text-4xl font-bold mb-2">Your Music</h1>

          <div className="flex items-center gap-5 text-sm text-gray-300">
            <span><span className="font-bold text-white">{playlists.length}</span> playlists</span>
            <span><span className="font-bold text-white">{profile?.favoriteSongs?.length || 0}</span> liked songs</span>
            <span><span className="font-bold text-white">{totalMinutes}</span> min listened</span>
          </div>
        </div>

        {/* Colour picker button — top right */}
        <div className="relative z-10 shrink-0 self-start">
          <button
            onClick={() => setShowColorPicker(v => !v)}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-medium transition-colors border border-white/20"
          >
            <div className="w-4 h-4 rounded-full" style={colorStyle} />
            Colour
          </button>

          {/* Colour picker dropdown */}
          {showColorPicker && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-20" onClick={() => setShowColorPicker(false)} />
              <div className="absolute right-0 top-10 z-30 bg-[#282828] border border-white/10 rounded-2xl p-4 shadow-2xl w-56">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">Avatar Colour</p>
                <div className="grid grid-cols-4 gap-2">
                  {AVATAR_COLORS.map(c => (
                    <button key={c.id} onClick={() => handleColorPick(c.id)}
                      title={c.label}
                      className={`w-10 h-10 rounded-full transition-all hover:scale-110 ${avatarColor === c.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#282828] scale-110' : ''}`}
                      style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'overview',  label: 'Overview' },
          { id: 'recent',    label: '🕐 Recently Played' },
          { id: 'liked',     label: '❤️ Liked Songs' },
          { id: 'playlists', label: '🎵 Playlists' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              tab === t.id ? 'bg-white text-black' : 'bg-surface-2 text-gray-300 hover:bg-white/10'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: Heart,  color: 'text-pink-400',   bg: 'bg-pink-400/10',   val: profile?.favoriteSongs?.length || 0,  label: 'Liked Songs' },
                  { icon: Music,  color: 'text-brand',      bg: 'bg-brand/10',      val: profile?.recentlyPlayed?.length || 0, label: 'Songs Played' },
                  { icon: Clock,  color: 'text-blue-400',   bg: 'bg-blue-400/10',   val: `${totalMinutes}m`,                   label: 'Time Listened' },
                  { icon: Music,  color: 'text-purple-400', bg: 'bg-purple-400/10', val: playlists.length,                     label: 'Playlists' },
                ].map((s, i) => (
                  <div key={i} className={`${s.bg} rounded-2xl p-5 border border-white/5`}>
                    <s.icon size={20} className={`${s.color} mb-3`} />
                    <p className="text-2xl font-bold">{s.val}</p>
                    <p className="text-sm text-gray-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              {recentSongs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Recently Played</h2>
                    <button onClick={() => setTab('recent')} className="text-xs text-gray-400 hover:text-white uppercase tracking-wider">See all</button>
                  </div>
                  <div className="space-y-1">
                    {recentSongs.slice(0, 5).map((song, i) => <SongRow key={song.id} song={song} index={i} queue={recentSongs} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'recent' && (
            recentSongs.length === 0
              ? <div className="text-center py-20 text-gray-500"><Clock size={48} className="mx-auto mb-3 opacity-20" /><p>No history yet</p></div>
              : <div className="space-y-1">{recentSongs.map((s, i) => <SongRow key={s.id} song={s} index={i} queue={recentSongs} />)}</div>
          )}

          {tab === 'liked' && (
            likedSongs.length === 0
              ? <div className="text-center py-20 text-gray-500"><Heart size={48} className="mx-auto mb-3 opacity-20" /><p>No liked songs yet</p></div>
              : <>
                  <div className="flex items-center gap-3 mb-5">
                    <button onClick={() => play(likedSongs[0], likedSongs, 0)}
                      className="flex items-center gap-2 bg-brand text-black font-bold px-6 py-3 rounded-full hover:bg-brand-dark transition-colors">
                      <Play size={18} fill="black" /> Play All
                    </button>
                    <span className="text-gray-400 text-sm">{likedSongs.length} songs</span>
                  </div>
                  <div className="space-y-1">{likedSongs.map((s, i) => <SongRow key={s.id} song={s} index={i} queue={likedSongs} />)}</div>
                </>
          )}

          {tab === 'playlists' && (
            playlists.length === 0
              ? <div className="text-center py-20 text-gray-500"><Music size={48} className="mx-auto mb-3 opacity-20" /><p>No playlists yet</p></div>
              : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {playlists.map(pl => (
                    <Link key={pl.id} to={`/playlist/${pl.id}`}
                      className="bg-surface-2 hover:bg-surface-3 rounded-xl p-4 transition-colors">
                      <div className="w-full aspect-square bg-surface-3 rounded-lg flex items-center justify-center mb-3">
                        <Music size={28} className="text-gray-500" />
                      </div>
                      <p className="font-medium text-sm truncate">{pl.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{pl.songIds?.length || 0} songs</p>
                    </Link>
                  ))}
                </div>
          )}
        </>
      )}
    </div>
  )
}
