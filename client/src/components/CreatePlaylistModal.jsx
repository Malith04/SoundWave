import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Music2, X, Sparkles } from 'lucide-react'

export default function CreatePlaylistModal({
  isOpen,
  onClose,
  onCreate,
  initialName = '',
  title = 'Create Playlist',
  buttonText = 'Create Playlist',
  anchorRect = null,
}) {
  const [name, setName] = useState(initialName)
  const [loading, setLoading] = useState(false)
  const [coords, setCoords] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setName(initialName)
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [isOpen, initialName])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) {
      setCoords(null)
      return
    }

    const updatePosition = () => {
      if (anchorRect && window.innerWidth >= 640) {
        const cardWidth = 340
        const cardHeight = 250
        const pad = 16

        // Position sideways to the right of the anchor button
        let left = anchorRect.right + 12
        if (left + cardWidth > window.innerWidth - pad) {
          left = Math.max(pad, anchorRect.left - cardWidth - 12)
        }

        // Align vertically with anchor center or top
        let top = anchorRect.top - 20
        if (top + cardHeight > window.innerHeight - pad) {
          top = Math.max(pad, window.innerHeight - cardHeight - pad)
        }
        if (top < pad) top = pad

        const arrowTop = Math.max(16, Math.min(anchorRect.top - top + (anchorRect.height / 2) - 8, cardHeight - 24))

        setCoords({ left, top, arrowTop })
      } else {
        setCoords(null) // Centered modal mode on mobile or when no anchor
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [isOpen, anchorRect])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setLoading(true)
    try {
      await onCreate(trimmed)
      setName('')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  // Render via React Portal into document.body so it breaks out of the sidebar container
  return createPortal(
    <div
      className={`fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] animate-fade-in ${
        coords ? '' : 'flex items-center justify-center p-3 xs:p-4'
      }`}
      onClick={onClose}
    >
      <div
        style={
          coords
            ? {
                position: 'fixed',
                left: `${coords.left}px`,
                top: `${coords.top}px`,
                width: '340px',
              }
            : undefined
        }
        className={`relative ${
          coords ? 'w-[340px]' : 'w-full max-w-sm sm:max-w-md'
        } bg-[#16161a] border border-white/10 rounded-2xl sm:rounded-3xl p-4 xs:p-5 sm:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95),0_0_35px_rgba(29,185,84,0.12)] animate-pop-in overflow-visible`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pointer arrow pointing towards the anchor button when in sideways popover mode */}
        {coords && (
          <div
            className="hidden sm:block absolute -left-2 w-4 h-4 bg-[#16161a] border-l border-t border-white/10 -rotate-45 pointer-events-none"
            style={{ top: `${coords.arrowTop}px` }}
          />
        )}

        {/* Soft top inner glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-14 bg-brand/15 blur-2xl pointer-events-none rounded-full" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/25 flex items-center justify-center text-brand shrink-0">
              <Music2 size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">{title}</h2>
              <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                <Sparkles size={11} className="text-brand shrink-0" />
                Organize your favourite tracks
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 relative">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-0.5">
              Playlist Title
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Late Night Vibes..."
              className="w-full h-11 bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 focus:border-brand focus:ring-1 focus:ring-brand/40 rounded-xl px-3.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-all duration-200"
              required
            />
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-semibold text-xs sm:text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 h-10 rounded-full bg-brand hover:bg-brand-dark text-black font-extrabold text-xs sm:text-sm transition-all duration-200 disabled:opacity-40 shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                buttonText
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
