import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Mail,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Sparkles,
  ExternalLink,
  ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'

// Default sample users matching the exact ImpactEcho dashboard screenshot
const INITIAL_USERS = [
  {
    id: 'usr_1',
    name: 'Ananda Rathnayake',
    email: 'anandarathnayake58@gmail.com',
    provider: 'GOOGLE',
    role: 'USER',
    trustScore: 100,
    strikes: 0,
    warns: 0,
    lastLogin: '9/27/2026, 10:29:24 PM',
    status: 'ACTIVE',
    twoFactor: true,
    verified: true,
    avatarColor: 'from-[#1e1b4b] to-[#312e81]'
  },
  {
    id: 'usr_2',
    name: 'Hashintha Rajamanthri',
    email: 'hashrajamanthri@gmail.com',
    provider: 'GOOGLE',
    role: 'USER',
    trustScore: 100,
    strikes: 0,
    warns: 0,
    lastLogin: '9/27/2026, 10:12:15 PM',
    status: 'ACTIVE',
    twoFactor: true,
    verified: true,
    avatarColor: 'from-[#06b6d4] to-[#0284c7]'
  },
  {
    id: 'usr_3',
    name: 'Mihiranga Rathnayake',
    email: 'mihirangarathnayake2005@gmail.com',
    provider: 'GOOGLE',
    role: 'USER',
    trustScore: 100,
    strikes: 0,
    warns: 0,
    lastLogin: '9/27/2026, 10:29:49 PM',
    status: 'ACTIVE',
    twoFactor: true,
    verified: true,
    avatarColor: 'from-[#ec4899] to-[#be185d]'
  },
  {
    id: 'usr_4',
    name: 'Mihir SSJ',
    email: 'ssjmihir@gmail.com',
    provider: 'GOOGLE',
    role: 'USER',
    trustScore: 100,
    strikes: 0,
    warns: 0,
    lastLogin: '9/30/2026, 12:52:01 PM',
    status: 'ACTIVE',
    twoFactor: false,
    verified: true,
    avatarColor: 'from-[#6366f1] to-[#4338ca]'
  },
  {
    id: 'usr_5',
    name: 'Hashintha Malith',
    email: 'hashinthamalith@gmail.com',
    provider: 'GOOGLE',
    role: 'USER',
    trustScore: 100,
    strikes: 0,
    warns: 0,
    lastLogin: '9/20/2026, 11:25:44 AM',
    status: 'RECOVERABLE',
    twoFactor: false,
    verified: true,
    avatarColor: 'from-[#a855f7] to-[#7e22ce]'
  },
  {
    id: 'usr_6',
    name: 'Akalanka Rajamantri',
    email: 'akalankarajamantri@gmail.com',
    provider: 'GOOGLE',
    role: 'USER',
    trustScore: 100,
    strikes: 0,
    warns: 0,
    lastLogin: '9/27/2026, 10:13:25 PM',
    status: 'ACTIVE',
    twoFactor: true,
    verified: true,
    avatarColor: 'from-[#818cf8] to-[#6366f1]'
  },
  {
    id: 'usr_7',
    name: 'Malith Rajamanthri (Administrator)',
    email: 'thegr8malith@gmail.com',
    provider: 'GOOGLE',
    role: 'SUPER_ADMIN',
    trustScore: 100,
    strikes: 0,
    warns: 0,
    lastLogin: '10/4/2026, 2:15:00 PM',
    status: 'ACTIVE',
    twoFactor: true,
    verified: true,
    avatarColor: 'from-[#f59e0b] to-[#d97706]'
  },
  {
    id: 'usr_8',
    name: 'SoundWave Ops Admin',
    email: 'admin@soundwave.com',
    provider: 'STANDARD',
    role: 'ADMIN',
    trustScore: 100,
    strikes: 0,
    warns: 0,
    lastLogin: '10/4/2026, 1:40:12 PM',
    status: 'ACTIVE',
    twoFactor: true,
    verified: true,
    avatarColor: 'from-[#10b981] to-[#059669]'
  }
]

