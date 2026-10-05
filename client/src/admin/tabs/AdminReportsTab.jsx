import { useState, useEffect } from 'react'
import { Flag, CheckCircle2, Clock, AlertCircle, MessageSquare, Plus, RefreshCw, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminReportsTab() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [form, setForm] = useState({
    name: 'Malith Rajamanthri',
    email: 'malithrajamanthri@gmail.com',
    category: 'Stream Playback',
    issue: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const loadReports = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/reports')
      if (res.ok) {
        const data = await res.json()
        setReports(data)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load incident reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [])

  const handleResolve = async id => {
    try {
      const res = await fetch(`/api/admin/reports/${id}/resolve`, { method: 'PATCH' })
      if (res.ok) {
        setReports(prev =>
          prev.map(r => (r.id === id ? { ...r, status: 'RESOLVED' } : r))
        )
        toast.success('Incident marked as resolved in database')
      } else {
        toast.error('Failed to resolve report')
      }
    } catch (_) {
      toast.error('Network error during resolve')
    }
  }

  const handleDelete = async id => {
    try {
      const res = await fetch(`/api/admin/reports/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setReports(prev => prev.filter(r => r.id !== id))
        toast.success('Report ticket deleted')
      }
    } catch (_) {}
  }

  const handleCreateReport = async e => {
    e.preventDefault()
    if (!form.issue.trim()) {
      return toast.error('Please describe the incident')
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        toast.success('New report logged in database')
        setForm(f => ({ ...f, issue: '' }))
        setNewModalOpen(false)
        loadReports()
      } else {
        toast.error('Failed to submit report')
      }
    } catch (_) {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header Controls ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--text-muted,#9ca3af)]">
            Active Incident Tickets:
          </span>
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-bold"
            style={{
              backgroundColor: 'rgba(var(--brand-rgb, 29, 185, 84), 0.15)',
              color: 'var(--brand, #1DB954)'
            }}
          >
            {reports.filter(r => r.status === 'OPEN').length} Open
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadReports}
            disabled={loading}
            className="p-1.5 rounded-lg bg-[var(--bg2,#141525)] text-[var(--text-muted,#9ca3af)] hover:text-white transition-all disabled:opacity-50"
            title="Refresh database reports"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setNewModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-white text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all"
            style={{ backgroundColor: 'var(--brand, #1DB954)' }}
          >
            <Plus size={13} />
            <span>File Incident Report</span>
          </button>
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="w-full bg-[var(--bg2,#0d0e19)] rounded-2xl border border-[var(--bg3,rgba(255,255,255,0.06))] overflow-hidden shadow-2xl transition-colors duration-300">
        <div className="grid grid-cols-12 px-6 py-4 border-b border-[var(--bg3,rgba(255,255,255,0.06))] text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted,#9ca3af)] select-none">
          <div className="col-span-12 md:col-span-3">REPORTER</div>
          <div className="hidden md:block md:col-span-2">CATEGORY</div>
          <div className="hidden md:block md:col-span-4">INCIDENT DETAILS</div>
          <div className="hidden md:block md:col-span-1">STATUS</div>
          <div className="col-span-12 md:col-span-2 text-right">ACTION</div>
        </div>

        <div className="divide-y divide-[var(--bg3,rgba(255,255,255,0.06))]">
          {loading ? (
            <div className="py-20 text-center text-gray-500">
              <div
                className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
                style={{ borderColor: 'var(--brand, #1DB954)', borderTopColor: 'transparent' }}
              />
              <p className="text-xs font-semibold text-[var(--text-muted,#9ca3af)]">
                Checking database for user incident reports...
              </p>
            </div>
          ) : reports.length === 0 ? (
            <div className="py-20 text-center text-gray-500 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/5">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text,#ffffff)]">No Active Incident Reports</p>
                <p className="text-xs text-[var(--text-muted,#9ca3af)] mt-1 max-w-md mx-auto">
                  All audio streams, playback buffers, playlist syncing, and user authentication are operating normally with zero reported issues.
                </p>
              </div>
              <button
                onClick={() => setNewModalOpen(true)}
                className="mt-2 px-4 py-1.5 rounded-full border border-white/10 text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-all"
              >
                Submit Test Incident Ticket
              </button>
            </div>
          ) : (
            reports.map(r => (
              <div
                key={r.id}
                className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors"
              >
                <div className="col-span-12 md:col-span-3 pr-2">
                  <p className="text-xs font-bold text-[var(--text,#ffffff)]">{r.user}</p>
                  <p className="text-[10px] text-[var(--text-muted,#9ca3af)] mt-0.5">
                    {r.timestamp ? new Date(r.timestamp).toLocaleString() : 'Recent'}
                  </p>
                </div>

                <div className="hidden md:block md:col-span-2">
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold border"
                    style={{
                      backgroundColor: 'rgba(var(--brand-rgb, 29, 185, 84), 0.1)',
                      borderColor: 'rgba(var(--brand-rgb, 29, 185, 84), 0.3)',
                      color: 'var(--brand, #1DB954)'
                    }}
                  >
                    {r.category}
                  </span>
                </div>

                <div className="hidden md:block md:col-span-4 pr-4">
                  <p className="text-xs text-gray-300 line-clamp-2">{r.issue}</p>
                </div>

                <div className="hidden md:block md:col-span-1">
                  <span
                    className={`text-xs font-bold ${
                      r.status === 'OPEN' ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>

                <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-2 mt-2 md:mt-0">
                  {r.status === 'OPEN' ? (
                    <button
                      onClick={() => handleResolve(r.id)}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline"
                    >
                      Mark Resolved
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500">Closed</span>
                  )}
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="p-1 text-gray-500 hover:text-rose-400 transition-colors"
                    title="Delete ticket"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Create Real Report Modal ── */}
      {newModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setNewModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[var(--bg2,#0d0e19)] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white">File Incident / Bug Report</h3>
              <button
                onClick={() => setNewModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Reporter Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[var(--bg,#141525)] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--brand,#1DB954)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-[var(--bg,#141525)] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--brand,#1DB954)]"
                >
                  <option value="Stream Playback">Stream Playback & Buffer</option>
                  <option value="Playlist Sync">Playlist Sync & Library</option>
                  <option value="Audio Quality">Audio Fidelity / Bitrate</option>
                  <option value="Account Security">Account & Authentication</option>
                  <option value="Feature Request">Feature Request</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Incident Description
                </label>
                <textarea
                  rows={3}
                  value={form.issue}
                  onChange={e => setForm(f => ({ ...f, issue: e.target.value }))}
                  placeholder="Describe the stream error, bug, or glitch observed..."
                  className="w-full bg-[var(--bg,#141525)] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[var(--brand,#1DB954)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--brand, #1DB954)' }}
                >
                  {submitting ? 'Submitting...' : 'Save to Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
