import { useState, useRef, useEffect } from 'react'
import { useAudioSettings, EQ_PRESETS } from '../context/AudioSettingsContext'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { updateUser, clearSearchHistory, clearRecentlyPlayed } from '../services/userService'
import { storage } from '../services/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import {
  RotateCcw, SlidersHorizontal, Wind, Waves, Gauge, Music2,
  Monitor, Bell, Shield, User, Headphones, Radio, Mic2,
  Globe, Trash2, Check, Zap, LogOut, Camera
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const EQ_BANDS  = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
const EQ_LABELS = ['32', '64', '125', '250', '500', '1K', '2K', '4K', '8K', '16K']

const TABS = [
  { id: 'audio',    label: 'Audio',         icon: Headphones },
  { id: 'playback', label: 'Playback',      icon: Radio },
  { id: 'display',  label: 'Display',       icon: Monitor },
  { id: 'privacy',  label: 'Privacy',       icon: Shield },
  { id: 'account',  label: 'Account',       icon: User },
]

function Toggle({ label, desc, value, onChange, badge }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-white/5 last:border-0">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{label}</p>
          {badge && <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badge === 'NEW' ? 'bg-brand/20 text-brand' : 'bg-purple-500/20 text-purple-400'}`}>{badge}</span>}
        </div>
        {desc && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>}
      </div>
      <button onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 overflow-hidden ${value ? 'bg-brand' : 'bg-surface-4'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

function RangeSlider({ label, desc, value, min, max, step = 1, unit = '', onChange }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="py-3.5 border-b border-white/5 last:border-0">
      <div className="flex justify-between mb-1.5">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
        </div>
        <span className="text-sm text-brand font-mono tabular-nums shrink-0 ml-4">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full seek-bar rounded-full cursor-pointer mt-2"
        style={{ '--progress': `${pct}%` }} />
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-600">{min}{unit}</span>
        <span className="text-xs text-gray-600">{max}{unit}</span>
      </div>
    </div>
  )
}

function Select({ label, desc, value, options, onChange }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-white/5 last:border-0">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="bg-surface-3 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand cursor-pointer shrink-0">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{title}</p>
      <div className="bg-surface-2 rounded-2xl px-5 divide-y divide-white/5">{children}</div>
    </div>
  )
}

// ── Audio Tab ─────────────────────────────────────────────────
function AudioTab({ settings, update, applyPreset, setEqBand }) {
  return (
    <>
      <Section title="Equalizer">
        <Toggle label="Enable Equalizer" desc="Adjust frequency levels for your perfect sound"
          value={settings.eqEnabled} onChange={v => update('eqEnabled', v)} />

        <div className="py-4">
          <p className="text-xs text-gray-500 mb-3">Presets</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(EQ_PRESETS).map(name => (
              <button key={name} onClick={() => applyPreset(name)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                  settings.eqPreset === name ? 'bg-brand text-black' : 'bg-surface-3 text-gray-300 hover:bg-surface-4'
                }`}>{name}</button>
            ))}
            {settings.eqPreset === 'custom' && (
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400">Custom</span>
            )}
          </div>
        </div>

        {/* EQ vertical sliders */}
        <div className={`pb-4 transition-opacity ${settings.eqEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <div className="flex items-end justify-between gap-1 h-44 bg-surface-3 rounded-xl px-4 py-4">
            {EQ_BANDS.map((freq, i) => {
              const gain = settings.eq[freq] ?? 0
              return (
                <div key={freq} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-xs text-brand font-mono tabular-nums" style={{fontSize:'10px'}}>{gain > 0 ? `+${gain}` : gain}</span>
                  <input type="range" min={-12} max={12} step={1} value={gain}
                    onChange={e => setEqBand(freq, parseInt(e.target.value))}
                    className="eq-slider" style={{ height: '80px', cursor: 'pointer', accentColor: '#1DB954' }} />
                  <span className="text-gray-500" style={{fontSize:'10px'}}>{EQ_LABELS[i]}</span>
                </div>
              )
            })}
          </div>
        </div>
      </Section>

      <Section title="Spatial Audio">
        <Toggle label="Spatial Audio" desc="Widens stereo field for an immersive 3D-like experience" badge="NEW"
          value={settings.spatialEnabled} onChange={v => update('spatialEnabled', v)} />
        <div className={settings.spatialEnabled ? '' : 'opacity-40 pointer-events-none'}>
          <RangeSlider label="Stereo Width" desc="0x = mono · 1x = normal · 2x = ultra wide"
            value={settings.spatialWidth} min={0} max={2} step={0.1} unit="x"
            onChange={v => update('spatialWidth', v)} />
        </div>
      </Section>

      <Section title="Enhancement">
        <RangeSlider label="Bass Boost" desc="Boost low frequencies for deeper bass"
          value={settings.bassBoost} min={0} max={12} step={1} unit=" dB"
          onChange={v => {
            console.log('Bass boost changed to:', v)
            update('bassBoost', v)
          }} />
        <Toggle label="Audio Normalization" desc="Keeps volume consistent across all tracks"
          value={settings.normalize} onChange={v => {
            console.log('Normalization changed to:', v)
            update('normalize', v)
          }} />
        <Toggle label="Mono Audio" desc="Combine left and right channels into one"
          value={settings.mono} onChange={v => {
            console.log('Mono audio changed to:', v)
            update('mono', v)
          }} />
      </Section>

      <Section title="Sound Profiles">
        <div className="py-4 grid grid-cols-2 gap-3">
          {[
            { name: 'Studio',     desc: 'Flat reference sound',        icon: '🎚️', preset: 'flat' },
            { name: 'Bass Head',  desc: 'Heavy bass for EDM & hip-hop', icon: '🔊', preset: 'bass' },
            { name: 'Vocal',      desc: 'Enhanced mids & clarity',      icon: '🎤', preset: 'vocal' },
            { name: 'Rock',       desc: 'Guitar & drums punch',         icon: '🎸', preset: 'rock' },
            { name: 'Electronic', desc: 'Crisp highs & punchy bass',    icon: '🎛️', preset: 'electronic' },
            { name: 'Podcast',    desc: 'Voice clarity boost',          icon: '🎙️', preset: 'podcast' },
          ].map(p => (
            <button key={p.name} onClick={() => { applyPreset(p.preset); toast.success(`${p.name} profile applied`) }}
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all text-left hover:scale-[1.02] ${
                settings.eqPreset === p.preset ? 'border-brand bg-brand/10' : 'border-white/10 bg-surface-3 hover:border-white/20'
              }`}>
              <span className="text-xl shrink-0">{p.icon}</span>
              <div>
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
              </div>
              {settings.eqPreset === p.preset && <Check size={14} className="text-brand ml-auto shrink-0 mt-0.5" />}
            </button>
          ))}
        </div>
      </Section>
    </>
  )
}

