import { useState } from 'react'
import { Sun, Coffee, Zap, Moon, Heart, Brain, Headphones, Music } from 'lucide-react'
import { getMoodPlaylist } from '../services/recommendationService'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import toast from 'react-hot-toast'

const MOODS = [
  { 
    id: 'energetic', 
    name: 'Energetic', 
    icon: Zap, 
    color: 'from-yellow-500 to-orange-600',
    description: 'High energy, workout vibes',
    keywords: ['rock', 'electronic', 'dance', 'upbeat']
  },
  { 
    id: 'focus', 
    name: 'Focus', 
    icon: Brain, 
    color: 'from-blue-500 to-indigo-600',
    description: 'Concentration and productivity',
    keywords: ['classical', 'instrumental', 'ambient', 'jazz']
  },
  { 
    id: 'happy', 
    name: 'Happy', 
    icon: Sun, 
    color: 'from-pink-500 to-rose-600',
    description: 'Uplifting and positive vibes',
    keywords: ['pop', 'dance', 'upbeat', 'cheerful']
  },
  { 
    id: 'chill', 
    name: 'Chill', 
    icon: Coffee, 
    color: 'from-green-500 to-teal-600',
    description: 'Relaxed and mellow',
    keywords: ['indie', 'acoustic', 'mellow', 'folk']
  },
  { 
    id: 'romantic', 
    name: 'Romantic', 
    icon: Heart, 
    color: 'from-red-500 to-pink-600',
    description: 'Love songs and ballads',
    keywords: ['love', 'ballad', 'romantic', 'slow']
  },
  { 
    id: 'ambient', 
    name: 'Sleep', 
    icon: Moon, 
    color: 'from-purple-500 to-indigo-600',
    description: 'Peaceful and calming',
    keywords: ['ambient', 'classical', 'peaceful', 'instrumental']
  }
]

