import { getUser } from './userService'
import { getSongById } from './songService'
import { searchAll } from './musicApi'

// Simple recommendation engine based on user listening patterns
export class RecommendationEngine {
  constructor() {
    this.weights = {
      genre: 0.3,
      artist: 0.25,
      recentlyPlayed: 0.2,
      favorites: 0.15,
      timeOfDay: 0.1
    }
  }

  // Get user's music profile
  async getUserProfile(userId) {
    try {
      const user = await getUser(userId)
      const recentSongs = await Promise.all(
        (user.recentlyPlayed || []).slice(0, 50).map(id => getSongById(id))
      )
      const favoriteSongs = await Promise.all(
        (user.favoriteSongs || []).slice(0, 30).map(id => getSongById(id))
      )

      // Analyze listening patterns
      const genres = this.extractGenres([...recentSongs, ...favoriteSongs])
      const artists = this.extractArtists([...recentSongs, ...favoriteSongs])
      const listeningTimes = this.analyzeListeningTimes(user.listeningHistory || [])

      return {
        genres,
        artists,
        listeningTimes,
        recentSongs: recentSongs.filter(Boolean),
        favoriteSongs: favoriteSongs.filter(Boolean)
      }
    } catch (error) {
      console.error('Error getting user profile:', error)
      return null
    }
  }

  // Extract genre preferences with weights
  extractGenres(songs) {
    const genreCount = {}
    songs.forEach(song => {
      if (song?.genre) {
        genreCount[song.genre] = (genreCount[song.genre] || 0) + 1
      }
    })
    
    // Convert to weighted preferences
    const total = Object.values(genreCount).reduce((a, b) => a + b, 0)
    const genres = {}
    Object.entries(genreCount).forEach(([genre, count]) => {
      genres[genre] = count / total
    })
    
    return Object.entries(genres)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .reduce((acc, [genre, weight]) => ({ ...acc, [genre]: weight }), {})
  }

  // Extract artist preferences
  extractArtists(songs) {
    const artistCount = {}
    songs.forEach(song => {
      if (song?.artist) {
        artistCount[song.artist] = (artistCount[song.artist] || 0) + 1
      }
    })
    
    return Object.entries(artistCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .reduce((acc, [artist, count]) => ({ ...acc, [artist]: count }), {})
  }

  // Analyze listening times to suggest mood-based music
  analyzeListeningTimes(history) {
    const timeSlots = {
      morning: 0,   // 6-12
      afternoon: 0, // 12-18
      evening: 0,   // 18-22
      night: 0      // 22-6
    }

    history.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours()
      if (hour >= 6 && hour < 12) timeSlots.morning++
      else if (hour >= 12 && hour < 18) timeSlots.afternoon++
      else if (hour >= 18 && hour < 22) timeSlots.evening++
      else timeSlots.night++
    })

