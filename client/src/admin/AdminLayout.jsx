import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate, Link, useParams } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  UserX,
  Music2,
  ShieldAlert,
  ListMusic,
  Cpu,
  BarChart3,
  Server,
  ShieldCheck,
  Settings,
  Search,
  Bell,
  Moon,
  Sun,
  Palette,
  ChevronDown,
  LogOut,
  ExternalLink,
  Flag,
  Sparkles,
  Check
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAudioSettings } from '../context/AudioSettingsContext'
import SoundWaveLogo from '../components/SoundWaveLogo'
import toast from 'react-hot-toast'

// Import all tab panels
import AdminUsersTab from './tabs/AdminUsersTab'
import AdminOverviewTab from './tabs/AdminOverviewTab'
import AdminContentTab from './tabs/AdminContentTab'
import AdminDeletedTab from './tabs/AdminDeletedTab'
import AdminModerationTab from './tabs/AdminModerationTab'
import AdminPlaylistsTab from './tabs/AdminPlaylistsTab'
import AdminAlgorithmTab from './tabs/AdminAlgorithmTab'
import AdminAnalyticsTab from './tabs/AdminAnalyticsTab'
import AdminInfrastructureTab from './tabs/AdminInfrastructureTab'
import AdminAdminsTab from './tabs/AdminAdminsTab'
import AdminSettingsTab from './tabs/AdminSettingsTab'
import AdminReportsTab from './tabs/AdminReportsTab'

const NAV_ITEMS = [
  { id: 'overview',       label: 'Overview',             icon: LayoutDashboard },
  { id: 'users',          label: 'Users',                icon: Users },
  { id: 'deleted',        label: 'Deleted Accounts',     icon: UserX },
  { id: 'content',        label: 'Content',              icon: Music2 },
  { id: 'moderation',     label: 'Content Moderation',   icon: ShieldAlert },
  { id: 'playlists',      label: 'Playlists & Mixes',    icon: ListMusic },
  { id: 'reports',        label: 'Reports',              icon: Flag },
  { id: 'algorithm',      label: 'Algorithm',            icon: Cpu },
  { id: 'analytics',      label: 'Analytics',            icon: BarChart3 },
  { id: 'infrastructure', label: 'Infrastructure',       icon: Server },
  { id: 'admins',         label: 'Admins',               icon: ShieldCheck },
  { id: 'settings',       label: 'Settings',             icon: Settings },
]

const ACCENT_COLORS = [
  { value: '#1DB954', name: 'Spotify Green' },
  { value: '#1E90FF', name: 'Electric Blue' },
  { value: '#FF6B6B', name: 'Coral Red' },
  { value: '#A855F7', name: 'Purple' },
  { value: '#F59E0B', name: 'Amber' },
]

