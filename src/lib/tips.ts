import { useSettingsStore, type TipId } from '../stores/settingsStore'

/**
 * Retire a first-run tip for good (`components/Tip.tsx`). Called by the tip's
 * TARGET, from the handler that does the thing the tip points at — so one tap
 * both acts and retires it. "Show the tips again" in the Actions menu undoes it.
 */
export function markTipSeen(id: TipId): void {
  const { tipsSeen, set } = useSettingsStore.getState()
  if (!tipsSeen.includes(id)) set('tipsSeen', [...tipsSeen, id])
}
