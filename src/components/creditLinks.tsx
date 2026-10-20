import type { useT } from '../i18n'

/**
 * "Made by James Markey MBE and the UNI·SIM team" — each name a link to its
 * own site (James, 2026-10-20: "It's good to have the made by James Markey MBE
 * which links to JamesMarkey.co.uk and the UNISIM team which links to
 * Unisim.co.uk"). The app's one pointer outward: no "More from UNI·SIM" row,
 * each app stays self-contained (`store-listings/README.md` §8).
 */
export function creditLinks(t: ReturnType<typeof useT>, className: string) {
  return {
    james: (
      <a href="https://jamesmarkey.co.uk" target="_blank" rel="noreferrer" className={className}>
        James Markey MBE
      </a>
    ),
    team: (
      <a href="https://www.unisim.co.uk" target="_blank" rel="noreferrer" className={className}>
        {t('about.app_footer_team')}
      </a>
    ),
  }
}
