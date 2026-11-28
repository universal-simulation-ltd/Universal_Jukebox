// bpmWorker.ts — runs `estimateBpm` off the main thread so a deck that is
// playing never stutters while its tempo is worked out. The excerpt is a copy
// made by the caller; nothing leaves the device.
import { estimateBpm } from './bpm'

self.onmessage = (e: MessageEvent<{ id: number; samples: Float32Array; sampleRate: number }>) => {
  const { id, samples, sampleRate } = e.data
  self.postMessage({ id, ...estimateBpm(samples, sampleRate) })
}
