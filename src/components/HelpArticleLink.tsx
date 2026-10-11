import { useState, type ReactNode } from 'react'
import { KnowledgeBaseDialog } from '@unisim/sdk'
import { KNOWLEDGE_BASE } from '../knowledge'
import { navigate } from '../lib/route'
import { phoneScreens } from '../native/shell'
import { useThemeStore } from '../stores/themeStore'

// A link to one knowledge-base article, from wherever it helps — the lyrics
// panel and Tune this app ▸ Lyrics point at LRCGET's (James, 2026-10-11). On
// the phone the article is a page of its own (`native/HelpScreens.tsx`); on
// the website it opens the knowledge base dialog at that article.

export default function HelpArticleLink({ article, className, children }: { article: string; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const theme = useThemeStore((s) => s.effective)
  const phone = phoneScreens()
  return (
    <>
      <button
        type="button"
        className={className ?? 'text-[13px] font-medium text-orange-700 underline-offset-2 hover:underline dark:text-orange-400'}
        onClick={() => (phone ? navigate({ view: 'help', article }) : setOpen(true))}
      >
        {children}
      </button>
      {!phone && <KnowledgeBaseDialog {...KNOWLEDGE_BASE} initialArticle={article} open={open} onClose={() => setOpen(false)} theme={theme} />}
    </>
  )
}