export default function AdminLayout() {
  const { tab: pathTab } = useParams()
  const [searchParams] = useSearchParams()
  const currentTab = searchParams.get('tab') || pathTab || 'users'
  const { user, profile, logout } = useAuth()
  const { settings: audioSettings, update: updateSetting } = useAudioSettings()
  const navigate = useNavigate()

  const [globalSearch, setGlobalSearch] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const themeMenuRef = useRef(null)

  const currentTheme = audioSettings?.theme || 'dark'
  const currentAccent = audioSettings?.accent || '#1DB954'
  const isSuperAdmin = user?.email === 'malithrajamanthri@gmail.com'

  const handleSelectTab = tabId => {
    navigate(`/soundwave-dashboard?tab=${tabId}`)
  }

  const handleSignOut = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (_) {}
  }

  // Close theme menu when clicking outside
  useEffect(() => {
    const handleClickOutside = e => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
        setThemeMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeItem = NAV_ITEMS.find(item => item.id === currentTab) || NAV_ITEMS[1]

  return (
    <div className="flex h-screen bg-[var(--bg,#0a0b12)] text-[var(--text,#ffffff)] overflow-hidden font-sans selection:bg-[var(--brand,#1DB954)] selection:text-white transition-colors duration-300">
      {/* ── Left Cybernetic Sidebar ── */}
      <aside className="w-64 bg-[var(--bg2,#0d0e19)] flex flex-col border-r border-[var(--bg3,rgba(255,255,255,0.06))] shrink-0 z-30 select-none transition-colors duration-300">
        {/* Brand Header */}
        <div className="p-5 border-b border-[var(--bg3,rgba(255,255,255,0.06))] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SoundWaveLogo size={36} animated glow />

            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight font-display text-[var(--text,#ffffff)]">
                  SoundWave
                </span>
                <span
                  className="px-1.5 py-0.2 rounded text-[10px] font-extrabold border tracking-wider"
                  style={{
                    backgroundColor: 'rgba(var(--brand-rgb, 29, 185, 84), 0.15)',
                    color: 'var(--brand, #1DB954)',
                    borderColor: 'var(--brand, #1DB954)'
                  }}
                >
                  ADMIN
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted,#9ca3af)] font-medium">Control console</p>
            </div>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto custom-scroll">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = currentTab === id
            return (
              <button
                key={id}
                onClick={() => handleSelectTab(id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 text-left ${
                  isActive
                    ? 'text-white shadow-sm border font-bold'
                    : 'text-[var(--text-muted,#9ca3af)] hover:text-[var(--text,#ffffff)] hover:bg-white/[0.04]'
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: 'var(--brand, #1DB954)',
                        borderColor: 'var(--brand, #1DB954)',
                        color: '#ffffff'
                      }
                    : {}
                }
              >
                <Icon
                  size={16}
                  className={isActive ? 'text-white' : 'text-[var(--text-muted,#9ca3af)]'}
                />
                <span>{label}</span>
              </button>
            )
          })}
        </nav>

        {/* Bottom Profile Capsule & Sign Out */}
        <div className="p-4 border-t border-[var(--bg3,rgba(255,255,255,0.06))] space-y-3 bg-[var(--bg,#0a0b12)]/60">
          {/* Administrator capsule */}
          <div className="p-3 rounded-2xl bg-[var(--bg3,#141524)] border border-white/5 flex items-center gap-3">
            {profile?.photoURL || user?.photoURL ? (
              <img
                src={profile?.photoURL || user?.photoURL}
                alt="Admin"
                className="w-8 h-8 rounded-full object-cover shrink-0 shadow-md ring-1 ring-white/10"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full text-white flex items-center justify-center font-extrabold text-xs shadow-md shrink-0"
                style={{
                  background: isSuperAdmin
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                    : 'linear-gradient(135deg, var(--brand, #1DB954), #8b5cf6)'
                }}
              >
                {(user?.displayName?.[0] || user?.email?.[0] || 'M').toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-[var(--text,#ffffff)] truncate">
                  {isSuperAdmin ? 'Super Administrator' : 'Administrator'}
                </p>
                {isSuperAdmin && <Sparkles size={11} className="text-amber-400 shrink-0" />}
              </div>
              <p className="text-[10px] text-[var(--text-muted,#9ca3af)] font-medium truncate">
                {user?.email || 'malithrajamanthri@gmail.com'}
              </p>
            </div>
          </div>

          {/* Sign Out Outlined Button */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-white/10 text-xs font-semibold text-[var(--text-muted,#9ca3af)] hover:text-[var(--text,#ffffff)] hover:bg-white/5 hover:border-white/20 transition-all active:scale-[0.98]"
          >
            <LogOut size={14} className="text-gray-400" />
            <span>Sign out</span>
          </button>

          {/* Quick link back to SoundWave Player */}
          <Link
            to="/"
            className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-muted,#9ca3af)] hover:text-[var(--brand,#1DB954)] transition-colors pt-1"
          >
            <span>Return to SoundWave App</span>
            <ExternalLink size={11} />
          </Link>
        </div>
      </aside>

      {/* ── Main Panel ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg,#0a0b12)]">
        {/* Top Control Bar */}
        <header className="px-8 pt-6 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 border-b border-[var(--bg3,rgba(255,255,255,0.06))]">
          <div>
            <div
              className="text-[10px] font-extrabold uppercase tracking-widest mb-0.5"
              style={{ color: 'var(--brand, #1DB954)' }}
            >
              SECURE CONSOLE
            </div>
            <h1 className="text-2xl font-extrabold text-[var(--text,#ffffff)] tracking-tight font-display">
              {activeItem.label}
            </h1>
            <p className="text-xs text-[var(--text-muted,#9ca3af)] mt-0.5 max-w-xl">
              Control dashboard for music listeners, verified artists, content filters, and trust reports.
            </p>
          </div>

          {/* Top Right Controls with Real Theme Switcher */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Search Pill Bar */}
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                placeholder="Search users or content"
                className="w-56 lg:w-64 bg-[var(--bg2,#141525)] border border-[var(--bg3,rgba(255,255,255,0.1))] rounded-full pl-9 pr-4 py-2 text-xs text-[var(--text,#ffffff)] placeholder-gray-500 focus:outline-none transition-all"
                style={{
                  borderColor: globalSearch ? 'var(--brand, #1DB954)' : undefined
                }}
              />
            </div>

            {/* Live Channel / Live Engine Badge */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-extrabold shadow-sm"
              style={{
                backgroundColor: 'rgba(var(--brand-rgb, 29, 185, 84), 0.1)',
                borderColor: 'rgba(var(--brand-rgb, 29, 185, 84), 0.3)',
                color: 'var(--brand, #1DB954)'
              }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: 'var(--brand, #1DB954)' }}
              />
              <span>LIVE CHANNEL</span>
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => setNotificationsOpen(v => !v)}
              className="relative p-2 rounded-full bg-[var(--bg2,#141525)] border border-white/10 text-gray-300 hover:text-white transition-all"
              title="Notifications"
            >
              <Bell size={15} />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-md">
                3
              </span>
            </button>

            {/* Theme & Accent Interactive Dropdown Pill */}
            <div className="relative" ref={themeMenuRef}>
              <button
                onClick={() => setThemeMenuOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg2,#141525)] border border-white/10 text-xs font-semibold text-[var(--text,#ffffff)] hover:border-white/25 transition-all shadow-sm"
              >
                {currentTheme === 'light' ? (
                  <Sun size={14} className="text-amber-400" />
                ) : (
                  <Moon size={14} style={{ color: 'var(--brand, #1DB954)' }} />
                )}
                <span className="capitalize">{currentTheme}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20"
                  style={{ backgroundColor: currentAccent }}
                  title="Active Accent Colour"
                />
                <ChevronDown size={13} className="text-gray-400" />
              </button>

              {/* Dropdown Menu */}
              {themeMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-[var(--bg2,#141525)] border border-white/10 rounded-2xl shadow-2xl p-3 z-50 animate-fade-in space-y-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted,#9ca3af)] mb-1.5">
                      Theme Mode
                    </p>
                    <div className="space-y-1">
                      {[
                        { id: 'dark', label: 'Dark Mode', icon: Moon },
                        { id: 'amoled', label: 'AMOLED Black', icon: Moon },
                        { id: 'light', label: 'Light Mode', icon: Sun },
                      ].map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          onClick={() => {
                            updateSetting('theme', id)
                            setThemeMenuOpen(false)
                            toast.success(`Theme switched to ${label}`)
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                            currentTheme === id
                              ? 'bg-[var(--brand,#1DB954)] text-white font-bold'
                              : 'text-gray-300 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon size={13} />
                            <span>{label}</span>
                          </div>
                          {currentTheme === id && <Check size={13} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted,#9ca3af)] mb-1.5">
                      SoundWave Accent
                    </p>
                    <div className="flex items-center gap-2 justify-between px-1">
                      {ACCENT_COLORS.map(c => (
                        <button
                          key={c.value}
                          onClick={() => {
                            updateSetting('accent', c.value)
                            toast.success(`Accent color set to ${c.name}`)
                          }}
                          className={`w-6 h-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center ${
                            currentAccent === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : ''
                          }`}
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                        >
                          {currentAccent === c.value && <Check size={11} className="text-white drop-shadow" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content Body */}
        <main className="flex-1 overflow-y-auto px-8 pb-8 pt-6 custom-scroll">
          {currentTab === 'users' && <AdminUsersTab search={globalSearch} />}
          {currentTab === 'overview' && <AdminOverviewTab />}
          {currentTab === 'deleted' && <AdminDeletedTab search={globalSearch} />}
          {currentTab === 'content' && <AdminContentTab search={globalSearch} />}
          {currentTab === 'moderation' && <AdminModerationTab />}
          {currentTab === 'playlists' && <AdminPlaylistsTab />}
          {currentTab === 'reports' && <AdminReportsTab />}
          {currentTab === 'algorithm' && <AdminAlgorithmTab />}
          {currentTab === 'analytics' && <AdminAnalyticsTab />}
          {currentTab === 'infrastructure' && <AdminInfrastructureTab />}
          {currentTab === 'admins' && <AdminAdminsTab />}
          {currentTab === 'settings' && <AdminSettingsTab />}
        </main>
      </div>
    </div>
  )
}
