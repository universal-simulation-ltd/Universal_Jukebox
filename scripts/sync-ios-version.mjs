#!/usr/bin/env node
// Stamp package.json's version into the iOS Xcode project.
//
//   node scripts/sync-ios-version.mjs [--check]
//
// Android reads package.json directly from build.gradle at build time, so it
// needs nothing like this. Xcode cannot: MARKETING_VERSION and
// CURRENT_PROJECT_VERSION are literals inside project.pbxproj, and Capacitor's
// template ships them as "1.0" / "1". Left alone, every TestFlight and App
// Store build for the rest of the app's life claims to be version 1.0 while the
// desktop installers next to it say 0.5.0.
//
// ⚠️ CURRENT_PROJECT_VERSION (the BUILD number) must strictly increase for each
// upload to App Store Connect, and a number is burned even by a build that is
// later rejected — you cannot re-use it. The same major*10000 + minor*100 +
// patch scheme as android/app/build.gradle keeps the two stores in step; if you
// ever need to re-upload the same version, bump the patch rather than editing
// this by hand.
//
// ⚠️ EVERY TARGET, NOT JUST THE APP. The project holds the iPhone app, the
// "Resume listening" widget (JukeboxWidget) and the Apple Watch app
// (JukeboxWatch), and App Store Connect refuses an upload whose embedded watch
// app or extension carries a different version or build from the app around
// it. The replacements below are global for exactly that reason, and the
// watch app's Info.plist is generated from these same two settings
// (GENERATE_INFOPLIST_FILE) — never give a target a literal of its own.
// `--check` also fails if any target has drifted from the others.
//
// --check exits non-zero instead of writing, for CI.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const PBXPROJ = join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj')

const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const [major, minor, patch] = version.split('.').map(Number)
if ([major, minor, patch].some((n) => !Number.isInteger(n))) {
  console.error(`Cannot parse version "${version}" as major.minor.patch`)
  process.exit(1)
}
const build = major * 10000 + minor * 100 + patch

const before = readFileSync(PBXPROJ, 'utf8')

// Every target's values — the app, the widget, the watch app — side by side.
const found = (key) => [...before.matchAll(new RegExp(`${key} = ([^;]+);`, 'g'))].map((m) => m[1])
const targets = { MARKETING_VERSION: found('MARKETING_VERSION'), CURRENT_PROJECT_VERSION: found('CURRENT_PROJECT_VERSION') }
const drifted = Object.entries(targets).filter(([, values]) => new Set(values).size > 1)
const after = before
  .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
  .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${build};`)

if (after === before) {
  console.log(`iOS project already at ${version} (build ${build}).`)
  process.exit(0)
}
if (process.argv.includes('--check')) {
  for (const [key, values] of drifted) console.error(`Targets disagree on ${key}: ${[...new Set(values)].join(', ')}`)
  console.error(`iOS project is out of date — run: node scripts/sync-ios-version.mjs`)
  console.error(`Expected MARKETING_VERSION ${version}, CURRENT_PROJECT_VERSION ${build}.`)
  process.exit(1)
}
writeFileSync(PBXPROJ, after)
console.log(`iOS project stamped: MARKETING_VERSION ${version}, CURRENT_PROJECT_VERSION ${build} (${targets.MARKETING_VERSION.length} target configurations, the watch app's included).`)
