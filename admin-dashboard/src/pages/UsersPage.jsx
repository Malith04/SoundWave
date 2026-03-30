import { useEffect, useState } from 'react'
import { Search, Trash2, Users } from 'lucide-react'
import { getUsers, deleteUser } from '../services/userService'
import toast from 'react-hot-toast'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getUsers()
      setUsers(data)
    } catch (err) {
      setError(err.code === 'permission-denied'
        ? 'Firestore rules are blocking this read. Publish the rules in Firebase Console.'
        : err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  useEffect(() => {
    if (!search) return setFiltered(users)
    setFiltered(users.filter(u =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    ))
  }, [users, search])

  const handleDelete = async user => {
    if (!confirm(`Remove user "${user.email}"?`)) return
    await deleteUser(user.uid || user.id)
    toast.success('User removed')
    loadUsers()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-gray-400 text-sm">{users.length} registered users</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full bg-d1 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-d1 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading users...</div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-red-400 font-semibold mb-2">Failed to load users</p>
            <p className="text-gray-500 text-sm max-w-md mx-auto">{error}</p>
            {error.includes('rules') && (
              <p className="text-gray-600 text-xs mt-3">
                Firebase Console → Firestore Database → Rules → paste <code>firebase/firestore.rules</code> → Publish
              </p>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            No users found
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-gray-500 text-sm">
                <th className="text-left p-4 font-medium">User</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Email</th>
                <th className="text-left p-4 font-medium hidden lg:table-cell">Favorites</th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-sm">
                        {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-sm">{user.name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-400 text-sm hidden md:table-cell">{user.email}</td>
                  <td className="p-4 text-gray-400 text-sm hidden lg:table-cell">{user.favoriteSongs?.length ?? 0} songs</td>
                  <td className="p-4">
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
