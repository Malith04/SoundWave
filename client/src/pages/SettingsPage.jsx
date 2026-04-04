import { useState } from 'react'
import { useAudioSettings, EQ_PRESETS } from '../context/AudioSettingsContext'
import { useAuth } from '../context/AuthContext'
import { updateUser } from '../services/userService'
import {
  RotateCcw, SlidersHorizontal, Wind, Waves, Gauge, Music2,
  Monitor, Bell, Shield, User, Headphones, Radio, Mic2,
  Globe, Trash2, Check, Zap, LogOut
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
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 ${value ? 'bg-brand' : 'bg-surface-4'}`}>
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
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
          onChange={v => update('bassBoost', v)} />
        <Toggle label="Audio Normalization" desc="Keeps volume consistent across all tracks"
          value={settings.normalize} onChange={v => update('normalize', v)} />
        <Toggle label="Mono Audio" desc="Combine left and right channels into one"
          value={settings.mono} onChange={v => update('mono', v)} />
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
  return (
    <>
      <Section title="Playback Behaviour">
        <RangeSlider label="Playback Speed" desc="Slow down or speed up all tracks"
          value={settings.speed} min={0.5} max={2.0} step={0.05} unit="x"
          onChange={v => { update('speed', v) }} />
        <RangeSlider label="Crossfade" desc="Smoothly fade between songs at the end of each track"
          value={settings.crossfade} min={0} max={12} step={1} unit="s"
          onChange={v => update('crossfade', v)} />
        <Toggle label="Gapless Playback" desc="Remove silence between tracks for seamless listening"
          value={settings.gapless} onChange={v => update('gapless', v)} />
        <Toggle label="Autoplay" desc="Keep playing similar songs when your queue ends"
          value={settings.autoplay} onChange={v => update('autoplay', v)} />
        <Toggle label="Smart Shuffle" desc="Mix in recommended songs while shuffling" badge="NEW"
          value={settings.smartShuffle} onChange={v => update('smartShuffle', v)} />
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
          onChange={v => update('streamQuality', v)} />
        <Toggle label="Loud Volume Level" desc="Increase maximum volume beyond normal levels"
          value={settings.loudVolume} onChange={v => update('loudVolume', v)} />
      </Section>

      <Section title="Queue & History">
        <Toggle label="Remember Queue on Restart" desc="Restore your queue when you reopen the app"
          value={settings.rememberQueue} onChange={v => update('rememberQueue', v)} />
        <Toggle label="Show Recently Played" desc="Display your listening history on the home screen"
          value={settings.showRecent} onChange={v => update('showRecent', v)} />
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
  const handleClearHistory = () => {
    localStorage.removeItem('sw_search_history')
    toast.success('Search history cleared')
  }
  const handleClearRecent = async () => {
    if (!user) return
    try {
      await updateUser(user.uid, { recentlyPlayed: [] })
      toast.success('Recently played cleared')
    } catch { toast.error('Failed to clear') }
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
  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }
  return (
    <>
      <Section title="Profile">
        <div className="py-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center justify-center text-2xl font-bold text-brand shrink-0">
            {profile?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-semibold">{profile?.name || 'User'}</p>
            <p className="text-sm text-gray-400">{profile?.email}</p>
            <span className="text-xs text-brand mt-1 block">Free Plan</span>
          </div>
        </div>
      </Section>

      <Section title="Subscription">
        <div className="py-4">
          <div className="bg-gradient-to-r from-brand/20 to-purple-500/20 border border-brand/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">Upgrade to Premium</p>
              <p className="text-xs text-gray-400 mt-0.5">Ad-free, offline listening & more</p>
            </div>
            <button className="bg-brand text-black font-bold px-4 py-2 rounded-full text-sm hover:bg-brand-dark transition-colors shrink-0">
              Upgrade
            </button>
          </div>
        </div>
      </Section>

      <Section title="Danger Zone">
        <div className="py-3.5">
          <button onClick={handleLogout}
            className="flex items-center gap-3 text-red-400 hover:text-red-300 transition-colors text-sm font-medium">
            <LogOut size={16} /> Sign out of SoundWave
          </button>
        </div>
        <div className="py-3.5">
          <button onClick={() => toast.error('Account deletion coming soon')}
            className="flex items-center gap-3 text-red-500 hover:text-red-400 transition-colors text-sm font-medium">
            <Trash2 size={16} /> Delete account
          </button>
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

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar nav */}
      <div className="w-52 shrink-0 border-r border-white/5 py-6 px-3 overflow-y-auto">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest px-3 mb-4">Settings</p>
        <nav className="space-y-0.5">
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
        <div className="mt-6 px-3">
          <button onClick={handleReset}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors">
            <RotateCcw size={13} /> Reset all settings
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {activeTab === 'audio'    && <AudioTab    settings={settings} update={update} applyPreset={applyPreset} setEqBand={setEqBand} />}
        {activeTab === 'playback' && <PlaybackTab settings={settings} update={update} />}
        {activeTab === 'display'  && <DisplayTab  settings={settings} update={update} />}
        {activeTab === 'privacy'  && <PrivacyTab  settings={settings} update={update} />}
        {activeTab === 'account'  && <AccountTab  profile={profile} logout={logout} navigate={navigate} />}
      </div>
    </div>
  )
}