    return timeSlots
  }

  // Get current time-based mood
  getCurrentMood() {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 10) return 'energetic' // Morning energy
    if (hour >= 10 && hour < 14) return 'focus' // Work focus
    if (hour >= 14 && hour < 18) return 'upbeat' // Afternoon boost
    if (hour >= 18 && hour < 22) return 'chill' // Evening wind-down
    return 'ambient' // Night relaxation
  }

  // Generate recommendations based on user profile
  async generateRecommendations(userId, limit = 20) {
    try {
      const profile = await getUserProfile(userId)
      if (!profile) return []

      const recommendations = []
      const mood = this.getCurrentMood()

      // Get recommendations based on top genres
      for (const [genre, weight] of Object.entries(profile.genres)) {
        const genreRecommendations = await this.getGenreRecommendations(genre, Math.ceil(limit * weight))
        recommendations.push(...genreRecommendations)
      }

      // Get recommendations based on favorite artists
      for (const [artist, count] of Object.entries(profile.artists).slice(0, 3)) {
        const artistRecommendations = await this.getArtistRecommendations(artist, 3)
        recommendations.push(...artistRecommendations)
      }

      // Add mood-based recommendations
      const moodRecommendations = await this.getMoodRecommendations(mood, 5)
      recommendations.push(...moodRecommendations)

      // Remove duplicates and songs user already has
      const uniqueRecommendations = this.removeDuplicates(recommendations, profile)
      
      // Score and sort recommendations
      const scoredRecommendations = this.scoreRecommendations(uniqueRecommendations, profile)
      
      return scoredRecommendations.slice(0, limit)
    } catch (error) {
      console.error('Error generating recommendations:', error)
      return []
    }
  }

  // Get recommendations for a specific genre
  async getGenreRecommendations(genre, limit) {
    try {
      const { jamendo } = await searchAll(genre)
      return jamendo.slice(0, limit)
    } catch (error) {
      console.error('Error getting genre recommendations:', error)
      return []
    }
  }

  // Get recommendations for a specific artist
  async getArtistRecommendations(artist, limit) {
    try {
      const { all } = await searchAll(artist)
      return all.slice(0, limit)
    } catch (error) {
      console.error('Error getting artist recommendations:', error)
      return []
    }
  }

  // Get mood-based recommendations
  async getMoodRecommendations(mood, limit) {
    const moodQueries = {
      energetic: ['rock', 'electronic', 'dance', 'pop', 'upbeat'],
      focus: ['classical', 'instrumental', 'ambient', 'jazz'],
      happy: ['pop', 'dance', 'upbeat', 'cheerful'],
      chill: ['indie', 'acoustic', 'mellow', 'folk'],
      romantic: ['love', 'ballad', 'romantic', 'slow'],
      ambient: ['ambient', 'classical', 'peaceful', 'instrumental']
    }

    try {
      console.log(`🎵 Getting mood recommendations for: ${mood}, limit: ${limit}`)
      const queries = moodQueries[mood] || moodQueries.chill
      let allSongs = []
      
      // Try multiple queries to get more results
      for (const query of queries) {
        try {
          console.log(`🔍 Searching for: "${query}"`)
          const searchResult = await searchAll(query)
          console.log(`📊 Search result for "${query}":`, {
            jamendo: searchResult.jamendo?.length || 0,
            itunes: searchResult.itunes?.length || 0
          })
          
          if (searchResult.jamendo?.length > 0) {
            allSongs.push(...searchResult.jamendo.slice(0, 8))
          }
          if (searchResult.itunes?.length > 0) {
            allSongs.push(...searchResult.itunes.slice(0, 5))
          }
          
          // If we have enough songs, break early
          if (allSongs.length >= limit * 2) {
            console.log(`✅ Got enough songs (${allSongs.length}), breaking early`)
            break
          }
        } catch (error) {
          console.warn(`❌ Failed to search for "${query}":`, error)
          continue
        }
      }
      
      // If still no results, try broader searches with more fallbacks
      if (allSongs.length === 0) {
        console.log('⚠️ No results from mood queries, trying broader searches...')
        const fallbackQueries = ['music', 'popular', 'hits', 'trending', 'best', 'top']
        
        for (const fallbackQuery of fallbackQueries) {
          try {
            console.log(`🔍 Fallback search for: "${fallbackQuery}"`)
            const searchResult = await searchAll(fallbackQuery)
            console.log(`📊 Fallback result for "${fallbackQuery}":`, {
              jamendo: searchResult.jamendo?.length || 0,
              itunes: searchResult.itunes?.length || 0
            })
            
            if (searchResult.jamendo?.length > 0) {
              allSongs.push(...searchResult.jamendo.slice(0, 15))
            }
            if (searchResult.itunes?.length > 0) {
              allSongs.push(...searchResult.itunes.slice(0, 10))
            }
            
            if (allSongs.length > 0) {
              console.log(`✅ Fallback search successful with ${allSongs.length} songs`)
              break
            }
          } catch (error) {
            console.error(`❌ Fallback search failed for "${fallbackQuery}":`, error)
            continue
          }
        }
      }
      
      // Remove duplicates and shuffle
      const uniqueSongs = this.removeDuplicatesSimple(allSongs)
      const shuffled = this.shuffleArray(uniqueSongs)
      
      console.log(`🎯 Final result: ${shuffled.length} unique songs for mood: ${mood}`)
      
      if (shuffled.length === 0) {
        console.error('🚨 No songs found after all attempts!')
      }
      
      return shuffled.slice(0, limit)
    } catch (error) {
      console.error('💥 Error getting mood recommendations:', error)
      return []
    }
  }

  // Remove duplicates and already known songs
  removeDuplicates(recommendations, profile) {
    const knownIds = new Set([
      ...profile.recentSongs.map(s => s.id),
      ...profile.favoriteSongs.map(s => s.id)
    ])

    const seen = new Set()
    return recommendations.filter(song => {
      if (!song || knownIds.has(song.id) || seen.has(song.id)) return false
      seen.add(song.id)
      return true
    })
  }

  // Simple duplicate removal without profile check
  removeDuplicatesSimple(songs) {
    const seen = new Set()
    return songs.filter(song => {
      if (!song || !song.id || seen.has(song.id)) return false
      seen.add(song.id)
      return true
    })
  }

  // Shuffle array
  shuffleArray(array) {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Score recommendations based on user preferences
  scoreRecommendations(recommendations, profile) {
    return recommendations.map(song => {
      let score = 0

      // Genre match
      if (song.genre && profile.genres[song.genre]) {
        score += profile.genres[song.genre] * this.weights.genre
      }

      // Artist match
      if (song.artist && profile.artists[song.artist]) {
        score += (profile.artists[song.artist] / 10) * this.weights.artist
      }

      // Time-based bonus
      const mood = this.getCurrentMood()
      if (this.songMatchesMood(song, mood)) {
        score += this.weights.timeOfDay
      }

      return { ...song, recommendationScore: score }
    }).sort((a, b) => b.recommendationScore - a.recommendationScore)
  }

  // Check if song matches current mood
  songMatchesMood(song, mood) {
    const moodKeywords = {
      energetic: ['upbeat', 'energy', 'fast', 'rock', 'electronic'],
      focus: ['instrumental', 'ambient', 'classical', 'minimal'],
      upbeat: ['happy', 'pop', 'dance', 'positive'],
      chill: ['chill', 'mellow', 'acoustic', 'indie'],
      ambient: ['ambient', 'peaceful', 'calm', 'meditation']
    }

    const keywords = moodKeywords[mood] || []
    const songText = `${song.title} ${song.genre} ${song.artist}`.toLowerCase()
    
    return keywords.some(keyword => songText.includes(keyword))
  }

  // Generate a "Discover Weekly" style playlist
  async generateDiscoverWeekly(userId) {
    const recommendations = await this.generateRecommendations(userId, 30)
    return {
      id: `discover_weekly_${Date.now()}`,
      name: 'Discover Weekly',
      description: 'Your weekly mix of fresh discoveries',
      songs: recommendations,
      createdAt: new Date().toISOString(),
      type: 'auto-generated'
    }
  }

  // Generate mood-based playlists
  async generateMoodPlaylist(userId, mood, limit = 25) {
    console.log('🎭 Generating mood playlist for:', mood, 'limit:', limit)
    
    try {
      // Get mood songs directly without requiring user profile
      console.log('🎵 Getting mood recommendations...')
      const moodSongs = await this.getMoodRecommendations(mood, limit)
      console.log('🎵 Mood recommendations result:', moodSongs?.length || 0, 'songs')
      
      if (moodSongs.length === 0) {
        console.warn('⚠️ No mood songs found, trying emergency fallback...')
        
        // Emergency fallback - try to get ANY songs
        try {
          console.log('🚨 Emergency fallback: importing searchAll directly...')
          const { searchAll } = await import('./musicApi')
          
          // Try the most basic searches
          const emergencyQueries = ['music', 'song', 'audio', 'track']
          let emergencySongs = []
          
          for (const query of emergencyQueries) {
            console.log(`🚨 Emergency search: "${query}"`)
            const result = await searchAll(query)
            
            if (result.jamendo?.length > 0) {
              emergencySongs.push(...result.jamendo.slice(0, 10))
            }
            if (result.itunes?.length > 0) {
              emergencySongs.push(...result.itunes.slice(0, 5))
            }
            
            if (emergencySongs.length >= 10) break
          }
          
          if (emergencySongs.length > 0) {
            console.log('🚨 Emergency fallback successful:', emergencySongs.length, 'songs')
            return {
              id: `emergency_${mood}_${Date.now()}`,
              name: `Music Mix`,
              description: `A mix of available songs`,
              songs: emergencySongs.slice(0, limit),
              createdAt: new Date().toISOString(),
              type: 'emergency-fallback',
              mood
            }
          }
        } catch (emergencyError) {
          console.error('🚨 Emergency fallback failed:', emergencyError)
        }
        
        // If we still have no songs, return null
        console.error('💥 All attempts failed - no songs available')
        return null
      }
      
      const playlist = {
        id: `mood_${mood}_${Date.now()}`,
        name: `${mood.charAt(0).toUpperCase() + mood.slice(1)} Mix`,
        description: `Perfect for your ${mood} mood`,
        songs: moodSongs,
        createdAt: new Date().toISOString(),
        type: 'mood-based',
        mood
      }
      
      console.log('✅ Generated mood playlist:', playlist.name, 'with', playlist.songs.length, 'songs')
      return playlist
      
    } catch (error) {
      console.error('💥 Error generating mood playlist:', error)
      return null
    }
  }
}

// Export singleton instance
export const recommendationEngine = new RecommendationEngine()

// Test function for browser console
window.testRecommendationEngine = recommendationEngine

// Convenience functions with better error handling
export const getRecommendations = async (userId, limit) => {
  try {
    return await recommendationEngine.generateRecommendations(userId, limit)
  } catch (error) {
    console.error('Error getting recommendations:', error)
    return []
  }
}

export const getDiscoverWeekly = async (userId) => {
  try {
    return await recommendationEngine.generateDiscoverWeekly(userId)
  } catch (error) {
    console.error('Error getting discover weekly:', error)
    return null
  }
}

export const getMoodPlaylist = async (userId, mood, limit) => {
  try {
    console.log('getMoodPlaylist called with:', { userId, mood, limit })
    const result = await recommendationEngine.generateMoodPlaylist(userId, mood, limit)
    console.log('getMoodPlaylist result:', result)
    return result
  } catch (error) {
    console.error('Error getting mood playlist:', error)
    return null
  }
}