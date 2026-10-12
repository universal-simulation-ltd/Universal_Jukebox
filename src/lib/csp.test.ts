import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The Content-Security-Policy in `public/_headers` allows index.html's inline
// scripts by their sha256 rather than with 'unsafe-inline'. Edit one of those
// scripts by a single character and the live site refuses it — the pre-paint
// theme silently stops working. This keeps the hashes and the scripts together.

const read = (rel: string) => readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), 'utf8')

function policy(): string {
  const line = read('public/_headers').split('\n').find((l) => /^\s*Content-Security-Policy:/.test(l))
  if (!line) throw new Error('public/_headers has no Content-Security-Policy')
  return line.slice(line.indexOf(':') + 1).trim()
}

function directive(name: string): string[] {
  const part = policy().split(';').map((p) => p.trim()).find((p) => p.startsWith(`${name} `))
  return part ? part.split(/\s+/).slice(1) : []
}

/** Classic inline scripts — the ones the browser runs. JSON-LD is data, not script. */
function inlineScripts(): string[] {
  return [...read('index.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
}

describe('the Content-Security-Policy', () => {
  it('allows every inline script in index.html by its hash', () => {
    const scripts = inlineScripts()
    expect(scripts.length).toBeGreaterThan(0)
    const allowed = directive('script-src')
    for (const body of scripts) {
      const hash = `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`
      expect(allowed).toContain(hash)
    }
  })

  it('keeps script-src strict', () => {
    const allowed = directive('script-src')
    expect(allowed).not.toContain("'unsafe-inline'")
    expect(allowed).not.toContain("'unsafe-eval'")
    expect(allowed).not.toContain('https:')
  })

  it('does not allow the Cloudflare Web Analytics beacon', () => {
    expect(policy()).not.toMatch(/cloudflareinsights/)
  })
})
