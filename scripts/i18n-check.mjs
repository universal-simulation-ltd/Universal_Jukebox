// The translation gate: every suite language has every English key, keeps
// every placeholder, and has nothing extra. `npm test` checks all of that
// except completeness (a key not yet translated shows in English, so a
// language part-way through still builds); this runs the same test with
// completeness required.
//
//   npm run i18n:check            every language
//   npm run i18n:check -- de fr   just these
//
// A script rather than `I18N_STRICT=1 vitest …` in package.json, because that
// inline variable does not work in the Windows shell.
import { spawnSync } from 'node:child_process'

const langs = process.argv.slice(2)
const result = spawnSync('npx', ['vitest', 'run', 'src/i18n', '--reporter=verbose'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, I18N_STRICT: langs.length ? langs.join(',') : 'all' },
})
process.exit(result.status ?? 1)
