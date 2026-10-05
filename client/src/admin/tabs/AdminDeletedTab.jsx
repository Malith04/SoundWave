import { useState, useEffect } from 'react'
import { UserX, RotateCcw, Trash2, Clock, AlertTriangle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminDeletedTab({ search = '' }) {
  const [deletedUsers, setDeletedUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)

  const loadDeleted = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/deleted-users')
      if (res.ok) {
        const data = await res.json()
        setDeletedUsers(data)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load deleted accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDeleted()
  }, [])

  const handleRestore = async user => {
    setActionId(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/restore`, { method: 'POST' })
      if (res.ok) {
        setDeletedUsers(prev => prev.filter(u => u.id !== user.id))
        toast.success(`Account for ${user.email} successfully restored in database!`)
      } else {
        toast.error('Failed to restore account')
      }
    } catch (_) {
      toast.error('Network error during account restore')
    } finally {
      setActionId(null)
    }
  }

  const handlePurge = async user => {
    if (!confirm(`Permanently purge ${user.email} from PostgreSQL database? This cannot be undone.`)) return
    setActionId(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/purge`, { method: 'DELETE' })
      if (res.ok) {
        setDeletedUsers(prev => prev.filter(u => u.id !== user.id))
        toast.error(`Account ${user.email} permanently erased from database.`)
      } else {
        toast.error('Failed to purge account')
      }
    } catch (_) {
      toast.error('Network error during account purge')
    } finally {
      setActionId(null)
    }
  }

  const filtered = deletedUsers.filter(u => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6">
      {/* ── Notice Banner ── */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
            <Clock size={18} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-amber-300">14-Day Grace Recovery Policy (PostgreSQL)</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Self-deleted accounts are held in recoverable status for 14 days before automated background worker purging.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDeleted}
            disabled={loading}
            className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-all disabled:opacity-50"
            title="Refresh database records"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 shrink-0">
            {deletedUsers.length} in Grace Period
          </span>
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="w-full bg-[#0d0e19] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="grid grid-cols-12 px-6 py-4 border-b border-white/5 text-[11px] font-extrabold uppercase tracking-wider text-gray-400 select-none">
          <div className="col-span-12 md:col-span-4">USER ACCOUNT</div>
          <div className="hidden md:block md:col-span-3">DELETED DATE</div>
          <div className="hidden md:block md:col-span-3">GRACE PERIOD REMAINING</div>
          <div className="col-span-12 md:col-span-2 text-right">ACTIONS</div>
        </div>

        <div className="divide-y divide-white/5">
          {loading ? (
            <div className="py-20 text-center text-gray-500">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold text-gray-400">Checking database for deleted accounts...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              <UserX size={44} className="mx-auto mb-3 opacity-20 text-amber-400" />
              <p className="text-sm font-semibold text-gray-400">No deleted accounts pending recovery</p>
              <p className="text-xs text-gray-600 mt-1">All registered PostgreSQL user accounts are currently active.</p>
            </div>
          ) : (
            filtered.map(u => (
              <div
                key={u.id}
                className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors"
              >
                {/* User Column */}
                <div className="col-span-12 md:col-span-4 flex items-center gap-3.5 min-w-0 pr-4">
                  {u.profilePicUrl ? (
                    <img
                      src={u.profilePicUrl}
                      alt={u.name}
                      className="w-10 h-10 rounded-full object-cover shrink-0 shadow-md ring-1 ring-white/10"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-600 to-rose-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-md">
                      {u.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-bold text-white truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{u.email}</p>
                  </div>
                </div>

                {/* Deleted Date */}
                <div className="hidden md:block md:col-span-3">
                  <p className="text-xs text-gray-300 font-medium">{u.deletedAt}</p>
                  <span className="text-[10px] text-gray-500 font-semibold uppercase">Database Tagged</span>
                </div>

                {/* Days remaining */}
                <div className="hidden md:block md:col-span-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {u.daysRemaining} days left
                    </span>
                    <span className="text-[11px] text-gray-500">until purge</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-3 mt-2 md:mt-0">
                  <button
                    disabled={actionId === u.id}
                    onClick={() => handleRestore(u)}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors disabled:opacity-50"
                  >
                    <RotateCcw size={12} />
                    <span>{actionId === u.id ? 'Restoring...' : 'Restore'}</span>
                  </button>
                  <button
                    disabled={actionId === u.id}
                    onClick={() => handlePurge(u)}
                    className="flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-400 hover:underline transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={12} />
                    <span>{actionId === u.id ? 'Purging...' : 'Purge'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
