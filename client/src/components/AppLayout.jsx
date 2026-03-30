import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import Sidebar from './Sidebar'
import Player from './Player'
import { usePlayer } from '../context/PlayerContext'

function YouTubePlayerMount() {
  const { initYTPlayer } = usePlayer()
  useEffect(() => {
    initYTPlayer('yt-hidden-player')
  }, [initYTPlayer])
  return <div id="yt-hidden-player" style={{ display: 'none' }} />
}

export default function AppLayout() {
  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden">
      <YouTubePlayerMount />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-surface-2 to-surface">
          <Outlet />
        </main>
      </div>
      <Player />
    </div>
  )
}
