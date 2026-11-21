import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULTS, DEVICE_ONLY, deviceDeck, normaliseSettings, syncedSettings, useSettingsStore } from './settingsStore'
import { useRequestsStore } from './requestsStore'

// The settings store on the SDK's synced store (createSyncedSettings, 0.232):
// the zustand view, the defaults, and what stays on the device.
// (No window here: the store runs in memory, as it does in a private window.)

describe('settings, synced', () => {
  it('reads nothing as exactly the defaults (Reset to defaults gives these)', () => {
    expect(normaliseSettings(undefined)).toEqual(DEFAULTS)
    expect(normaliseSettings(null)).toEqual(DEFAULTS)
    expect(normaliseSettings('junk')).toEqual(DEFAULTS)
    // A fixed point: the defaults read back as themselves, field by field.
    expect(normaliseSettings(JSON.parse(JSON.stringify(DEFAULTS)))).toEqual(DEFAULTS)
  })

  it('keeps every default as it was: the switches that reach the network start off', () => {
    expect(DEFAULTS.lyricsOnline).toBe(false)
    expect(DEFAULTS.aboutOnline).toBe(false)
    expect(DEFAULTS.hitsOnline).toBe(false)
    expect(DEFAULTS.hitsDeep).toBe(false)
    expect(DEFAULTS.trackNotifications).toBe(false)
    expect(DEFAULTS.hideVisualiser).toBe(false)
    expect(DEFAULTS.lyricsAroundStyle).toBe('orbit')
    expect(DEFAULTS.requestKind).toBe('artist')
  })

  it('reads a stored blob field by field, as before', () => {
    const s = normaliseSettings({ stableVolume: false, deck: 'nope', requestKind: 'album', volumeBoost: 99 })
    expect(s.stableVolume).toBe(false)
    expect(s.deck).toBe('vinyl')
    expect(s.requestKind).toBe('album')
    expect(s.volumeBoost).toBe(4)
  })

  it('reads hidden tabs saved before the eye (in their slots) with the hidden ones last, nothing lost', () => {
    const s = normaliseSettings({ tabOrder: ['jukebox', 'artists', 'albums', 'tracks', 'mix'], hiddenTabs: ['tracks', 'artists'], homeTab: 'tracks' })
    expect(s.hiddenTabs).toEqual(['tracks', 'artists'])
    expect(s.tabOrder).toEqual(['jukebox', 'albums', 'mix', 'tracks', 'artists'])
    expect(s.homeTab).toBe('tracks')
    // Read again (as the synced store does), it stays the same.
    expect(normaliseSettings(JSON.parse(JSON.stringify(s)))).toEqual(s)
  })

  it('patch writes several settings in one go', () => {
    useSettingsStore.getState().patch({ tabOrder: ['mix', 'jukebox', 'tracks', 'albums', 'artists'], hiddenTabs: ['artists'] })
    expect(useSettingsStore.getState().hiddenTabs).toEqual(['artists'])
    expect(syncedSettings.getState().tabOrder).toEqual(['mix', 'jukebox', 'tracks', 'albums', 'artists'])
    useSettingsStore.getState().reset()
    expect(useSettingsStore.getState().hiddenTabs).toEqual([])
    expect(useSettingsStore.getState().tabOrder).toEqual(DEFAULTS.tabOrder)
  })

  it('device-only keys are real settings', () => {
    for (const k of DEVICE_ONLY) expect(k in DEFAULTS).toBe(true)
    // The ones that follow the account include the Tune switches.
    expect(DEVICE_ONLY).not.toContain('stableVolume')
    expect(DEVICE_ONLY).not.toContain('requestKind')
    expect(DEVICE_ONLY).toContain('volumeBoost')
  })

  it('the zustand view writes through to the synced store and tells subscribers (next, prev)', () => {
    const seen: [boolean, boolean][] = []
    const off = useSettingsStore.subscribe((next, prev) => seen.push([next.stableVolume, prev.stableVolume]))
    useSettingsStore.getState().set('stableVolume', false)
    expect(syncedSettings.getState().stableVolume).toBe(false)
    expect(useSettingsStore.getState().stableVolume).toBe(false)
    expect(seen).toEqual([[false, true]])
    off()
  })

  it('a change made on the synced store (the account’s, another tab’s) reaches the view', () => {
    syncedSettings.set({ deck: 'cd' })
    expect(useSettingsStore.getState().deck).toBe('cd')
  })

  it('restore reads a backup field by field; reset puts every default back', () => {
    useSettingsStore.getState().restore({ hideErrors: false, ceremonyMode: 'off', junk: 1 })
    expect(useSettingsStore.getState().hideErrors).toBe(false)
    expect(useSettingsStore.getState().ceremonyMode).toBe('off')
    useSettingsStore.getState().reset()
    expect(syncedSettings.getState()).toEqual(DEFAULTS)
    const view = useSettingsStore.getState()
    for (const k of Object.keys(DEFAULTS) as (keyof typeof DEFAULTS)[]) expect(view[k]).toEqual(DEFAULTS[k])
  })

  it('Requests’ double tap lives in the settings (so it follows the account)', () => {
    useRequestsStore.getState().setDefaultKind('track')
    expect(useSettingsStore.getState().requestKind).toBe('track')
    expect(useRequestsStore.getState().defaultKind).toBe('track')
    useSettingsStore.getState().reset()
    expect(useRequestsStore.getState().defaultKind).toBe('artist')
  })
})

// The website's Pocket on an iPhone (no pocket player there: barsPocketPlayer).
// The synced store sends its whole set on any change, so the iPhone must keep
// the value it can't show, not rewrite it as what it shows.
describe('a deck this device cannot show', () => {
  const asIPhone = () => {
    ;(globalThis as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios' }
  }
  afterEach(() => {
    delete (globalThis as { Capacitor?: unknown }).Capacitor
    useSettingsStore.getState().reset()
  })

  it('is read as stored on every device', () => {
    asIPhone()
    expect(normaliseSettings({ deck: 'pocket' }).deck).toBe('pocket')
    expect(normaliseSettings({ deck: 'nope' }).deck).toBe('vinyl')
  })

  it('shows as the CD on an iPhone, as itself elsewhere', () => {
    expect(deviceDeck('pocket')).toBe('pocket')
    asIPhone()
    expect(deviceDeck('pocket')).toBe('cd')
    expect(deviceDeck('cassette')).toBe('cassette')
    expect(deviceDeck('automatic')).toBe('automatic')
  })

  it('an iPhone changing another setting keeps the account’s Pocket (the clobber)', () => {
    asIPhone()
    // The account's set arriving (applyRemote runs the same normalise as set).
    syncedSettings.set({ deck: 'pocket' })
    expect(useSettingsStore.getState().deck).toBe('cd')
    // Something else changed on the iPhone: the whole set goes to the account.
    useSettingsStore.getState().set('hideErrors', false)
    expect(syncedSettings.getState().deck).toBe('pocket')
    expect(syncedSettings.getState().hideErrors).toBe(false)
    expect(useSettingsStore.getState().deck).toBe('cd')
    // A deck picked on the iPhone is a real choice, and is kept.
    useSettingsStore.getState().set('deck', 'cassette')
    expect(syncedSettings.getState().deck).toBe('cassette')
  })
})
