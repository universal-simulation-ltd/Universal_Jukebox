# Store privacy answers: App Privacy (App Store) and Data safety (Google Play)

The exact answers for both forms, and the code each one rests on. Checked
against the code on 2026-11-26. Neither store's API can fill these forms, so
they are filled by hand. This file only says what to enter.

**Why it is no longer "Data Not Collected":** the phone app has no sign-in of
its own and never creates an account. But when the phone already holds a
UNI·SIM session that another UNI·SIM app made, Jukebox recognises it
(`src/main.tsx`: `noAccounts` is set only for the Windows app):

- the title shows the account's name, "Bradley's Jukebox" (`src/lib/jukeboxTitle.ts`);
- Tune this app ▸ Your Universal ID shows the account's email, and its name
  box edits the account's "Call me" (`src/components/Settings.tsx`);
- Tune this app's own settings are kept with the account, so they follow the
  person to the website (`src/stores/settingsStore.ts`, `createSyncedSettings`).
  These are display choices (colour scheme, language, default views, the app
  name). Settings that belong to one device stay on that device. None of it
  names a song, an artist or a file.

**Still not collected:** no "app opened" event on the phone (`<UsageTracker />`
is website-only, `src/App.tsx`), no install id or open count, and no device IDs.
The music, its tags, artwork and lyrics never leave the phone. The Apple Watch
app talks only to the paired iPhone.

**Lookups that go straight from the phone to a public service, never to us**
(not "collected" under either store's definition: we never receive or keep
them):

| Lookup | Sends | When | Platforms |
|---|---|---|---|
| lrclib.net (lyrics) | title, artist, album, length | opt-in | Android, web (never iOS: `barsOnlineLyrics()`) |
| Wikipedia (About this track) | title, artist | opt-in | all |
| iTunes Search (Find a picture, Requests) | what you typed | only when you tap Search | all |
| ListenBrainz, MusicBrainz, Wikidata (Hits shelf) | song title and artist name | off by default (`hitsOnline`) | Android, web (never iOS: `barsHits()`) |

---

## App Store Connect: App Privacy

App Store Connect → Apps → Universal Jukebox → **App Privacy** → Data Types →
**Edit**.

1. "Do you or your third-party partners collect data from this app?"
   **Yes, we collect data from this app.**
2. Tick these four, and nothing else:
   - **Contact Info → Name**
   - **Contact Info → Email Address**
   - **Identifiers → User ID**
   - **Other Data → Other Data Types** (Tune this app's settings)
3. For each of the four, **Set Up**:
   - Purposes: **App Functionality** only.
   - "Is this data linked to the user's identity?" **Yes.**
   - "Is this data used for tracking purposes?" **No.**
4. **Publish.** It applies to the live version straight away; no new build.

| Data type | Linked | Tracking | Purpose |
|---|---|---|---|
| Name | Yes | No | App Functionality |
| Email Address | Yes | No | App Functionality |
| User ID | Yes | No | App Functionality |
| Other Data Types | Yes | No | App Functionality |

The privacy manifest says the same: `ios/App/App/PrivacyInfo.xcprivacy`
(`NSPrivacyTracking` false, no tracking domains, the four types above).

## Google Play Console: Data safety

Play Console → App content → **Data safety**. Quickest: **Import from CSV**
with `store-assets/out/play/data-safety.csv`, built from
`store-assets/data-safety.json`. By hand:

1. "Does your app collect or share any of the required user data types?" **Yes.**
2. "Is all of the user data collected by your app encrypted in transit?" **Yes.**
3. "Which of the following methods of account creation does your app support?"
   **My app does not allow users to create an account.**
4. Data deletion: link `https://www.unisim.co.uk/privacy#retention`.
5. Data types: tick only these four.
   - **Personal info → Name**
   - **Personal info → Email address**
   - **Personal info → User IDs**
   - **App activity → Other actions** (Tune this app's settings)
6. For each of the four:
   - Collected: **Yes**. Shared: **No**.
   - "Is this data processed ephemerally?" **No.**
   - "Is this data required for your app, or can users choose whether it's
     collected?" **Users can choose** (optional: only for someone already
     signed in through another UNI·SIM app).
   - Why is it collected? **App functionality** only.
7. Not ticked: Location, Financial info, Health, Messages, Photos and videos,
   Audio files, Files and docs, Calendar, Contacts, App info and performance,
   Device or other IDs, and every other App activity type.

## When to change these answers

- If the phone app ever gets its own sign-in, sends an "app opened" event, or
  sends anything to UNI·SIM's servers about the music, these answers are wrong.
  Update this file, `data-safety.json` and `PrivacyInfo.xcprivacy` together.
- A new lookup that goes from the phone straight to a public service, opt-in
  or on a tap, goes in the lookups table above. It doesn't change the answers.
