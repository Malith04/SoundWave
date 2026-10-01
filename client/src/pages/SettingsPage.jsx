import { useState, useRef, useEffect } from 'react'
import { useAudioSettings, EQ_PRESETS } from '../context/AudioSettingsContext'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { updateUser, uploadProfilePicture, clearSearchHistory, clearRecentlyPlayed } from '../services/userService'
import { api } from '../services/api'
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
  const { currentSong, engine, switchEngine } = usePlayer()

  return (
    <>
      <Section title="Equalizer">
        <div className="flex items-center justify-between py-3.5 border-b border-white/5">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Enable Equalizer</p>
              {settings.eqEnabled && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-brand/20 text-brand">
                  ● ACTIVE
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Adjust 10 frequency bands in real-time with zero latency
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const nextVal = !settings.eqEnabled
              update('eqEnabled', nextVal)
              toast.success(nextVal ? 'Equalizer enabled' : 'Equalizer bypassed (flat)')
            }}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 overflow-hidden ${settings.eqEnabled ? 'bg-brand' : 'bg-surface-4'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${settings.eqEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Engine status notice if on YouTube */}
        {currentSong && engine === 'youtube' && (
          <div className="my-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-base shrink-0">🎧</span>
              <p className="text-xs text-purple-300">
                Playing YouTube stream. Switch to Studio Audio Engine for real-time Equalizer & 3D Spatial processing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                switchEngine('howler')
                toast.success('Switched to Studio Audio Engine')
              }}
              className="text-xs px-3 py-1 bg-purple-500 text-white font-bold rounded-full hover:bg-purple-600 transition-colors shrink-0 shadow-sm"
            >
              Switch to Studio Audio
            </button>
          </div>
        )}

        <div className="py-4">
          <p className="text-xs text-gray-500 mb-3">Presets</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(EQ_PRESETS).map(name => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  applyPreset(name)
                  toast.success(`${name.toUpperCase()} preset applied`)
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                  settings.eqPreset === name ? 'bg-brand text-black shadow-md' : 'bg-surface-3 text-gray-300 hover:bg-surface-4'
                }`}
              >
                {name}
              </button>
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
                  <span className="text-xs text-brand font-mono tabular-nums" style={{ fontSize: '10px' }}>{gain > 0 ? `+${gain}` : gain}</span>
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={1}
                    value={gain}
                    onChange={e => setEqBand(freq, parseInt(e.target.value))}
                    className="eq-slider"
                    style={{ height: '80px', cursor: 'pointer', accentColor: 'var(--brand)' }}
                  />
                  <span className="text-gray-500" style={{ fontSize: '10px' }}>{EQ_LABELS[i]}</span>
                </div>
              )
            })}
          </div>
        </div>
      </Section>

      <Section title="Spatial Audio">
        <Toggle
          label="Spatial Audio"
          desc="Widens stereo field for an immersive 3D-like experience"
          badge="NEW"
          value={settings.spatialEnabled}
          onChange={v => {
            update('spatialEnabled', v)
            toast.success(v ? '3D Spatial Audio enabled' : '3D Spatial Audio disabled')
          }}
        />
        <div className={settings.spatialEnabled ? '' : 'opacity-40 pointer-events-none'}>
          <RangeSlider
            label="Stereo Width"
            desc="0x = mono · 1x = normal · 2x = ultra wide"
            value={settings.spatialWidth}
            min={0}
            max={2}
            step={0.1}
            unit="x"
            onChange={v => update('spatialWidth', v)}
          />
        </div>
      </Section>

      <Section title="Enhancement">
        <RangeSlider
          label="Bass Boost"
          desc="Boost low frequencies for deeper, punchier bass"
          value={settings.bassBoost}
          min={0}
          max={12}
          step={1}
          unit=" dB"
          onChange={v => update('bassBoost', v)}
        />
        <Toggle
          label="Audio Normalization"
          desc="Keeps volume consistent across all tracks using studio dynamics compressor"
          value={settings.normalize}
          onChange={v => {
            update('normalize', v)
            toast.success(v ? 'Audio normalization enabled' : 'Audio normalization disabled')
          }}
        />
        <Toggle
          label="Mono Audio"
          desc="Combine left and right channels into a balanced mono stream"
          value={settings.mono}
          onChange={v => {
            update('mono', v)
            toast.success(v ? 'Mono audio downmix enabled' : 'Stereo audio restored')
          }}
        />
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
            <button
              key={p.name}
              type="button"
              onClick={() => {
                applyPreset(p.preset)
                toast.success(`${p.name} profile applied`)
              }}
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all text-left hover:scale-[1.02] ${
                settings.eqPreset === p.preset ? 'border-brand bg-brand/10' : 'border-white/10 bg-surface-3 hover:border-white/20'
              }`}
            >
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
  const { forceApplySettings, switchEngine } = usePlayer()
  
  return (
    <>
      <Section title="Playback Behaviour">
        <RangeSlider label="Playback Speed" desc="Slow down or speed up all tracks in real-time"
          value={settings.speed} min={0.5} max={2.0} step={0.05} unit="x"
          onChange={v => { 
            update('speed', v)
            setTimeout(() => {
              forceApplySettings?.()
              if (v !== 1) {
                toast.success(`Playback speed set to ${v}x`)
              }
            }, 60)
          }} />
        <RangeSlider label="Crossfade" desc="Smoothly fade between songs at the end of each track"
          value={settings.crossfade} min={0} max={12} step={1} unit="s"
          onChange={v => {
            update('crossfade', v)
            if (v > 0) {
              toast.success(`Crossfade set to ${v} seconds`)
            }
          }} />
        <Toggle label="Gapless Playback" desc="Remove silence between tracks for seamless listening"
          value={settings.gapless} onChange={v => update('gapless', v)} />
        <Toggle label="Autoplay" desc="Keep playing similar songs when your queue ends"
          value={settings.autoplay} onChange={v => update('autoplay', v)} />
        <Toggle label="Smart Shuffle" desc="Mix in recommended songs while shuffling" badge="NEW"
          value={settings.smartShuffle} onChange={v => update('smartShuffle', v)} />
      </Section>

      <Section title="Audio Engine & Quality">
        <Select label="Audio Playback Engine" desc="Choose between Studio Web Audio with full EQ or YouTube stream"
          value={settings.audioEngine || 'auto'}
          options={[
            { value: 'auto',    label: '✨ Smart Auto (Studio EQ when active)' },
            { value: 'studio',  label: '🎧 Studio Audio Engine (Full 10-Band EQ & 3D Spatial)' },
            { value: 'youtube', label: '🎬 YouTube Stream (Full tracks for iTunes)' },
          ]}
          onChange={v => {
            update('audioEngine', v)
            if (v === 'studio') {
              switchEngine?.('howler')
              toast.success('Studio Audio Engine activated (Full EQ & 3D Spatial active)')
            } else if (v === 'youtube') {
              switchEngine?.('youtube')
              toast.success('YouTube streaming engine activated')
            } else {
              toast.success('Smart Audio Engine mode enabled')
            }
          }} />
        <Select label="Streaming Quality" desc="Higher quality uses more data"
          value={settings.streamQuality}
          options={[
            { value: 'auto',   label: 'Automatic (Best available)' },
            { value: 'low',    label: 'Low (64 kbps)' },
            { value: 'normal', label: 'Normal (128 kbps)' },
            { value: 'high',   label: 'High (256 kbps)' },
            { value: 'very_high', label: 'Very High Lossless (320 kbps)' },
          ]}
          onChange={v => {
            update('streamQuality', v)
            toast.success(`Quality set to ${v}`)
          }} />
        <Toggle label="Loud Volume Level" desc="Increase maximum volume beyond normal levels"
          value={settings.loudVolume} onChange={v => {
            update('loudVolume', v)
            setTimeout(() => {
              forceApplySettings?.()
              toast.success(v ? 'Loud volume boost enabled' : 'Loud volume disabled')
            }, 60)
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

function compressImage(file, maxWidth = 320, maxHeight = 320, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ── Account Tab ───────────────────────────────────────────────
function AccountTab({ profile, logout, navigate }) {
  const { user, refreshProfile } = useAuth()
  const fileInputRef = useRef(null)

  const [name, setName]         = useState(profile?.displayName || profile?.name || user?.displayName || '')
  const [bio, setBio]           = useState(profile?.bio || user?.bio || '')
  const [country, setCountry]   = useState(profile?.country || user?.country || '')
  const [language, setLanguage] = useState(profile?.language || user?.language || 'en')
  const [gender, setGender]     = useState(profile?.gender || user?.gender || '')
  const [birthDate, setBirthDate] = useState(profile?.birthDate || profile?.birth_date || user?.birthDate || '')
  const [saving, setSaving]     = useState(false)
  const [imgError, setImgError] = useState(false)

  const [profilePic, setProfilePic] = useState(
    profile?.profilePicUrl || user?.profilePicUrl || user?.photoURL || (user?.uid ? localStorage.getItem(`sw_profile_pic_${user.uid}`) : null)
  )
  const [uploadingPic, setUploadingPic] = useState(false)

  const [newEmail, setNewEmail]       = useState('')
  const [newPass, setNewPass]         = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPass, setSavingPass]   = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  // Keep state synced when profile updates
  useEffect(() => {
    if (profile) {
      if (profile.displayName || profile.name) setName(profile.displayName || profile.name)
      if (profile.bio) setBio(profile.bio)
      if (profile.country) setCountry(profile.country)
      if (profile.language) setLanguage(profile.language)
      if (profile.gender) setGender(profile.gender)
      if (profile.birthDate || profile.birth_date) setBirthDate(profile.birthDate || profile.birth_date)
      if (profile.profilePicUrl) {
        setProfilePic(profile.profilePicUrl)
        setImgError(false)
      }
    }
  }, [profile])

  const handlePicUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB')
      return
    }

    setUploadingPic(true)
    try {
      // Upload directly to Supabase Storage S3 bucket via server endpoint
      const res = await uploadProfilePicture(file)
      const newUrl = res.profilePicUrl
      setProfilePic(newUrl)
      setImgError(false)

      if (user?.uid) {
        localStorage.setItem(`sw_profile_pic_${user.uid}`, newUrl)
      }

      await refreshProfile()
      toast.success('Profile picture saved to Supabase Storage & database!')
    } catch (err) {
      console.error('Upload failed:', err)
      toast.error('Failed to update picture: ' + (err.message || 'Unknown error'))
    } finally {
      setUploadingPic(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      await updateUser(user.uid, {
        displayName: name.trim(),
        name: name.trim(),
        bio: bio.trim(),
        gender,
        birthDate,
        country,
        language,
      })
      await refreshProfile()
      toast.success('Profile details saved to database!')
    } catch (err) {
      toast.error('Failed to save profile: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const handleChangeEmail = async (e) => {
    e.preventDefault()
    if (!newEmail.trim()) return
    setSavingEmail(true)
    try {
      await api.put('/auth/email', { email: newEmail.trim() })
      await refreshProfile()
      toast.success('Email updated successfully!')
      setNewEmail('')
    } catch (err) {
      toast.error(err.message || 'Failed to update email')
    } finally {
      setSavingEmail(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPass !== confirmPass) {
      toast.error('Passwords do not match')
      return
    }
    if (newPass.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setSavingPass(true)
    try {
      await api.put('/auth/password', { newPassword: newPass })
      toast.success('Password updated successfully!')
      setNewPass('')
      setConfirmPass('')
    } catch (err) {
      toast.error(err.message || 'Failed to update password')
    } finally {
      setSavingPass(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeletingAccount(true)
    try {
      const res = await api.delete('/auth/account')
      await logout()
      toast.success(
        res?.message || 'Account scheduled for deletion. Your data is backed up for 14 days — log back in anytime to restore!',
        { duration: 6000 }
      )
      navigate('/login')
    } catch (err) {
      toast.error(err.message || 'Failed to delete account')
    } finally {
      setDeletingAccount(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Signed out successfully')
      navigate('/login')
    } catch (err) {
      toast.error('Failed to sign out')
    }
  }

  const displayName = profile?.displayName || profile?.name || user?.displayName || name || 'User'
  const displayEmail = profile?.email || user?.email || ''

  return (
    <>
      {/* Profile card */}
      <Section title="Your Profile">
        <div className="py-5 flex items-center gap-5 border-b border-white/5">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden shadow-xl border-4 border-white/10 bg-gradient-to-br from-brand/40 to-brand flex items-center justify-center">
              {profilePic && !imgError ? (
                <img
                  src={profilePic}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white">
                  {(displayName[0] || 'U').toUpperCase()}
                </div>
              )}
            </div>
            
            {/* Upload picture button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPic}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#282828] hover:bg-brand rounded-full flex items-center justify-center border-2 border-black transition-colors shadow-lg group"
              title="Change profile picture"
            >
              {uploadingPic ? (
                <div className="w-3 h-3 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={13} className="text-white group-hover:text-black transition-colors" />
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePicUpload} />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg text-white truncate">{displayName}</p>
            <p className="text-sm text-gray-400 truncate">{displayEmail}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs bg-brand/20 text-brand px-2.5 py-0.5 rounded-full font-semibold">
                {profile?.subscriptionTier ? profile.subscriptionTier.toUpperCase() : 'FREE PLAN'}
              </span>
              <span className="text-xs text-gray-500">
                Member since {profile?.createdAt ? new Date(profile.createdAt).getFullYear() : '2026'}
              </span>
            </div>
          </div>
        </div>

        {/* Editable fields */}
        <div className="py-4 space-y-4">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold block mb-1.5">Display Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your display name"
              className="w-full bg-surface-3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold block mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell people a bit about your musical taste..."
              rows={3}
              className="w-full bg-surface-3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand transition-colors resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold block mb-1.5">Gender</label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                className="w-full bg-surface-3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand transition-colors"
              >
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="nonbinary">Non-binary</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold block mb-1.5">Birth Date</label>
              <input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                className="w-full bg-surface-3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand transition-colors scheme-dark"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold block mb-1.5">Country</label>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="w-full bg-surface-3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand transition-colors"
              >
                <option value="">Select country</option>
                {['Sri Lanka','United States','United Kingdom','India','Australia','Canada','Germany','France','Japan','Brazil','South Korea','Singapore'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold block mb-1.5">Language</label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="w-full bg-surface-3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand transition-colors"
            >
              {[
                { v:'en', l:'English' },{ v:'si', l:'Sinhala' },{ v:'ta', l:'Tamil' },
                { v:'es', l:'Spanish' },{ v:'fr', l:'French' },{ v:'de', l:'German' },
                { v:'ja', l:'Japanese' },{ v:'ko', l:'Korean' },{ v:'pt', l:'Portuguese' },
              ].map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="bg-brand text-black font-bold px-7 py-2.5 rounded-full text-sm hover:bg-brand-dark transition-all shadow-md shadow-brand/20 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </Section>

      {/* Subscription */}
      <Section title="Subscription Plan">
        <div className="py-4">
          <div className="bg-gradient-to-r from-brand/20 via-purple-500/10 to-brand/20 border border-brand/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-lg text-white">SoundWave Premium</p>
                <span className="text-[10px] uppercase font-bold bg-brand text-black px-2 py-0.5 rounded-full">Active Tier: Free</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Unlimited playback · High bitrate audio · Zero ads · Custom Equalizer</p>
            </div>
            <button
              onClick={() => toast.success('You are enjoying all unlocked features on SoundWave Free tier!')}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-5 py-2.5 rounded-full text-sm transition-colors shrink-0"
            >
              Manage Plan
            </button>
          </div>
        </div>
      </Section>

      {/* Change email */}
      <Section title="Account Email">
        <form onSubmit={handleChangeEmail} className="py-4 space-y-3">
          <p className="text-xs text-gray-500">Current email: <span className="text-gray-300 font-medium">{displayEmail}</span></p>
          <input
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="Enter new email address"
            className="w-full bg-surface-3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand transition-colors"
          />
          <button
            type="submit"
            disabled={savingEmail || !newEmail.trim()}
            className="bg-surface-3 hover:bg-surface-4 border border-white/10 text-white font-medium px-5 py-2 rounded-full text-sm transition-colors disabled:opacity-50"
          >
            {savingEmail ? 'Updating...' : 'Update Email Address'}
          </button>
        </form>
      </Section>

      {/* Change password */}
      <Section title="Security & Password">
        <form onSubmit={handleChangePassword} className="py-4 space-y-3">
          <input
            type="password"
            value={newPass}
            onChange={e => setNewPass(e.target.value)}
            placeholder="New password (at least 6 characters)"
            className="w-full bg-surface-3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand transition-colors"
          />
          <input
            type="password"
            value={confirmPass}
            onChange={e => setConfirmPass(e.target.value)}
            placeholder="Confirm new password"
            className="w-full bg-surface-3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand transition-colors"
          />
          <button
            type="submit"
            disabled={savingPass || !newPass || !confirmPass}
            className="bg-surface-3 hover:bg-surface-4 border border-white/10 text-white font-medium px-5 py-2 rounded-full text-sm transition-colors disabled:opacity-50"
          >
            {savingPass ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </Section>

      {/* Danger zone */}
      <Section title="Account Actions">
        <div className="py-3.5 border-b border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-red-400 hover:text-red-300 transition-colors text-sm font-semibold"
          >
            <LogOut size={16} /> Sign out of SoundWave
          </button>
        </div>
        <div className="py-3.5">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-3 text-red-500 hover:text-red-400 transition-colors text-sm font-medium"
            >
              <Trash2 size={16} /> Delete Account
            </button>
          ) : (
            <div className="space-y-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-2.5">
                <Trash2 size={18} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-400 font-semibold">14-Day Deletion & Backup Protection</p>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                    Your account will be deactivated and logged out immediately. All your playlists, favorites, and profile data will remain <strong>safely backed up for 14 days</strong>.
                  </p>
                  <p className="text-xs text-emerald-400 mt-1.5 font-medium">
                    💡 If you change your mind, simply log back in with your account within 14 days to instantly restore everything.
                  </p>
                  <p className="text-xs text-red-400/80 mt-1">
                    ⚠️ If you do not log in for more than 14 days, your account and all data will be permanently purged from the database.
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <p className="text-xs text-gray-400 mb-1.5">
                  Please type <strong className="text-white font-mono bg-black/40 px-2 py-0.5 rounded">DELETE</strong> to confirm:
                </p>
                <input
                  value={deleteInput}
                  onChange={e => setDeleteInput(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full bg-surface-3 border border-red-500/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors font-mono"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  disabled={deleteInput !== 'DELETE' || deletingAccount}
                  onClick={handleDeleteAccount}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2 rounded-full text-sm transition-colors disabled:opacity-30"
                >
                  {deletingAccount ? 'Scheduling Deletion...' : 'Deactivate & Schedule Deletion'}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteInput('') }}
                  className="bg-surface-3 hover:bg-surface-4 text-gray-300 px-5 py-2 rounded-full text-sm transition-colors"
                >
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
