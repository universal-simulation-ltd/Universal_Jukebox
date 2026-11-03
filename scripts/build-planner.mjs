// Siri's planner, bundled on its own for JavaScriptCore (`src/siri/planner.ts`).
//
// Written to `public/siri-planner.js`, so every build carries it into `dist/`
// and `npx cap sync` into the iOS app's `public/` folder, where
// `SiriIntents.swift` loads it. Generated — `.gitignore` keeps it out of git,
// and `build` / `build:desktop` run this first, so it can never be a stale copy
// of the code the page plays by.
//
// ⚠️ An IIFE with one global, `JukeboxPlanner`, and ES2019: JavaScriptCore runs
// it with no module loader, and on the oldest iOS the app supports.
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

await build({
  entryPoints: [`${root}src/siri/planner.ts`],
  outfile: `${root}public/siri-planner.js`,
  bundle: true,
  format: 'iife',
  globalName: 'JukeboxPlanner',
  platform: 'neutral',
  target: 'es2019',
  minify: true,
  legalComments: 'none',
  logLevel: 'warning',
})
