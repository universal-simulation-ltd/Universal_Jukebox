// What the app calls itself at the top (James, 2026-11-02: "update the your
// universal id to be more like Blackbook … ask how you want the jukebox to
// read. If no account just ask whose jukebox is this").
//
// - Signed in to the suite: the account's name made possessive ("James’
//   Jukebox", `personalTitle.ts`), or "My Jukebox" with no name known — then
//   the App name choice, kept on the Universal ID by the SDK
//   (`useAppTitleChoice`): that personal name, "Your Jukebox" (picked as a
//   custom name, in the words of the language it was picked in, as BlackBook
//   does), or the product's own "Universal Jukebox". The website's navbar
//   resolves the same choice itself.
// - Nobody signed in: "Whose jukebox is this?" in Tune (`ownerName`, on this
//   device): "Bradley’s Jukebox", or "Universal Jukebox" while it's empty.
//
// ⚠️ ONE NAME, NOT TWO (James, 2026-11-02: "There's an issue between the name
// given in the app e.g. James' jukebox and that given in the app.unisim — they
// should be synced instead of one overriding the other. The custom field is
// primarily for guests"). The name IS the suite's "Call me" (Global Tuning,
// kept on the Universal ID and shown on the Hub), and `ownerName` is this
// device's copy of it — `useOwnerNameSync` below keeps the two together:
//
// - signed in, the account's name comes down to `ownerName`, so signing out
//   leaves the jukebox called what it was;
// - signed out, the guest's name goes into the stored "Call me", which the SDK
//   uses to SEED an account that has no name yet on the next sign-in (an
//   account that has one keeps it — the SDK's rule: a row that exists wins).
//
// Signed in, Tune's name box edits "Call me" itself, so a change there shows on
// the Hub and a change on the Hub shows here.

import { useEffect } from 'react'
import { resolveAppTitle, useAppTitleChoice, useCallMe, useProfile, useUniversal } from '@unisim/sdk'
import { useT } from '../i18n'
import { useSettingsStore } from '../stores/settingsStore'
import { possessive } from './personalTitle'

export const PRODUCT_TITLE = 'Universal Jukebox'

/** Signed in to the suite with a real (not anonymous) account, and allowed to be. */
export function useSignedIn(): { signedIn: boolean; loading: boolean; email: string | null } {
  const { config, session } = useUniversal()
  const { loading } = useProfile()
  const user = session?.user
  const signedIn = !config.noAccounts && !!user && !(user as { is_anonymous?: boolean }).is_anonymous
  return { signedIn, loading: signedIn && loading, email: signedIn ? (user?.email ?? null) : null }
}

/** "James’ Jukebox" for the account's name, "My Jukebox" without one. */
export function usePersonalTitle(): string {
  const t = useT()
  const name = useCallMe()
  return name ? t('app.personal_title', { owner: possessive(t.lang, name) }) : t('app.my_jukebox')
}

/**
 * The bar's title, and the part of it to set in the accent (the owner — or
 * "Universal" in the product's name). Null while the profile is still
 * loading, so a name doesn't arrive after "My Jukebox" has flashed.
 */
export function useJukeboxTitle(): { text: string; accent: string | null } | null {
  const t = useT()
  const { signedIn, loading } = useSignedIn()
  const personal = usePersonalTitle()
  const name = useCallMe()
  const choice = useAppTitleChoice()
  const ownerName = useSettingsStore((s) => s.ownerName.trim())
  if (loading) return null
  const product = { text: PRODUCT_TITLE, accent: 'Universal' }
  const before = (text: string) => text.slice(0, Math.max(0, text.indexOf('Jukebox'))).trim() || null
  if (signedIn) {
    const text = resolveAppTitle(choice.mode, choice.custom, personal)
    if (!text || text === PRODUCT_TITLE) return product
    const owner = name && text === personal ? possessive(t.lang, name) : null
    return { text, accent: owner ?? before(text) }
  }
  if (!ownerName) return product
  const owner = possessive(t.lang, ownerName)
  return { text: t('app.personal_title', { owner }), accent: owner }
}

/** Keeps `ownerName` and the suite's "Call me" as one name — see the top of this file. Mounted once, in `App`. */
export function useOwnerNameSync(): void {
  const { loading: authLoading, globalCallMe, setGlobalCallMe } = useUniversal()
  const { signedIn, loading } = useSignedIn()
  const callMe = useCallMe()
  const ownerName = useSettingsStore((s) => s.ownerName.trim())
  const setSetting = useSettingsStore((s) => s.set)
  useEffect(() => {
    if (authLoading || loading) return
    if (signedIn) {
      if (callMe && callMe !== ownerName) setSetting('ownerName', callMe)
    } else if ((ownerName || null) !== globalCallMe) {
      setGlobalCallMe(ownerName || null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, loading, signedIn, callMe, ownerName, globalCallMe])
}
