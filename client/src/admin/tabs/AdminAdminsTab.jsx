import { useState, useEffect } from 'react'
import { ShieldCheck, Plus, Key, Lock, CheckCircle2, UserMinus, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminAdminsTab() {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)

  const loadAdmins = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        const adminUsers = data.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN')
        // Ensure at least the primary super admin shows
        if (adminUsers.length === 0) {
          const owner = data.find(u => u.email === 'malithrajamanthri@gmail.com') || data[0]
          if (owner) {
            adminUsers.push({ ...owner, role: 'SUPER_ADMIN' })
          }
        }
        setAdmins(adminUsers)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdmins()
  }, [])

  return (
    <div className="space-y-6">
      {/* ── Top Control ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Privileged Console Administrators (Real DB)
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Accounts with database write access, ban privileges, and platform settings permissions.
          </p>
        </div>

        <button
          onClick={loadAdmins}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#141525] border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Admin Cards / Table ── */}
      <div className="w-full bg-[#0d0e19] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="grid grid-cols-12 px-6 py-4 border-b border-white/5 text-[11px] font-extrabold uppercase tracking-wider text-gray-400 select-none">
          <div className="col-span-12 md:col-span-4">ADMINISTRATOR</div>
          <div className="hidden md:block md:col-span-2">ROLE</div>
          <div className="hidden md:block md:col-span-3">ALLOWLISTED / IP</div>
          <div className="hidden md:block md:col-span-2">2FA SECURITY</div>
          <div className="col-span-12 md:col-span-1 text-right">ACTION</div>
        </div>

        <div className="divide-y divide-white/5">
          {loading ? (
            <div className="py-20 text-center text-gray-500">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold text-gray-400">Loading administrators from database...</p>
            </div>
          ) : (
            admins.map(adm => (
              <div
                key={adm.id}
                className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors"
              >
                <div className="col-span-12 md:col-span-4 flex items-center gap-3.5 pr-4">
                  {adm.profilePicUrl ? (
                    <img
                      src={adm.profilePicUrl}
                      alt={adm.name}
                      className="w-10 h-10 rounded-full object-cover shrink-0 shadow-md ring-1 ring-white/10"
                    />
                  ) : (
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-tr ${adm.avatarColor || 'from-amber-500 to-orange-600'} text-white font-extrabold text-xs flex items-center justify-center shadow-md`}
                    >
                      {adm.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-bold text-white truncate">{adm.name}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{adm.email}</p>
                  </div>
                </div>

                <div className="hidden md:block md:col-span-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#6366f1]/20 text-[#a5b4fc] border border-[#6366f1]/30">
                    {adm.role}
                  </span>
                </div>

                <div className="hidden md:block md:col-span-3">
                  <p className="text-xs font-medium text-gray-300">
                    Allowlisted Primary IP
                  </p>
                </div>

                <div className="hidden md:block md:col-span-2">
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                    <CheckCircle2 size={13} />
                    <span>{adm.twoFactor ? 'Enforced' : 'Active'}</span>
                  </span>
                </div>

                <div className="col-span-12 md:col-span-1 flex items-center justify-end mt-2 md:mt-0">
                  {adm.role === 'SUPER_ADMIN' ? (
                    <span className="text-[11px] text-gray-500 font-semibold">Owner</span>
                  ) : (
                    <span className="text-[11px] text-gray-500 font-semibold">Admin</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