export default function AdminUsersTab({ search = '' }) {
  const [users, setUsers] = useState(INITIAL_USERS)
  const [loading, setLoading] = useState(false)
  const [activeProvider, setActiveProvider] = useState('All providers')
  const [activeRole, setActiveRole] = useState('All roles')
  const [activeStatus, setActiveStatus] = useState('All statuses')
  const [selectedUser, setSelectedUser] = useState(null)
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null)

  // Fetch real users from backend and merge
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/admin/users').catch(() => null)
        if (res && res.ok) {
          const apiUsers = await res.json()
          if (Array.isArray(apiUsers) && apiUsers.length > 0) {
            setUsers(prev => {
              const existingEmails = new Set(prev.map(u => u.email.toLowerCase()))
              const newItems = apiUsers
                .filter(u => u.email && !existingEmails.has(u.email.toLowerCase()))
                .map((u, i) => ({
                  id: u.id || `api_${i}`,
                  name: u.display_name || u.email?.split('@')[0] || 'SoundWave Listener',
                  email: u.email,
                  provider: u.auth_provider === 'google' ? 'GOOGLE' : 'STANDARD',
                  role: u.is_admin ? 'ADMIN' : 'USER',
                  trustScore: 100,
                  strikes: 0,
                  warns: 0,
                  lastLogin: u.created_at ? new Date(u.created_at).toLocaleString() : 'Recent',
                  status: 'ACTIVE',
                  twoFactor: false,
                  verified: true,
                  avatarColor: 'from-[#6366f1] to-[#ec4899]'
                }))
              return [...newItems, ...prev]
            })
          }
        }
      } catch (_) {}
    }
    fetchUsers()
  }, [])

  // Filter pills configuration matching screenshot exactly
  const providerFilters = ['All providers', 'Google', 'Standard']
  const roleFilters = ['All roles', 'USER', 'ADMIN', 'SUPER_ADMIN']
  const statusFilters = [
    'All statuses',
    'Active',
    'Verified',
    'Unverified',
    '2FA enabled',
    'Recoverable deletion',
    'Recovered'
  ]

  // Filter logic
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchesName = u.name?.toLowerCase().includes(q)
        const matchesEmail = u.email?.toLowerCase().includes(q)
        const matchesProvider = u.provider?.toLowerCase().includes(q)
        const matchesRole = u.role?.toLowerCase().includes(q)
        if (!matchesName && !matchesEmail && !matchesProvider && !matchesRole) {
          return false
        }
      }

      // Provider filter
      if (activeProvider !== 'All providers') {
        if (activeProvider === 'Google' && u.provider !== 'GOOGLE') return false
        if (activeProvider === 'Standard' && u.provider !== 'STANDARD') return false
      }

      // Role filter
      if (activeRole !== 'All roles') {
        if (u.role !== activeRole) return false
      }

      // Status filter
      if (activeStatus !== 'All statuses') {
        if (activeStatus === 'Active' && u.status !== 'ACTIVE') return false
        if (activeStatus === 'Verified' && !u.verified) return false
        if (activeStatus === 'Unverified' && u.verified) return false
        if (activeStatus === '2FA enabled' && !u.twoFactor) return false
        if (activeStatus === 'Recoverable deletion' && u.status !== 'RECOVERABLE') return false
        if (activeStatus === 'Recovered' && u.status !== 'RECOVERED') return false
      }

      return true
    })
  }, [users, search, activeProvider, activeRole, activeStatus])

  // Ban/Unban handler
  const handleToggleBan = (user, e) => {
    e.stopPropagation()
    const isBanned = user.status === 'BANNED'
    const newStatus = isBanned ? 'ACTIVE' : 'BANNED'
    setUsers(prev =>
      prev.map(u => (u.id === user.id ? { ...u, status: newStatus } : u))
    )
    if (isBanned) {
      toast.success(`User ${user.email} unbanned successfully!`)
    } else {
      toast.error(`User ${user.email} has been banned.`)
    }
  }

  // Restore recoverable user
  const handleRestoreUser = (user, e) => {
    e.stopPropagation()
    setUsers(prev =>
      prev.map(u => (u.id === user.id ? { ...u, status: 'ACTIVE' } : u))
    )
    toast.success(`Account for ${user.email} restored successfully!`)
  }

  // Helper for initials
  const getInitials = name => {
    if (!name) return 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  return (
    <div className="space-y-6">
      {/* ── Filter Pills Row (Exact Match to ImpactEcho Screenshot) ── */}
      <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
        {/* Providers Group */}
        <div className="flex items-center gap-1.5 bg-[#0f101d] p-1 rounded-full border border-white/5">
          {providerFilters.map(p => {
            const isSelected = activeProvider === p
            return (
              <button
                key={p}
                onClick={() => setActiveProvider(p)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  isSelected
                    ? 'bg-[#6366f1] text-white shadow-md shadow-indigo-500/25'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {p}
              </button>
            )
          })}
        </div>

        {/* Roles Group */}
        <div className="flex items-center gap-1.5 bg-[#0f101d] p-1 rounded-full border border-white/5">
          {roleFilters.map(r => {
            const isSelected = activeRole === r
            return (
              <button
                key={r}
                onClick={() => setActiveRole(r)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  isSelected
                    ? 'bg-[#6366f1] text-white shadow-md shadow-indigo-500/25'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {r}
              </button>
            )
          })}
        </div>

        {/* Statuses Group */}
        <div className="flex items-center gap-1.5 bg-[#0f101d] p-1 rounded-full border border-white/5">
          {statusFilters.map(s => {
            const isSelected = activeStatus === s
            return (
              <button
                key={s}
                onClick={() => setActiveStatus(s)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  isSelected
                    ? 'bg-[#6366f1] text-white shadow-md shadow-indigo-500/25'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {s}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Table Container Matching Screenshot ── */}
      <div className="w-full bg-[#0d0e19] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        {/* Table Head */}
        <div className="grid grid-cols-12 px-6 py-4 border-b border-white/5 text-[11px] font-extrabold uppercase tracking-wider text-gray-400 select-none">
          <div className="col-span-12 md:col-span-4">
            <span className="block">USER</span>
            <span className="block text-[10px] text-gray-600 font-semibold mt-0.5">ACTIONS</span>
          </div>
          <div className="hidden md:block md:col-span-2">PROVIDER</div>
          <div className="hidden md:block md:col-span-2">TRUST</div>
          <div className="hidden md:block md:col-span-2">LAST ACTIVE</div>
          <div className="hidden md:block md:col-span-2 text-right md:text-left">STATUS</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-white/5">
          {filteredUsers.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              <UserX size={44} className="mx-auto mb-3 opacity-20 text-indigo-400" />
              <p className="text-sm font-semibold text-gray-400">No users found matching your filters</p>
              <p className="text-xs text-gray-600 mt-1">Try resetting the provider, role, or status pills.</p>
              <button
                onClick={() => {
                  setActiveProvider('All providers')
                  setActiveRole('All roles')
                  setActiveStatus('All statuses')
                }}
                className="mt-4 px-4 py-1.5 rounded-full bg-[#6366f1] text-white text-xs font-semibold hover:bg-[#4f46e5] transition-all"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            filteredUsers.map(u => {
              const initials = getInitials(u.name)
              const isBanned = u.status === 'BANNED'
              const isRecoverable = u.status === 'RECOVERABLE'

              return (
                <div
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors cursor-pointer group"
                >
                  {/* User Column */}
                  <div className="col-span-12 md:col-span-4 flex items-center gap-3.5 min-w-0 pr-4">
                    {/* Circle Avatar matching screenshot */}
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-tr ${u.avatarColor || 'from-indigo-600 to-purple-600'} text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-md ring-1 ring-white/10`}
                    >
                      {initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs md:text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                          {u.name}
                        </p>
                        {u.role === 'SUPER_ADMIN' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            SUPER
                          </span>
                        )}
                        {u.role === 'ADMIN' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{u.email}</p>
                    </div>
                  </div>

                  {/* Provider Column */}
                  <div className="hidden md:block md:col-span-2">
                    <p className="text-xs font-bold text-gray-200 uppercase tracking-wide">
                      {u.provider}
                    </p>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mt-0.5">
                      {u.role}
                    </p>
                  </div>

                  {/* Trust Column */}
                  <div className="hidden md:block md:col-span-2">
                    <p className="text-xs font-bold text-emerald-400">
                      Score: {u.trustScore}
                    </p>
                    <p className="text-[11px] font-medium text-gray-500 mt-0.5">
                      {u.strikes} Strikes, {u.warns} Warns
                    </p>
                  </div>

                  {/* Last Active Column */}
                  <div className="hidden md:block md:col-span-2">
                    <p className="text-[11px] font-medium text-gray-500">Last login</p>
                    <p className="text-xs font-medium text-gray-300 mt-0.5 truncate">
                      {u.lastLogin}
                    </p>
                  </div>

                  {/* Status & Action Column matching screenshot */}
                  <div className="col-span-12 md:col-span-2 flex items-center justify-between mt-2 md:mt-0">
                    <div>
                      {u.status === 'ACTIVE' && (
                        <span className="text-xs font-extrabold text-emerald-400 tracking-wider">
                          ACTIVE
                        </span>
                      )}
                      {u.status === 'RECOVERABLE' && (
                        <span className="text-xs font-extrabold text-amber-500 tracking-wider">
                          RECOVERABLE
                        </span>
                      )}
                      {u.status === 'BANNED' && (
                        <span className="text-xs font-extrabold text-rose-500 tracking-wider">
                          BANNED
                        </span>
                      )}
                      {u.status === 'RECOVERED' && (
                        <span className="text-xs font-extrabold text-cyan-400 tracking-wider">
                          RECOVERED
                        </span>
                      )}
                    </div>

                    {/* Action button on right matching screenshot "Ban User" in red */}
                    <div className="flex items-center gap-2">
                      {isRecoverable ? (
                        <button
                          onClick={e => handleRestoreUser(u, e)}
                          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          onClick={e => handleToggleBan(u, e)}
                          className={`text-xs font-semibold transition-colors ${
                            isBanned
                              ? 'text-emerald-400 hover:text-emerald-300 hover:underline'
                              : 'text-rose-500 hover:text-rose-400 hover:underline'
                          }`}
                        >
                          {isBanned ? 'Unban User' : 'Ban User'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── User Details Modal / Drawer if row clicked ── */}
      {selectedUser && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="w-full max-w-lg bg-[#0d0e19] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full bg-gradient-to-tr ${selectedUser.avatarColor} text-white font-extrabold text-sm flex items-center justify-center shadow-lg`}
                >
                  {getInitials(selectedUser.name)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedUser.name}</h3>
                  <p className="text-xs text-gray-400">{selectedUser.email}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-[#141525] rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Provider</p>
                <p className="text-xs font-extrabold text-white mt-1">{selectedUser.provider}</p>
              </div>
              <div className="p-3 bg-[#141525] rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Trust Score</p>
                <p className="text-xs font-extrabold text-emerald-400 mt-1">
                  {selectedUser.trustScore} / 100
                </p>
              </div>
              <div className="p-3 bg-[#141525] rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Status</p>
                <p className="text-xs font-extrabold text-indigo-400 mt-1">{selectedUser.status}</p>
              </div>
            </div>

            {/* SoundWave Music Activity Info */}
            <div className="space-y-3 bg-[#141525]/60 p-4 rounded-xl border border-white/5 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Account Role</span>
                <span className="font-bold text-white">{selectedUser.role}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Two-Factor Authentication</span>
                <span className="font-bold text-white">
                  {selectedUser.twoFactor ? 'Enabled (Google Authenticator)' : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>SoundWave Music Stream Hours</span>
                <span className="font-bold text-emerald-400">148.5 hrs</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Curated Playlists</span>
                <span className="font-bold text-white">6 playlists</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Last Active Session</span>
                <span className="font-bold text-gray-300">{selectedUser.lastLogin}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5"
              >
                Close
              </button>

              <button
                onClick={e => {
                  handleToggleBan(selectedUser, e)
                  setSelectedUser(null)
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                  selectedUser.status === 'BANNED'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                    : 'bg-rose-600 text-white hover:bg-rose-500'
                }`}
              >
                {selectedUser.status === 'BANNED' ? 'Unban Account' : 'Ban Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
