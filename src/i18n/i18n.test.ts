// Every language has every key, and nothing else; every translation keeps the
// English placeholders ({name}) and plural stems. `tsc` already fails on a
// missing key (each dictionary is typed against English) — this also catches
// a dropped `{count}`, an extra key, and an empty string, and keeps catching
// them if anyone loosens a type.
import { describe, expect, it } from 'vitest'
import { en } from './en/index.ts'
import { TRANSLATIONS } from './languages.ts'
import { getT, makeBasicTranslator } from './runtime.ts'

const SUITE = ['fr', 'es', 'it', 'de', 'pt-BR', 'pt-PT', 'tr']

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

function flat(dict: Record<string, Record<string, string>>): Map<string, string> {
  const out = new Map<string, string>()
  for (const [ns, keys] of Object.entries(dict)) {
    for (const [k, v] of Object.entries(keys)) out.set(`${ns}.${k}`, v)
  }
  return out
}

const english = flat(en)

describe('i18n dictionaries', () => {
  it('registers every suite language', () => {
    expect(Object.keys(TRANSLATIONS).sort()).toEqual([...SUITE].sort())
  })

  it('English has no empty strings', () => {
    for (const [key, value] of english) expect(value.trim(), key).not.toBe('')
  })

  for (const lang of SUITE) {
    describe(lang, () => {
      const dict = TRANSLATIONS[lang] ? flat(TRANSLATIONS[lang]) : new Map<string, string>()

      it('has every English key', () => {
        const missing = [...english.keys()].filter((k) => !dict.has(k))
        expect(missing).toEqual([])
      })

      it('has no key English lacks', () => {
        // A plural form English does not use (`_few`, `_many`) is allowed when
        // its stem exists in English.
        const extra = [...dict.keys()].filter(
          (k) => !english.has(k) && !(/_(zero|two|few|many)$/.test(k) && english.has(k.replace(/_(zero|two|few|many)$/, '_other'))),
        )
        expect(extra).toEqual([])
      })

      it('keeps every placeholder and leaves nothing empty', () => {
        const wrong: string[] = []
        for (const [key, value] of dict) {
          if (value.trim() === '') wrong.push(`${key}: empty`)
          const source = english.get(key) ?? english.get(key.replace(/_(zero|two|few|many)$/, '_other'))
          if (source === undefined) continue
          // Exactly the same set — even `{count}` in a `_one` form, because
          // French and Portuguese pick "one" for 0 as well as 1.
          const want = placeholders(source)
          const got = placeholders(value)
          if (JSON.stringify(want) !== JSON.stringify(got)) wrong.push(`${key}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`)
        }
        expect(wrong).toEqual([])
      })
    })
  }
})

describe('runtime', () => {
  it('reads English under node, so the other tests see English', () => {
    expect(getT()('common.cancel')).toBe('Cancel')
    expect(getT().plural('common.songs', 1)).toBe('1 song')
    expect(getT().plural('common.songs', 1204)).toBe('1,204 songs')
  })

  it('falls back to English for an unknown language', () => {
    expect(makeBasicTranslator('xx').plural('common.albums', 2)).toBe('2 albums')
  })
})
