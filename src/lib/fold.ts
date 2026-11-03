/**
 * Fold a string for searching: lower case, accents stripped, punctuation
 * flattened to spaces.
 *
 * Accents ARE folded here even though `albumKey` deliberately does not fold
 * them. The two are doing opposite jobs: a key must never merge two records
 * that are genuinely different, while a search box must find "Bjork" when the
 * tag says "Björk". Being wrong costs a duplicate album in one case and a
 * missed result in the other, and only one of those is recoverable.
 */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    // Escaped rather than written as literal combining marks: the class is
    // invisible in an editor and does not survive every copy-paste intact.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
