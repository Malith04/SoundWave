import { useState } from 'react'
import { ShieldCheck, Plus, Key, Lock, CheckCircle2, UserMinus } from 'lucide-react'
import toast from 'react-hot-toast'

const INITIAL_ADMINS = [
  {
    id: 'adm_1',
    name: 'Malith Rajamanthri',
    email: 'thegr8malith@gmail.com',
    role: 'SUPER_ADMIN',
    ipAllowlist: '112.134.xxx.xxx (Sri Lanka)',
    twoFactor: true,
    lastActive: 'Active Now',
    avatarColor: 'from-[#f59e0b] to-[#d97706]'
  },
  {
    id: 'adm_2',
    name: 'SoundWave Ops Admin',
    email: 'admin@soundwave.com',
    role: 'ADMIN',
    ipAllowlist: 'Dynamic Allowlist',
    twoFactor: true,
    lastActive: 'Today, 1:40 PM',
    avatarColor: 'from-[#10b981] to-[#059669]'
  }
]

export default function AdminAdminsTab() {
  const [admins, setAdmins] = useState(INITIAL_ADMINS)

  return (
    <div className="space-y-6">
      {/* ── Top Control ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Privileged Console Administrators
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Accounts with access to console controls, user bans, and infrastructure settings.
          </p>
        </div>

        <button
          onClick={() => toast.success('Admin invite modal opened')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus size={14} />
          <span>Grant Admin Privileges</span>
        </button>
      </div>

      {/* ── Admin Cards / Table ── */}
      <div className="w-full bg-[#0d0e19] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="grid grid-cols-12 px-6 py-4 border-b border-white/5 text-[11px] font-extrabold uppercase tracking-wider text-gray-400 select-none">
          <div className="col-span-12 md:col-span-4">ADMINISTRATOR</div>
          <div className="hidden md:block md:col-span-2">ROLE</div>
          <div className="hidden md:block md:col-span-3">ALLOWLISTED IP</div>
          <div className="hidden md:block md:col-span-2">2FA SECURITY</div>
          <div className="col-span-12 md:col-span-1 text-right">ACTION</div>
        </div>

        <div className="divide-y divide-white/5">
          {admins.map(adm => (
            <div
              key={adm.id}
              className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors"
            >
              <div className="col-span-12 md:col-span-4 flex items-center gap-3.5 pr-4">
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-tr ${adm.avatarColor} text-white font-extrabold text-xs flex items-center justify-center shadow-md`}
                >
                  {adm.name.substring(0, 2).toUpperCase()}
                </div>
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
                <p className="text-xs font-medium text-gray-300">{adm.ipAllowlist}</p>
              </div>

              <div className="hidden md:block md:col-span-2">
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                  <CheckCircle2 size={13} />
                  <span>Enforced</span>
                </span>
              </div>

              <div className="col-span-12 md:col-span-1 flex items-center justify-end mt-2 md:mt-0">
                {adm.role !== 'SUPER_ADMIN' ? (
                  <button
                    onClick={() => {
                      if (!confirm(`Revoke admin privileges for ${adm.email}?`)) return
                      setAdmins(prev => prev.filter(a => a.id !== adm.id))
                      toast.success('Admin privileges revoked')
                    }}
                    className="text-xs font-semibold text-rose-500 hover:text-rose-400 hover:underline"
                  >
                    Revoke
                  </button>
                ) : (
                  <span className="text-[11px] text-gray-500 font-semibold">Owner</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
