import { useEffect } from 'react'
import { usePlayer } from '../context/PlayerContext'
import toast from 'react-hot-toast'

export function useKeyboardShortcuts() {
  const { 
    togglePlay, 
    next, 
    previous, 
    setVolume, 
    volume, 
    toggleMute, 
    toggleShuffle, 
    cycleRepeat,
    seek,
    progress,
    duration
  } = usePlayer()

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      
      // Prevent default for our shortcuts
      const shortcuts = ['Space', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'KeyM', 'KeyS', 'KeyR']
      if (shortcuts.includes(e.code)) {
        e.preventDefault()
      }

      switch (e.code) {
        case 'Space':
          togglePlay()
          toast.success(e.shiftKey ? '⏸️ Paused' : '▶️ Playing', { duration: 1000 })
          break
          
        case 'ArrowRight':
          if (e.shiftKey) {
            // Shift + Right: Skip forward
            next()
            toast.success('⏭️ Next track', { duration: 1000 })
          } else {
            // Right: Seek forward 10s
            const newProgress = Math.min(progress + (10 / duration), 1)
            seek(newProgress)
            toast.success('⏩ +10s', { duration: 1000 })
          }
          break
          
        case 'ArrowLeft':
          if (e.shiftKey) {
            // Shift + Left: Skip backward
            previous()
            toast.success('⏮️ Previous track', { duration: 1000 })
          } else {
            // Left: Seek backward 10s
            const newProgress = Math.max(progress - (10 / duration), 0)
            seek(newProgress)
            toast.success('⏪ -10s', { duration: 1000 })
          }
          break
          
        case 'ArrowUp':
          // Up: Volume up
          const newVolumeUp = Math.min(volume + 10, 100)
          setVolume(newVolumeUp)
          toast.success(`🔊 Volume ${newVolumeUp}%`, { duration: 1000 })
          break
          
        case 'ArrowDown':
          // Down: Volume down
          const newVolumeDown = Math.max(volume - 10, 0)
          setVolume(newVolumeDown)
          toast.success(`🔉 Volume ${newVolumeDown}%`, { duration: 1000 })
          break
          
        case 'KeyM':
          // M: Mute/unmute
          toggleMute()
          toast.success('🔇 Mute toggled', { duration: 1000 })
          break
          
        case 'KeyS':
          // S: Shuffle
          toggleShuffle()
          toast.success('🔀 Shuffle toggled', { duration: 1000 })
          break
          
        case 'KeyR':
          // R: Repeat
          cycleRepeat()
          toast.success('🔁 Repeat mode changed', { duration: 1000 })
          break
          
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
        case 'Digit5':
        case 'Digit6':
        case 'Digit7':
        case 'Digit8':
        case 'Digit9':
        case 'Digit0':
          // Number keys: Seek to percentage
          const percentage = e.code === 'Digit0' ? 1 : parseInt(e.code.slice(-1)) / 10
          seek(percentage)
          toast.success(`⏯️ Seek to ${Math.round(percentage * 100)}%`, { duration: 1000 })
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [togglePlay, next, previous, setVolume, volume, toggleMute, toggleShuffle, cycleRepeat, seek, progress, duration])

  // Show shortcuts help
  const showShortcuts = () => {
    toast.success(`
🎹 Keyboard Shortcuts:
Space - Play/Pause
← → - Seek ±10s
Shift+← → - Previous/Next
↑ ↓ - Volume ±10
M - Mute, S - Shuffle, R - Repeat
1-9,0 - Seek to %
    `, { duration: 5000 })
  }

  return { showShortcuts }
}