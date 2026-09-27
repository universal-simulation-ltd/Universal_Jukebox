// Structurally identical to @unisim/sdk's KnowledgeArticle (0.163.0+). Kept
// local so the articles compile whatever SDK version is installed.
export interface Article {
  /** Stable kebab-case slug, identical across languages. */
  id: string
  title: string
  /** One line shown under the title in the list. */
  summary?: string
  /** List heading, e.g. "The basics" / "How it works" / "Privacy and security". */
  group?: string
  /**
   * A tiny closed markdown: blank line between paragraphs, `## ` subheadings,
   * `- ` bullets, `1. ` numbered steps and `**bold**`. Nothing else, no HTML.
   */
  body: string
}
