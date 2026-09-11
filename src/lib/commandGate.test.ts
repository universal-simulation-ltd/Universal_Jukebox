import { describe, expect, it } from 'vitest'
import { createCommandGate, REPEAT_WINDOW_MS } from './commandGate'

describe('createCommandGate', () => {
  const at = () => {
    let t = 1000
    return { clock: () => t, advance: (ms: number) => { t += ms } }
  }

  it('drops the echo of one press arriving by the other route', () => {
    const time = at()
    const gate = createCommandGate(time.clock)
    expect(gate('pause', 'webkit').pass).toBe(true)
    time.advance(4)
    expect(gate('pause', 'native')).toEqual({ pass: false, after: { action: 'pause', via: 'webkit', ms: 4 } })
  })

  it('treats play, pause and toggle as one press', () => {
    const time = at()
    const gate = createCommandGate(time.clock)
    expect(gate('toggle', 'native').pass).toBe(true)
    time.advance(20)
    expect(gate('pause', 'webkit').pass).toBe(false)
    time.advance(20)
    expect(gate('play', 'webkit').pass).toBe(false)
  })

  it('lets a second press through once the window has passed', () => {
    const time = at()
    const gate = createCommandGate(time.clock)
    expect(gate('nexttrack', 'native').pass).toBe(true)
    time.advance(REPEAT_WINDOW_MS)
    expect(gate('nexttrack', 'native').pass).toBe(true)
  })

  it('never holds up a different kind of command, or one it does not know', () => {
    const time = at()
    const gate = createCommandGate(time.clock)
    expect(gate('pause', 'webkit').pass).toBe(true)
    expect(gate('nexttrack', 'webkit').pass).toBe(true)
    expect(gate('previoustrack', 'native').pass).toBe(true)
    expect(gate('seekto', 'native').pass).toBe(true)
    expect(gate('seekto', 'native').pass).toBe(true)
  })
})
