import { useState } from 'react'
import { X, Upload, Music, Image, Check } from 'lucide-react'
import { upsertSong } from '../../services/songService'
import toast from 'react-hot-toast'

const GENRES = ['Pop', 'Rock', 'Hip-Hop', 'Chill', 'Electronic', 'Jazz', 'Classical', 'R&B', 'Acoustic']

export default function AdminUploadModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({ title: '', artist: '', album: '', genre: 'Pop' })
  const [audioName, setAudioName] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.title.trim() || !form.artist.trim()) {
      return toast.error('Please enter song title and artist')
    }

    setUploading(true)
    try {
      const newSong = {
        id: `upload_${Date.now()}`,
        title: form.title.trim(),
        artist: form.artist.trim(),
        album: form.album.trim() || 'Single',
        genre: form.genre,
        coverUrl: coverUrl.trim() || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3', // fallback demo track
        source: 'uploaded',
        duration: 215000,
      }

      await upsertSong(newSong)
      toast.success('Track uploaded to catalog!')
      onSuccess?.(newSong)
      onClose()
    } catch (err) {
      toast.error('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans animate-fade-in">
      <div className="glass-panel bg-[#12141c]/95 rounded-3xl w-full max-w-lg border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand/20 text-brand flex items-center justify-center">
              <Music size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-display">Add Catalog Track</h2>
              <p className="text-[11px] text-gray-400">Add metadata and stream configuration</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Song Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
              placeholder="e.g. Blinding Lights"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Artist *</label>
              <input
                type="text"
                required
                value={form.artist}
                onChange={e => setForm(f => ({ ...f, artist: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
                placeholder="e.g. The Weeknd"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Album</label>
              <input
                type="text"
                value={form.album}
                onChange={e => setForm(f => ({ ...f, album: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
                placeholder="e.g. After Hours"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Genre</label>
            <select
              value={form.genre}
              onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
              className="w-full bg-[#12141c] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand"
            >
              {GENRES.map(g => (
                <option key={g} value={g} className="bg-[#12141c] text-white">{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Artwork URL (optional)</label>
            <input
              type="url"
              value={coverUrl}
              onChange={e => setCoverUrl(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
              placeholder="https://images.unsplash.com/..."
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="bg-brand hover:bg-brand-hover text-black font-extrabold px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-brand/20 disabled:opacity-50"
            >
              {uploading ? 'Adding...' : 'Add Track'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
