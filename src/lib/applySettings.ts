import { ensureGraph, graphExists, setBoost } from './audioGraph'
import { mediaElements, setFades } from './audio'
import { useSettingsStore } from '../stores/settingsStore'

// The one place settings become audible.
//
// Subscribed once at startup rather than from a component, because these have
// to hold whether or not the Settings page is mounted — you change the fade,
// navigate back to your library, and it keeps working. A `useEffect` somewhere
// would tie the behaviour to a screen being open.

/**
 * Push the current settings into the audio layer.
 *
 * ⚠️ The boost and Extra quiet are the only ones that build a Web Audio graph,
 * and they do so ONLY when actually moved off their defaults. That asymmetry is the point:
 * routing the element through an `AudioContext` is a one-way door with silence
 * as its failure mode (see `audioGraph.ts`), so somebody who never touches the
 * boost slider never takes that risk. Once built the graph stays — there is no
 * un-routing an element — so turning the boost back to 1× sets unity gain
 * rather than tearing anything down.
 */
function apply(): void {
  const { volumeBoost, quietDb, fadeInSec, fadeOutSec } = useSettingsStore.getState()

  setFades(fadeInSec, fadeOutSec)

  const wantsBoost = volumeBoost > 1.001
  const wantsQuiet = quietDb < -0.001
  if (wantsBoost && !graphExists()) ensureGraph(mediaElements())
  // Extra quiet is the one route to a graph in the iPhone app — see
  // `quietGraphAllowed`.
  if (wantsQuiet && !graphExists()) ensureGraph(mediaElements(), { forQuiet: true })
  if (graphExists()) {
    setBoost((wantsBoost ? volumeBoost : 1) * (wantsQuiet ? 10 ** (quietDb / 20) : 1))
  }
}

/** Call once, from `main.tsx`. */
export function startApplyingSettings(): void {
  apply()
  useSettingsStore.subscribe(apply)
}
