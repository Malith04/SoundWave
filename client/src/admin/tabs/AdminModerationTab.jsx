import { useState } from 'react'
import { ShieldAlert, AlertTriangle, CheckCircle2, XCircle, FileText, Ban } from 'lucide-react'
import toast from 'react-hot-toast'

const INITIAL_FLAGS = [
  {
    id: 'mod_1',
    trackTitle: 'Midnight Beats Rip (Uncredited)',
    reportedBy: 'DJ Pulse Official',
    reason: 'Copyright / Uncredited Sample',
    severity: 'HIGH',
    date: '10/2/2026',
    status: 'PENDING'
  },
  {
    id: 'mod_2',
    trackTitle: 'Loud Noise Generator Loop',
    reportedBy: 'System Audio Analyzer',
    reason: 'Distorted Audio Peak (+12dB)',
    severity: 'MEDIUM',
    date: '10/3/2026',
    status: 'PENDING'
  },
  {
    id: 'mod_3',
    trackTitle: 'Explicit Metadata Violation',
    reportedBy: 'Content Filter Bot',
    reason: 'Missing Explicit Tag on Cover',
    severity: 'LOW',
    date: '10/1/2026',
    status: 'RESOLVED'
  }
]

export default function AdminModerationTab() {
  const [flags, setFlags] = useState(INITIAL_FLAGS)
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
      {/* ── Filters ── */}
      <div className="flex items-center gap-1.5 bg-[#0f101d] p-1 rounded-full border border-white/5 w-fit">
        {['All', 'Pending', 'Resolved'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === tab
                ? 'bg-[#6366f1] text-white shadow-md shadow-indigo-500/25'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Moderation Queue ── */}
      <div className="w-full bg-[#0d0e19] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="grid grid-cols-12 px-6 py-4 border-b border-white/5 text-[11px] font-extrabold uppercase tracking-wider text-gray-400 select-none">
          <div className="col-span-12 md:col-span-4">FLAGGED CONTENT</div>
          <div className="hidden md:block md:col-span-3">VIOLATION / REASON</div>
          <div className="hidden md:block md:col-span-2">SEVERITY</div>
          <div className="hidden md:block md:col-span-1">STATUS</div>
          <div className="col-span-12 md:col-span-2 text-right">ACTIONS</div>
        </div>

        <div className="divide-y divide-white/5">
          {filtered.map(item => (
            <div
              key={item.id}
              className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors"
            >
              <div className="col-span-12 md:col-span-4 pr-4">
                <p className="text-xs md:text-sm font-bold text-white truncate">{item.trackTitle}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Reported by: {item.reportedBy}</p>
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
          ))}
        </div>
      </div>
    </div>
  )
}