// ── Playback Tab ──────────────────────────────────────────────
function PlaybackTab({ settings, update }) {
  const { forceApplySettings } = usePlayer()
  
  return (
    <>
      <Section title="Playback Behaviour">
        <RangeSlider label="Playback Speed" desc="Slow down or speed up all tracks"
          value={settings.speed} min={0.5} max={2.0} step={0.05} unit="x"
          onChange={v => { 
            console.log('Playback speed changed to:', v)
            update('speed', v)
            // Force apply immediately
            setTimeout(() => {
              forceApplySettings?.()
              if (v !== 1) {
                toast.success(`Playback speed set to ${v}x`)
              }
            }, 100)
          }} />
        <RangeSlider label="Crossfade" desc="Smoothly fade between songs at the end of each track"
          value={settings.crossfade} min={0} max={12} step={1} unit="s"
          onChange={v => {
            console.log('Crossfade changed to:', v)
            update('crossfade', v)
            if (v > 0) {
              toast.success(`Crossfade set to ${v} seconds`)
            }
          }} />
        <Toggle label="Gapless Playback" desc="Remove silence between tracks for seamless listening"
          value={settings.gapless} onChange={v => {
            console.log('Gapless changed to:', v)
            update('gapless', v)
          }} />
        <Toggle label="Autoplay" desc="Keep playing similar songs when your queue ends"
          value={settings.autoplay} onChange={v => {
            console.log('Autoplay changed to:', v)
            update('autoplay', v)
          }} />
        <Toggle label="Smart Shuffle" desc="Mix in recommended songs while shuffling" badge="NEW"
          value={settings.smartShuffle} onChange={v => {
            console.log('Smart shuffle changed to:', v)
            update('smartShuffle', v)
          }} />
      </Section>

      <Section title="Audio Quality">
        <Select label="Streaming Quality" desc="Higher quality uses more data"
          value={settings.streamQuality}
          options={[
            { value: 'auto',   label: 'Automatic' },
            { value: 'low',    label: 'Low (24 kbps)' },
            { value: 'normal', label: 'Normal (96 kbps)' },
            { value: 'high',   label: 'High (160 kbps)' },
            { value: 'very_high', label: 'Very High (320 kbps)' },
          ]}
          onChange={v => {
            console.log('Stream quality changed to:', v)
            update('streamQuality', v)
          }} />
        <Toggle label="Loud Volume Level" desc="Increase maximum volume beyond normal levels"
          value={settings.loudVolume} onChange={v => {
            console.log('Loud volume changed to:', v)
            update('loudVolume', v)
            // Force apply immediately
            setTimeout(() => {
              forceApplySettings?.()
              toast.success(v ? 'Loud volume enabled' : 'Loud volume disabled')
            }, 100)
          }} />
      </Section>

      <Section title="Queue & History">
        <Toggle label="Remember Queue on Restart" desc="Restore your queue when you reopen the app"
          value={settings.rememberQueue} onChange={v => {
            console.log('Remember queue changed to:', v)
            update('rememberQueue', v)
          }} />
        <Toggle label="Show Recently Played" desc="Display your listening history on the home screen"
          value={settings.showRecent} onChange={v => {
            console.log('Show recent changed to:', v)
            update('showRecent', v)
          }} />
      </Section>

    </>
  )
}

