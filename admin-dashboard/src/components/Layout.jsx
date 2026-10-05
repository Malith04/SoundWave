import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Music, Users, BarChart3, LogOut, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import SoundWaveLogo from './SoundWaveLogo'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/songs', icon: Music, label: 'Songs & Media' },
  { to: '/users', icon: Users, label: 'User Directory' },
  { to: '/analytics', icon: BarChart3, label: 'Streaming Analytics' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const currentNavItem = navItems.find(item => item.to === location.pathname) || { label: 'Admin Console' }

  return (
    <div className="flex h-screen bg-[#07080b] text-white overflow-hidden font-sans">
      {/* ── Left Sidebar ── */}
      <aside className="w-64 bg-[#0d0f15]/90 backdrop-blur-xl flex flex-col border-r border-white/10 shrink-0 z-20">
        {/* Brand Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SoundWaveLogo size={36} animated glow />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight font-display text-white">SoundWave</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand/20 text-brand border border-brand/30">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium">Admin Workspace</p>
            </div>
          </div>
        </div>

        {/* Live System Indicator */}
        <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
              </span>
              <span className="text-[11px] font-medium text-gray-300">Live Database</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
              Online
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Management
          </div>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-brand/20 to-emerald-500/10 text-brand border border-brand/30 shadow-lg shadow-brand/10'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`
              }
            >
              <Icon size={17} className="shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Quick Launch & Footer Actions */}
        <div className="p-3 border-t border-white/10 space-y-2 bg-[#090a0f]/60">
          {/* Link back to Main SoundWave Web App */}
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-brand group-hover:rotate-12 transition-transform" />
              <span>Launch App (Player)</span>
            </div>
            <ExternalLink size={13} className="text-gray-500 group-hover:text-gray-300" />
          </a>

          {/* Admin User Profile Capsule */}
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand to-emerald-400 text-black flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                {user?.email?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.email || 'Admin'}</p>
                <div className="flex items-center gap-1 text-[10px] text-brand">
                  <ShieldCheck size={11} />
                  <span>Verified SuperAdmin</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0"
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-[#0e1017] to-[#07080b]">
        {/* Top Header Bar */}
        <header className="h-16 px-8 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0d0f15]/50 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400">Admin</span>
            <span className="text-gray-600">/</span>
            <h1 className="text-sm font-bold text-white font-display tracking-tight">
              {currentNavItem.label}
            </h1>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300">
              <span className="w-2 h-2 rounded-full bg-brand" />
              <span>SoundWave v1.0.0 Pro</span>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
