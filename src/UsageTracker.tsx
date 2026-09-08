import { useEffect, useRef } from 'react'
import { useUniversal, useUsageTracker, track } from '@unisim/sdk'

/**
 * Emits a single `session.opened` usage_events row when a signed-in user with an
 * active org opens the app, so god-mode's "last product used" column populates.
 * No-op while anonymous — the SDK drops usage events without a session/org.
 * Mount once inside <UniversalProvider>.
 *
 * ⚠️ This is the component that breaks if `jukebox` is missing from the Postgres
 * `product_code` enum — and it breaks INVISIBLY, for signed-in users only, in a
 * state most people never see. Migration `0150_product_code_jukebox.sql` added
 * it, which is why `product: 'jukebox'` in main.tsx needs no cast.
 *
 * ⚠️ Note what is NOT tracked, and why it matters more here than anywhere else
 * in the suite. No event carries a filename, an artist, an album, a track count
 * or a byte count. This app reads someone's entire music collection; a
 * well-meaning `track('jukebox.scanned', { tracks })` would start quietly
 * building a picture of what people own — which is precisely the thing the
 * front page promises does not happen. The only event this app will ever send
 * is "somebody opened it".
 *
 * ⚠️ The fifteenth copy of this file in the tree (nine byte-identical). The SDK
 * export that would delete all fifteen is in `new-universal-app.md` §3.
 */
export default function UsageTracker() {
  useUsageTracker()
  const { session, activeOrgId } = useUniversal()
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current || !session || !activeOrgId) return
    fired.current = true
    track('session.opened')
  }, [session, activeOrgId])
  return null
}
