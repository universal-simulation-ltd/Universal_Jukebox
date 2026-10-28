// What the bar calls the app once somebody is signed in to the suite (James,
// 2026-10-26, the suite rule: "If signed in it should be clear from the
// personalisation — 'Bradley's Book' — as opposed to the traditional profile
// button"). Jukebox has no sign-in of its own; it recognises a session from any
// unisim.co.uk app through the shared cookie, so someone signed in on the hub
// opens it as "James’ Jukebox".
//
// ⚠️ THE POSSESSIVE IS THE LANGUAGE'S OWN, NOT A STRING WITH "’s" IN IT.
// "James’s Jukebox" is what a template gives a name that ends in s; James asked
// for "James’ Jukebox" (2026-10-28). The same trap in German ("Hans’", not
// "Hanss"), French ("d’Anna", not "de Anna") and Turkish, whose ending follows
// the name's last vowel ("James’in", "Ayşe’nin"). So `owner` is built here per
// language and the dictionaries only place it: `app.personal_title`.

/** The name as the owner of something, in this language — what `{owner}` in `app.personal_title` holds. */
export function possessive(lang: string, name: string): string {
  const n = name.trim()
  switch (lang.toLowerCase().split('-')[0]) {
    // An s on the end takes the apostrophe alone: "James’", "Chris’".
    case 'en':
      return /s$/i.test(n) ? `${n}’` : `${n}’s`
    // A plain s, without an apostrophe — except after an s sound: "Annas", "Hans’", "Max’".
    case 'de':
      return /(s|ß|x|z|ce)$/i.test(n) ? `${n}’` : `${n}s`
    // "de", elided before a vowel or a silent h: "de James", "d’Anna", "d’Hélène".
    case 'fr':
      return /^[aeiouyhàâäéèêëîïôöùûü]/i.test(n) ? `d’${n}` : `de ${n}`
    case 'tr':
      return `${n}’${turkishGenitive(n)}`
    // "de James" / "di James" is in the sentence itself.
    default:
      return n
  }
}

/** The Turkish genitive ending for a name: "in" after James, "nın" after Kaya, "un" after Onur. */
export function turkishGenitive(name: string): string {
  const vowels = name.toLocaleLowerCase('tr').match(/[aıoueiöü]/g)
  const last = vowels?.[vowels.length - 1] ?? 'e'
  const vowel = 'aı'.includes(last) ? 'ı' : 'ei'.includes(last) ? 'i' : 'ou'.includes(last) ? 'u' : 'ü'
  const endsInVowel = /[aıoueiöü]$/i.test(name.toLocaleLowerCase('tr'))
  return `${endsInVowel ? 'n' : ''}${vowel}n`
}
