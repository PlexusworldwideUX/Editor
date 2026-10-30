/**
 * Rem rule: every measurement is rem, up to 4 decimal places, and the last
 * decimal digit must be 0 or 5 (step = 0.0005rem). 1px = 0.0625rem is valid.
 * Values are stored as integer "ticks" of 0.0005rem so math never drifts.
 */
export const TICK = 0.0005
const PER_REM = 2000 // ticks per 1rem

export type Ticks = number

export const rem = (value: number): Ticks => {
  const t = Math.round(value * PER_REM)
  if (Math.abs(t / PER_REM - value) > 1e-9) throw new Error(`${value}rem is not on the 0.0005rem scale`)
  return t
}

export const toCss = (t: Ticks): string => {
  if (t === 0) return '0'
  const sign = t < 0 ? '-' : ''
  const abs = Math.abs(t) * 5 // units of 0.0001rem
  const whole = Math.floor(abs / 10000)
  const frac = String(abs % 10000).padStart(4, '0').replace(/0+$/, '')
  return `${sign}${whole}${frac ? '.' + frac : ''}rem`
}

/** Validate user-typed text such as "0.0625rem" or "1.5". */
export const parseRem = (text: string): Ticks | null => {
  const m = /^(-?\d+)(?:\.(\d{1,4}))?(?:rem)?$/.exec(text.trim())
  if (!m) return null
  const frac = (m[2] ?? '').padEnd(4, '0')
  if (!/[05]$/.test(frac)) return null
  const neg = m[1].startsWith('-')
  const t = (Math.abs(Number(m[1])) * 10000 + Number(frac)) / 5
  return neg ? -t : t
}

/**
 * Free-text entry: accepts any number (optionally with "rem") and snaps it to the nearest valid value,
 * meaning up to 4 decimals with the last digit 0 or 5. Returns null only when the text is not a number.
 */
export const snapRem = (text: string): Ticks | null => {
  const m = /^\s*(-?(?:\d+\.?\d*|\.\d+))\s*(?:rem)?\s*$/i.exec(text)
  if (!m) return null
  const t = Math.round(Number(m[1]) * PER_REM)
  return t === 0 ? 0 : t
}
