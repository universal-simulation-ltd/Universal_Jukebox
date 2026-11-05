import { describe, expect, it } from 'vitest'
import { sleeveLettering } from './madeSleeves'

describe('made sleeves for albums with no artwork', () => {
  it('letters an album the same way every time, and not every album alike', () => {
    expect(sleeveLettering('Mika Life in Cartoon Motion')).toEqual(sleeveLettering('Mika Life in Cartoon Motion'))
    const styles = new Set(Array.from({ length: 60 }, (_, i) => JSON.stringify(sleeveLettering(`Album ${i}`))))
    expect(styles.size).toBeGreaterThan(2)
  })
})