export default function MoodSelector({ onClose }) {
  const { user } = useAuth()
  const { play } = usePlayer()
  const [loading, setLoading] = useState(null)

  const handleMoodSelect = async (mood) => {
    if (!user) {
      toast.error('Please sign in to get mood-based recommendations')
      return
    }

    setLoading(mood.id)
    try {
      console.log('🎵 Getting mood playlist for:', mood.name)
      const playlist = await getMoodPlaylist(user.uid, mood.id, 25)
      
      console.log('📋 Playlist result:', playlist)
      
      if (playlist && playlist.songs && playlist.songs.length > 0) {
        console.log('✅ Found', playlist.songs.length, 'songs for mood:', mood.name)
        play(playlist.songs[0], playlist.songs, 0)
        toast.success(`🎵 Playing ${mood.name} mix - ${playlist.songs.length} songs`)
        onClose()
      } else {
        console.warn('⚠️ No songs found for mood:', mood.name, 'trying direct API fallback...')
        
        // Direct fallback - try searching the music API directly
        try {
          console.log('🔄 Trying direct music API search...')
          const { searchAll } = await import('../services/musicApi')
          
          // Try mood-specific searches first
          const moodSearches = mood.keywords || ['music']
          let foundSongs = []
          
          for (const keyword of moodSearches) {
            console.log(`🔍 Direct search for: "${keyword}"`)
            const result = await searchAll(keyword)
            
            if (result.jamendo?.length > 0) {
              foundSongs.push(...result.jamendo.slice(0, 10))
            }
            if (result.itunes?.length > 0) {
              foundSongs.push(...result.itunes.slice(0, 8))
            }
            
            if (foundSongs.length >= 15) break
          }
          
          // If still no results, try very broad searches
          if (foundSongs.length === 0) {
            console.log('🔄 Trying very broad searches...')
            const broadSearches = ['popular', 'music', 'hits', 'best', 'top', 'trending']
            
            for (const search of broadSearches) {
              console.log(`🔍 Broad search for: "${search}"`)
              const result = await searchAll(search)
              
              if (result.jamendo?.length > 0) {
                foundSongs.push(...result.jamendo.slice(0, 12))
              }
              if (result.itunes?.length > 0) {
                foundSongs.push(...result.itunes.slice(0, 8))
              }
              
              if (foundSongs.length > 0) break
            }
          }
          
          if (foundSongs.length > 0) {
            console.log('✅ Direct search found', foundSongs.length, 'songs')
            // Remove duplicates
            const uniqueSongs = foundSongs.filter((song, index, self) => 
              index === self.findIndex(s => s.id === song.id)
            )
            
            play(uniqueSongs[0], uniqueSongs, 0)
            toast.success(`🎵 Playing music mix - ${uniqueSongs.length} songs`)
            onClose()
            return
          }
          
          // Last resort - show helpful error
          console.error('🚨 All search attempts failed')
          toast.error('No music available right now. Please check your internet connection and try again.')
          
        } catch (fallbackError) {
          console.error('💥 Direct API fallback failed:', fallbackError)
          toast.error('Unable to load music. Please check your connection and try again.')
        }
      }
    } catch (error) {
      console.error('💥 Error getting mood playlist:', error)
      toast.error('Failed to load mood playlist. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  // Auto-detect mood based on time of day
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#121212] rounded-2xl border border-white/10 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">What's your mood?</h2>
            <p className="text-gray-400 text-sm mt-1">Get personalized music for how you're feeling</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Auto-suggested mood */}
        <div className="mb-6 p-4 bg-gradient-to-r from-brand/20 to-brand/10 rounded-xl border border-brand/30">
          <div className="flex items-center gap-3 mb-2">
            <autoMood.icon size={20} className="text-brand" />
            <span className="text-sm font-medium text-brand">Suggested for now</span>
          </div>
          <button
            onClick={() => handleMoodSelect(autoMood)}
            disabled={loading === autoMood.id}
            className="flex items-center gap-3 w-full text-left hover:bg-white/5 p-2 rounded-lg transition-colors"
          >
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${autoMood.color} flex items-center justify-center`}>
              {loading === autoMood.id ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <autoMood.icon size={20} className="text-white" />
              )}
            </div>
            <div>
              <p className="font-semibold">{autoMood.name}</p>
              <p className="text-xs text-gray-400">{autoMood.description}</p>
            </div>
          </button>
        </div>

        {/* All moods grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {MOODS.map((mood) => (
            <button
              key={mood.id}
              onClick={() => handleMoodSelect(mood)}
              disabled={loading === mood.id}
              className="group relative overflow-hidden rounded-xl p-4 text-left transition-all hover:scale-105 disabled:scale-100 disabled:opacity-50"
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${mood.color} opacity-80 group-hover:opacity-100 transition-opacity`} />
              
              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  {loading === mood.id ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <mood.icon size={24} className="text-white" />
                  )}
                  <Music size={16} className="text-white/60" />
                </div>
                <h3 className="font-bold text-white mb-1">{mood.name}</h3>
                <p className="text-xs text-white/80 leading-tight">{mood.description}</p>
              </div>

              {/* Hover effect */}
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="text-center mb-3">
            <p className="text-xs text-gray-500">
              Mood detection uses time of day and your listening history to suggest the perfect music
            </p>
          </div>
          
          {/* Debug button for testing */}
          <div className="flex justify-center gap-2">
            <button
              onClick={async () => {
                console.log('🧪 Debug: Testing music API connectivity...')
                if (window.testAPIConnectivity) {
                  await window.testAPIConnectivity()
                }
                if (window.testMusicAPI) {
                  await window.testMusicAPI('rock')
                }
                console.log('🧪 Debug: Check console for results')
                toast.success('Debug tests running - check console')
              }}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors px-3 py-1 rounded-full border border-gray-700 hover:border-gray-600"
            >
              🧪 Debug API
            </button>
            
            <button
              onClick={async () => {
                console.log('🧪 Debug: Testing simple music search...')
                try {
                  const { searchAll } = await import('../services/musicApi')
                  const result = await searchAll('music')
                  console.log('🧪 Simple search result:', result)
                  
                  if (result.all.length > 0) {
                    console.log('✅ Found songs, trying to play...')
                    play(result.all[0], result.all, 0)
                    toast.success(`🎵 Playing test song - ${result.all.length} total`)
                    onClose()
                  } else {
                    toast.error('No songs found in test search')
                  }
                } catch (error) {
                  console.error('🧪 Simple search failed:', error)
                  toast.error('Test search failed - check console')
                }
              }}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors px-3 py-1 rounded-full border border-gray-700 hover:border-gray-600"
            >
              🎵 Test Play
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}