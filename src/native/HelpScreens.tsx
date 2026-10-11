// HelpScreens.tsx — the knowledge base as pages of the app, not the website's
// dialog over it (James, 2026-10-11: "Make the knowledge base feel more like
// its native mobile as opposed to a popup"). The list of articles, grouped as
// the dialog groups them, then each article as a page of its own with the top
// bar's way back — so the edge swipe goes back a page, as everywhere else.
//
// The articles are the same ones the dialog reads (`knowledge/`), in the
// reader's language, laid out with the SDK's own parser (`parseArticleBody`),
// so nothing here can say something the website's knowledge base doesn't.

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { parseArticleBody, useLanguage } from '@unisim/sdk'
import { loadArticles } from '../knowledge'
import type { Article } from '../knowledge/types'
import { navigate } from '../lib/route'
import { useT } from '../i18n'

/** The articles in the reader's language; null while they load. */
function useArticles(): Article[] | null {
  const { language } = useLanguage()
  const [articles, setArticles] = useState<{ language: string; list: Article[] } | null>(null)
  useEffect(() => {
    let live = true
    void loadArticles(language).then((list) => { if (live) setArticles({ language, list }) })
    return () => { live = false }
  }, [language])
  return articles?.language === language ? articles.list : null
}

export function HelpScreen() {
  const t = useT()
  const articles = useArticles()
  // In the articles' own order, a card per group, as the dialog shows them.
  const groups = useMemo(() => {
    const out: { name: string; list: Article[] }[] = []
    for (const article of articles ?? []) {
      const name = article.group ?? ''
      const group = out.find((g) => g.name === name)
      if (group) group.list.push(article)
      else out.push({ name, list: [article] })
    }
    return out
  }, [articles])

  return (
    <div className="jx-page jx-help">
      <div className="jx-heading">
        <div>
          <h1 className="jx-h1">{t('native.knowledge_base')}</h1>
          <p className="jx-sub">{t('app.knowledge_base_detail')}</p>
        </div>
      </div>
      {articles === null ? <p className="jx-empty">{t('common.loading')}</p> : null}
      {groups.map((group) => (
        <section key={group.name} className="jx-help-group">
          {group.name ? <p className="jx-label">{group.name}</p> : null}
          <ul className="jx-list jx-card jx-help-card">
            {group.list.map((article) => (
              <li key={article.id}>
                <button type="button" className="jx-row" onClick={() => navigate({ view: 'help', article: article.id })}>
                  <span>
                    <b>{article.title}</b>
                    {article.summary ? <small>{article.summary}</small> : null}
                  </span>
                  <span className="jx-chev" aria-hidden>›</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/** `**bold**` and `*italic*` inside a line — all the inline markup the articles use. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>
    return part
  })
}

export function ArticleScreen({ id }: { id: string }) {
  const t = useT()
  const articles = useArticles()
  const article = articles?.find((a) => a.id === id)
  const blocks = useMemo(() => (article ? parseArticleBody(article.body) : []), [article])

  if (articles === null) return <p className="jx-empty">{t('common.loading')}</p>
  if (!article) return <p className="jx-empty">{t('native.help_missing')}</p>

  return (
    <article className="jx-page jx-article">
      <h1 className="jx-h1">{article.title}</h1>
      {article.summary ? <p className="jx-sub">{article.summary}</p> : null}
      <div className="jx-article-body">
        {blocks.map((block, i) =>
          block.kind === 'h' ? (
            <h2 key={i}>{inline(block.text)}</h2>
          ) : block.kind === 'p' ? (
            <p key={i}>{inline(block.text)}</p>
          ) : block.kind === 'ul' ? (
            <ul key={i}>{block.items.map((item, j) => <li key={j}>{inline(item)}</li>)}</ul>
          ) : (
            <ol key={i}>{block.items.map((item, j) => <li key={j}>{inline(item)}</li>)}</ol>
          ),
        )}
      </div>
      {article.sources?.length ? (
        <section className="jx-article-sources">
          <p className="jx-label">{t('native.help_sources')}</p>
          <ul>
            {article.sources.map((source) => (
              <li key={source.href}>
                <a href={source.href} target="_blank" rel="noopener noreferrer">{source.title}</a>
                {[source.authors, source.publisher, source.year].filter(Boolean).length ? (
                  <small>{[source.authors, source.publisher, source.year].filter(Boolean).join(' · ')}</small>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  )
}