// ── Display Tab ───────────────────────────────────────────────
function DisplayTab({ settings, update }) {
  return (
    <>
      <Section title="Appearance">
        <Select label="Theme" desc="Choose your colour theme"
          value={settings.theme}
          options={[
            { value: 'dark',   label: '🌑 Dark (Default)' },
            { value: 'amoled', label: '⚫ AMOLED Black' },
            { value: 'light',  label: '☀️ Light' },
          ]}
          onChange={v => update('theme', v)} />
        <Select label="Accent Colour" desc="Main highlight colour throughout the app"
          value={settings.accent}
          options={[
            { value: '#1DB954', label: '🟢 Spotify Green' },
            { value: '#1E90FF', label: '🔵 Electric Blue' },
            { value: '#FF6B6B', label: '🔴 Coral Red' },
            { value: '#A855F7', label: '🟣 Purple' },
            { value: '#F59E0B', label: '🟡 Amber' },
          ]}
          onChange={v => update('accent', v)} />
        <Toggle label="Animated Album Art" desc="Show spinning vinyl and glow effects in the player"
          value={settings.animatedArt} onChange={v => update('animatedArt', v)} />
        <Toggle label="Background Particles" desc="Show floating particles in the full-screen player"
          value={settings.particles} onChange={v => update('particles', v)} />
      </Section>

      <Section title="Now Playing">
        <Toggle label="Show Song Credits" desc="Display producer, songwriter info when available"
          value={settings.showCredits} onChange={v => update('showCredits', v)} />
        <Toggle label="Canvas / Animated Covers" desc="Show animated visuals behind album art" badge="NEW"
          value={settings.canvas} onChange={v => update('canvas', v)} />
        <Toggle label="Full-Screen Lyrics by Default" desc="Auto-open lyrics when expanding the player"
          value={settings.autoLyrics} onChange={v => update('autoLyrics', v)} />
      </Section>

      <Section title="Home Screen">
        <Toggle label="Show Daily Mixes" desc="Display personalised genre mixes on the home screen"
          value={settings.showMixes} onChange={v => update('showMixes', v)} />
        <Toggle label="Show Recently Played" desc="Quick access row on the home screen"
          value={settings.showRecent} onChange={v => update('showRecent', v)} />
        <Toggle label="Show New Releases" desc="Surface new music from artists you like"
          value={settings.showNew} onChange={v => update('showNew', v)} />
      </Section>
    </>
  )
}

