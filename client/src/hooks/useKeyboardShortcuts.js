import { useEffect, useRef } from 'react'
import { usePlayer } from '../context/PlayerContext'
import toast from 'react-hot-toast'

export function useKeyboardShortcuts() {
  const {
    currentSong,
    isPlaying,
    togglePlay,
    next,
    previous,
    setVolume,
    volume,
    toggleMute,
    isMuted,
    toggleShuffle,
    isShuffled,
    cycleRepeat,
    repeatMode,
    seek,
    progress,
    duration,
  } = usePlayer()

  // Keep a ref of live values to avoid re-binding the event listener on every progress tick (250ms)
  const stateRef = useRef({
    currentSong,
    isPlaying,
    volume,
    isMuted,
    isShuffled,
    repeatMode,
    progress,
    duration,
  })

  useEffect(() => {
    stateRef.current = {
      currentSong,
      isPlaying,
      volume,
      isMuted,
      isShuffled,
      repeatMode,
      progress,
      duration,
    }
  })

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Don't trigger shortcuts when typing in inputs or contenteditable elements
      const tag = document.activeElement?.tagName
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        document.activeElement?.isContentEditable
      ) {
        return
      }

      // Ignore auto-repeat key events for toggle actions so holding Space doesn't flicker
      if (e.repeat && ['Space', 'KeyM', 'KeyS', 'KeyR'].includes(e.code)) {
        return
      }

      const {
        currentSong: song,
        isPlaying: playing,
        volume: vol,
        isMuted: muted,
        isShuffled: shuffled,
        repeatMode: repeat,
        progress: curProgress,
        duration: totalDuration,
      } = stateRef.current

      switch (e.code) {
        case 'Space': {
          e.preventDefault()
          if (!song) {
            toast('No track selected', {
              id: 'soundwave-player-status',
              icon: '🎵',
              duration: 1000,
            })
            break
          }

          const res = togglePlay()
          const nowPlaying = typeof res === 'boolean' ? res : !playing
          toast(nowPlaying ? 'Playing' : 'Paused', {
            id: 'soundwave-player-status',
            icon: nowPlaying ? '▶️' : '⏸️',
            duration: 1000,
          })
          break
        }

        case 'ArrowRight': {
          e.preventDefault()
          if (e.altKey || e.shiftKey) {
            next()
            toast('Next track', {
              id: 'soundwave-player-status',
              icon: '⏭️',
              duration: 1000,
            })
          } else {
            const dur = totalDuration || 100
            const step = 10 / dur
            const newProgress = Math.min(curProgress + step, 1)
            seek(newProgress)
            toast('Forward 10s', {
              id: 'soundwave-player-status',
              icon: '⏩',
              duration: 1000,
            })
          }
          break
        }

        case 'ArrowLeft': {
          e.preventDefault()
          if (e.altKey || e.shiftKey) {
            previous()
            toast('Previous track', {
              id: 'soundwave-player-status',
              icon: '⏮️',
              duration: 1000,
            })
          } else {
            const dur = totalDuration || 100
            const step = 10 / dur
            const newProgress = Math.max(curProgress - step, 0)
            seek(newProgress)
            toast('Backward 10s', {
              id: 'soundwave-player-status',
              icon: '⏪',
              duration: 1000,
            })
          }
          break
        }

        case 'ArrowUp': {
          if (!e.altKey && !e.shiftKey) {
            e.preventDefault()
            const newVol = Math.min(vol + 10, 100)
            setVolume(newVol)
            toast(`Volume ${newVol}%`, {
              id: 'soundwave-player-status',
              icon: '🔊',
              duration: 1000,
            })
          }
          break
        }

        case 'ArrowDown': {
          if (!e.altKey && !e.shiftKey) {
            e.preventDefault()
            const newVol = Math.max(vol - 10, 0)
            setVolume(newVol)
            toast(`Volume ${newVol}%`, {
              id: 'soundwave-player-status',
              icon: '🔉',
              duration: 1000,
            })
          }
          break
        }

        case 'KeyM': {
          e.preventDefault()
          toggleMute()
          const willMute = !muted
          toast(willMute ? 'Muted' : 'Unmuted', {
            id: 'soundwave-player-status',
            icon: willMute ? '🔇' : '🔊',
            duration: 1000,
          })
          break
        }

        case 'KeyS': {
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            toggleShuffle()
            const willShuffle = !shuffled
            toast(willShuffle ? 'Shuffle on' : 'Shuffle off', {
              id: 'soundwave-player-status',
              icon: '🔀',
              duration: 1000,
            })
          }
          break
        }

        case 'KeyR': {
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            cycleRepeat()
            const nextModes = { none: 'all', all: 'one', one: 'none' }
            const nextMode = nextModes[repeat] || 'all'
            const modeLabels = { none: 'Repeat off', all: 'Repeat all', one: 'Repeat one' }
            toast(modeLabels[nextMode] || 'Repeat', {
              id: 'soundwave-player-status',
              icon: '🔁',
              duration: 1000,
            })
          }
          break
        }

        case 'Digit0':
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
        case 'Digit5':
        case 'Digit6':
        case 'Digit7':
        case 'Digit8':
        case 'Digit9':
        case 'Numpad0':
        case 'Numpad1':
        case 'Numpad2':
        case 'Numpad3':
        case 'Numpad4':
        case 'Numpad5':
        case 'Numpad6':
        case 'Numpad7':
        case 'Numpad8':
        case 'Numpad9': {
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault()
            const digitChar = e.code.replace('Digit', '').replace('Numpad', '')
            const digit = parseInt(digitChar, 10)
            const fraction = digit === 0 ? 0 : digit / 10
            seek(fraction)
            toast(`Seek to ${Math.round(fraction * 100)}%`, {
              id: 'soundwave-player-status',
              icon: '📍',
              duration: 1000,
            })
          }
          break
        }

        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [togglePlay, next, previous, setVolume, toggleMute, toggleShuffle, cycleRepeat, seek])

  // Show shortcuts help
  const showShortcuts = () => {
    toast(
      '⌨️ Shortcuts: Space: Play/Pause | ←/→: ±10s (Alt/Shift: Prev/Next) | ↑/↓: Volume | M: Mute | S: Shuffle | R: Repeat | 0-9: Seek %',
      {
        id: 'soundwave-player-status',
        icon: '🎹',
        duration: 4000,
      }
    )
  }

  return { showShortcuts }
}