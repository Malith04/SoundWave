import { useState } from 'react'
import { Sun, Coffee, Zap, Moon, Heart, Brain, Headphones, Music, Sparkles, X, Play } from 'lucide-react'
import { getMoodPlaylist } from '../services/recommendationService'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import toast from 'react-hot-toast'

const MOODS = [
  { 
    id: 'energetic', 
    name: 'Energetic', 
    icon: Zap, 
    color: 'from-amber-500 to-orange-600',
    description: 'High energy, workout & hype vibes',
    keywords: ['rock', 'electronic', 'dance', 'upbeat']
  },
  { 
    id: 'focus', 
    name: 'Focus', 
    icon: Brain, 
    color: 'from-blue-500 to-indigo-600',
    description: 'Deep concentration & productivity',
    keywords: ['classical', 'instrumental', 'ambient', 'jazz']
  },
  { 
    id: 'happy', 
    name: 'Happy', 
    icon: Sun, 
    color: 'from-pink-500 to-rose-600',
    description: 'Uplifting and cheerful anthems',
    keywords: ['pop', 'dance', 'upbeat', 'cheerful']
  },
  { 
    id: 'chill', 
    name: 'Chill', 
    icon: Coffee, 
    color: 'from-emerald-500 to-teal-600',
    description: 'Relaxed, mellow indie & acoustic',
    keywords: ['indie', 'acoustic', 'mellow', 'folk']
  },
  { 
    id: 'romantic', 
    name: 'Romantic', 
    icon: Heart, 
    color: 'from-red-500 to-pink-600',
    description: 'Love ballads & soulful melodies',
    keywords: ['love', 'ballad', 'romantic', 'slow']
  },
  { 
    id: 'ambient', 
    name: 'Sleep', 
    icon: Moon, 
    color: 'from-purple-500 to-indigo-700',
    description: 'Peaceful, calming sleep soundscapes',
    keywords: ['ambient', 'classical', 'peaceful', 'instrumental']
  }
]

export default function MoodSelector({ onClose }) {
  const { user } = useAuth()
  const { play } = usePlayer()
  const [loading, setLoading] = useState(null)

  const handleMoodSelect = async (mood) => {
    setLoading(mood.id)
    try {
      const playlist = await getMoodPlaylist(user?.uid || 'guest', mood.id, 25)
      
      if (playlist?.songs?.length > 0) {
        play(playlist.songs[0], playlist.songs, 0)
        toast.success(`Playing ${mood.name} mix (${playlist.songs.length} tracks)`)
        onClose()
      } else {
        // Direct search fallback
        try {
          const { searchAll } = await import('../services/musicApi')
          const moodSearches = mood.keywords || ['music']
          let foundSongs = []
          
          for (const keyword of moodSearches) {
            const result = await searchAll(keyword)
            if (result.jamendo?.length > 0) {
              foundSongs.push(...result.jamendo.slice(0, 10))
            }
            if (foundSongs.length >= 10) break
          }
          
          if (foundSongs.length > 0) {
            play(foundSongs[0], foundSongs, 0)
            toast.success(`Playing ${mood.name} tracks (${foundSongs.length} songs)`)
            onClose()
          } else {
            toast.error(`No songs found for ${mood.name} mood`)
          }
        } catch {
          toast.error('Could not connect to music service')
        }
      }
    } catch {
      toast.error('Failed to generate mood playlist')
    } finally {
      setLoading(null)
    }
  }

  const getAutoMood = () => {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 10) return MOODS.find(m => m.id === 'energetic')
    if (hour >= 10 && hour < 14) return MOODS.find(m => m.id === 'focus')
    if (hour >= 14 && hour < 18) return MOODS.find(m => m.id === 'happy')
    if (hour >= 18 && hour < 22) return MOODS.find(m => m.id === 'chill')
    return MOODS.find(m => m.id === 'ambient')
  }

  const autoMood = getAutoMood()

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[300] flex items-center justify-center p-3 sm:p-5 animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative glass-modal rounded-3xl border border-white/15 p-5 sm:p-8 max-w-2xl w-full max-h-[88vh] overflow-y-auto shadow-2xl animate-pop-in">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand/15 text-brand text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles size={12} />
              AI Music Matcher
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
              What's your mood?
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
              Personalized algorithmic selection tailored to how you feel
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
            aria-label="Close mood selector"
          >
            <X size={18} />
          </button>
        </div>

        {/* Suggested For Current Time Hero */}
        <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-brand/20 via-emerald-600/10 to-transparent rounded-2xl border border-brand/30 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-brand animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-brand">Suggested for right now</span>
          </div>
          <button
            onClick={() => handleMoodSelect(autoMood)}
            disabled={loading === autoMood.id}
            className="flex items-center justify-between w-full text-left hover:bg-white/5 p-3 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${autoMood.color} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0`}>
                {loading === autoMood.id ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <autoMood.icon size={24} className="text-white" />
                )}
              </div>
              <div>
                <p className="font-extrabold text-base text-white font-display flex items-center gap-2">
                  <span>{autoMood.name} Mix</span>
                  <span className="text-[10px] bg-brand text-black px-2 py-0.5 rounded-full font-bold">BEST MATCH</span>
                </p>
                <p className="text-xs text-gray-300 mt-0.5">{autoMood.description}</p>
              </div>
            </div>

            <div className="w-10 h-10 rounded-full bg-brand text-black flex items-center justify-center shadow-md group-hover:scale-110 active:scale-95 transition-all shrink-0 ml-2">
              <Play size={16} fill="black" className="ml-0.5" />
            </div>
          </button>
        </div>

        {/* All Moods Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {MOODS.map((mood) => (
            <button
              key={mood.id}
              onClick={() => handleMoodSelect(mood)}
              disabled={loading === mood.id}
              className="group relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 border border-white/10 active:scale-95 disabled:scale-100 disabled:opacity-50"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${mood.color} opacity-80 group-hover:opacity-100 transition-opacity`} />
              
              <div className="relative z-10 flex flex-col h-28 justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                    {loading === mood.id ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <mood.icon size={20} className="text-white" />
                    )}
                  </div>
                  <Play size={13} fill="white" className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white font-display">{mood.name}</h3>
                  <p className="text-[11px] text-white/80 line-clamp-1 mt-0.5">{mood.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-white/10 text-center text-xs text-gray-500">
          SoundWave recommendation engine utilizes dynamic listening patterns and tempo-matching algorithms
        </div>
      </div>
    </div>
  )
}