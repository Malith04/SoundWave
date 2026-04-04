import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { useState, useEffect, useRef } from 'react'
import { User, Mail, Music, Heart, Clock, Pencil, Check, X, Play } from 'lucide-react'
import { getUser, updateUser } from '../services/userService'
import { getSongById } from '../services/songService'
import { getUserPlaylists } from '../services/playlistService'
import SongRow from '../components/SongRow'
import toast from 'react-hot-toast'

const AVATAR_COLORS = [
  'from-brand to-emerald-700',
  'from-purple-500 to-indigo-700',
  'from-pink-500 to-rose-700',
  'from-orange-500 to-red-700',
  'from-blue-500 to-cyan-700',
  'from-yellow-500 to-amber-700',
]

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const { play } = usePlayer()
  const [tab, setTab] = useState('overview')
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [recentSongs, setRecentSongs] = useState([])
  const [likedSongs, setLikedSongs] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [avatarColor, setAvatarColor] = useState(0)
  const [showColorPicker, setShowColorPicker] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sw_avatar_color')
    if (saved) setAvatarColor(parseInt(saved))
  }, [])

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
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const handleSaveName = async () => {
    if (!newName.trim() || newName === profile?.name) { setEditingName(false); return }
    setSavingName(true)
    try {
      await updateUser(user.uid, { name: newName.trim() })
      await refreshProfile()
      toast.success('Name updated')
      setEditingName(false)
    } catch { toast.error('Failed to update name') }
    finally { setSavingName(false) }
  }

  const handleColorPick = (i) => {
    setAvatarColor(i)
    localStorage.setItem('sw_avatar_color', i)
    setShowColorPicker(false)
    toast.success('Avatar updated')
  }

  const totalMinutes = Math.round((profile?.recentlyPlayed?.length || 0) * 3.5)

  return (
    <div className="px-6 py-6 pb-10">
      {/* Hero */}
      <div className="relative flex items-end gap-6 mb-8 p-6 rounded-2xl overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${AVATAR_COLORS[avatarColor]} opacity-30`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

        {/* Avatar */}
        <div className="relative shrink-0">
          <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${AVATAR_COLORS[avatarColor]} flex items-center justify-center text-5xl font-bold text-white shadow-2xl`}>
            {profile?.name?.[0]?.toUpperCase() || <User size={40} />}
          </div>
          <button onClick={() => setShowColorPicker(v => !v)}
            className="absolute -bottom-1 -right-1 w-8 h-8 bg-surface-3 hover:bg-surface-4 rounded-full flex items-center justify-center border border-white/20 transition-colors">
            <Pencil size={13} />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-2 bg-surface-2 border border-white/10 rounded-xl p-3 flex gap-2 z-10 shadow-2xl">
              {AVATAR_COLORS.map((c, i) => (
                <button key={i} onClick={() => handleColorPick(i)}
                  className={`w-7 h-7 rounded-full bg-gradient-to-br ${c} hover:scale-110 transition-transform ${avatarColor === i ? 'ring-2 ring-white' : ''}`} />
              ))}
            </div>
          )}
        </div>

        {/* Name + stats */}
        <div className="relative flex-1 min-w-0">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Profile</p>
          {editingName ? (
            <div className="flex items-center gap-2 mb-2">
              <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-2xl font-bold text-white focus:outline-none focus:border-brand w-64" />
              <button onClick={handleSaveName} disabled={savingName} className="p-1.5 bg-brand rounded-full text-black hover:scale-105 transition-transform">
                <Check size={16} />
              </button>
              <button onClick={() => setEditingName(false)} className="p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold truncate">{profile?.name || 'User'}</h1>
              <button onClick={() => { setNewName(profile?.name || ''); setEditingName(true) }}
                className="p-1.5 text-gray-400 hover:text-white transition-colors opacity-0 hover:opacity-100 group-hover:opacity-100">
                <Pencil size={16} />
              </button>
            </div>
          )}
          <p className="text-gray-400 text-sm flex items-center gap-1.5"><Mail size={13} />{profile?.email}</p>
          <div className="flex items-center gap-5 mt-3 text-sm text-gray-300">
            <span><span className="font-bold text-white">{playlists.length}</span> playlists</span>
            <span><span className="font-bold text-white">{profile?.favoriteSongs?.length || 0}</span> liked songs</span>
            <span><span className="font-bold text-white">{totalMinutes}</span> min listened</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'overview',  label: 'Overview' },
          { id: 'recent',    label: 'Recently Played' },
          { id: 'liked',     label: '❤️ Liked Songs' },
          { id: 'playlists', label: 'Playlists' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${tab === t.id ? 'bg-white text-black' : 'bg-surface-2 text-gray-300 hover:bg-white/10'}`}>
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
          {/* Overview */}
          {tab === 'overview' && (
            <div className="space-y-8">
              {/* Stats cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: Heart,  color: 'text-pink-400',  bg: 'bg-pink-400/10',  val: profile?.favoriteSongs?.length || 0,    label: 'Liked Songs' },
                  { icon: Music,  color: 'text-brand',     bg: 'bg-brand/10',     val: profile?.recentlyPlayed?.length || 0,   label: 'Songs Played' },
                  { icon: Clock,  color: 'text-blue-400',  bg: 'bg-blue-400/10',  val: `${totalMinutes}m`,                     label: 'Time Listened' },
                  { icon: Music,  color: 'text-purple-400',bg: 'bg-purple-400/10',val: playlists.length,                       label: 'Playlists' },
                ].map((s, i) => (
                  <div key={i} className={`${s.bg} rounded-2xl p-5 border border-white/5`}>
                    <s.icon size={20} className={`${s.color} mb-3`} />
                    <p className="text-2xl font-bold">{s.val}</p>
                    <p className="text-sm text-gray-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Top recent */}
              {recentSongs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Recently Played</h2>
                    <button onClick={() => setTab('recent')} className="text-xs text-gray-400 hover:text-white uppercase tracking-wider transition-colors">See all</button>
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

          {/* Recently Played */}
          {tab === 'recent' && (
            <div>
              {recentSongs.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <Clock size={48} className="mx-auto mb-3 opacity-20" />
                  <p>No listening history yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentSongs.map((song, i) => (
                    <SongRow key={song.id} song={song} index={i} queue={recentSongs} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Liked Songs */}
          {tab === 'liked' && (
            <div>
              {likedSongs.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <Heart size={48} className="mx-auto mb-3 opacity-20" />
                  <p>No liked songs yet</p>
                  <p className="text-sm mt-1">Hit ❤️ on any song to save it here</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-5">
                    <button onClick={() => play(likedSongs[0], likedSongs, 0)}
                      className="flex items-center gap-2 bg-brand text-black font-bold px-6 py-3 rounded-full hover:bg-brand-dark transition-colors">
                      <Play size={18} fill="black" /> Play All
                    </button>
                    <span className="text-gray-400 text-sm">{likedSongs.length} songs</span>
                  </div>
                  <div className="space-y-1">
                    {likedSongs.map((song, i) => (
                      <SongRow key={song.id} song={song} index={i} queue={likedSongs} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Playlists */}
          {tab === 'playlists' && (
            <div>
              {playlists.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <Music size={48} className="mx-auto mb-3 opacity-20" />
                  <p>No playlists yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {playlists.map(pl => (
                    <a key={pl.id} href={`/playlist/${pl.id}`}
                      className="bg-surface-2 hover:bg-surface-3 rounded-xl p-4 transition-colors group">
                      <div className="w-full aspect-square bg-surface-3 rounded-lg flex items-center justify-center mb-3">
                        <Music size={28} className="text-gray-500" />
                      </div>
                      <p className="font-medium text-sm truncate">{pl.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{pl.songIds?.length || 0} songs</p>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
