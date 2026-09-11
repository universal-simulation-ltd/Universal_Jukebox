import { useEffect, useState } from 'react'
import { scrollToTop } from '../lib/scrollTop'

// A floating "back to the top" (James, 2026-09-11: "when scrolling down have a
// floating up arrow to scroll to the top"). It appears once you are most of a
// screen down, and sits just above the player bar — measured, because the bar
// is taller on a phone with a home indicator and absent with nothing queued.

export default function ScrollTopButton() {
  const [shown, setShown] = useState(false)
  const [lift, setLift] = useState(16)

  useEffect(() => {
    let frame = 0
    const check = () => {
      frame = 0
      setShown(window.scrollY > window.innerHeight * 0.8)
      const bar = document.querySelector('[data-jb-playerbar]')
      setLift((bar ? bar.getBoundingClientRect().height : 0) + 16)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    check()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to the top"
      title="Back to the top"
      aria-hidden={!shown}
      tabIndex={shown ? 0 : -1}
      style={{ bottom: lift }}
      className={`fixed right-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/85 text-white shadow-lg backdrop-blur transition duration-200 hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504] sm:right-6 dark:bg-slate-100/90 dark:text-slate-900 dark:hover:bg-white ${
        shown ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M10 16V4.5M5 9.5l5-5 5 5" />
      </svg>
    </button>
  )
}