// ── Privacy Tab ───────────────────────────────────────────────
function PrivacyTab({ settings, update }) {
  const { user } = useAuth()
  const handleClearHistory = async () => {
    try {
      await clearSearchHistory()
      if (user?.uid) localStorage.removeItem(`sw_search_history_${user.uid}`)
      localStorage.removeItem('sw_search_history')
      toast.success('Search history cleared')
    } catch {
      toast.error('Failed to clear search history')
    }
  }
  const handleClearRecent = async () => {
    if (!user) return
    try {
      await clearRecentlyPlayed()
      toast.success('Recently played history cleared')
    } catch { toast.error('Failed to clear recently played') }
  }
  return (
    <>
      <Section title="Listening Activity">
        <Toggle label="Private Session" desc="Listen without affecting your history or recommendations"
          value={settings.privateSession} onChange={v => { update('privateSession', v); toast(v ? '🔒 Private session on' : '🔓 Private session off') }} />
        <Toggle label="Share Listening Activity" desc="Let others see what you're currently playing"
          value={settings.shareActivity} onChange={v => update('shareActivity', v)} />
      </Section>

      <Section title="Data & History">
        <div className="py-3.5 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Clear Search History</p>
              <p className="text-xs text-gray-500 mt-0.5">Remove all recent searches</p>
            </div>
            <button onClick={handleClearHistory}
              className="px-4 py-1.5 rounded-full bg-surface-3 hover:bg-surface-4 text-sm text-gray-300 hover:text-white transition-colors shrink-0">
              Clear
            </button>
          </div>
        </div>
        <div className="py-3.5 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Clear Recently Played</p>
              <p className="text-xs text-gray-500 mt-0.5">Remove your listening history</p>
            </div>
            <button onClick={handleClearRecent}
              className="px-4 py-1.5 rounded-full bg-surface-3 hover:bg-surface-4 text-sm text-gray-300 hover:text-white transition-colors shrink-0">
              Clear
            </button>
          </div>
        </div>
        <Toggle label="Collect Usage Data" desc="Help improve the app by sharing anonymous usage stats"
          value={settings.analytics} onChange={v => update('analytics', v)} />
      </Section>
    </>
  )
}

