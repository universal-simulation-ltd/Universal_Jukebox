import { create } from 'zustand'

// Light mode is the default across the whole suite — the app opens light and
// STAYS light until the user explicitly asks for something else. That is a
// standing rule, and it is deliberately stronger than "respect the OS": an app
// that flips to dark because the user's laptop schedules dark at sunset looks
// broken to someone who never asked for it. `system` is available; it is just
// not the default.
//
// ⚠️ THIS IS THE FOURTH COPY of this file (Beam, Video, PalsPayIn, here), and
// `Docs_UNI_SIM/new-universal-app.md` §3 names it as one of the four things the
// tree is repeating: the existing three differ only in the storage key. The
// right fix is one `useTheme(appKey)` in `@unisim/sdk`, and Jukebox was
// supposed to be its first consumer rather than its next duplicate.
//
// It is a copy anyway, on purpose and with the reason written down: the SDK
// change is a publish plus a consumer bump in four apps, and doing it as part
// of shipping a new app means a new app that cannot build until an npm publish
// lands. The extraction is in `backlog-unisim.md` with this file named as the
// one to delete. **Do not take a fifth copy** — at that point the deduplication
// is cheaper than the copy.
//
// Dark mode matters more here than in the other three. Every other Universal
// App is a tool you use in daylight and close; a music player is left open,
// often in the evening, on a Now Playing view dominated by one large image.

export type ThemePref = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'unisim-jukebox-theme'

function readStored(): ThemePref {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch { /* private mode / storage disabled */ }
  return 'light'
}

function resolve(pref: ThemePref): 'light' | 'dark' {
  if (pref !== 'system') return pref
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(pref: ThemePref): 'light' | 'dark' {
  const effective = resolve(pref)
  document.documentElement.classList.toggle('dark', effective === 'dark')
  document.documentElement.style.colorScheme = effective
  return effective
}

interface ThemeState {
  pref: ThemePref
  effective: 'light' | 'dark'
  setPref(pref: ThemePref): void
}

export const useThemeStore = create<ThemeState>((set) => {
  const pref = readStored()
  const effective = apply(pref)

  // Only track the OS while the user has actually opted into `system`.
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const current = useThemeStore.getState().pref
    if (current === 'system') set({ effective: apply('system') })
  })

  return {
    pref,
    effective,
    setPref(next) {
      try { localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
      set({ pref: next, effective: apply(next) })
    },
  }
})
