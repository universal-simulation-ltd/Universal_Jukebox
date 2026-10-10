import { ensureGraph, graphExists, setBoost } from './audioGraph'
import { engineActive, mediaElements, setFades, setOutputGain } from './audio'
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
 * ⚠️ The boost and Quiet / Loud are the only ones that build a Web Audio graph,
 * and they do so ONLY when actually moved off their defaults. That asymmetry is the point:
 * routing the element through an `AudioContext` is a one-way door with silence
 * as its failure mode (see `audioGraph.ts`), so somebody who never touches the
 * boost slider never takes that risk. Once built the graph stays — there is no
 * un-routing an element — so turning the boost back to 1× sets unity gain
 * rather than tearing anything down.
 */
function apply(): void {
  const { volumeBoost, levelDb, fadeInSec, fadeOutSec } = useSettingsStore.getState()

  setFades(fadeInSec, fadeOutSec)

  // ⚠️ THE iPHONE APP BUILDS NO GRAPH AT ALL. Its sound is the native engine's,
  // which has a real gain of its own, so Quiet is just a number sent there —
  // and a Web Audio context here would take WebKit's audio session and fight
  // the engine for the speaker (`lib/audioEngine.ts`). Above 0 dB the engine
  // can only take the product up to full: AVPlayer's volume stops at 1.
  if (engineActive()) {
    setOutputGain(Math.abs(levelDb) > 0.001 ? 10 ** (levelDb / 20) : 1)
    return
  }

  const wantsBoost = volumeBoost > 1.001
  const wantsLevel = Math.abs(levelDb) > 0.001
  if (wantsBoost && !graphExists()) ensureGraph(mediaElements())
  // Quiet / Loud is the one route to a graph in the iPhone app — see
  // `quietGraphAllowed`.
  if (wantsLevel && !graphExists()) ensureGraph(mediaElements(), { forQuiet: true })
  if (graphExists()) {
    setBoost((wantsBoost ? volumeBoost : 1) * (wantsLevel ? 10 ** (levelDb / 20) : 1))
  }
}

/** Call once, from `main.tsx`. */
export function startApplyingSettings(): void {
  apply()
  useSettingsStore.subscribe(apply)
}
