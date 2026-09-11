import { useCallback, useLayoutEffect, useRef, useState } from 'react'

/**
 * How many columns a CSS grid is actually showing — measured, because the
 * count is responsive (and a setting), and "the second row" means after
 * however many fit across right now.
 *
 * Returns a CALLBACK ref for the grid: it watches the grid's size (a window
 * resize, a breakpoint) and is re-measured when `setting` changes, which alters
 * the columns without necessarily resizing anything.
 */
export function useGridColumns(setting: unknown): [(el: HTMLElement | null) => void, number] {
  const [columns, setColumns] = useState(2)
  const node = useRef<HTMLElement | null>(null)
  const observer = useRef<ResizeObserver | null>(null)
  const measure = useCallback(() => {
    const el = node.current
    if (el) setColumns(getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length || 1)
  }, [])
  const ref = useCallback(
    (el: HTMLElement | null) => {
      observer.current?.disconnect()
      node.current = el
      if (!el) return
      measure()
      observer.current = new ResizeObserver(measure)
      observer.current.observe(el)
    },
    [measure],
  )
  useLayoutEffect(measure, [measure, setting])
  return [ref, columns]
}
