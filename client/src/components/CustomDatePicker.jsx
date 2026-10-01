import { useState, useRef, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, ChevronDown, Check, Cake } from 'lucide-react'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAYS_OF_WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export default function CustomDatePicker({ value, onChange, placeholder = 'Select your birth date' }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // Parse current value (YYYY-MM-DD) or default to ~20 years ago for pleasant birthday picking
  const parsedDate = value ? new Date(value + 'T00:00:00') : null
  const defaultYear = parsedDate ? parsedDate.getFullYear() : new Date().getFullYear() - 20
  const defaultMonth = parsedDate ? parsedDate.getMonth() : 0

  const [currentYear, setCurrentYear] = useState(defaultYear)
  const [currentMonth, setCurrentMonth] = useState(defaultMonth)
  const [mode, setMode] = useState('days') // 'days' | 'months' | 'years'

  // Update calendar view when value changes from outside
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00')
      if (!isNaN(d.getTime())) {
        setCurrentYear(d.getFullYear())
        setCurrentMonth(d.getMonth())
      }
    }
  }, [value])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        setMode('days')
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Year list for birth dates (from 1940 to current year)
  const currentMaxYear = new Date().getFullYear()
  const years = []
  for (let y = currentMaxYear; y >= 1940; y--) {
    years.push(y)
  }

  // Days in current month & starting day
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  // JavaScript getDay(): 0 is Sunday. Convert to Monday=0, Sunday=6
  const rawFirstDay = new Date(currentYear, currentMonth, 1).getDay()
  const firstDayIndex = (rawFirstDay + 6) % 7

  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(y => y - 1)
    } else {
      setCurrentMonth(m => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(y => y + 1)
    } else {
      setCurrentMonth(m => m + 1)
    }
  }

  const handleSelectDay = (day) => {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0')
    const formattedDay = String(day).padStart(2, '0')
    const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`
    onChange(dateStr)
    setIsOpen(false)
  }

  const calculateAge = (dateStr) => {
    if (!dateStr) return null
    const birth = new Date(dateStr + 'T00:00:00')
    if (isNaN(birth.getTime())) return null
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age >= 0 ? age : null
  }

  const formattedDisplay = () => {
    if (!parsedDate || isNaN(parsedDate.getTime())) return null
    return parsedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const age = calculateAge(value)

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* ── Custom Trigger Input ── */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full glass-input rounded-xl px-4 py-3 text-sm flex items-center justify-between cursor-pointer transition-all duration-200 select-none ${
          isOpen ? 'ring-2 ring-brand border-brand bg-white/10' : 'hover:border-white/20 hover:bg-white/5'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            value ? 'bg-brand/20 text-brand' : 'bg-white/5 text-gray-400'
          }`}>
            <CalendarIcon size={16} />
          </div>

          <div className="flex items-center gap-2 min-w-0">
            {value ? (
              <>
                <span className="font-semibold text-white truncate text-sm">
                  {formattedDisplay()}
                </span>
                {age !== null && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand/20 text-brand border border-brand/30 shrink-0">
                    <Cake size={11} /> {age} yrs
                  </span>
                )}
              </>
            ) : (
              <span className="text-gray-500 text-sm">{placeholder}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
              }}
              className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand' : ''}`}
          />
        </div>
      </div>

      {/* ── Custom Popover Modal ── */}
      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 sm:right-auto sm:w-[340px] z-50 glass-modal rounded-2xl p-4 shadow-2xl border border-white/15 animate-pop-in backdrop-blur-2xl">
          
          {/* Header Navigation */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            {/* Month & Year Selectors */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMode(mode === 'months' ? 'days' : 'months')}
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-white hover:bg-white/10 transition-colors flex items-center gap-1 border border-transparent hover:border-white/15"
              >
                {MONTH_NAMES[currentMonth]}
                <ChevronDown size={12} className={mode === 'months' ? 'rotate-180 text-brand' : 'text-gray-400'} />
              </button>

              <button
                type="button"
                onClick={() => setMode(mode === 'years' ? 'days' : 'years')}
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-brand hover:bg-brand/10 transition-colors flex items-center gap-1 border border-brand/20"
              >
                {currentYear}
                <ChevronDown size={12} className={mode === 'years' ? 'rotate-180' : ''} />
              </button>
            </div>

            {/* Prev / Next Arrows */}
            {mode === 'days' && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-7 h-7 rounded-lg glass-input flex items-center justify-center text-gray-300 hover:text-white hover:border-white/30 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-7 h-7 rounded-lg glass-input flex items-center justify-center text-gray-300 hover:text-white hover:border-white/30 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          {/* ── MODE: Months Grid ── */}
          {mode === 'months' && (
            <div className="grid grid-cols-3 gap-2 py-1 animate-fade-in">
              {MONTH_NAMES.map((m, idx) => {
                const isSelected = currentMonth === idx
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setCurrentMonth(idx)
                      setMode('days')
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all duration-150 text-center ${
                      isSelected
                        ? 'bg-brand text-black font-bold shadow-md shadow-brand/30'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {m.slice(0, 3)}
                  </button>
                )
              })}
            </div>
          )}

          {/* ── MODE: Years Grid ── */}
          {mode === 'years' && (
            <div className="max-h-[220px] overflow-y-auto pr-1 grid grid-cols-4 gap-1.5 py-1 animate-fade-in custom-scroll">
              {years.map(y => {
                const isSelected = currentYear === y
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setCurrentYear(y)
                      setMode('days')
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all duration-150 text-center ${
                      isSelected
                        ? 'bg-brand text-black font-bold shadow-md shadow-brand/30'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {y}
                  </button>
                )
              })}
            </div>
          )}

          {/* ── MODE: Days Calendar Grid ── */}
          {mode === 'days' && (
            <div className="animate-fade-in">
              {/* Day names */}
              <div className="grid grid-cols-7 mb-2 text-center">
                {DAYS_OF_WEEK.map(d => (
                  <span key={d} className="text-[11px] font-bold text-gray-500 uppercase tracking-wider py-1">
                    {d}
                  </span>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {/* Previous month leading days */}
                {Array.from({ length: firstDayIndex }).map((_, i) => {
                  const dayNum = daysInPrevMonth - firstDayIndex + i + 1
                  return (
                    <div
                      key={`prev-${i}`}
                      className="h-8 flex items-center justify-center text-xs text-gray-600 select-none"
                    >
                      {dayNum}
                    </div>
                  )
                })}

                {/* Current month days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1
                  const isSelected = parsedDate &&
                    parsedDate.getFullYear() === currentYear &&
                    parsedDate.getMonth() === currentMonth &&
                    parsedDate.getDate() === dayNum

                  const isToday =
                    new Date().getFullYear() === currentYear &&
                    new Date().getMonth() === currentMonth &&
                    new Date().getDate() === dayNum

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => handleSelectDay(dayNum)}
                      className={`h-8 rounded-lg text-xs font-medium transition-all duration-150 flex items-center justify-center ${
                        isSelected
                          ? 'bg-gradient-to-tr from-brand to-emerald-400 text-black font-extrabold shadow-md shadow-brand/40 scale-105'
                          : isToday
                          ? 'border border-brand/40 text-brand hover:bg-brand/10'
                          : 'text-gray-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {dayNum}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Footer ── */}
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
            <button
              type="button"
              onClick={() => {
                const now = new Date()
                setCurrentYear(now.getFullYear() - 18)
                setCurrentMonth(now.getMonth())
                setMode('days')
              }}
              className="text-gray-400 hover:text-white text-[11px] font-medium transition-colors"
            >
              Reset view
            </button>

            {value && (
              <span className="text-[11px] text-brand font-semibold flex items-center gap-1">
                <Check size={12} strokeWidth={3} /> Saved
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
