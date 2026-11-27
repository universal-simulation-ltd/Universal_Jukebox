// The phone app's "New features" sheet (suite rule, Docs_UNI_SIM/BRANDING.md
// → "New features"; the SDK's <WhatsNewSheet>). Once, after an update, for
// people who already had the app; never on a fresh install, never while a
// dialog is up. Only the newest release is ever shown. Reset to defaults
// shows it again (the SDK's useResetAppDefaults clears "seen").
//
// 1.0.18 — the Hits shelf (James, 2026-11-27: "Yes, add it"). The shelf came
// in 1.0.17 (`@374c458`), which reached Play production with no sheet, and it
// stays empty until "Look songs up for the Hits shelf" is on. The switch here
// IS that Tune row (`hitsOnline`, same store), so it starts unticked, and the
// sentence beside it says what is sent (the rule every online setting keeps,
// `lib/hits.ts`). Not on iPhone / iPad release builds (`barsHits`), and not
// when the person has removed the shelf.

import { WhatsNewSheet, defineWhatsNew } from '@unisim/sdk'
import { useT } from '../i18n'
import { barsHits } from '../lib/nativeFile'
import { useSettingsStore } from '../stores/settingsStore'
import { useThemeStore } from '../stores/themeStore'
import { HAD_JUKEBOX_BEFORE } from './firstRun'

const releases = defineWhatsNew({
  '1.0.18': [
    {
      id: 'hits',
      icon: '🏆',
      titleKey: 'settings.hits_online',
      bodyKey: 'shelves.hits_offer',
      setting: {
        key: 'hitsOnline',
        get: () => useSettingsStore.getState().hitsOnline === true,
        set: (on: boolean) => { useSettingsStore.getState().set('hitsOnline', on); return true },
      },
      applies: () => !barsHits() && useSettingsStore.getState().hitsShelf,
    },
  ],
})

export function NewFeatures() {
  const t = useT()
  const dark = useThemeStore((s) => s.effective === 'dark')
  return (
    <WhatsNewSheet
      releases={releases}
      isFreshInstall={() => !HAD_JUKEBOX_BEFORE}
      t={(key) => t(key as Parameters<typeof t>[0])}
      theme={dark ? 'dark' : 'light'}
      variant="sheet"
    />
  )
}
