import { useRef, useEffect } from 'react'

/**
 * 8-Digit OTP Input Component
 * Features:
 * - 8 discrete modern digit boxes with sleek dark aesthetic
 * - Automatic focus progression on typing
 * - Backspace regression to previous input
 * - Arrow key navigation
 * - Full 8-digit paste and multi-digit mobile autofill support
 * - Auto-submit callback when all 8 digits are filled
 * - Completely prevents solid-white autofill/browser background issues
 */
export default function OtpInput({
  value = '',
  onChange,
  onComplete,
  disabled = false,
  error = false,
  length = 8
}) {
  const inputsRef = useRef([])

  // Ensure value is split into array of length
  const digits = Array.from({ length }, (_, i) => value[i] || '')

  useEffect(() => {
    // Focus first empty input or the first one on mount
    const firstEmptyIndex = digits.findIndex(d => !d)
    const targetIndex = firstEmptyIndex === -1 ? length - 1 : firstEmptyIndex
    if (inputsRef.current[targetIndex] && !disabled) {
      inputsRef.current[targetIndex].focus()
    }
  }, [])

  const handleKeyDown = (e, index) => {
    if (disabled) return

    if (e.key === 'Backspace') {
      e.preventDefault()
      if (digits[index]) {
        // Clear current cell
        const nextDigits = [...digits]
        nextDigits[index] = ''
        const nextValue = nextDigits.join('')
        onChange(nextValue)
      } else if (index > 0) {
        // Move to previous cell and clear it
        const nextDigits = [...digits]
        nextDigits[index - 1] = ''
        const nextValue = nextDigits.join('')
        onChange(nextValue)
        inputsRef.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault()
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleChange = (e, index) => {
    if (disabled) return
    const inputVal = e.target.value
    const cleanedDigits = inputVal.replace(/\D/g, '')

    // If multiple digits were pasted/autofilled into this field
    if (cleanedDigits.length > 1) {
      const nextDigits = [...digits]
      for (let i = 0; i < cleanedDigits.length && index + i < length; i++) {
        nextDigits[index + i] = cleanedDigits[i]
      }
      const nextValue = nextDigits.join('')
      onChange(nextValue)

      const nextFocus = Math.min(index + cleanedDigits.length, length - 1)
      inputsRef.current[nextFocus]?.focus()

      if (nextValue.length === length && onComplete) {
        onComplete(nextValue)
      }
      return
    }

    const cleanDigit = cleanedDigits.slice(-1)
    const nextDigits = [...digits]
    nextDigits[index] = cleanDigit
    const nextValue = nextDigits.join('')
    onChange(nextValue)

    if (cleanDigit && index < length - 1) {
      // Advance to next box
      inputsRef.current[index + 1]?.focus()
    }

    if (nextValue.length === length && onComplete) {
      onComplete(nextValue)
    }
  }

  const handlePaste = e => {
    e.preventDefault()
    if (disabled) return
    const pastedData = e.clipboardData.getData('text')
    if (!pastedData) return

    const digitsOnly = pastedData.replace(/\D/g, '').slice(0, length)
    if (!digitsOnly) return

    onChange(digitsOnly)

    const nextFocusIndex = Math.min(digitsOnly.length, length - 1)
    inputsRef.current[nextFocusIndex]?.focus()

    if (digitsOnly.length === length && onComplete) {
      onComplete(digitsOnly)
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
        {Array.from({ length }).map((_, index) => {
          const digit = digits[index] || ''
          const isFilled = digit !== ''
          const isDivider = index === 4 // Visual separator between 4-4 digits

          return (
            <div key={index} className="flex items-center">
              {isDivider && (
                <div className="w-1.5 sm:w-2 h-0.5 bg-white/20 mr-1.5 sm:mr-2 -ml-0.5 sm:-ml-1 rounded-full shrink-0" />
              )}
              <input
                ref={el => (inputsRef.current[index] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                maxLength={1}
                value={digit}
                disabled={disabled}
                onChange={e => handleChange(e, index)}
                onKeyDown={e => handleKeyDown(e, index)}
                onPaste={handlePaste}
                onFocus={e => e.target.select()}
                style={{
                  backgroundColor: isFilled ? '#161a22' : '#13141d',
                  color: '#ffffff',
                  caretColor: '#1DB954'
                }}
                className={`otp-digit-input w-9 sm:w-11 h-12 sm:h-13 text-center text-lg sm:text-xl font-mono font-bold rounded-xl border transition-all duration-200 outline-none
                  ${
                    error
                      ? 'border-red-500 bg-red-500/10 text-red-300 ring-2 ring-red-500/30'
                      : isFilled
                      ? 'filled border-brand/70 shadow-[0_0_12px_rgba(29,185,84,0.22)]'
                      : 'border-white/10 hover:border-white/25 focus:border-brand focus:ring-2 focus:ring-brand/35'
                  }
                  ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-text'}
                `}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

