import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, Music, Image } from 'lucide-react'
import { addSong } from '../services/songService'
import toast from 'react-hot-toast'

const GENRES = ['Pop', 'Rock', 'Hip-Hop', 'Chill', 'Electronic', 'Jazz', 'Classical', 'R&B', 'Country']

export default function UploadSongModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ title: '', artist: '', album: '', genre: 'Pop' })
  const [audioFile, setAudioFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [progress, setProgress] = useState({ audio: 0, cover: 0 })
  const [uploading, setUploading] = useState(false)

  const onDropAudio = useCallback(files => setAudioFile(files[0]), [])
  const onDropCover = useCallback(files => setCoverFile(files[0]), [])

  const { getRootProps: getAudioProps, getInputProps: getAudioInput } = useDropzone({
    onDrop: onDropAudio, accept: { 'audio/*': [] }, maxFiles: 1
  })
  const { getRootProps: getCoverProps, getInputProps: getCoverInput } = useDropzone({
    onDrop: onDropCover, accept: { 'image/*': [] }, maxFiles: 1
  })

  const handleSubmit = async e => {
    e.preventDefault()
    if (!audioFile || !coverFile) return toast.error('Please select both audio and cover files')
    setUploading(true)
    try {
      await addSong(form, audioFile, coverFile, (type, p) => setProgress(prev => ({ ...prev, [type]: p })))
      toast.success('Song uploaded successfully')
      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-d1 rounded-2xl w-full max-w-lg border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-lg font-semibold">Upload New Song</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Metadata */}
          {[['title', 'Song Title'], ['artist', 'Artist'], ['album', 'Album']].map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm text-gray-400 mb-1">{label}</label>
              <input
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-d2 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand transition-colors"
                required
              />
            </div>
          ))}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Genre</label>
            <select
              value={form.genre}
              onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
              className="w-full bg-d2 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand"
            >
              {GENRES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>

          {/* Audio drop zone */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Audio File</label>
            <div {...getAudioProps()} className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-brand/50 transition-colors">
              <input {...getAudioInput()} />
              <Music size={24} className="mx-auto mb-2 text-gray-500" />
              {audioFile ? (
                <p className="text-sm text-brand">{audioFile.name}</p>
              ) : (
                <p className="text-sm text-gray-500">Drop audio file or click to browse</p>
              )}
            </div>
            {uploading && <div className="mt-1 h-1 bg-d2 rounded-full"><div className="h-1 bg-brand rounded-full transition-all" style={{ width: `${progress.audio}%` }} /></div>}
          </div>

          {/* Cover drop zone */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Cover Image</label>
            <div {...getCoverProps()} className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-brand/50 transition-colors">
              <input {...getCoverInput()} />
              {coverFile ? (
                <img src={URL.createObjectURL(coverFile)} alt="" className="w-16 h-16 rounded-lg object-cover mx-auto" />
              ) : (
                <>
                  <Image size={24} className="mx-auto mb-2 text-gray-500" />
                  <p className="text-sm text-gray-500">Drop cover image or click to browse</p>
                </>
              )}
            </div>
            {uploading && <div className="mt-1 h-1 bg-d2 rounded-full"><div className="h-1 bg-brand rounded-full transition-all" style={{ width: `${progress.cover}%` }} /></div>}
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-brand hover:bg-brand/90 text-black font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Upload size={18} />
            {uploading ? 'Uploading...' : 'Upload Song'}
          </button>
        </form>
      </div>
    </div>
  )
}
