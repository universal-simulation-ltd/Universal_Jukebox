// Every translation, registered by `index.tsx` and read by `i18n.test.ts`.
// Kept apart from `index.tsx` so the test can import the dictionaries without
// the SDK or React. English is not here: it is the source, loaded by runtime.ts.
import type { Messages } from './runtime.ts'

export const TRANSLATIONS: Record<string, Messages> = {}
