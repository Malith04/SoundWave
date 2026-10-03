import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Play,
  Pause,
  Shuffle,
  Heart,
  Share2,
  CheckCircle2,
  Search,
  X,
  Disc,
  Sparkles,
  Calendar,
  Users,
  Music,
  ArrowLeft,
  Flame,
  Radio,
  Clock
} from 'lucide-react'
import { getArtistProfile, isArtistFollowed, toggleFollowArtist } from '../services/artistService'
import { usePlayer } from '../context/PlayerContext'
import { useAuth } from '../context/AuthContext'
import SongRow from '../components/SongRow'
import toast from 'react-hot-toast'

export default function ArtistPage() {
  const { name } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { currentSong, isPlaying, play, togglePlay } = usePlayer()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Local state
  const [isFollowing, setIsFollowing] = useState(false)
  const [artistSearch, setArtistSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'popular' | 'albums' | 'new' | 'upcoming' | 'collabs'
  const [showAllTopSongs, setShowAllTopSongs] = useState(false)
  const [selectedAlbum, setSelectedAlbum] = useState(null)

  // Load artist data
  useEffect(() => {
    let isCancelled = false
    setLoading(true)
    setError(null)
    setArtistSearch('')
    setActiveTab('all')
    setSelectedAlbum(null)

    getArtistProfile(name)
      .then(data => {
        if (isCancelled) return
        if (!data || !data.artist) {
          setError('Artist not found')
        } else {
          setProfile(data)
          setIsFollowing(isArtistFollowed(user?.uid, data.artist.name))
        }
      })
      .catch(err => {
        if (!isCancelled) setError(err.message || 'Failed to load artist catalog')
      })
      .finally(() => {
        if (!isCancelled) setLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [name, user?.uid])

  // Follow toggle handler
  const handleFollowToggle = () => {
    if (!profile?.artist) return
    const newState = toggleFollowArtist(user?.uid, profile.artist)
    setIsFollowing(newState)
    toast.success(
      newState
        ? `Added ${profile.artist.name} to your followed artists!`
        : `Removed ${profile.artist.name} from your followed artists`
    )
  }

  // Share handler
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Artist link copied to clipboard!')
    } else {
      toast.success('Link copied!')
    }
  }

  // Play whole artist catalog / top songs
  const handlePlayAll = (shuffle = false) => {
    if (!profile?.topSongs?.length) return
    let queue = [...profile.topSongs]
    if (shuffle) {
      queue.sort(() => Math.random() - 0.5)
    }
    play(queue[0], queue, 0)
  }

  // Filter songs, albums, and collabs via the dedicated in-page search bar
  const query = artistSearch.trim().toLowerCase()

  const filteredTopSongs = useMemo(() => {
    if (!profile?.topSongs) return []
    if (!query) return profile.topSongs
    return profile.topSongs.filter(
      s =>
        s.title.toLowerCase().includes(query) ||
        s.album?.toLowerCase().includes(query) ||
        s.genre?.toLowerCase().includes(query)
    )
  }, [profile?.topSongs, query])

  const filteredAlbums = useMemo(() => {
    if (!profile?.albums) return []
    if (!query) return profile.albums
    return profile.albums.filter(
      a =>
        a.title.toLowerCase().includes(query) ||
        a.year?.toString().includes(query) ||
        a.genre?.toLowerCase().includes(query)
    )
  }, [profile?.albums, query])

  const filteredNewReleases = useMemo(() => {
    if (!profile?.newReleases) return []
    if (!query) return profile.newReleases
    return profile.newReleases.filter(
      r =>
        r.title.toLowerCase().includes(query) ||
        r.album?.toLowerCase().includes(query)
    )
  }, [profile?.newReleases, query])

  const filteredUpcoming = useMemo(() => {
    if (!profile?.upcomingReleases) return []
    if (!query) return profile.upcomingReleases
    return profile.upcomingReleases.filter(
      u =>
        u.title.toLowerCase().includes(query) ||
        u.album?.toLowerCase().includes(query)
    )
  }, [profile?.upcomingReleases, query])

  const filteredCollabs = useMemo(() => {
    if (!profile?.collaborations) return []
    if (!query) return profile.collaborations
    return profile.collaborations.filter(
      c =>
        c.title.toLowerCase().includes(query) ||
        c.artist?.toLowerCase().includes(query) ||
        c.album?.toLowerCase().includes(query)
    )
  }, [profile?.collaborations, query])

  // Is current playing song by this artist?
  const isArtistTrackPlaying =
    isPlaying &&
    currentSong &&
    profile?.artist &&
    currentSong.artist?.toLowerCase().includes(profile.artist.name.toLowerCase())

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 text-center p-8 animate-fade-in">
        <div className="relative w-16 h-16">
          <div className="w-16 h-16 border-4 border-white/10 border-t-brand rounded-full animate-spin" />
          <Music className="w-6 h-6 text-brand absolute inset-0 m-auto" />
        </div>
        <p className="text-gray-400 font-medium text-sm">
          Loading {name}'s songs, albums, and discography...
        </p>
      </div>
    )
  }

  // Error Screen
  if (error || !profile) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-surface-2 flex items-center justify-center text-gray-500 mb-4 border border-white/10">
          <Disc size={36} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Artist Catalog Not Found</h2>
        <p className="text-gray-400 text-sm max-w-md mb-6">
          We couldn't retrieve the discography for "{name}". Try searching for another artist or check the spelling.
        </p>
        <button
          onClick={() => navigate('/search')}
          className="px-6 py-2.5 bg-brand hover:bg-brand-dark text-black font-bold rounded-full transition-all text-sm shadow-lg shadow-brand/20"
        >
          Back to Search
        </button>
      </div>
    )
  }

  const { artist, topSongs, albums, newReleases, upcomingReleases, collaborations } = profile
  const displayedSongs = showAllTopSongs ? filteredTopSongs : filteredTopSongs.slice(0, 5)
  const hasUpcoming = upcomingReleases && upcomingReleases.length > 0

  return (
    <div className="min-h-screen pb-28 animate-fade-in">
      {/* ── 1. Compact Artist Hero Header (No Empty Gap) ── */}
      <div className="relative w-full overflow-hidden bg-gradient-to-b from-surface-3/50 via-surface-2/30 to-surface border-b border-white/[0.06]">
        {/* Blurred ambient backdrop image */}
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-3xl scale-110 opacity-30 transition-transform duration-1000 pointer-events-none"
          style={{ backgroundImage: `url(${artist.banner || artist.picture})` }}
        />
        {/* Vignette Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/70 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-surface/90 via-surface/40 to-transparent pointer-events-none" />
        {/* Back navigation button — pinned to left top corner */}
        <div className="absolute top-4 left-4 sm:top-5 sm:left-6 z-20">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/10 hover:border-white/25 flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 shadow-lg"
            title="Back"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-3.5 sm:px-8 pt-12 sm:pt-14 md:pt-12 pb-5 sm:pb-7">
          {/* Hero Content: Avatar + Artist Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6">
            {/* Circular high-res Artist Avatar */}
            <div className="relative shrink-0 w-20 h-20 xs:w-24 xs:h-24 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-full overflow-hidden bg-surface-3 border-2 sm:border-4 border-white/15 shadow-[0_15px_35px_rgba(0,0,0,0.8)] group">
              {artist.picture ? (
                <img
                  src={artist.picture}
                  alt={artist.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-surface-3 text-gray-500">
                  <Music size={48} />
                </div>
              )}
            </div>

            {/* Artist Typography & Details */}
            <div className="flex-1 min-w-0">
              {/* Verified pill */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-[11px] sm:text-xs font-semibold text-white mb-1.5 sm:mb-2 shadow-sm">
                <CheckCircle2 size={13} className="text-brand fill-brand/20" />
                <span>Verified Artist</span>
              </div>

              {/* Artist Name */}
              <h1 className="text-xl xs:text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight truncate drop-shadow-lg leading-tight">
                {artist.name}
              </h1>

              {/* Listeners & Catalog Info */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-300 mt-1.5 sm:mt-2 font-medium">
                <span className="flex items-center gap-1.5 text-white font-semibold">
                  <Flame size={14} className="text-amber-400 shrink-0" />
                  {artist.monthlyListeners} monthly listeners
                </span>
                <span className="w-1 h-1 rounded-full bg-gray-500" />
                <span>{albums.length} Albums</span>
                <span className="w-1 h-1 rounded-full bg-gray-500" />
                <span>{topSongs.length}+ Songs</span>
                {artist.genre && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-gray-500" />
                    <span className="px-2.5 py-0.5 rounded-full bg-white/[0.08] text-white text-[11px] font-semibold border border-white/10">
                      {artist.genre}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Action Controls & Dedicated In-Page Search Bar ── */}
      <div className="px-3.5 sm:px-8 max-w-7xl mx-auto mt-4 sm:mt-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-5 sm:pb-6 border-b border-white/[0.08]">
          {/* Play, Shuffle, Follow, Share Action Buttons */}
          <div className="flex items-center flex-wrap gap-2.5 sm:gap-4 shrink-0">
            {/* Big Play / Pause Button */}
            <button
              onClick={() => (isArtistTrackPlaying ? togglePlay() : handlePlayAll(false))}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-brand hover:bg-brand-dark text-black flex items-center justify-center shadow-[0_10px_25px_rgba(29,185,84,0.4)] hover:scale-105 active:scale-95 transition-all duration-200"
              title={isArtistTrackPlaying ? 'Pause' : `Play ${artist.name}`}
            >
              {isArtistTrackPlaying ? (
                <Pause size={20} className="sm:w-6 sm:h-6" fill="black" />
              ) : (
                <Play size={20} className="sm:w-6 sm:h-6 translate-x-0.5" fill="black" />
              )}
            </button>

            {/* Shuffle Button */}
            <button
              onClick={() => handlePlayAll(true)}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-surface-2 hover:bg-surface-3 border border-white/10 hover:border-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-all hover:scale-105 active:scale-95"
              title="Shuffle Play"
            >
              <Shuffle size={17} />
            </button>

            {/* Follow / Following Toggle Button */}
            <button
              onClick={handleFollowToggle}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold border transition-all duration-200 flex items-center gap-1.5 sm:gap-2 hover:scale-105 active:scale-95 ${
                isFollowing
                  ? 'bg-brand/15 border-brand text-brand shadow-[0_0_15px_rgba(29,185,84,0.25)]'
                  : 'bg-transparent border-white/20 hover:border-white text-white'
              }`}
            >
              <Heart size={14} fill={isFollowing ? 'currentColor' : 'none'} />
              <span>{isFollowing ? 'Following' : 'Follow'}</span>
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-surface-2 hover:bg-surface-3 border border-white/10 hover:border-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-all hover:scale-105 active:scale-95"
              title="Share Artist"
            >
              <Share2 size={15} />
            </button>
          </div>

          {/* ── Dedicated In-Page Search Bar for this Artist's Catalog ── */}
          <div className="relative w-full sm:max-w-xs md:max-w-sm">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={artistSearch}
              onChange={e => setArtistSearch(e.target.value)}
              placeholder={`Search in ${artist.name}'s songs, albums...`}
              className="w-full h-11 bg-surface-2/90 hover:bg-surface-2 focus:bg-surface-3 border border-white/10 focus:border-brand rounded-full pl-10 pr-9 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none transition-all shadow-inner"
            />
            {artistSearch && (
              <button
                type="button"
                onClick={() => setArtistSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 transition-colors"
                title="Clear artist search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-4">
          {[
            { id: 'all', label: 'All Catalog' },
            { id: 'popular', label: `Popular Songs (${filteredTopSongs.length})` },
            { id: 'albums', label: `Albums & EPs (${filteredAlbums.length})` },
            { id: 'new', label: `New Releases (${filteredNewReleases.length})` },
            ...(hasUpcoming
              ? [{ id: 'upcoming', label: `Upcoming (${filteredUpcoming.length})` }]
              : []),
            { id: 'collabs', label: `Collaborations (ft.) (${filteredCollabs.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-black shadow-md'
                  : 'bg-surface-2/70 text-gray-400 hover:text-white hover:bg-surface-3'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Live Search Indicator */}
        {artistSearch && (
          <div className="flex items-center justify-between text-xs text-gray-400 py-2">
            <span>
              Showing results for <span className="text-white font-semibold">"{artistSearch}"</span> in{' '}
              {artist.name}'s catalog
            </span>
            <button
              onClick={() => setArtistSearch('')}
              className="text-brand hover:underline font-medium"
            >
              Clear filter
            </button>
          </div>
        )}
      </div>

      {/* ── 3. Main Catalog Content ── */}
      <div className="px-4 sm:px-8 max-w-7xl mx-auto mt-6 space-y-12">
        {/* ── Section: Upcoming Releases (Shown ONLY if artist has upcoming releases) ── */}
        {hasUpcoming && (activeTab === 'all' || activeTab === 'upcoming') && filteredUpcoming.length > 0 && (
          <section className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-brand" />
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Upcoming Releases
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-brand/20 text-brand text-[11px] font-bold uppercase tracking-wider">
                  Coming Soon
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUpcoming.map(item => (
                <div
                  key={item.id}
                  className="relative flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-brand/10 via-surface-2 to-surface-2 border border-brand/30 shadow-lg overflow-hidden group"
                >
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-surface-3 shrink-0 shadow-md">
                    {item.coverUrl ? (
                      <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <Disc size={28} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider text-brand mb-1">
                      {item.type === 'album' ? 'Upcoming Album' : 'Upcoming Single'}
                    </span>
                    <h3 className="text-sm font-bold text-white truncate">{item.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      Expected: {new Date(item.releaseDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Section: Latest / New Releases ── */}
        {(activeTab === 'all' || activeTab === 'new') && filteredNewReleases.length > 0 && (
          <section className="animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={20} className="text-amber-400" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                New Releases & Latest Music
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredNewReleases.slice(0, 4).map(item => (
                <div
                  key={item.id}
                  className="group relative p-3.5 rounded-2xl bg-surface-2/60 hover:bg-surface-3/80 border border-white/5 hover:border-white/15 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex items-center gap-3.5"
                >
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-surface-3 shrink-0 shadow-md">
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {item.audioUrl && (
                      <button
                        onClick={() => play(item, filteredNewReleases, 0)}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Play"
                      >
                        <Play size={18} fill="white" className="text-white translate-x-0.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                      Latest Release
                    </span>
                    <h3 className="text-sm font-bold text-white truncate group-hover:text-brand transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {item.releaseDate ? new Date(item.releaseDate).getFullYear() : 'Single'} · {item.genre || 'Music'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Section: Popular Songs ── */}
        {(activeTab === 'all' || activeTab === 'popular') && (
          <section className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Popular Songs
              </h2>
              {filteredTopSongs.length > 5 && activeTab === 'all' && (
                <button
                  onClick={() => setShowAllTopSongs(!showAllTopSongs)}
                  className="text-xs sm:text-sm font-bold text-gray-400 hover:text-white transition-colors"
                >
                  {showAllTopSongs ? 'Show Less' : `See All (${filteredTopSongs.length})`}
                </button>
              )}
            </div>

            {filteredTopSongs.length === 0 ? (
              <div className="py-8 text-center text-gray-500 bg-surface-2/40 rounded-2xl border border-white/5">
                <Music size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No songs matched your search "{artistSearch}"</p>
              </div>
            ) : (
              <div className="space-y-1">
                {displayedSongs.map((song, idx) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    index={idx}
                    queue={filteredTopSongs}
                    showIndex
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Section: Albums & EPs ── */}
        {(activeTab === 'all' || activeTab === 'albums') && (
          <section className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Disc size={20} className="text-brand" />
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Albums & Discography
                </h2>
              </div>
              <span className="text-xs text-gray-400 font-medium">
                {filteredAlbums.length} {filteredAlbums.length === 1 ? 'Album' : 'Albums'}
              </span>
            </div>

            {filteredAlbums.length === 0 ? (
              <div className="py-8 text-center text-gray-500 bg-surface-2/40 rounded-2xl border border-white/5">
                <Disc size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No albums found matching "{artistSearch}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredAlbums.map(album => (
                  <div
                    key={album.id}
                    onClick={() => setSelectedAlbum(album)}
                    className="group relative flex flex-col p-3 rounded-2xl bg-surface-2/50 hover:bg-surface-3/80 border border-white/5 hover:border-white/15 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                  >
                    {/* Album Art with Hover Play */}
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-surface-3 mb-3 shadow-md">
                      <img
                        src={album.coverUrl}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-brand text-black flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                          <Play size={16} fill="black" className="translate-x-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Album Info */}
                    <h3 className="text-sm font-bold text-white truncate group-hover:text-brand transition-colors">
                      {album.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {album.year} · Album
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Section: Collaborations / Features ("ft. with other artists") ── */}
        {(activeTab === 'all' || activeTab === 'collabs') && filteredCollabs.length > 0 && (
          <section className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={20} className="text-purple-400" />
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Collaborations & Features
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-bold">
                  Feat.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCollabs.map(collab => (
                <div
                  key={collab.id}
                  onClick={() => play(collab, filteredCollabs, 0)}
                  className="group relative flex items-center gap-3 p-3 rounded-2xl bg-surface-2/60 hover:bg-surface-3/90 border border-white/5 hover:border-purple-500/30 cursor-pointer transition-all duration-200 hover:shadow-lg"
                >
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-surface-3 shrink-0 shadow-md">
                    <img
                      src={collab.coverUrl}
                      alt={collab.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play size={16} fill="white" className="text-white translate-x-0.5" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="inline-block px-1.5 py-0.2 bg-purple-500/20 rounded text-[9px] font-extrabold uppercase text-purple-300 mb-0.5">
                      Collaboration
                    </div>
                    <h3 className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                      {collab.title}
                    </h3>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {collab.artist}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Section: About The Artist ── */}
        <section className="pt-8 border-t border-white/[0.08] animate-fade-in">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-4">
            About {artist.name}
          </h2>
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-surface-2 via-surface-2/80 to-surface-1 border border-white/10 p-6 sm:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 shadow-xl">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden bg-surface-3 shrink-0 border border-white/10 shadow-lg">
              <img
                src={artist.picture}
                alt={artist.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <h3 className="text-2xl font-black text-white">{artist.name}</h3>
                <CheckCircle2 size={18} className="text-brand shrink-0" />
              </div>
              <p className="text-sm text-gray-300 leading-relaxed max-w-2xl mb-4">
                {artist.name} is a renowned {artist.genre || 'recording'} artist with over{' '}
                <span className="text-white font-bold">{artist.monthlyListeners}</span> monthly listeners on
                SoundWave. Explore all official releases, studio albums, hit collaborations, and upcoming music
                above.
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <span className="px-3 py-1 bg-white/[0.06] border border-white/10 rounded-full text-xs font-semibold text-gray-300">
                  {albums.length} Official Albums
                </span>
                <span className="px-3 py-1 bg-white/[0.06] border border-white/10 rounded-full text-xs font-semibold text-gray-300">
                  {collaborations.length} Collabs
                </span>
                <span className="px-3 py-1 bg-brand/10 border border-brand/30 rounded-full text-xs font-semibold text-brand">
                  Verified Streaming Catalog
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Album Detail Modal ── */}
      {selectedAlbum && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedAlbum(null)}
        >
          <div
            className="relative w-full max-w-lg bg-[#141419] border border-white/10 rounded-3xl p-6 shadow-2xl animate-pop-in"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedAlbum(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-5 mb-6">
              <img
                src={selectedAlbum.coverUrl}
                alt={selectedAlbum.title}
                className="w-24 h-24 rounded-2xl object-cover shadow-xl border border-white/10"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                  Album Release
                </span>
                <h3 className="text-xl font-black text-white truncate mt-0.5">
                  {selectedAlbum.title}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {selectedAlbum.artist} · {selectedAlbum.year}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedAlbum.trackCount} tracks · {selectedAlbum.genre}
                </p>
              </div>
            </div>

            {/* Quick Action in Modal */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/[0.08]">
              <button
                onClick={() => {
                  // Find songs belonging to this album or play artist top songs
                  const albumTracks = topSongs.filter(
                    s => s.album?.toLowerCase() === selectedAlbum.title?.toLowerCase()
                  )
                  if (albumTracks.length > 0) {
                    play(albumTracks[0], albumTracks, 0)
                  } else {
                    handlePlayAll(false)
                  }
                  setSelectedAlbum(null)
                }}
                className="flex-1 h-11 bg-brand hover:bg-brand-dark text-black font-extrabold rounded-full flex items-center justify-center gap-2 shadow-lg shadow-brand/30 transition-all text-sm"
              >
                <Play size={16} fill="black" />
                <span>Play Album</span>
              </button>

              {selectedAlbum.viewUrl && (
                <a
                  href={selectedAlbum.viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 h-11 bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 text-white rounded-full flex items-center justify-center text-xs font-semibold transition-colors"
                >
                  View on Apple Music
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
