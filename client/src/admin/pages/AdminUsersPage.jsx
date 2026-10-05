import { useEffect, useState } from 'react'
import { Search, Trash2, Users, ShieldCheck, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users').catch(() => null)
      if (res && res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map(u => ({
            id: u.id,
            name: u.display_name || u.email?.split('@')[0],
            email: u.email,
            isAdmin: u.is_admin,
            tier: u.subscription_tier || 'free',
            createdAt: u.created_at,
          }))
          setUsers(mapped)
          setLoading(false)
          return
        }
      }
      setUsers([])
    } catch (_) {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  useEffect(() => {
    if (!search.trim()) return setFiltered(users)
    const q = search.toLowerCase()
    setFiltered(users.filter(u =>
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    ))
  }, [users, search])

  const handleDelete = user => {
    if (!confirm(`Remove user "${user.email}"?`)) return
    setUsers(prev => prev.filter(u => u.id !== user.id))
    toast.success('User removed')
  }

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight font-display">
            User Directory & Access
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage registered SoundWave listeners, roles, and privileges.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-gray-300">
          <Users size={14} className="text-brand" />
          <span>{users.length} Total Registered Users</span>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by name or email address..."
          className="w-full bg-[#12141c] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
        />
      </div>

      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-16 text-center text-gray-500 text-xs flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <span>Loading user directory...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-gray-500 text-xs">
            <Users size={40} className="mx-auto mb-3 opacity-25" />
            No user accounts found matching your query
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-[11px] uppercase tracking-wider bg-white/[0.02]">
                  <th className="p-4 font-bold">User</th>
                  <th className="p-4 font-bold hidden md:table-cell">Account Role</th>
                  <th className="p-4 font-bold hidden lg:table-cell">Subscription Tier</th>
                  <th className="p-4 font-bold hidden lg:table-cell">Joined</th>
                  <th className="p-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand to-emerald-400 text-black font-extrabold text-xs flex items-center justify-center shrink-0 shadow-md">
                          {u.name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white text-xs truncate group-hover:text-brand transition-colors">
                            {u.name || 'Anonymous User'}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 hidden md:table-cell">
                      {u.isAdmin ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand/20 text-brand border border-brand/30">
                          <ShieldCheck size={11} /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
                          <UserCheck size={11} /> Member
                        </span>
                      )}
                    </td>

                    <td className="p-4 hidden lg:table-cell">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/5 text-gray-300 border border-white/5 capitalize">
                        {u.tier || 'Free'}
                      </span>
                    </td>

                    <td className="p-4 text-gray-500 font-mono text-[11px] hidden lg:table-cell">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active'}
                    </td>

                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(u)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        title="Delete User"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
