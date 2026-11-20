import { describe, expect, it } from 'vitest'
import { DEFAULTS, DEVICE_ONLY, normaliseSettings, syncedSettings, useSettingsStore } from './settingsStore'
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