// ── Account Tab ───────────────────────────────────────────────
function AccountTab({ profile, logout, navigate }) {
  const { user, refreshProfile } = useAuth()
  const fileInputRef = useRef(null)

  const [name, setName]         = useState(profile?.name || '')
  const [bio, setBio]           = useState(profile?.bio || '')
  const [country, setCountry]   = useState(profile?.country || '')
  const [language, setLanguage] = useState(profile?.language || 'en')
  const [gender, setGender]     = useState(profile?.gender || '')
  const [saving, setSaving]     = useState(false)
  const [profilePic, setProfilePic] = useState(profile?.profilePicUrl || null)
  const [uploadingPic, setUploadingPic] = useState(false)

  const [newEmail, setNewEmail]       = useState('')
  const [newPass, setNewPass]         = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPass, setSavingPass]   = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')

  const avatarColor = localStorage.getItem('sw_avatar_color') || 0
  const AVATAR_COLORS = [
    'from-brand to-emerald-700','from-purple-500 to-indigo-700',
    'from-pink-500 to-rose-700','from-orange-500 to-red-700',
    'from-blue-500 to-cyan-700','from-yellow-500 to-amber-700',
  ]

  // Profile picture sync logic - improved with better error handling
  useEffect(() => {
    if (profile?.profilePicUrl && !uploadingPic) {
      console.log('Syncing profile picture from database:', profile.profilePicUrl)
      setProfilePic(profile.profilePicUrl)
      // Cache the profile picture URL
      if (user?.uid) {
        localStorage.setItem(`sw_profile_pic_${user.uid}`, profile.profilePicUrl)
        console.log('Profile picture cached for user:', user.uid)
      }
    }
  }, [profile?.profilePicUrl, uploadingPic, user?.uid])

  // Load cached profile picture on mount - improved logic
  useEffect(() => {
    if (user?.uid) {
      const cachedPic = localStorage.getItem(`sw_profile_pic_${user.uid}`)
      console.log('Checking cached profile picture for user:', user.uid, 'Found:', !!cachedPic)
      if (cachedPic && !profilePic && !profile?.profilePicUrl) {
        console.log('Loading cached profile picture:', cachedPic)
        setProfilePic(cachedPic)
      }
    }
  }, [user?.uid, profile])

  // Initialize profile picture when profile loads - improved
  useEffect(() => {
    if (profile?.profilePicUrl && !profilePic) {
      console.log('Initializing profile picture from profile data:', profile.profilePicUrl)
      setProfilePic(profile.profilePicUrl)
      // Ensure it's cached
      if (user?.uid) {
        localStorage.setItem(`sw_profile_pic_${user.uid}`, profile.profilePicUrl)
      }
    }
  }, [profile?.profilePicUrl, profilePic, user?.uid])

  const handlePicUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }

    console.log('Starting profile picture upload:', file.name, 'Size:', file.size)

    // Show preview immediately
    const localUrl = URL.createObjectURL(file)
    setProfilePic(localUrl)

    setUploadingPic(true)
    try {
      console.log('Uploading to Firebase Storage...')
      // Path must match storage rules: profiles/{userId}/...
      const storageRef = ref(storage, `profiles/${user.uid}/avatar_${Date.now()}`)
      const snapshot = await uploadBytes(storageRef, file)
      console.log('Upload successful, getting download URL...')
      const url = await getDownloadURL(storageRef)
      console.log('Download URL obtained:', url)
      
      // Update user profile in database
      console.log('Updating user profile in database...')
      await updateUser(user.uid, { profilePicUrl: url })
      console.log('Database updated successfully')
      
      // Clean up the local preview URL
      URL.revokeObjectURL(localUrl)
      
      // Set the final URL and cache it
      setProfilePic(url)
      localStorage.setItem(`sw_profile_pic_${user.uid}`, url)
      console.log('Profile picture cached locally')
      
      // Refresh the profile context to get updated data
      console.log('Refreshing profile context...')
      await refreshProfile()
      console.log('Profile refresh completed')
      
      toast.success('Profile picture updated successfully!')
    } catch (err) {
      console.error('Upload failed:', err)
      toast.error('Upload failed: ' + (err.message || 'Unknown error'))
      // Revert preview on failure
      const fallbackUrl = profile?.profilePicUrl || localStorage.getItem(`sw_profile_pic_${user.uid}`)
      setProfilePic(fallbackUrl || null)
      URL.revokeObjectURL(localUrl)
    } finally {
      setUploadingPic(false)
      // Reset input so same file can be picked again
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      await updateUser(user.uid, {
        name: name.trim(),
        bio: bio.trim(),
        country,
        language,
        gender,
      })
      await refreshProfile()
      toast.success('Profile updated')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const handleChangeEmail = async e => {
    e.preventDefault()
    if (!newEmail.trim()) return
    setSavingEmail(true)
    try {
      await user.updateEmail(newEmail.trim())
      await updateUser(user.uid, { email: newEmail.trim() })
      toast.success('Email updated')
      setNewEmail('')
    } catch (err) {
      toast.error(err.message?.includes('requires-recent-login')
        ? 'Please sign out and sign back in first'
        : 'Failed to update email')
    } finally { setSavingEmail(false) }
  }

  const handleChangePassword = async e => {
    e.preventDefault()
    if (newPass !== confirmPass) { toast.error('Passwords do not match'); return }
    if (newPass.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setSavingPass(true)
    try {
      await user.updatePassword(newPass)
      toast.success('Password updated')
      setNewPass(''); setConfirmPass('')
    } catch (err) {
      toast.error(err.message?.includes('requires-recent-login')
        ? 'Please sign out and sign back in first'
        : 'Failed to update password')
    } finally { setSavingPass(false) }
  }

  const handleLogout = async () => { await logout(); navigate('/login') }

  return (
    <>
      {/* Profile card */}
      <Section title="Your Profile">
        <div className="py-5 flex items-center gap-5 border-b border-white/5">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden shadow-lg border-4 border-white/10"
              style={profilePic ? {} : { background: `linear-gradient(135deg, ${AVATAR_COLORS[avatarColor].split(' ')[1]}, ${AVATAR_COLORS[avatarColor].split(' ')[3]})` }}>
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white">
                  {profile?.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            
            {/* Upload picture button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPic}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#282828] hover:bg-[#3e3e3e] rounded-full flex items-center justify-center border-2 border-black transition-colors shadow-lg"
              title="Change profile picture"
            >
              {uploadingPic ? (
                <div className="w-3 h-3 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={12} className="text-white" />
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePicUpload} />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg">{profile?.name || 'User'}</p>
            <p className="text-sm text-gray-400">{profile?.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs bg-brand/20 text-brand px-2 py-0.5 rounded-full font-medium">Free Plan</span>
              <span className="text-xs text-gray-500">Member since {profile?.createdAt ? new Date(profile.createdAt).getFullYear() : '—'}</span>
            </div>
          </div>
        </div>

        {/* Editable fields */}
        <div className="py-4 space-y-4">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Display Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-surface-3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand transition-colors" />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)}
              placeholder="Tell people a bit about yourself..."
              rows={3}
              className="w-full bg-surface-3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand transition-colors resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value)}
                className="w-full bg-surface-3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand transition-colors">
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="nonbinary">Non-binary</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Country</label>
              <select value={country} onChange={e => setCountry(e.target.value)}
                className="w-full bg-surface-3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand transition-colors">
                <option value="">Select country</option>
                {['Sri Lanka','United States','United Kingdom','India','Australia','Canada','Germany','France','Japan','Brazil','South Korea','Singapore'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Language</label>
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className="w-full bg-surface-3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand transition-colors">
              {[
                { v:'en', l:'English' },{ v:'si', l:'Sinhala' },{ v:'ta', l:'Tamil' },
                { v:'es', l:'Spanish' },{ v:'fr', l:'French' },{ v:'de', l:'German' },
                { v:'ja', l:'Japanese' },{ v:'ko', l:'Korean' },{ v:'pt', l:'Portuguese' },
              ].map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
          <button onClick={handleSaveProfile} disabled={saving}
            className="bg-brand text-black font-bold px-6 py-2.5 rounded-full text-sm hover:bg-brand-dark transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </Section>

      {/* Subscription */}
      <Section title="Subscription">
        <div className="py-4">
          <div className="bg-gradient-to-r from-brand/20 to-purple-500/20 border border-brand/30 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="font-bold">SoundWave Premium</p>
              <p className="text-xs text-gray-400 mt-1">Ad-free · Offline listening · HQ audio · Unlimited skips</p>
            </div>
            <button className="bg-brand text-black font-bold px-5 py-2.5 rounded-full text-sm hover:bg-brand-dark transition-colors shrink-0">
              Upgrade
            </button>
          </div>
        </div>
      </Section>

      {/* Change email */}
      <Section title="Change Email">
        <form onSubmit={handleChangeEmail} className="py-4 space-y-3">
          <p className="text-xs text-gray-500">Current: <span className="text-gray-300">{profile?.email}</span></p>
          <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
            placeholder="New email address"
            className="w-full bg-surface-3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand transition-colors" />
          <button type="submit" disabled={savingEmail || !newEmail.trim()}
            className="bg-surface-3 hover:bg-surface-4 border border-white/10 text-white font-medium px-5 py-2 rounded-full text-sm transition-colors disabled:opacity-50">
            {savingEmail ? 'Updating...' : 'Update Email'}
          </button>
        </form>
      </Section>

      {/* Change password */}
      <Section title="Change Password">
        <form onSubmit={handleChangePassword} className="py-4 space-y-3">
          <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
            placeholder="New password (min 6 characters)"
            className="w-full bg-surface-3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand transition-colors" />
          <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
            placeholder="Confirm new password"
            className="w-full bg-surface-3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand transition-colors" />
          <button type="submit" disabled={savingPass || !newPass || !confirmPass}
            className="bg-surface-3 hover:bg-surface-4 border border-white/10 text-white font-medium px-5 py-2 rounded-full text-sm transition-colors disabled:opacity-50">
            {savingPass ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </Section>

      {/* Danger zone */}
      <Section title="Danger Zone">
        <div className="py-3.5 border-b border-white/5">
          <button onClick={handleLogout}
            className="flex items-center gap-3 text-red-400 hover:text-red-300 transition-colors text-sm font-medium">
            <LogOut size={16} /> Sign out of SoundWave
          </button>
        </div>
        <div className="py-3.5">
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-3 text-red-500 hover:text-red-400 transition-colors text-sm font-medium">
              <Trash2 size={16} /> Delete account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-400 font-medium">This will permanently delete your account and all data.</p>
              <p className="text-xs text-gray-500">Type <span className="text-white font-mono">DELETE</span> to confirm</p>
              <input value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
                placeholder="Type DELETE"
                className="w-full bg-surface-3 border border-red-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors" />
              <div className="flex gap-3">
                <button
                  disabled={deleteInput !== 'DELETE'}
                  onClick={() => toast.error('Account deletion requires backend support')}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2 rounded-full text-sm transition-colors disabled:opacity-30">
                  Delete Forever
                </button>
                <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput('') }}
                  className="bg-surface-3 hover:bg-surface-4 text-gray-300 px-5 py-2 rounded-full text-sm transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </Section>
    </>
  )
}

// ── Main Settings Page ────────────────────────────────────────
export default function SettingsPage() {
  const { settings, update, applyPreset, setEqBand, reset } = useAudioSettings()
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('audio')

  const handleReset = () => { reset(); toast.success('Settings reset to defaults') }
  const activeTabObj = TABS.find(t => t.id === activeTab)

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">

      {/* ── Desktop sidebar nav ── */}
      <div className="hidden lg:flex flex-col w-52 shrink-0 border-r border-white/5 py-6 px-3 overflow-y-auto">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest px-3 mb-4">Settings</p>
        <nav className="space-y-0.5 flex-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === t.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}>
              <t.icon size={17} />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="mt-4 px-3">
          <button onClick={handleReset}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors">
            <RotateCcw size={13} /> Reset all settings
          </button>
        </div>
      </div>

      {/* ── Mobile tab bar ── */}
      <div className="lg:hidden shrink-0 border-b border-white/5 bg-surface-2">
        <div className="flex overflow-x-auto scrollbar-none px-2 pt-2 gap-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                activeTab === t.id
                  ? 'bg-white/10 text-white border-b-2 border-brand'
                  : 'text-gray-400 hover:text-white'
              }`}>
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5">
        {activeTab === 'audio'    && <AudioTab    settings={settings} update={update} applyPreset={applyPreset} setEqBand={setEqBand} />}
        {activeTab === 'playback' && <PlaybackTab settings={settings} update={update} />}
        {activeTab === 'display'  && <DisplayTab  settings={settings} update={update} />}
        {activeTab === 'privacy'  && <PrivacyTab  settings={settings} update={update} />}
        {activeTab === 'account'  && <AccountTab  profile={profile} logout={logout} navigate={navigate} />}

        {/* Mobile reset button */}
        <div className="lg:hidden mt-4 pb-4">
          <button onClick={handleReset}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors">
            <RotateCcw size={13} /> Reset all settings
          </button>
        </div>
      </div>
    </div>
  )
}
