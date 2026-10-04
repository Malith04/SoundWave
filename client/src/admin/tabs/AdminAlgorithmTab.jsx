import { useState } from 'react'
import { Cpu, Sliders, Sparkles, RefreshCw, Check, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminAlgorithmTab() {
  const [weights, setWeights] = useState({
    bpmMatching: 75,
    genreAffinity: 85,
    discoveryFreshness: 60,
    artistFamiliarity: 50,
    collaborativeDepth: 8
  })

  const handleSave = () => {
    toast.success('Recommendation weights updated in production engine!')
  }

  const handleReset = () => {
    setWeights({
      bpmMatching: 70,
      genreAffinity: 80,
      discoveryFreshness: 50,
      artistFamiliarity: 50,
      collaborativeDepth: 5
    })
    toast('Weights reset to factory defaults', { icon: '⚙️' })
  }

  return (
    <div className="space-y-6">
      {/* ── Status Header ── */}
      <div className="p-5 rounded-2xl bg-[#0d0e19] border border-white/5 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6366f1] to-[#8b5cf6] p-0.5 flex items-center justify-center">
            <div className="w-full h-full bg-[#0d0e19] rounded-[14px] flex items-center justify-center text-indigo-400">
              <Cpu size={20} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">SoundWave Vector Embeddings v2.4</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Live algorithmic dispatch for personalized daily mixes, queue autofill, and discover weekly.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3.5 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all"
          >
            Apply Tuning
          </button>
        </div>
      </div>

      {/* ── Sliders Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Slider 1: Genre Affinity */}
        <div className="p-5 rounded-2xl bg-[#0d0e19] border border-white/5 space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-white">Genre & Sub-genre Affinity</label>
            <span className="text-xs font-extrabold text-indigo-400">{weights.genreAffinity}%</span>
          </div>
          <p className="text-[11px] text-gray-500">
            How strictly the recommendation queue adheres to the listener's most played genres.
          </p>
          <input
            type="range"
            min="0"
            max="100"
            value={weights.genreAffinity}
            onChange={e => setWeights(w => ({ ...w, genreAffinity: Number(e.target.value) }))}
            className="w-full accent-[#6366f1] cursor-pointer"
          />
        </div>

        {/* Slider 2: BPM / Tempo Matching */}
        <div className="p-5 rounded-2xl bg-[#0d0e19] border border-white/5 space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-white">BPM & Harmonic Flow</label>
            <span className="text-xs font-extrabold text-indigo-400">{weights.bpmMatching}%</span>
          </div>
          <p className="text-[11px] text-gray-500">
            Ensures sequential tracks maintain smooth tempo transitions without jarring energy jumps.
          </p>
          <input
            type="range"
            min="0"
            max="100"
            value={weights.bpmMatching}
            onChange={e => setWeights(w => ({ ...w, bpmMatching: Number(e.target.value) }))}
            className="w-full accent-[#6366f1] cursor-pointer"
          />
        </div>

        {/* Slider 3: Discovery Freshness */}
        <div className="p-5 rounded-2xl bg-[#0d0e19] border border-white/5 space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-white">Serendipity & Discovery</label>
            <span className="text-xs font-extrabold text-indigo-400">{weights.discoveryFreshness}%</span>
          </div>
          <p className="text-[11px] text-gray-500">
            Injects new, unfamiliar artists into the queue instead of solely cycling favorites.
          </p>
          <input
            type="range"
            min="0"
            max="100"
            value={weights.discoveryFreshness}
            onChange={e => setWeights(w => ({ ...w, discoveryFreshness: Number(e.target.value) }))}
            className="w-full accent-[#6366f1] cursor-pointer"
          />
        </div>

        {/* Slider 4: Collaborative Filtering Depth */}
        <div className="p-5 rounded-2xl bg-[#0d0e19] border border-white/5 space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-white">Collaborative Mesh Depth</label>
            <span className="text-xs font-extrabold text-indigo-400">{weights.collaborativeDepth} hops</span>
          </div>
          <p className="text-[11px] text-gray-500">
            Depth of graph exploration across listeners with overlapping favorite tracks.
          </p>
          <input
            type="range"
            min="1"
            max="10"
            value={weights.collaborativeDepth}
            onChange={e => setWeights(w => ({ ...w, collaborativeDepth: Number(e.target.value) }))}
            className="w-full accent-[#6366f1] cursor-pointer"
          />
        </div>
      </div>
    </div>
  )
}
