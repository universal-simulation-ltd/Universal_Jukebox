// icons.tsx — the phone screens' glyphs. Stroked at 1.8 on a 24 grid, to sit
// with the system's own tab-bar icons.

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

/** A record half out of its sleeve. */
export function IconAlbums() {
  return (
    <svg {...base}>
      <rect x="3" y="5" width="12" height="14" rx="1.5" />
      <path d="M15 7.2a5 5 0 0 1 0 9.6" />
      <path d="M15 5.4a6.8 6.8 0 0 1 0 13.2" />
      <circle cx="9" cy="12" r="2" />
    </svg>
  )
}

/** A microphone. */
export function IconArtists() {
  return (
    <svg {...base}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" />
    </svg>
  )
}

/** Two quavers. */
export function IconSongs() {
  return (
    <svg {...base}>
      <path d="M9 18V6l11-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </svg>
  )
}

/** Records filed on a shelf. */
export function IconShelves() {
  return (
    <svg {...base}>
      <path d="M3 20h18M5 20V6M9 20V4M13 20V7l4.5 13" />
    </svg>
  )
}

/** Sliders — Tune this app. */
export function IconTune() {
  return (
    <svg {...base}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </svg>
  )
}

/** Headphones — preview a few seconds of a song. */
export function IconPreview() {
  return (
    <svg {...base} strokeWidth={1.7}>
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <path d="M4 14.5h2.2a1 1 0 0 1 1 1v3.6a1 1 0 0 1-1 1H5.4A1.4 1.4 0 0 1 4 18.7v-4.2ZM20 14.5h-2.2a1 1 0 0 0-1 1v3.6a1 1 0 0 0 1 1h.8a1.4 1.4 0 0 0 1.4-1.4v-4.2Z" />
    </svg>
  )
}

export function IconStop() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6.5" y="6.5" width="11" height="11" rx="2.2" />
    </svg>
  )
}

/** ⋯ — a song's options. */
export function IconMore() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5.5" cy="12" r="1.9" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="18.5" cy="12" r="1.9" />
    </svg>
  )
}

export function IconClose() {
  return (
    <svg {...base} strokeWidth={2.2}>
      <path d="M7 7l10 10M17 7 7 17" />
    </svg>
  )
}

export function IconSearch() {
  return (
    <svg {...base}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}

export function IconBack() {
  return (
    <svg {...base} strokeWidth={2.2}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

export function IconDown() {
  return (
    <svg {...base} strokeWidth={2.2}>
      <path d="M5 9l7 7 7-7" />
    </svg>
  )
}

export function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 4.8v14.4a1 1 0 0 0 1.5.86l11.6-7.2a1 1 0 0 0 0-1.72L8.5 3.94A1 1 0 0 0 7 4.8Z" />
    </svg>
  )
}

export function IconPause() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="4" width="4.2" height="16" rx="1.2" />
      <rect x="13.8" y="4" width="4.2" height="16" rx="1.2" />
    </svg>
  )
}

export function IconNext() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M5 5.6v12.8a1 1 0 0 0 1.53.85l9.6-6.4a1 1 0 0 0 0-1.7l-9.6-6.4A1 1 0 0 0 5 5.6Z" />
      <rect x="16.8" y="5" width="2.6" height="14" rx="1" />
    </svg>
  )
}

export function IconShuffle() {
  return (
    <svg {...base} strokeWidth={2}>
      <path d="M3 7h3.5c2 0 3 1 4.2 3l2.6 4c1.2 2 2.2 3 4.2 3H21M3 17h3.5c1.1 0 1.9-.3 2.6-.9M14.9 7.9c.7-.6 1.5-.9 2.6-.9H21" />
      <path d="M18 4l3 3-3 3M18 14l3 3-3 3" />
    </svg>
  )
}

/** The app's own mark: a record, its label in the accent. */
export function RecordMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className="jx-mark">
      <circle cx="16" cy="16" r="15" fill="#151210" />
      <circle cx="16" cy="16" r="11.5" fill="none" stroke="#2c2622" strokeWidth="1" />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="#2c2622" strokeWidth="1" />
      <circle cx="16" cy="16" r="5.6" fill="var(--jx-fill)" />
      <circle cx="16" cy="16" r="1.3" fill="#f6f2ec" />
    </svg>
  )
}
