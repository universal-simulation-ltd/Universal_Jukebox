import { describe, expect, it, vi } from 'vitest'

// Android's WebView has no `navigator.mediaSession`, and the native plugin's
// buttons (`dispatchAction`) must still reach the player there.
describe('dispatchAction without navigator.mediaSession', () => {
  it('runs the handlers the player installed', async () => {
    vi.stubGlobal('navigator', {})
    const { dispatchAction, setHandlers, setPlaybackState } = await import('./mediaSession')
    const handlers = {
      onPlay: vi.fn(), onPause: vi.fn(), onStop: vi.fn(), onNext: vi.fn(),
      onPrevious: vi.fn(), onSeekTo: vi.fn(), onSeekBy: vi.fn(),
    }
    setHandlers(handlers)
    dispatchAction('nexttrack')
    expect(handlers.onNext).toHaveBeenCalledOnce()
    setPlaybackState(true)
    await new Promise((r) => setTimeout(r, 400))
    dispatchAction('toggle')
    expect(handlers.onPause).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })
})
