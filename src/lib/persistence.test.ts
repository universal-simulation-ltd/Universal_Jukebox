import { describe, expect, it } from 'vitest'
import { keepsFolderWhenInstalled, type BrowserTraits } from './persistence'

// The install tip on the landing page. It is a promise about somebody else's
// browser, so the cases it must STAY QUIET in matter more than the one it speaks
// in.

const chrome = (version: string, over: Partial<BrowserTraits> = {}): BrowserTraits => ({
  brands: [
    { brand: 'Not)A;Brand', version: '99' },
    { brand: 'Google Chrome', version },
    { brand: 'Chromium', version },
  ],
  hasDirectoryPicker: true,
  installed: false,
  ...over,
})

describe('whether to suggest installing the app', () => {
  it('does, in Chrome 122 and later', () => {
    expect(keepsFolderWhenInstalled(chrome('122'))).toBe(true)
    expect(keepsFolderWhenInstalled(chrome('140'))).toBe(true)
  })

  it('does not before 122, when an installed app still asked', () => {
    expect(keepsFolderWhenInstalled(chrome('121'))).toBe(false)
  })

  it('does not once the app is already installed', () => {
    expect(keepsFolderWhenInstalled(chrome('130', { installed: true }))).toBe(false)
  })

  it('does not without a folder picker — the handle is the permission', () => {
    expect(keepsFolderWhenInstalled(chrome('130', { hasDirectoryPicker: false }))).toBe(false)
  })

  it('does not in another Chromium browser, whose policy is not documented', () => {
    expect(
      keepsFolderWhenInstalled({
        brands: [{ brand: 'Microsoft Edge', version: '130' }, { brand: 'Chromium', version: '130' }],
        hasDirectoryPicker: true,
        installed: false,
      }),
    ).toBe(false)
  })

  it('does not where the browser names no brands at all (Firefox, Safari)', () => {
    expect(keepsFolderWhenInstalled({ brands: [], hasDirectoryPicker: false, installed: false })).toBe(false)
  })
})
