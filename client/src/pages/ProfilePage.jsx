import { useAuth } from '../context/AuthContext'
import { User, Mail, Music, Heart } from 'lucide-react'

export default function ProfilePage() {
  const { profile } = useAuth()

  return (
    <div className="px-6 py-6">
      <h1 className="text-3xl font-bold mb-8">Profile</h1>

      <div className="flex items-center gap-6 mb-10">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-4xl font-bold text-black">
          {profile?.name?.[0]?.toUpperCase() || <User size={36} />}
        </div>
        <div>
          <h2 className="text-2xl font-bold">{profile?.name || 'User'}</h2>
          <p className="text-gray-400 flex items-center gap-1.5 mt-1"><Mail size={14} /> {profile?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg">
        <div className="bg-surface-2 rounded-xl p-5">
          <Heart size={20} className="text-brand mb-2" />
          <p className="text-2xl font-bold">{profile?.favoriteSongs?.length || 0}</p>
          <p className="text-sm text-gray-400">Liked Songs</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-5">
          <Music size={20} className="text-brand mb-2" />
          <p className="text-2xl font-bold">{profile?.recentlyPlayed?.length || 0}</p>
          <p className="text-sm text-gray-400">Songs Played</p>
        </div>
      </div>
    </div>
  )
}
