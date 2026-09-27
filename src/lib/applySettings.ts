import { ensureGraph, graphAllowed, graphExists, setBoost } from './audioGraph'
import { mediaElements, setFades, setTrimGain } from './audio'
import { trimAttenuation, trimBoost } from './volumeTrim'
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
 * ⚠️ The boost is the only one that builds a Web Audio graph, and it does so
 * ONLY when actually asked for a boost above unity. That asymmetry is the point:
 * routing the element through an `AudioContext` is a one-way door with silence
 * as its failure mode (see `audioGraph.ts`), so somebody who never touches the
 * boost slider never takes that risk. Once built the graph stays — there is no
 * un-routing an element — so turning the boost back to 1× sets unity gain
 * rather than tearing anything down.
 */
function apply(): void {
  const { volumeBoost, volumeTrim, fadeInSec, fadeOutSec } = useSettingsStore.getState()

  setFades(fadeInSec, fadeOutSec)
  // The "−50 to +50" volume: its minus side on the element, anywhere; its plus
  // side on top of the boost, only where the graph is allowed (`volumeTrim.ts`).
  // Not in the iPhone app, where it can't be heard (`VolumeTrim`) — a trim
  // left set there must not linger unseen.
  setTrimGain(graphAllowed() ? trimAttenuation(volumeTrim) : 1)

  const gain = volumeBoost * (graphAllowed() ? trimBoost(volumeTrim) : 1)
  const wantsBoost = gain > 1.001
  if (wantsBoost && !graphExists()) ensureGraph(mediaElements())
  if (graphExists()) setBoost(wantsBoost ? gain : 1)
}

/** Call once, from `main.tsx`. */
export function startApplyingSettings(): void {
  apply()
  useSettingsStore.subscribe(apply)
}
