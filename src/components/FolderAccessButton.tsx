import { useRef } from 'react'
import { folderAccess } from '../lib/roots'
import type { Root } from '../lib/types'
import { useLibraryStore } from '../stores/libraryStore'

// The button that gets ONE folder back — permission, a re-pick, or a rescan,
// whichever that folder needs (`folderAccess`).
//
// Used by the folder-permission banner (one per unreachable folder) and by the
// error a missing file raises, when the folder is the thing that lapsed. It is
// one component so the two can never offer different routes back to the same
// folder.
//
// ⚠️ ONE FOLDER PER BUTTON, and never a loop. Permission is per handle, so three
// folders is three prompts — and firing those inside a single user gesture is
// something browsers may collapse into ONE grant, silently leaving the rest
// unplayable. Anything that wants to offer "reconnect them all" should render
// one of these per folder instead.
//
// ⚠️ And it MUST be a click. A permission request with no user gesture behind
// it is dropped silently, which presents as a button that does nothing — so
// nothing here can move into an effect.

const LABELS = { reopen: 'Allow access', choose: 'Choose folder', rescan: 'Rescan' } as const

export default function FolderAccessButton({ root }: { root: Root }) {
  const regrantFolder = useLibraryStore((s) => s.regrantFolder)
  const scanNativeFolder = useLibraryStore((s) => s.scanNativeFolder)
  const addFiles = useLibraryStore((s) => s.addFiles)
  const folderInput = useRef<HTMLInputElement>(null)
  const kind = folderAccess(root)

  return (
    <>
      <button
        type="button"
        onClick={
          kind === 'rescan'
            ? () => void scanNativeFolder()
            : kind === 'reopen'
              ? () => void regrantFolder(root.id)
              : () => folderInput.current?.click()
        }
        className="shrink-0 rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504]"
      >
        {LABELS[kind]}
      </button>
      {/* Rendered with the button it serves, in the same branch: a ref to an
          input that is not in the page is a click that silently does nothing. */}
      {kind === 'choose' && (
        <input
          ref={folderInput}
          type="file"
          {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
          multiple
          className="hidden"
          onChange={(e) => {
            // ⚠️ INTO this root, not as a new one. Without the id the folder
            // came back as "Music (2)" beside a "Music" still asking for itself.
            if (e.target.files) void addFiles(e.target.files, undefined, root.id)
            e.target.value = ''
          }}
        />
      )}
    </>
  )
}
