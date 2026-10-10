// Every translation, registered by `index.tsx` and read by `i18n.test.ts`.
// Kept apart from `index.tsx` so the test can import the dictionaries without
// the SDK or React. English is not here: it is the source, loaded by runtime.ts.
//
// Each language is a folder with the same files as `en/`, typed as a `Draft`
// (any subset of the English keys); a key it lacks shows in English.
import type { Draft } from './runtime.ts'
import { fr } from './fr/index.ts'
import { es } from './es/index.ts'
import { it } from './it/index.ts'
import { de } from './de/index.ts'
import { ptBR } from './pt-BR/index.ts'
import { ptPT } from './pt-PT/index.ts'
import { tr } from './tr/index.ts'

export const TRANSLATIONS: Record<string, Draft> = { fr, es, it, de, 'pt-BR': ptBR, 'pt-PT': ptPT, tr }
