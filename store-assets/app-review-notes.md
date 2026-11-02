# App Review notes — Universal Jukebox (iOS)

For the **next App Store submission** (1.0.15 or later), after 1.0.13 was
rejected on 2026-10-20 under 4.3(a)/(b) spam and 4.2.6 (see the backlog's
Jukebox item and the handover's 2026-10-20 entry). Last time the notes were
minimal and Apple's nine 4.3 questions went unanswered. This time they go in
the **App Review Information ▸ Notes** field up front (limit 4,000 characters;
the text below is about 2,700).

## Before pasting, check

- [x] **Widget** line: filled in. The widget ships in 1.0.15 (`ios/App/JukeboxWidget`).
- [ ] **Siri** line: `130f524` is in the build (it's in everything after 1.0.13).
- [ ] **Testing** line: "tested internally" (James, 2026-10-20) unless an
      external TestFlight group has run first; then say so, with how many testers.
- [ ] Hits is off on iPhone/iPad (`barsHits`, `5fdd72a`), so "no data
      collected" and "offline" are true. Re-read this if Hits comes back on iOS.
- [ ] Age rating: answer the new `socialMedia` / `socialMediaAgeRestricted`
      questions first (submissions fail without them).
- [ ] Attach a short screen recording if possible (Siri, lock screen, widget, Bedside).

## Notes (paste into App Review Information ▸ Notes)

> Universal Jukebox is not made from a template or by an app-generation service. It is designed, written and published by Universal Simulation Ltd (UNI·SIM), a small UK company, and its code is our own.
>
> WHAT IT DOES AND WHO IT'S FOR: an offline player for music files people already own, presented as a real record player or cassette deck. No streaming, no subscription, no account, no data collected. It is for people with their own collection (ripped CDs, downloads, files synced through Apple Music).
>
> THE GAP IT FILLS: most players today are streaming catalogues. Jukebox is built around your own records: sleeves on a shelf, a turning record, a lyric sheet read from your own lyric files, play counts kept on the device.
>
> NEW IN THIS BUILD:
> • Siri: "Hey Siri, play Mika on Jukebox" (SiriKit INPlayMediaIntent, handled in the app)
> • A "Resume listening" widget for the Home Screen (small, medium) and Lock Screen (rectangular, circular, inline): the last song on the record that played it; one tap carries on from the same second
> • A Discography card on each artist page, lyric marks on every song and album with lyrics, and the Albums shelf as the first screen
>
> NATIVE iOS FEATURES: our own AVPlayer audio engine, so crossfades, fades, the sleep fade and ReplayGain play in the background; lock-screen and Control Centre controls showing the current lyric; AirPlay; import from the Music library or Files; Bedside mode.
>
> TESTING: tested internally by our team on iPhone and iPad through TestFlight builds before each submission.
>
> HOW IT DIFFERS FROM OUR OTHER APPS / WHY IT IS SEPARATE: our other apps are a PDF editor and other utilities; none plays music. Jukebox has its own screens, icon, colours, screenshots and listing. Merging a music player into a PDF editor would serve neither.
>
> SHARED AND THIRD-PARTY CODE: our apps share our own internal code library, not a template. Open-source components: Capacitor, React, Zustand. No app builder, white-label service or AI app generator. Not made for a client.
>
> HOW TO TRY IT: no account is needed. On first launch choose "Example library" for a ready set of albums (music synthesised on the device, sleeves from public-domain photos). Every song in it has its own timed words, written for it, so the lyrics around the record, the lyric sheet and the lock-screen line can all be tried. Hold the "Universal Jukebox" title for a small surprise.
>
> If a particular screen reads as duplicated or template-like, please tell us which one and we will change it.

## Resolution Center reply (send once the new build is submitted)

> Thank you for your review. We have submitted a new build, 1.0.15, which adds features built for iPhone and iPad: Siri ("Hey Siri, play Mika on Jukebox"), a Home Screen and Lock Screen "Resume listening" widget, and more. We have answered each of your questions in the App Review notes. If a particular screen still reads as template-like, please tell us which one and we will change it.

If 1.0.15 is rejected again under 4.3: appeal to the App Review Board
(developer.apple.com/contact/app-store/?topic=appeal), not another Resolution Center message.
