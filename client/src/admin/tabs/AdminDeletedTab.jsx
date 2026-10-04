import { useState } from 'react'
import { UserX, RotateCcw, Trash2, Clock, AlertTriangle, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'

const INITIAL_DELETED = [
  {
    id: 'del_1',
    name: 'Hashintha Malith',
    email: 'hashinthamalith@gmail.com',
    deletedAt: '9/20/2026, 11:25:44 AM',
    daysRemaining: 4,
    status: 'RECOVERABLE',
    avatarColor: 'from-[#a855f7] to-[#7e22ce]'
  },
  {
    id: 'del_2',
    name: 'Kasun Bandara',
    email: 'kasun.b@example.com',
    deletedAt: '9/24/2026, 4:10:15 PM',
    daysRemaining: 8,
    status: 'RECOVERABLE',
    avatarColor: 'from-[#ec4899] to-[#be185d]'
  },
  {
    id: 'del_3',
    name: 'Nipuna Senanayake',
    email: 'nipuna.s@example.com',
    deletedAt: '9/18/2026, 09:12:00 AM',
    daysRemaining: 2,
    status: 'RECOVERABLE',
    avatarColor: 'from-[#6366f1] to-[#4338ca]'
  }
]

export default function AdminDeletedTab({ search = '' }) {
  const [deletedUsers, setDeletedUsers] = useState(INITIAL_DELETED)

  const handleRestore = user => {
    setDeletedUsers(prev => prev.filter(u => u.id !== user.id))
    toast.success(`Account for ${user.email} successfully restored!`)
  }

  const handlePurge = user => {
    if (!confirm(`Permanently purge ${user.email}? This cannot be undone.`)) return
    setDeletedUsers(prev => prev.filter(u => u.id !== user.id))
    toast.error(`Account ${user.email} permanently erased from database.`)
  }

  const filtered = deletedUsers.filter(u => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      {/* ── Notice Banner ── */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
            <Clock size={18} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-amber-300">14-Day Grace Recovery Policy</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Users who delete their account have 14 days to recover their library, playlists, and listening history before irreversible database purge.
            </p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 shrink-0">
          {deletedUsers.length} in Grace Period
        </span>
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
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              <UserX size={44} className="mx-auto mb-3 opacity-20 text-amber-400" />
              <p className="text-sm font-semibold text-gray-400">No deleted accounts pending recovery</p>
            </div>
          ) : (
            filtered.map(u => (
              <div
                key={u.id}
                className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors"
              >
                {/* User Column */}
                <div className="col-span-12 md:col-span-4 flex items-center gap-3.5 min-w-0 pr-4">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-tr ${u.avatarColor} text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-md`}
                  >
                    {u.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-bold text-white truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{u.email}</p>
                  </div>
                </div>

                {/* Deleted Date */}
                <div className="hidden md:block md:col-span-3">
                  <p className="text-xs text-gray-300 font-medium">{u.deletedAt}</p>
                  <span className="text-[10px] text-gray-500 font-semibold uppercase">Self-Requested</span>
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
                    onClick={() => handleRestore(u)}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
                  >
                    <RotateCcw size={12} />
                    <span>Restore</span>
                  </button>
                  <button
                    onClick={() => handlePurge(u)}
                    className="flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-400 hover:underline transition-colors"
                  >
                    <Trash2 size={12} />
                    <span>Purge</span>
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
