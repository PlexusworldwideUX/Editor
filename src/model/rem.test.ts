import { describe, expect, it } from 'vitest'
import { parseRem, rem, snapRem, toCss } from './rem'

describe('rem scale', () => {
  it('accepts values ending in 0 or 5', () => {
    for (const v of ['0.0625', '0.125', '0.5', '1.5rem', '0.0005', '22.5'])
      expect(parseRem(v)).not.toBeNull()
  })
  it('rejects other endings and px', () => {
    for (const v of ['0.0627', '0.0001', '1px', '0.00005']) expect(parseRem(v)).toBeNull()
  })
  it('round-trips', () => {
    expect(toCss(rem(0.0625))).toBe('0.0625rem')
    expect(toCss(rem(0.5))).toBe('0.5rem')
    expect(toCss(parseRem('1.5')!)).toBe('1.5rem')
    expect(toCss(0)).toBe('0')
  })
  it('snaps free text to the nearest valid value', () => {
    expect(toCss(snapRem('1.2347')!)).toBe('1.2345rem')
    expect(toCss(snapRem('0.06')!)).toBe('0.06rem')
    expect(toCss(snapRem('0.0626')!)).toBe('0.0625rem')
    expect(toCss(snapRem('2rem')!)).toBe('2rem')
    expect(toCss(snapRem('.5')!)).toBe('0.5rem')
    expect(toCss(snapRem('-0.3333')!)).toBe('-0.3335rem')
    expect(snapRem('abc')).toBeNull()
    expect(snapRem('')).toBeNull()
  })
})
