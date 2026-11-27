// Was Jukebox already on this device before this load? Read once, FIRST:
// main.tsx imports this before anything else, because the settings store
// writes its keys (`unisim-jukebox-settings`, the `jukebox:` standards) as
// soon as it loads, so any later look would call every install an update.
// Used by the "New features" sheet (whatsNew.tsx): new users never see it.

export const HAD_JUKEBOX_BEFORE: boolean = (() => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? ''
      if (k === 'unisim-jukebox-settings' || k.startsWith('jukebox:')) return true
    }
  } catch { /* no storage: treat as new, so nothing shows */ }
  return false
})()
