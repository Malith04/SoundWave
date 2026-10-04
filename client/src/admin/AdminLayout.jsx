import { useState, useEffect } from 'react'
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
  ChevronDown,
  LogOut,
  ExternalLink,
  Flag,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import SoundWaveLogo from '../components/SoundWaveLogo'

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

export default function AdminLayout() {
  const { tab: pathTab } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = searchParams.get('tab') || pathTab || 'users'
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()

  const [globalSearch, setGlobalSearch] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const handleSelectTab = tabId => {
    navigate(`/soundwave-dashboard?tab=${tabId}`)
  }

  const handleSignOut = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (_) {}
  }

  const activeItem = NAV_ITEMS.find(item => item.id === currentTab) || NAV_ITEMS[1]

  return (
    <div className="flex h-screen bg-[#0a0b12] text-white overflow-hidden font-sans selection:bg-[#6366f1] selection:text-white">
      {/* ── Left Cybernetic Sidebar ── */}
      <aside className="w-64 bg-[#0d0e19] flex flex-col border-r border-white/5 shrink-0 z-30 select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Custom rounded gradient logo badge */}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6366f1] via-[#8b5cf6] to-[#ec4899] p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#0d0e19] rounded-[14px] flex items-center justify-center">
                <SoundWaveLogo size={22} animated glow={false} />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight font-display text-white">SoundWave</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-white/10 text-white border border-white/20 tracking-wider">
                  ADMIN
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium">Admin panel</p>
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
                    ? 'text-white bg-white/10 shadow-sm border border-white/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-[#a5b4fc]' : 'text-gray-400'} />
                <span>{label}</span>
              </button>
            )
          })}
        </nav>

        {/* Bottom Profile Capsule & Sign Out */}
        <div className="p-4 border-t border-white/5 space-y-3 bg-[#0a0b12]/60">
          {/* Administrator capsule */}
          <div className="p-3 rounded-2xl bg-[#141524] border border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#ec4899] to-[#8b5cf6] text-white flex items-center justify-center font-extrabold text-xs shadow-md shrink-0">
              {(profile?.displayName?.[0] || user?.email?.[0] || 'A').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">Administrator</p>
              <p className="text-[10px] text-gray-500 font-medium truncate">Allowlisted IP</p>
            </div>
          </div>

          {/* Sign Out Outlined Button */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-white/10 text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all active:scale-[0.98]"
          >
            <LogOut size={14} className="text-gray-400" />
            <span>Sign out</span>
          </button>

          {/* Quick link back to SoundWave Player */}
          <Link
            to="/"
            className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500 hover:text-[#1DB954] transition-colors pt-1"
          >
            <span>Return to SoundWave App</span>
            <ExternalLink size={11} />
          </Link>
        </div>
      </aside>

      {/* ── Main Panel ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-br from-[#0c0d17] via-[#090a10] to-[#07080b]">
        {/* Top Control Bar */}
        <header className="px-8 pt-6 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div>
            <div className="text-[10px] font-extrabold text-[#818cf8] uppercase tracking-widest mb-0.5">
              SECURE CONSOLE
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight font-display">
              {activeItem.label}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5 max-w-xl">
              Control dashboard for volunteer network users, content filters, safety campaigns, and trust reports.
            </p>
          </div>

          {/* Top Right Controls matching screenshot */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Search Pill Bar */}
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                placeholder="Search users or content"
                className="w-56 lg:w-64 bg-[#141525] border border-white/10 rounded-full pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#6366f1] transition-all"
              />
            </div>

            {/* Live Channel / Live Engine Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#141525] border border-white/10 text-[11px] font-extrabold text-emerald-400 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE CHANNEL</span>
            </div>

            {/* Notification Bell with counter */}
            <button
              onClick={() => setNotificationsOpen(v => !v)}
              className="relative p-2 rounded-full bg-[#141525] border border-white/10 text-gray-300 hover:text-white transition-all"
              title="Notifications"
            >
              <Bell size={15} />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#ec4899] text-white text-[9px] font-bold flex items-center justify-center shadow-md">
                9
              </span>
            </button>

            {/* Theme dropdown pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#141525] border border-white/10 text-xs font-semibold text-gray-300">
              <Moon size={14} className="text-indigo-400" />
              <span>Dark</span>
              <ChevronDown size={13} className="text-gray-500" />
            </div>
          </div>
        </header>

        {/* Scrollable Content Body */}
        <main className="flex-1 overflow-y-auto px-8 pb-8 custom-scroll">
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
