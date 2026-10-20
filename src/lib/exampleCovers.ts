// The example library's sleeve photos (James, 2026-10-20: "get some free to use
// photos for the albums of people, scenery or anything else and put the album
// name on top"). All CC0, sources in `src/assets/example-covers/README.md`.
//
// ⚠️ INLINED (`?inline`), in a chunk of their own that `drawSleeve` imports
// only when somebody opens the example library — the app's own bundle carries
// none of it. Inlined rather than fetched because a sleeve ends in
// `canvas.toBlob`, and the desktop app runs from `file://`, where a picture
// drawn from a file taints the canvas and the blob is refused. A data URL
// never does, on any platform.

import cuttingHead from '../assets/example-covers/cutting-head.jpg?inline'
import masterLacquer from '../assets/example-covers/master-lacquer.jpg?inline'
import quietRooms from '../assets/example-covers/quiet-rooms.jpg?inline'
import runOut from '../assets/example-covers/run-out.jpg?inline'
import secondPressing from '../assets/example-covers/second-pressing.jpg?inline'
import sidesAAndB from '../assets/example-covers/sides-a-and-b.jpg?inline'
import surfaceNoise from '../assets/example-covers/surface-noise.jpg?inline'
import testPressing from '../assets/example-covers/test-pressing.jpg?inline'
import theLongPlayer from '../assets/example-covers/the-long-player.jpg?inline'

/** By album title — every example record has its own. */
export const EXAMPLE_PHOTOS: Readonly<Record<string, string>> = {
  'Sides A and B': sidesAAndB,
  'Second Pressing': secondPressing,
  'The Long Player': theLongPlayer,
  'Run-out': runOut,
  'Cutting Head': cuttingHead,
  'Test Pressing': testPressing,
  'Master Lacquer': masterLacquer,
  'Quiet Rooms': quietRooms,
  'Surface Noise': surfaceNoise,
}
