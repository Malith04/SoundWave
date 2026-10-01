import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  Sparkles, Music2, ArrowRight, ArrowLeft, Check, Calendar, 
  User, Zap, Brain, Coffee, Moon, Flame, Disc3, Headphones
} from 'lucide-react'
import toast from 'react-hot-toast'
import CustomDatePicker from '../components/CustomDatePicker'

const GENRE_OPTIONS = [
  { id: 'pop',        name: 'Pop',         emoji: '🎤', color: 'from-pink-500 to-rose-600' },
  { id: 'rock',       name: 'Rock',        emoji: '🎸', color: 'from-red-600 to-amber-700' },
  { id: 'hiphop',     name: 'Hip-Hop',     emoji: '🎧', color: 'from-amber-500 to-orange-600' },
  { id: 'electronic', name: 'Electronic',  emoji: '🎛️', color: 'from-purple-600 to-indigo-600' },
  { id: 'rnb',        name: 'R&B / Soul',  emoji: '🎹', color: 'from-fuchsia-600 to-pink-700' },
  { id: 'jazz',       name: 'Jazz',        emoji: '🎷', color: 'from-amber-600 to-stone-700' },
  { id: 'classical',  name: 'Classical',   emoji: '🎻', color: 'from-emerald-600 to-teal-800' },
  { id: 'chill',      name: 'Chill / Lo-Fi', emoji: '🌊', color: 'from-cyan-500 to-blue-700' },
  { id: 'indie',      name: 'Indie & Alt', emoji: '🪕', color: 'from-lime-500 to-emerald-700' },
  { id: 'latin',      name: 'Latin',       emoji: '💃', color: 'from-orange-500 to-red-600' },
  { id: 'metal',      name: 'Metal',       emoji: '⚡', color: 'from-zinc-600 to-zinc-900' },
  { id: 'ambient',    name: 'Ambient',     emoji: '🧘', color: 'from-blue-600 to-indigo-900' },
]

const VIBE_OPTIONS = [
  { id: 'energy', name: 'High Energy',  desc: 'Workouts, runs & hype sessions',  icon: Zap,    gradient: 'from-amber-500 to-orange-600' },
  { id: 'focus',  name: 'Deep Focus',   desc: 'Studying, coding & flow state',  icon: Brain,  gradient: 'from-blue-500 to-indigo-600' },
  { id: 'chill',  name: 'Chill & Relax',desc: 'Coffee breaks & mellow evenings', icon: Coffee, gradient: 'from-emerald-500 to-teal-600' },
  { id: 'night',  name: 'Late Night',   desc: 'Calm ambient, sleep & dreaming', icon: Moon,   gradient: 'from-purple-600 to-indigo-800' },
  { id: 'party',  name: 'Party & Upbeat',desc: 'Socializing, weekends & dance',  icon: Flame,  gradient: 'from-rose-500 to-pink-600' },
]

const GENDER_OPTIONS = [
  { id: 'Male', label: 'Male' },
  { id: 'Female', label: 'Female' },
  { id: 'Non-binary', label: 'Non-binary' },
  { id: 'Prefer not to say', label: 'Prefer not to say' },
]

