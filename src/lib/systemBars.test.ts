import { describe, expect, it } from 'vitest'
import { pageUnderStatusBar } from './systemBars'

const ua = (chrome: number) =>
  `Mozilla/5.0 (Linux; Android 15; Pixel 9 Build/AP3A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/${chrome}.0.0.0 Mobile Safari/537.36`

describe('pageUnderStatusBar', () => {
  it('is always true on iOS (viewport-fit=cover)', () => {
    expect(pageUnderStatusBar('ios', 'Mozilla/5.0 (iPhone)')).toBe(true)
  })
  it('follows SystemBars on Android: edge-to-edge only from WebView 140', () => {
    expect(pageUnderStatusBar('android', ua(124))).toBe(false)
    expect(pageUnderStatusBar('android', ua(139))).toBe(false)
    expect(pageUnderStatusBar('android', ua(140))).toBe(true)
    expect(pageUnderStatusBar('android', ua(141))).toBe(true)
  })
  it('is false on the web', () => {
    expect(pageUnderStatusBar('web', ua(141))).toBe(false)
  })
})
