import { useState } from 'react'
import { BarChart3, TrendingUp, Headphones, Globe, Disc, Radio } from 'lucide-react'

export default function AdminAnalyticsTab() {
  const genres = [
    { name: 'Pop & Synthpop', percentage: 38, count: '142,500 plays', color: 'bg-indigo-500' },
    { name: 'Hip Hop & Rap', percentage: 24, count: '91,200 plays', color: 'bg-purple-500' },
    { name: 'Electronic & EDM', percentage: 18, count: '67,400 plays', color: 'bg-pink-500' },
    { name: 'Lo-Fi Chill & Ambient', percentage: 12, count: '45,100 plays', color: 'bg-teal-500' },
    { name: 'Rock & Alternative', percentage: 8, count: '30,800 plays', color: 'bg-amber-500' }
  ]

  const topArtists = [
    { rank: 1, name: 'The Weeknd', plays: '52,190', trend: '+18%' },
    { rank: 2, name: 'Ed Sheeran', plays: '38,420', trend: '+12%' },
    { rank: 3, name: 'Post Malone', plays: '31,800', trend: '+9%' },
    { rank: 4, name: 'Dua Lipa', plays: '24,550', trend: '+15%' },
    { rank: 5, name: 'ChilledCow / Lofi Girl', plays: '19,300', trend: '+22%' }
  ]

  return (
    <div className="space-y-6">
      {/* ── Top Summary ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#0d0e19] border border-white/5">
          <p className="text-xs font-semibold text-gray-400">Total Stream Time</p>
          <p className="text-2xl font-extrabold text-white mt-1">2,840.5 Hours</p>
          <p className="text-[11px] text-emerald-400 mt-1">↑ 19.4% vs last week</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0d0e19] border border-white/5">
          <p className="text-xs font-semibold text-gray-400">Average Session Duration</p>
          <p className="text-2xl font-extrabold text-white mt-1">42.8 Minutes</p>
          <p className="text-[11px] text-indigo-400 mt-1">4.2 tracks per session</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0d0e19] border border-white/5">
          <p className="text-xs font-semibold text-gray-400">Peak Concurrency Time</p>
          <p className="text-2xl font-extrabold text-white mt-1">9:00 PM – 11:30 PM</p>
          <p className="text-[11px] text-gray-400 mt-1">UTC+05:30 (Sri Lanka Time)</p>
        </div>
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Genre Share */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-[#0d0e19] border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Streaming Genre Distribution
            </h3>
            <span className="text-xs text-gray-400">Last 30 Days</span>
          </div>

          <div className="space-y-3.5 pt-2">
            {genres.map(g => (
              <div key={g.name} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-gray-200">{g.name}</span>
                  <span className="text-gray-400">
                    {g.percentage}% · {g.count}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#141525] overflow-hidden">
                  <div
                    className={`h-full ${g.color} rounded-full transition-all duration-500`}
                    style={{ width: `${g.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Streamed Artists */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-[#0d0e19] border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Top Artists by Plays
          </h3>

          <div className="divide-y divide-white/5">
            {topArtists.map(a => (
              <div key={a.name} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-5 text-center text-xs font-bold text-gray-500">#{a.rank}</span>
                  <span className="text-xs font-bold text-white">{a.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-400">{a.plays}</span>
                  <span className="text-[10px] text-gray-500 ml-1.5">{a.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
