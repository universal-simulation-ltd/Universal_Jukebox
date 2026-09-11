import Cover from './Cover'
import type { Album } from '../lib/types'

/**
 * A 45 in its album's colours — a single, the jukebox's record: a bigger label
 * and a hole you can see across a room. Drawn in proportions, so it is right at
 * whatever size the shelf gives it (the reel's `Medium` is a fixed 76px
 * drawing, and scaled up it has too few, too-thick grooves).
 */
export default function Record45({ album }: { album: Album | undefined }) {
  return (
    <span className="relative block aspect-square w-full overflow-hidden rounded-full bg-[#120c09] shadow-lg ring-1 ring-black/10">
      <span
        className="absolute inset-0 rounded-full opacity-[0.18]"
        style={{ background: 'repeating-radial-gradient(circle at 50% 50%, transparent 0 2px, rgba(255,255,255,.5) 2px 3px)' }}
      />
      <span className="absolute overflow-hidden rounded-full ring-1 ring-white/10" style={{ inset: '25%' }}>
        <Cover album={album} className="h-full w-full" rounded={false} />
      </span>
      <span className="absolute rounded-full bg-slate-100 dark:bg-slate-900" style={{ inset: '43%' }} />
    </span>
  )
}
