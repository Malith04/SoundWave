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

export default function AdminUsersTab({ search = '' }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeProvider, setActiveProvider] = useState('All providers')
  const [activeRole, setActiveRole] = useState('All roles')
  const [activeStatus, setActiveStatus] = useState('All statuses')
  const [selectedUser, setSelectedUser] = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  // Fetch real users from PostgreSQL database
  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      } else {
        toast.error('Failed to load users from database')
      }
    } catch (err) {
      console.error(err)
      toast.error('Network error loading users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // Filter pills matching the ImpactEcho design
  const providerFilters = ['All providers', 'Google', 'Standard']
  const roleFilters = ['All roles', 'USER', 'ADMIN', 'SUPER_ADMIN']
  const statusFilters = [
    'All statuses',
    'Active',
    'Verified',
    'Unverified',
    '2FA enabled',
    'Recoverable deletion',
    'Banned'
  ]

  // Filter logic on real database records
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
        if (activeStatus === 'Banned' && u.status !== 'BANNED') return false
      }

      return true
    })
  }, [users, search, activeProvider, activeRole, activeStatus])

  // Real Ban / Unban API handler
  const handleToggleBan = async (user, e) => {
    e.stopPropagation()
    if (user.email === 'malithrajamanthri@gmail.com') {
      return toast.error('Super Admin account cannot be banned.')
    }

    const willBan = user.status !== 'BANNED'
    setActionLoadingId(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/ban`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBanned: willBan })
      })

      if (res.ok) {
        setUsers(prev =>
          prev.map(u =>
            u.id === user.id
              ? {
                  ...u,
                  status: willBan ? 'BANNED' : 'ACTIVE',
                  trustScore: willBan ? 30 : 100,
                  strikes: willBan ? 1 : 0
                }
              : u
          )
        )
        if (willBan) {
          toast.error(`User ${user.email} has been banned in database.`)
        } else {
          toast.success(`User ${user.email} unbanned successfully!`)
        }
      } else {
        const errData = await res.json().catch(() => ({}))
        toast.error(errData.error || 'Failed to update ban status in database.')
      }
    } catch (_) {
      toast.error('Network error during ban operation.')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Real Restore user API handler
  const handleRestoreUser = async (user, e) => {
    e.stopPropagation()
    setActionLoadingId(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/restore`, {
        method: 'POST'
      })
      if (res.ok) {
        setUsers(prev =>
          prev.map(u => (u.id === user.id ? { ...u, status: 'ACTIVE' } : u))
        )
        toast.success(`Account for ${user.email} restored successfully!`)
      } else {
        toast.error('Failed to restore user.')
      }
    } catch (_) {
      toast.error('Network error during account restore.')
    } finally {
      setActionLoadingId(null)
    }
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
      {/* ── Filter Pills Row (Theme Responsive) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Providers Group */}
          <div className="flex items-center gap-1.5 bg-[var(--bg2,#0f101d)] p-1 rounded-full border border-[var(--bg3,rgba(255,255,255,0.06))]">
            {providerFilters.map(p => {
              const isSelected = activeProvider === p
              return (
                <button
                  key={p}
                  onClick={() => setActiveProvider(p)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                    isSelected
                      ? 'text-white shadow-md'
                      : 'text-[var(--text-muted,#9ca3af)] hover:text-[var(--text,#ffffff)] hover:bg-white/5'
                  }`}
                  style={
                    isSelected
                      ? { backgroundColor: 'var(--brand, #1DB954)', color: '#ffffff' }
                      : {}
                  }
                >
                  {p}
                </button>
              )
            })}
          </div>

          {/* Roles Group */}
          <div className="flex items-center gap-1.5 bg-[var(--bg2,#0f101d)] p-1 rounded-full border border-[var(--bg3,rgba(255,255,255,0.06))]">
            {roleFilters.map(r => {
              const isSelected = activeRole === r
              return (
                <button
                  key={r}
                  onClick={() => setActiveRole(r)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                    isSelected
                      ? 'text-white shadow-md'
                      : 'text-[var(--text-muted,#9ca3af)] hover:text-[var(--text,#ffffff)] hover:bg-white/5'
                  }`}
                  style={
                    isSelected
                      ? { backgroundColor: 'var(--brand, #1DB954)', color: '#ffffff' }
                      : {}
                  }
                >
                  {r}
                </button>
              )
            })}
          </div>

          {/* Statuses Group */}
          <div className="flex items-center gap-1.5 bg-[var(--bg2,#0f101d)] p-1 rounded-full border border-[var(--bg3,rgba(255,255,255,0.06))]">
            {statusFilters.map(s => {
              const isSelected = activeStatus === s
              return (
                <button
                  key={s}
                  onClick={() => setActiveStatus(s)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                    isSelected
                      ? 'text-white shadow-md'
                      : 'text-[var(--text-muted,#9ca3af)] hover:text-[var(--text,#ffffff)] hover:bg-white/5'
                  }`}
                  style={
                    isSelected
                      ? { backgroundColor: 'var(--brand, #1DB954)', color: '#ffffff' }
                      : {}
                  }
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={loadUsers}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--bg2,#141525)] border border-[var(--bg3,rgba(255,255,255,0.1))] text-xs font-semibold text-[var(--text-muted,#9ca3af)] hover:text-[var(--text,#ffffff)] transition-all disabled:opacity-50"
          title="Refresh database records"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Table Container Matching Screenshot (Theme Adapted) ── */}
      <div className="w-full bg-[var(--bg2,#0d0e19)] rounded-2xl border border-[var(--bg3,rgba(255,255,255,0.06))] overflow-hidden shadow-2xl transition-colors duration-300">
        {/* Table Head */}
        <div className="grid grid-cols-12 px-6 py-4 border-b border-[var(--bg3,rgba(255,255,255,0.06))] text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted,#9ca3af)] select-none">
          <div className="col-span-12 md:col-span-4">
            <span className="block">USER</span>
            <span className="block text-[10px] text-gray-500 font-semibold mt-0.5">ACTIONS</span>
          </div>
          <div className="hidden md:block md:col-span-2">PROVIDER</div>
          <div className="hidden md:block md:col-span-2">TRUST</div>
          <div className="hidden md:block md:col-span-2">LAST ACTIVE</div>
          <div className="hidden md:block md:col-span-2 text-right md:text-left">STATUS</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-[var(--bg3,rgba(255,255,255,0.06))]">
          {loading ? (
            <div className="py-20 text-center text-gray-500">
              <div
                className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
                style={{ borderColor: 'var(--brand, #1DB954)', borderTopColor: 'transparent' }}
              />
              <p className="text-xs font-semibold text-[var(--text-muted,#9ca3af)]">
                Loading registered database users...
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              <UserX size={44} className="mx-auto mb-3 opacity-20 text-[var(--brand,#1DB954)]" />
              <p className="text-sm font-semibold text-[var(--text-muted,#9ca3af)]">
                No users found in database
              </p>
              <p className="text-xs text-gray-500 mt-1">Try resetting the provider, role, or status pills.</p>
              <button
                onClick={() => {
                  setActiveProvider('All providers')
                  setActiveRole('All roles')
                  setActiveStatus('All statuses')
                }}
                className="mt-4 px-4 py-1.5 rounded-full text-white text-xs font-semibold hover:brightness-110 transition-all"
                style={{ backgroundColor: 'var(--brand, #1DB954)' }}
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            filteredUsers.map(u => {
              const initials = getInitials(u.name)
              const isBanned = u.status === 'BANNED'
              const isRecoverable = u.status === 'RECOVERABLE'
              const isActionLoading = actionLoadingId === u.id
              const isSuper = u.email === 'malithrajamanthri@gmail.com'

              return (
                <div
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/[0.03] transition-colors cursor-pointer group"
                >
                  {/* User Column */}
                  <div className="col-span-12 md:col-span-4 flex items-center gap-3.5 min-w-0 pr-4">
                    {/* Real Profile Image or Circle Initial Badge */}
                    {u.profilePicUrl ? (
                      <img
                        src={u.profilePicUrl}
                        alt={u.name}
                        className="w-10 h-10 rounded-full object-cover shrink-0 shadow-md ring-1 ring-white/10"
                        onError={e => {
                          e.target.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-md ring-1 ring-white/10`}
                        style={{
                          background: isSuper
                            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                            : `linear-gradient(135deg, var(--brand, #1DB954), #8b5cf6)`
                        }}
                      >
                        {initials}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs md:text-sm font-bold text-[var(--text,#ffffff)] truncate transition-colors">
                          {u.name}
                        </p>
                        {isSuper && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <span>SUPER</span>
                            <Sparkles size={9} />
                          </span>
                        )}
                        {!isSuper && u.role === 'ADMIN' && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-extrabold border"
                            style={{
                              backgroundColor: 'rgba(var(--brand-rgb, 29, 185, 84), 0.15)',
                              color: 'var(--brand, #1DB954)',
                              borderColor: 'var(--brand, #1DB954)'
                            }}
                          >
                            ADMIN
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted,#9ca3af)] truncate mt-0.5">{u.email}</p>
                    </div>
                  </div>

                  {/* Provider Column */}
                  <div className="hidden md:block md:col-span-2">
                    <p className="text-xs font-bold text-[var(--text,#ffffff)] uppercase tracking-wide">
                      {u.provider}
                    </p>
                    <p className="text-[11px] font-semibold text-[var(--text-muted,#9ca3af)] uppercase tracking-wide mt-0.5">
                      {isSuper ? 'SUPER_ADMIN' : u.role}
                    </p>
                  </div>

                  {/* Trust Column */}
                  <div className="hidden md:block md:col-span-2">
                    <p className={`text-xs font-bold ${isBanned ? 'text-rose-400' : 'text-emerald-400'}`}>
                      Score: {u.trustScore}
                    </p>
                    <p className="text-[11px] font-medium text-[var(--text-muted,#9ca3af)] mt-0.5">
                      {u.strikes} Strikes, {u.warns} Warns
                    </p>
                  </div>

                  {/* Last Active Column */}
                  <div className="hidden md:block md:col-span-2">
                    <p className="text-[11px] font-medium text-[var(--text-muted,#9ca3af)]">Last login</p>
                    <p className="text-xs font-medium text-[var(--text,#ffffff)] mt-0.5 truncate">
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
                    </div>

                    {/* Action button on right */}
                    <div className="flex items-center gap-2">
                      {isSuper ? (
                        <span className="text-xs font-bold text-amber-400">Owner</span>
                      ) : isRecoverable ? (
                        <button
                          disabled={isActionLoading}
                          onClick={e => handleRestoreUser(u, e)}
                          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors disabled:opacity-50"
                        >
                          {isActionLoading ? 'Restoring...' : 'Restore'}
                        </button>
                      ) : (
                        <button
                          disabled={isActionLoading}
                          onClick={e => handleToggleBan(u, e)}
                          className={`text-xs font-semibold transition-colors disabled:opacity-50 ${
                            isBanned
                              ? 'text-emerald-400 hover:text-emerald-300 hover:underline'
                              : 'text-rose-500 hover:text-rose-400 hover:underline'
                          }`}
                        >
                          {isActionLoading ? 'Updating...' : isBanned ? 'Unban User' : 'Ban User'}
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
            className="w-full max-w-lg bg-[var(--bg2,#0d0e19)] border border-[var(--bg3,rgba(255,255,255,0.1))] rounded-2xl p-6 shadow-2xl space-y-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--bg3,rgba(255,255,255,0.06))] pb-4">
              <div className="flex items-center gap-3">
                {selectedUser.profilePicUrl ? (
                  <img
                    src={selectedUser.profilePicUrl}
                    alt={selectedUser.name}
                    className="w-12 h-12 rounded-full object-cover shadow-lg ring-1 ring-white/10"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full text-white font-extrabold text-sm flex items-center justify-center shadow-lg"
                    style={{
                      background: selectedUser.email === 'malithrajamanthri@gmail.com'
                        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                        : `linear-gradient(135deg, var(--brand, #1DB954), #8b5cf6)`
                    }}
                  >
                    {getInitials(selectedUser.name)}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-[var(--text,#ffffff)]">{selectedUser.name}</h3>
                  <p className="text-xs text-[var(--text-muted,#9ca3af)]">{selectedUser.email}</p>
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
              <div className="p-3 bg-[var(--bg,#141525)] rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Provider</p>
                <p className="text-xs font-extrabold text-[var(--text,#ffffff)] mt-1">{selectedUser.provider}</p>
              </div>
              <div className="p-3 bg-[var(--bg,#141525)] rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Trust Score</p>
                <p
                  className={`text-xs font-extrabold mt-1 ${
                    selectedUser.status === 'BANNED' ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {selectedUser.trustScore} / 100
                </p>
              </div>
              <div className="p-3 bg-[var(--bg,#141525)] rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Status</p>
                <p className="text-xs font-extrabold text-emerald-400 mt-1">{selectedUser.status}</p>
              </div>
            </div>

            {/* SoundWave Music Activity Info (Real Database Data) */}
            <div className="space-y-3 bg-[var(--bg,#141525)]/60 p-4 rounded-xl border border-white/5 text-xs">
              <div className="flex justify-between text-[var(--text-muted,#9ca3af)]">
                <span>Database User ID</span>
                <span className="font-mono text-[11px] text-[var(--text,#ffffff)] truncate max-w-[240px]">
                  {selectedUser.id}
                </span>
              </div>
              <div className="flex justify-between text-[var(--text-muted,#9ca3af)]">
                <span>Account Role</span>
                <span className="font-bold text-[var(--text,#ffffff)]">
                  {selectedUser.email === 'malithrajamanthri@gmail.com' ? 'SUPER_ADMIN' : selectedUser.role}
                </span>
              </div>
              <div className="flex justify-between text-[var(--text-muted,#9ca3af)]">
                <span>Subscription Tier</span>
                <span className="font-bold uppercase text-emerald-400">{selectedUser.subscriptionTier}</span>
              </div>
              <div className="flex justify-between text-[var(--text-muted,#9ca3af)]">
                <span>Total Tracks Streamed</span>
                <span className="font-bold" style={{ color: 'var(--brand, #1DB954)' }}>
                  {selectedUser.totalPlayed} tracks
                </span>
              </div>
              <div className="flex justify-between text-[var(--text-muted,#9ca3af)]">
                <span>Member Since</span>
                <span className="font-bold text-[var(--text,#ffffff)]">
                  {new Date(selectedUser.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted,#9ca3af)] hover:text-white hover:bg-white/5"
              >
                Close
              </button>

              {selectedUser.email !== 'malithrajamanthri@gmail.com' && (
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
