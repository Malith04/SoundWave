import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { useState, useEffect } from 'react'
import { User, Music, Heart, Clock, Play, Sparkles, Compass, Calendar, Disc } from 'lucide-react'
import { getFavoriteSongs, getRecentlyPlayed } from '../services/userService'
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

  const [tab, setTab]                 = useState('overview')
  const [recentSongs, setRecentSongs] = useState([])
  const [likedSongs, setLikedSongs]   = useState([])
  const [playlists, setPlaylists]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [avatarColor, setAvatarColor] = useState(0)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [imgError, setImgError]       = useState(false)

  const activeAvatar = profile?.profilePicUrl || user?.profilePicUrl || user?.photoURL || (user?.uid ? localStorage.getItem(`sw_profile_pic_${user.uid}`) : null)

  // Load saved avatar color
  useEffect(() => {
    if (user?.uid) {
      const saved = localStorage.getItem(`sw_avatar_color_${user.uid}`)
      if (saved) setAvatarColor(parseInt(saved))
    }
  }, [user?.uid])

  useEffect(() => {
    setImgError(false)
  }, [activeAvatar])

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      try {
        const [liked, recent, pls] = await Promise.all([
          getFavoriteSongs(),
          getRecentlyPlayed(),
          getUserPlaylists(user.uid),
        ])
        setLikedSongs(liked || [])
        setRecentSongs(recent || [])
        setPlaylists(pls || [])
      } catch (err) {
        console.error('Failed to load profile music info:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const handleColorPick = async (id) => {
    setAvatarColor(id)
    if (user?.uid) {
      localStorage.setItem(`sw_avatar_color_${user.uid}`, id)
    }
    setShowColorPicker(false)
  }

  const totalMinutes = Math.round(
    recentSongs.reduce((acc, s) => acc + (s.duration || 210), 0) / 60
  )
  const colorStyle = getAvatarStyle(avatarColor)

  const displayName = user?.displayName || user?.name || profile?.displayName || profile?.name || 'SoundWave Listener'
  const genres = user?.favoriteGenres || profile?.favoriteGenres || []
  const listeningVibe = user?.listeningVibe || profile?.listeningVibe || ''
  const memberYear = user?.createdAt ? new Date(user.createdAt).getFullYear() : '2026'

  return (
    <div className="px-6 py-6 pb-12 max-w-7xl mx-auto">

      {/* ── Hero banner ── */}
      <div className="relative flex flex-col sm:flex-row items-start sm:items-end gap-6 mb-8 p-6 md:p-8 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        {/* Gradient bg from avatar color */}
        <div className="absolute inset-0 opacity-30" style={colorStyle} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-transparent" />

        {/* Avatar */}
        <div className="relative shrink-0 z-10">
          <div
            className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden shadow-2xl border-4 border-white/20 flex items-center justify-center"
            style={activeAvatar && !imgError ? {} : colorStyle}
          >
            {activeAvatar && !imgError ? (
              <img
                src={activeAvatar}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl font-black text-white">
                {(displayName[0] || 'U').toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* User Details & Music Stats */}
        <div className="relative z-10 flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand/20 text-brand border border-brand/30 uppercase tracking-widest">
              Profile
            </span>
            {user?.subscriptionTier && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 capitalize">
                {user.subscriptionTier}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-2 truncate">
            {displayName}
          </h1>

          <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-sm text-gray-300 mb-3">
            <span><strong className="text-white font-bold">{playlists.length}</strong> Playlists</span>
            <span><strong className="text-white font-bold">{likedSongs.length}</strong> Liked Songs</span>
            <span><strong className="text-white font-bold">{recentSongs.length}</strong> Songs Played</span>
            <span><strong className="text-white font-bold">{totalMinutes}</strong> min listened</span>
          </div>

          {/* Vibe and Member info */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
            {listeningVibe && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-gray-200 border border-white/10">
                <Sparkles size={13} className="text-brand" /> {listeningVibe}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-gray-400">
              <Calendar size={13} /> Member since {memberYear}
            </span>
            <Link
              to="/settings"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand text-black font-semibold hover:bg-brand-dark transition-colors"
            >
              Edit Profile
            </Link>
          </div>
        </div>

        {/* Colour picker button — top right */}
        <div className="relative z-10 shrink-0 self-start sm:self-auto sm:ml-auto">
          <button
            onClick={() => setShowColorPicker(v => !v)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-semibold text-white transition-colors border border-white/20 backdrop-blur-md"
          >
            <div className="w-3.5 h-3.5 rounded-full shadow-inner" style={colorStyle} />
            Theme Color
          </button>

          {/* Colour picker dropdown */}
          {showColorPicker && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowColorPicker(false)} />
              <div className="absolute right-0 top-11 z-30 bg-[#1c1c20]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl w-60">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">Profile Accent Color</p>
                <div className="grid grid-cols-4 gap-2.5">
                  {AVATAR_COLORS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleColorPick(c.id)}
                      title={c.label}
                      className={`w-10 h-10 rounded-full transition-all hover:scale-110 ${avatarColor === c.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1c1c20] scale-110' : ''}`}
                      style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Favorite Genres Bar ── */}
      {genres.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3 overflow-x-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 shrink-0 flex items-center gap-1.5">
            <Compass size={14} className="text-brand" /> Favorite Genres:
          </span>
          <div className="flex items-center gap-2">
            {genres.map((g, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/10 whitespace-nowrap"
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'overview',  label: 'Overview', icon: Disc },
          { id: 'recent',    label: `🕐 Recently Played (${recentSongs.length})`, icon: Clock },
          { id: 'liked',     label: `❤️ Liked Songs (${likedSongs.length})`, icon: Heart },
          { id: 'playlists', label: `🎵 Playlists (${playlists.length})`, icon: Music },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === t.id
                ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
                : 'bg-surface-2 text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-[3px] border-brand border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-400">Loading your music library...</p>
        </div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="space-y-8">
              {/* Quick statistics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: Heart,  color: 'text-pink-400',   bg: 'bg-pink-400/10',   val: likedSongs.length,    label: 'Liked Songs' },
                  { icon: Music,  color: 'text-brand',      bg: 'bg-brand/10',      val: recentSongs.length,   label: 'Tracks Played' },
                  { icon: Clock,  color: 'text-blue-400',   bg: 'bg-blue-400/10',   val: `${totalMinutes}m`,   label: 'Time Listened' },
                  { icon: Disc,   color: 'text-purple-400', bg: 'bg-purple-400/10', val: playlists.length,     label: 'Saved Playlists' },
                ].map((s, i) => (
                  <div key={i} className={`${s.bg} rounded-2xl p-5 border border-white/5 hover:border-white/20 transition-all`}>
                    <s.icon size={22} className={`${s.color} mb-3`} />
                    <p className="text-3xl font-black text-white">{s.val}</p>
                    <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-medium">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Liked songs quick preview */}
              {likedSongs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-white">Favorite Songs</h2>
                      <button
                        onClick={() => play(likedSongs[0], likedSongs, 0)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/20 text-brand text-xs font-bold hover:bg-brand hover:text-black transition-all"
                      >
                        <Play size={12} fill="currentColor" /> Play All
                      </button>
                    </div>
                    <button onClick={() => setTab('liked')} className="text-xs text-gray-400 hover:text-white uppercase tracking-wider">
                      See all ({likedSongs.length})
                    </button>
                  </div>
                  <div className="space-y-1">
                    {likedSongs.slice(0, 5).map((song, i) => (
                      <SongRow key={song.id} song={song} index={i} queue={likedSongs} />
                    ))}
                  </div>
                </div>
              )}

              {/* Recently played preview */}
              {recentSongs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-white">Recently Played</h2>
                      <button
                        onClick={() => play(recentSongs[0], recentSongs, 0)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold hover:bg-white hover:text-black transition-all"
                      >
                        <Play size={12} fill="currentColor" /> Play
                      </button>
                    </div>
                    <button onClick={() => setTab('recent')} className="text-xs text-gray-400 hover:text-white uppercase tracking-wider">
                      See all ({recentSongs.length})
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recentSongs.slice(0, 5).map((song, i) => (
                      <SongRow key={song.id} song={song} index={i} queue={recentSongs} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'recent' && (
            recentSongs.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <Clock size={48} className="mx-auto mb-3 opacity-20" />
                <p className="text-base font-medium">No listening history yet</p>
                <p className="text-xs text-gray-600 mt-1">Play any track from Search or Home to see it here!</p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => play(recentSongs[0], recentSongs, 0)}
                    className="flex items-center gap-2 bg-brand text-black font-bold px-6 py-2.5 rounded-full hover:bg-brand-dark transition-colors text-sm"
                  >
                    <Play size={16} fill="black" /> Play History
                  </button>
                  <span className="text-xs text-gray-400">{recentSongs.length} tracks</span>
                </div>
                {recentSongs.map((s, i) => (
                  <SongRow key={s.id} song={s} index={i} queue={recentSongs} />
                ))}
              </div>
            )
          )}

          {tab === 'liked' && (
            likedSongs.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <Heart size={48} className="mx-auto mb-3 opacity-20" />
                <p className="text-base font-medium">No liked songs yet</p>
                <p className="text-xs text-gray-600 mt-1">Tap the heart icon next to any song to save it here!</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <button
                    onClick={() => play(likedSongs[0], likedSongs, 0)}
                    className="flex items-center gap-2 bg-brand text-black font-bold px-6 py-2.5 rounded-full hover:bg-brand-dark transition-colors text-sm"
                  >
                    <Play size={16} fill="black" /> Play All
                  </button>
                  <span className="text-gray-400 text-sm">{likedSongs.length} songs</span>
                </div>
                <div className="space-y-1">
                  {likedSongs.map((s, i) => (
                    <SongRow key={s.id} song={s} index={i} queue={likedSongs} />
                  ))}
                </div>
              </div>
            )
          )}

          {tab === 'playlists' && (
            playlists.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <Music size={48} className="mx-auto mb-3 opacity-20" />
                <p className="text-base font-medium">No playlists created yet</p>
                <p className="text-xs text-gray-600 mt-1">Create one using the + button in the sidebar!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {playlists.map(pl => (
                  <Link
                    key={pl.id}
                    to={`/playlist/${pl.id}`}
                    className="bg-surface-2 hover:bg-surface-3 rounded-2xl p-4 transition-all hover:scale-[1.02] border border-white/5 group"
                  >
                    <div className="w-full aspect-square bg-gradient-to-br from-white/5 to-white/10 rounded-xl flex items-center justify-center mb-3 group-hover:shadow-lg">
                      <Music size={32} className="text-gray-400 group-hover:text-brand transition-colors" />
                    </div>
                    <p className="font-semibold text-sm text-white truncate">{pl.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{pl.songIds?.length || 0} songs</p>
                  </Link>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
