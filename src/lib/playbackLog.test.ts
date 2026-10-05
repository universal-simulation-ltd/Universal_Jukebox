import { describe, expect, it } from 'vitest'
import { formatPlaybackLog } from './playbackLog'

describe('the playback log', () => {
  const at = new Date(2026, 9, 5, 14, 22, 7).getTime()
  it('puts each event on its own line with its clock time and details', () => {
    const text = formatPlaybackLog({
      now: at,
      platform: 'ios',
      version: '1.0.0',
      events: [{ t: at, kind: 'lock-art', vis: 'hidden', report: 'mode=own', sec: 84.27 }],
      native: '2026-10-05T13:22:07Z update rate=1.0 at=84 mode=own app=2\n',
    })
    expect(text).toContain('14:22:07 lock-art hidden report=mode=own sec=84.3')
    expect(text).toContain('── Native log (commands.log), UTC ──\n2026-10-05T13:22:07Z update rate=1.0')
  })

  it('says when there is nothing, and leaves the native half out where there is none', () => {
    const text = formatPlaybackLog({ now: at, platform: 'android', version: '1.0.0', events: [], native: null })
    expect(text).toContain('(none)')
    expect(text).not.toContain('Native log')
  })
})
