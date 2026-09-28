// Open Settings with one section unfolded and scrolled to — the "Customise"
// button under Now Playing lands on "Buttons under the song" (James,
// 2026-09-28). Every section otherwise starts shut on every visit (see
// `Section` in Settings.tsx); this is a one-off ask, cleared once Settings has it.

import { navigate } from './route'

export type SettingsSectionId = 'buttons'

let pending: SettingsSectionId | null = null

export function openSettingsAt(id: SettingsSectionId): void {
  pending = id
  navigate({ view: 'settings' })
}

/**
 * The section asked for on the way in, if any. Read while rendering, so it
 * must not clear anything (React may render twice) — `forgetSettingsSection`
 * does that from an effect.
 */
export function pendingSettingsSection(): SettingsSectionId | null {
  return pending
}

export function forgetSettingsSection(): void {
  pending = null
}
