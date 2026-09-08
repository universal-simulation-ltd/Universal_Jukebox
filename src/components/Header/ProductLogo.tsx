// GENERATED FILE — do not edit by hand.
// Source: backoffice/universal-platform/scripts/app-marks/marks.mjs
// Regenerate: node scripts/app-marks/build.mjs (from backoffice/universal-platform)
// Mark: Universal Jukebox — A record with its tonearm lifted clear; on hover the arm comes down.
// Hover: The arm swings down onto the record and the disc turns.
//
// Icon-only by design: the SDK's UniversalAppsNavBar renders the product name
// from its catalogue beside this slot, so a wordmark here would print it twice.

const CSS = `
  /* Resting states */
  .uam-jukebox-arm { transform: rotate(-34deg); transition: transform .55s cubic-bezier(.34,1.2,.4,1); transform-origin: 49px 14px; }
  .uam-jukebox-head { transform: rotate(-34deg); transition: transform .55s cubic-bezier(.34,1.2,.4,1); transform-origin: 49px 14px; }
  .uam-jukebox-disc { transform: rotate(0deg); transition: transform 1.2s cubic-bezier(0.16,1,0.3,1); transform-origin: 29px 33px; }

  /* Active states */
  .uam-host-jukebox:hover .uam-jukebox-arm,
  .uam-host-jukebox:focus-visible .uam-jukebox-arm { transform: rotate(0deg); }
  .uam-host-jukebox:hover .uam-jukebox-head,
  .uam-host-jukebox:focus-visible .uam-jukebox-head { transform: rotate(0deg); }
  .uam-host-jukebox:hover .uam-jukebox-disc,
  .uam-host-jukebox:focus-visible .uam-jukebox-disc { transform: rotate(120deg); }

  @media (prefers-reduced-motion: reduce) {
    .uam-jukebox-arm,
    .uam-jukebox-head,
    .uam-jukebox-disc { transition: none !important; }
  }
`

export default function ProductLogo() {
  return (
    <span
      className="uam-host-jukebox inline-flex h-6 w-6 shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      <style>{CSS}</style>
      <svg viewBox="0 0 64 64" className="h-6 w-6" aria-hidden="true">
        <defs>
          <linearGradient id="uam-nav-jukebox-tile" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fe8c01" />
            <stop offset="1" stopColor="#e05504" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="14" fill="url(#uam-nav-jukebox-tile)" />
        <circle cx={29} cy={33} r={20} fill="#ffffff" className="uam-jukebox-disc" />
        <circle cx={29} cy={33} r={15.5} fill="none" strokeWidth={1.6} opacity={0.5} stroke="#e05504" className="uam-jukebox-groove1" />
        <circle cx={29} cy={33} r={11} fill="none" strokeWidth={1.6} opacity={0.5} stroke="#e05504" className="uam-jukebox-groove2" />
        <circle cx={29} cy={33} r={6.2} fill="#e05504" />
        <circle cx={29} cy={33} r={1.6} fill="#ffffff" />
        <circle cx={49} cy={14} r={4} fill="#fed7aa" />
        <path d="M49 14 L42 28.5" fill="none" strokeWidth={2.8} strokeLinecap="round" stroke="#fed7aa" className="uam-jukebox-arm" />
        <path d="M42 28.5 L40.6 31.4" fill="none" strokeWidth={5.4} strokeLinecap="round" stroke="#fed7aa" className="uam-jukebox-head" />
      </svg>
    </span>
  )
}
