import { useState } from 'react'
import { ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle, FileText, Ban, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminModerationTab() {
  const [flags, setFlags] = useState([])
  const [filter, setFilter] = useState('All')

  const handleResolve = (item, action) => {
    setFlags(prev =>
      prev.map(f => (f.id === item.id ? { ...f, status: action === 'dismiss' ? 'DISMISSED' : 'TAKEDOWN' } : f))
    )
    if (action === 'dismiss') {
      toast.success('Report dismissed - audio cleared')
    } else {
      toast.error('Track taken down from public catalog & strike applied')
    }
  }

  const filtered = flags.filter(f => {
    if (filter === 'Pending') return f.status === 'PENDING'
    if (filter === 'Resolved') return f.status !== 'PENDING'
    return true
  })

  return (
    <div className="space-y-6">
      {/* ── Filters & Controls ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 bg-[var(--bg2,#0f101d)] p-1 rounded-full border border-[var(--bg3,rgba(255,255,255,0.06))] w-fit">
          {['All', 'Pending', 'Resolved'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === tab
                  ? 'text-white shadow-md'
                  : 'text-[var(--text-muted,#9ca3af)] hover:text-white hover:bg-white/5'
              }`}
              style={filter === tab ? { backgroundColor: 'var(--brand, #1DB954)', color: '#ffffff' } : {}}
            >
              {tab}
            </button>
          ))}
        </div>

        <span
          className="px-3 py-1 rounded-full text-xs font-bold border"
          style={{
            backgroundColor: 'rgba(var(--brand-rgb, 29, 185, 84), 0.1)',
            borderColor: 'rgba(var(--brand-rgb, 29, 185, 84), 0.3)',
            color: 'var(--brand, #1DB954)'
          }}
        >
          0 Flags Pending
        </span>
      </div>

      {/* ── Moderation Queue ── */}
      <div className="w-full bg-[var(--bg2,#0d0e19)] rounded-2xl border border-[var(--bg3,rgba(255,255,255,0.06))] overflow-hidden shadow-2xl transition-colors duration-300">
        <div className="grid grid-cols-12 px-6 py-4 border-b border-[var(--bg3,rgba(255,255,255,0.06))] text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted,#9ca3af)] select-none">
          <div className="col-span-12 md:col-span-4">FLAGGED CONTENT</div>
          <div className="hidden md:block md:col-span-3">VIOLATION / REASON</div>
          <div className="hidden md:block md:col-span-2">SEVERITY</div>
          <div className="hidden md:block md:col-span-1">STATUS</div>
          <div className="col-span-12 md:col-span-2 text-right">ACTIONS</div>
        </div>

        <div className="divide-y divide-[var(--bg3,rgba(255,255,255,0.06))]">
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-gray-500 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/5">
                <ShieldCheck size={28} />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text,#ffffff)]">Audio Catalog is 100% Compliant</p>
                <p className="text-xs text-[var(--text-muted,#9ca3af)] mt-1 max-w-md mx-auto">
                  No active DMCA copyright takedown notices, audio waveform clipping warnings, or metadata flags exist in your database.
                </p>
              </div>
            </div>
          ) : (
            filtered.map(item => (
              <div
                key={item.id}
                className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors"
              >
                <div className="col-span-12 md:col-span-4 pr-4">
                  <p className="text-xs md:text-sm font-bold text-[var(--text,#ffffff)] truncate">
                    {item.trackTitle}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted,#9ca3af)] mt-0.5">
                    Reported by: {item.reportedBy}
                  </p>
                </div>

                <div className="hidden md:block md:col-span-3">
                  <p className="text-xs font-semibold text-gray-200">{item.reason}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{item.date}</p>
                </div>

                <div className="hidden md:block md:col-span-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      item.severity === 'HIGH'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : item.severity === 'MEDIUM'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}
                  >
                    {item.severity}
                  </span>
                </div>

                <div className="hidden md:block md:col-span-1">
                  <span
                    className={`text-xs font-bold ${
                      item.status === 'PENDING'
                        ? 'text-amber-400'
                        : item.status === 'TAKEDOWN'
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-2 mt-2 md:mt-0">
                  {item.status === 'PENDING' ? (
                    <>
                      <button
                        onClick={() => handleResolve(item, 'dismiss')}
                        className="text-xs font-semibold text-gray-400 hover:text-white px-2 py-1"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleResolve(item, 'takedown')}
                        className="text-xs font-bold text-rose-500 hover:text-rose-400 px-2 py-1"
                      >
                        Takedown
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500">Processed</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
