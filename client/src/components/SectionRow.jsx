import { Link } from 'react-router-dom'
import SongCard from './SongCard'

export default function SectionRow({ title, songs, linkTo }) {
  if (!songs?.length) return null
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{title}</h2>
        {linkTo && (
          <Link to={linkTo} className="text-xs text-gray-400 hover:text-white font-semibold uppercase tracking-wider transition-colors">
            See all
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {songs.slice(0, 6).map(song => (
          <SongCard key={song.id} song={song} queue={songs} />
        ))}
      </div>
    </section>
  )
}