export default function OnboardingPage() {
  const { user, completeOnboarding } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Step 1: Details
  const [displayName, setDisplayName] = useState(user?.displayName || user?.email?.split('@')[0] || '')
  const [birthDate, setBirthDate] = useState(user?.birthDate || '')
  const [gender, setGender] = useState(user?.gender || '')

  // Step 2: Genres
  const [selectedGenres, setSelectedGenres] = useState(user?.favoriteGenres?.length ? user.favoriteGenres : [])

  // Step 3: Vibe
  const [selectedVibe, setSelectedVibe] = useState(user?.listeningVibe || 'energy')

  const toggleGenre = (genreId) => {
    setSelectedGenres(prev => 
      prev.includes(genreId) ? prev.filter(g => g !== genreId) : [...prev, genreId]
    )
  }

  const handleNext = () => {
    if (step === 1) {
      if (!displayName.trim()) {
        toast.error('Please enter your display name.')
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (selectedGenres.length < 3) {
        toast.error('Please select at least 3 genres to tune your recommendations.')
        return
      }
      setStep(3)
    }
  }

  const handleFinish = async () => {
    setSubmitting(true)
    try {
      await completeOnboarding({
        displayName: displayName.trim(),
        birthDate,
        gender,
        favoriteGenres: selectedGenres,
        listeningVibe: selectedVibe,
      })
      toast.success('Welcome to SoundWave! 🎶 Your rhythm is ready.', { duration: 4000 })
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Failed to complete onboarding:', err)
      toast.error(err.message || 'Could not save profile setup. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[#121212] text-white flex flex-col justify-center items-center p-4 sm:p-6 overflow-hidden">
      {/* ── Ambient Aurora Lighting ── */}
      <div className="absolute top-[-15%] left-[-15%] w-[500px] h-[500px] bg-brand/15 rounded-full blur-[140px] pointer-events-none animate-aurora" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[550px] h-[550px] bg-purple-600/15 rounded-full blur-[160px] pointer-events-none animate-aurora" style={{ animationDelay: '-7s' }} />

      {/* Decorative Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* ── Main Container ── */}
      <div className="relative z-10 w-full max-w-xl glass-modal rounded-3xl p-6 sm:p-10 shadow-2xl border border-white/10 animate-pop-in">
        
        {/* Header / Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand to-emerald-400 flex items-center justify-center shadow-md shadow-brand/30">
                <Music2 size={16} className="text-black" />
              </div>
              <span className="font-display font-bold text-sm tracking-wide text-white/90">SoundWave Setup</span>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-brand border border-brand/30">
              Step {step} of 3
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-brand to-emerald-400 h-full transition-all duration-500 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* ── STEP 1: Basic Profile ── */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                Let's get to know you
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Tell us a bit about yourself to personalize your SoundWave journey.
              </p>
            </div>

            <div className="space-y-4">
              {/* Display Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 ml-1">
                  What should we call you? *
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your name or handle"
                    className="w-full glass-input rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Birth Date */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 ml-1">
                  Date of Birth
                </label>
                <CustomDatePicker
                  value={birthDate}
                  onChange={setBirthDate}
                  placeholder="Select your birth date"
                />
                <p className="text-[11px] text-gray-500 mt-1 ml-1">
                  Helps us tune age-appropriate playlists and music discoveries.
                </p>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 ml-1">
                  Gender
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {GENDER_OPTIONS.map(g => {
                    const isSelected = gender === g.id
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGender(g.id)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                          isSelected
                            ? 'bg-brand/20 border-brand text-brand shadow-sm shadow-brand/20'
                            : 'glass-input text-gray-300 hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        {g.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Favorite Genres ── */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                  Pick your favorite genres
                </h2>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  selectedGenres.length >= 3 
                    ? 'bg-brand/20 text-brand border-brand/40' 
                    : 'bg-white/10 text-gray-400 border-white/10'
                }`}>
                  {selectedGenres.length} / 3 required
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Choose at least 3 sounds you love. We'll build your personal daily mix.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
              {GENRE_OPTIONS.map(g => {
                const isSelected = selectedGenres.includes(g.id)
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGenre(g.id)}
                    className={`relative p-3 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between ${
                      isSelected
                        ? 'bg-gradient-to-br ' + g.color + ' border-white/30 text-white shadow-lg scale-[1.02]'
                        : 'glass-input border-white/10 text-gray-300 hover:border-white/25 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{g.emoji}</span>
                      <span className="text-xs font-bold tracking-tight">{g.name}</span>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shrink-0">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── STEP 3: Listening Vibe & Launch ── */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                What's your listening vibe?
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Pick your primary groove so we can queue your first recommendations.
              </p>
            </div>

            <div className="space-y-2.5">
              {VIBE_OPTIONS.map(v => {
                const isSelected = selectedVibe === v.id
                const Icon = v.icon
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVibe(v.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all duration-200 flex items-center gap-3.5 ${
                      isSelected
                        ? 'bg-white/10 border-brand shadow-md shadow-brand/20 ring-1 ring-brand'
                        : 'glass-input border-white/10 text-gray-300 hover:border-white/25 hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${v.gradient} flex items-center justify-center text-white shrink-0 shadow-md`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white tracking-tight">{v.name}</h4>
                      <p className="text-xs text-gray-400">{v.desc}</p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-brand text-black flex items-center justify-center shrink-0">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Ready Card Preview */}
            <div className="glass-card rounded-2xl p-4 border border-white/10 flex items-center gap-3 bg-brand/5">
              <Headphones size={22} className="text-brand shrink-0" />
              <div className="text-xs text-gray-300">
                <span className="font-semibold text-white">Starter Mix Ready:</span> Personalized with your{' '}
                <span className="text-brand font-semibold">{selectedGenres.length} selected genres</span> and current vibe!
              </div>
            </div>
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-white/10">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-input text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand text-black text-xs font-bold hover:bg-brand-dark transition-all duration-200 hover:scale-105 active:scale-95 shadow-md shadow-brand/30 ml-auto"
            >
              Continue <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={submitting}
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-brand to-emerald-400 text-black text-sm font-extrabold hover:opacity-95 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-brand/40 ml-auto disabled:opacity-50"
            >
              <Sparkles size={16} />
              {submitting ? 'Setting up your groove...' : 'Enter SoundWave'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
