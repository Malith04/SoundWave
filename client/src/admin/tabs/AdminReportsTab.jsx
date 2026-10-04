import { useState } from 'react'
import { Flag, CheckCircle, Clock, AlertCircle, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

const INITIAL_REPORTS = [
  {
    id: 'rep_1',
    user: 'Mihiranga Rathnayake',
    category: 'Stream Playback',
    issue: 'Audio buffer stalled around 2:14 on mobile web player',
    timestamp: '10/3/2026, 8:40 PM',
    status: 'OPEN'
  },
  {
    id: 'rep_2',
    user: 'Hashintha Rajamanthri',
    category: 'Playlist Sync',
    issue: 'Liked tracks counter took 3 seconds to update after clicking heart',
    timestamp: '10/2/2026, 11:15 AM',
    status: 'RESOLVED'
  },
  {
    id: 'rep_3',
    user: 'Akalanka Rajamantri',
    category: 'Account Security',
    issue: 'Requested reset verification token for 2FA phone transition',
    timestamp: '10/1/2026, 4:05 PM',
    status: 'RESOLVED'
  }
]

export default function AdminReportsTab() {
  const [reports, setReports] = useState(INITIAL_REPORTS)

  const handleResolve = id => {
    setReports(prev =>
      prev.map(r => (r.id === id ? { ...r, status: 'RESOLVED' } : r))
    )
    toast.success('Report marked as resolved')
  }

  return (
    <div className="space-y-6">
      <div className="w-full bg-[#0d0e19] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="grid grid-cols-12 px-6 py-4 border-b border-white/5 text-[11px] font-extrabold uppercase tracking-wider text-gray-400 select-none">
          <div className="col-span-12 md:col-span-3">REPORTER</div>
          <div className="hidden md:block md:col-span-2">CATEGORY</div>
          <div className="hidden md:block md:col-span-4">INCIDENT DETAILS</div>
          <div className="hidden md:block md:col-span-1">STATUS</div>
          <div className="col-span-12 md:col-span-2 text-right">ACTION</div>
        </div>

        <div className="divide-y divide-white/5">
          {reports.map(r => (
            <div
              key={r.id}
              className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors"
            >
              <div className="col-span-12 md:col-span-3 pr-2">
                <p className="text-xs font-bold text-white">{r.user}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{r.timestamp}</p>
              </div>

              <div className="hidden md:block md:col-span-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#6366f1]/20 text-[#a5b4fc] border border-[#6366f1]/30">
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

              <div className="col-span-12 md:col-span-2 flex items-center justify-end mt-2 md:mt-0">
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
