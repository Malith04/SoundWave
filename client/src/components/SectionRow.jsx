import { Link } from 'react-router-dom'
import { useRef } from 'react'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import SongCard from './SongCard'

export default function SectionRow({ title, subtitle, songs, linkTo, limit = 6 }) {
  const scrollRef = useRef(null)

  if (!songs?.length) return null

  const displaySongs = limit ? songs.slice(0, limit) : songs

  const scroll = (direction) => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -350 : 350
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' })
    }
  }

  return (
    <section className="mb-8 lg:mb-10">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold tracking-tight font-display text-white flex items-center gap-2">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs lg:text-sm text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {linkTo && (
            <Link
              to={linkTo}
              className="text-xs font-semibold text-gray-400 hover:text-brand uppercase tracking-wider flex items-center gap-1 transition-colors mr-2"
            >
              <span>See all</span>
              <ArrowRight size={13} />
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {displaySongs.map(song => (
          <SongCard key={song.id} song={song} queue={songs} />
        ))}
      </div>
    </section>
  )
}
