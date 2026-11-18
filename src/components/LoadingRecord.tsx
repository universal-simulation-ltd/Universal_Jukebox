// A small record that spins while the example library is being made
// (James, 2026-11-18: "show a loading animation so you know it's doing
// something"). Used on the button or row that was pressed — Landing,
// WelcomeScreen, Try the example library — beside "Cutting records…".
//
// ⚠️ THE GLINT IS WHAT MAKES IT LOOK LIKE IT IS TURNING. A record is all
// circles round one centre, and a spinning circle looks exactly like a still
// one; the white arc is the one thing on it that moves.
//
// Reduced motion: no spin, a slow pulse instead, so it still says "busy".

export default function LoadingRecord({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className={`${className} shrink-0 motion-safe:animate-[spin_0.9s_linear_infinite] motion-reduce:animate-pulse`}
    >
      <circle cx="10" cy="10" r="9.5" fill="#151210" />
      <circle cx="10" cy="10" r="6.6" fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="0.8" />
      <path d="M10 1.9A8.1 8.1 0 0 1 18.1 10" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.3" strokeLinecap="round" />
      {/* The phone app's own accent where there is one (`--jx-fill`), else the website's orange. */}
      <circle cx="10" cy="10" r="3.7" fill="var(--jx-fill, #FE8C01)" />
      <circle cx="10" cy="10" r="0.9" fill="#ffffff" />
    </svg>
  )
}
