import Foundation
import AVFoundation
import MediaPlayer
import UIKit

/// The iPhone app's own audio engine — the music, played natively, and the
/// queue run natively while the phone is locked (James, 2026-10-07: build it
/// before 1.0).
///
/// ⚠️ WHY THE PAGE'S `<audio>` HAD TO GO. Three things were settled on the phone
/// before a line of this was written:
///   - WKWebView stores `<audio>.volume` and plays no quieter (heard 2026-09-27),
///     so every fade, the crossfade, Stable volume and the sleep fade were
///     silent features on iPhone — a crossfade was two songs at full level;
///   - Web Audio, the other way to a gain, stops when the app leaves the screen;
///   - probe 3 (2026-10-07, iPhone JPM, locked 3 min): a NATIVE player keeps
///     playing and keeps the app running, but the page's JavaScript stops within
///     a second of the lock.
/// So the sound is here, and so is everything the queue does at the end of a
/// song — the next track, the crossfade, the fades, Stable volume, the start-up
/// cue, the sleep timer, the lock-screen buttons — because on a locked phone
/// there is nobody else to do it. The page sends the next stretch of the queue
/// with every change-over already decided (`setUpcoming`, built by
/// `src/stores/playerStore.ts` from `src/lib/enginePlan.ts`) and asks where
/// things got to when it wakes (`snapshot`).
///
/// ⚠️ WHO DRIVES. While the app is ACTIVE the page runs the queue exactly as it
/// always has — it hears the position four times a second, starts its own
/// crossfades (`maybeStartEarlyCrossfade`), animates the deck, and tells the
/// engine what to play. The moment the app is not active the engine takes over
/// (`autonomous`), and it hands back on the next `didBecomeActive`. Every
/// change the engine makes on its own bumps `seq`; a page command sent from an
/// older `seq` is from a page that has not caught up yet and is refused
/// (`accepts`) — a timer that fires on waking must not drag the music back to
/// where the page last saw it.
///
/// ⚠️ IT OWNS THE AUDIO SESSION, AND WEBKIT MUST NOT PLAY. Until this engine the
/// rule was the reverse (see `AppDelegate`): two non-mixable sessions in one app
/// fight, and earlier builds showed dozens of interruptions a second. With the
/// engine on, nothing in the page makes a sound: the decks, the 10-second
/// preview and the start-up cues all come here (`src/lib/audioEngine.ts`), and
/// the Web Audio graph is never built (`lib/applySettings.ts`).
///
/// ⚠️ AVPLAYER, TWO OF THEM, NOT AVAUDIOENGINE. A crossfade is two files
/// decoding at once, so two players, as the web had two `<audio>` elements.
/// AVPlayer streams from disk, plays every format the library holds (MP3, AAC,
/// ALAC, FLAC, WAV), opens a Music-library song's `ipod-library://` URL directly
/// (so a song not yet copied out still plays while locked), seeks and reports
/// position for free, and survives route changes and AirPlay by itself.
/// `AVPlayer.volume` IS applied to the sound — unlike WebKit's — and a 30 ms
/// timer moving it is a ramp you cannot hear the steps of. AVAudioEngine would
/// buy gain above 1 (the Loud half of "Quiet or loud", the 2× boost) at the cost
/// of scheduling, seeking, position-keeping and a graph that stops on every
/// configuration change; not worth it for a gain above 1. Above full, a deck
/// instead gets an audio tap on its item (`BoostTap`, at the end of this file)
/// that multiplies the samples, with a soft limiter, while its volume stays at
/// 1 — attached only once a level above 1 is asked for, so a phone that never
/// turns things up plays exactly as before.
///
/// All main thread: the plugin hops every call onto it, the KVO and
/// notification handlers hop back to it, and the timer runs on it.
final class JukeboxEngine: NSObject {
    static let shared = JukeboxEngine()

    /// Events for the page, set by `JukeboxEnginePlugin`.
    var emit: ((String, [String: Any]) -> Void)?

    /// On once the page has asked for the engine — `NowPlayingPlugin` reads it
    /// to stand aside (the lock-screen entry and its buttons are ours then).
    private(set) var enabled = false

    // MARK: - What the page sends

    enum Curve: String { case linear, equalPower = "equal-power", staggered, leadOut = "lead-out" }
    enum Kind: String { case crossfade, change, cut }

    /// One change-over, decided by the page — `EngineTransition` in `enginePlan.ts`.
    struct Transition {
        var kind: Kind = .cut
        var blendSec = 0.0
        var manualSec = 0.0
        var curve: Curve = .staggered
        var gapSec = 0.0
        var fadeInSec: Double?
        var duckSec = 0.0
        var cue = false
        var cueDelaySec = 0.0

        init() {}
        init(_ o: [String: Any]?) {
            guard let o = o else { return }
            kind = Kind(rawValue: o["kind"] as? String ?? "") ?? .cut
            blendSec = num(o["blendSec"]) ?? 0
            manualSec = num(o["manualSec"]) ?? 0
            curve = Curve(rawValue: o["curve"] as? String ?? "") ?? .staggered
            gapSec = num(o["gapSec"]) ?? 0
            fadeInSec = num(o["fadeInSec"])
            duckSec = num(o["duckSec"]) ?? 0
            cue = o["cue"] as? Bool ?? false
            cueDelaySec = num(o["cueDelaySec"]) ?? 0
        }
    }

    /// One queue entry — `EngineEntryDraft`, with its file turned into a URL.
    ///
    /// A class, so a measurement made here while locked lands on the entry the
    /// queue is holding rather than on a copy.
    final class Entry {
        let key: String
        let cursor: Int
        let trackId: String
        let albumId: String
        let url: URL?
        let mediaId: UInt64?
        let title: String
        let artist: String
        let album: String
        var gain: Double?
        var intro: Double?
        var outro: Double?
        let auto: Transition
        let skip: Transition
        /// The start-up cue for the machine this song plays on — a stashed clip.
        let cue: URL?
        /// "Lyrics on the lock screen": the song's timed lines, in order, for
        /// the engine to follow while the page is away. Empty with the setting
        /// off or no synced sheet.
        var lines: [(at: Double, text: String)]

        init?(_ o: [String: Any]?) {
            guard let o = o, let key = o["key"] as? String, let trackId = o["trackId"] as? String else { return nil }
            self.key = key
            cursor = Int(num(o["cursor"]) ?? -1)
            self.trackId = trackId
            albumId = o["albumId"] as? String ?? ""
            url = (o["url"] as? String).flatMap { URL(string: $0) }
            mediaId = (o["mediaId"] as? String).flatMap { UInt64($0) }
            title = o["title"] as? String ?? ""
            artist = o["artist"] as? String ?? ""
            album = o["album"] as? String ?? ""
            gain = num(o["gain"])
            intro = num(o["introSec"])
            outro = num(o["outroSec"])
            auto = Transition(o["auto"] as? [String: Any])
            skip = Transition(o["skip"] as? [String: Any])
            cue = (o["cue"] as? String).flatMap { URL(string: $0) }
            lines = (o["lines"] as? [Any] ?? []).compactMap { item in
                guard let line = item as? [String: Any], let at = num(line["t"]) else { return nil }
                return (at, line["text"] as? String ?? "")
            }
        }
    }

    /// The intro / outro rules and the user's caps — `LeadLimits`.
    struct Limits {
        var introMin = 1.0, introHoldMax = 6.0, introMax = 6.0
        var outroMin = 1.2, outroLeadMax = 8.0, outroMax = 8.0
        init() {}
        init(_ o: [String: Any]?) {
            guard let o = o else { return }
            introMin = num(o["introMin"]) ?? introMin
            introHoldMax = num(o["introHoldMax"]) ?? introHoldMax
            introMax = num(o["introMax"]) ?? introMax
            outroMin = num(o["outroMin"]) ?? outroMin
            outroLeadMax = num(o["outroLeadMax"]) ?? outroLeadMax
            outroMax = num(o["outroMax"]) ?? outroMax
        }
    }

    // MARK: - The two decks

    /// A ramp of one deck's envelope — `rampTo` in `src/lib/audio.ts`.
    struct Ramp {
        var from: Double
        var to: Double
        var started: CFTimeInterval
        var delay: Double
        var seconds: Double
        var curve: Curve
        var done: (() -> Void)?
    }

    final class Deck {
        let player = AVPlayer()
        var entry: Entry?
        /// This deck's own envelope (fades, the crossfade) — separate from the
        /// user's volume, which multiplies it, for the reason `applyVolume` in
        /// `audio.ts` gives: neither control may destroy the other's value.
        var fade = 1.0
        /// "Stable volume": this song's factor, ≤ 1.
        var level = 1.0
        var ramp: Ramp?
        var ready = false
        var ended = false
        var startAt = 0.0
        var onReady: [() -> Void] = []
        var statusObservation: NSKeyValueObservation?
        var observers: [NSObjectProtocol] = []
        /// The tap's gain above full (`BoostTap`), and the item it is on.
        let boost = BoostTap.Gain()
        weak var boostedItem: AVPlayerItem?
        weak var boosting: AVPlayerItem?

        init() {
            player.actionAtItemEnd = .pause
            // Local files: start at once rather than waiting to buffer ahead.
            player.automaticallyWaitsToMinimizeStalling = false
        }
    }

    private let decks = [Deck(), Deck()]
    /// The deck the page is about; the other is idle or retiring.
    private var active = 0
    /// The deck fading out under the active one during a crossfade.
    private var retiring: Int?

    // MARK: - The queue, as last sent

    private var upcoming: [Entry] = []
    /// Lock-screen Previous with nothing in `history`.
    private var previousEntry: Entry?
    /// Songs moved past while the page was away — Previous walks back through them.
    private var history: [Entry] = []
    private var repeatOne: Transition?
    /// Repeat all / one: what is moved past goes back on the end (`upcomingCursors`).
    private var wrap = false
    private var limits = Limits()
    private var stableVolume = true
    private var cueLevel = 0.5
    /// "Notify me of each new song" — the engine posts the card itself while
    /// the page is away (`announce`).
    private var notify = false

    // MARK: - Levels

    private var userVolume = 1.0
    private var muted = false
    /// "Quiet or loud" — 10^(dB/20). Above 1 it can only take the product to full.
    private var outputGain = 1.0
    private var sleepFactor = 1.0
    private var fadeIn = 0.0
    private var fadeOut = 0.0

    // MARK: - State

    /// Whether the music should be playing — the transport's intent, which is
    /// what the lock screen's button and the page's play state follow. Through a
    /// record change's silent gap it stays true, so the lock screen does not
    /// flash ▶ between two songs.
    private var wantsPlaying = false
    private var sleepEndsAt: Date?
    private var sleepFadeSec = 60.0
    private var sleepEnded = false
    /// Bumped by every change of song the engine makes by itself.
    private var seq = 0
    /// The entry an end-of-song crossfade has already been started from.
    private var armedKey: String?
    /// A record change's silence, between the lift and the landing.
    private var pending: DispatchWorkItem?
    /// The active song ended while the page was driving — if the app goes away
    /// before the page puts the next one on, the engine does it (`safetyNets`).
    private var endedAt: CFTimeInterval?
    /// The page moved the cursor (`setUpcoming`'s `current` is not what is
    /// playing) but has not loaded it yet — a record change's lift, a song being
    /// copied out. Same safety net.
    private var pageMovedAt: CFTimeInterval?
    private var consecutiveSkips = 0
    /// Songs skipped as unplayable while the page was away — for its banner.
    private var skippedLog: [[String: Any]] = []
    private var queueEnded = false
    private var interruptedPlaying = false
    private var timer: DispatchSourceTimer?
    private var lastStateAt: CFTimeInterval = 0
    private var changedPending = false
    private let measureQueue = DispatchQueue(label: "uk.co.unisim.jukebox.engine.measure", qos: .utility)
    private var measuring = Set<String>()

    // MARK: - Lock screen

    private var artwork: MPMediaItemArtwork?
    /// Whose artwork that is — kept across a change within an album, which is
    /// what lets the turning record from `NowPlayingPlugin` survive a locked
    /// change-over between two songs of the same record.
    private var artworkAlbum: String?
    private var animatedArtwork: [String: Any] = [:]
    private var artCache: [String: UIImage] = [:]
    /// A lyric line in the artist's place (`lib/lockLyrics.ts`), or nil.
    private var artistLine: String?
    /// The song the last notification card was for, and one waiting for its cover.
    private var announcedKey: String?
    private var announceLater: DispatchWorkItem?
    private var announcePending: Entry?

    // MARK: - Preview and cues

    private let previewPlayer = AVPlayer()
    private var previewObservation: NSKeyValueObservation?
    private var previewObservers: [NSObjectProtocol] = []
    private var previewStop: DispatchWorkItem?
    private var previewVolume = 1.0
    private var clips: [AVAudioPlayer] = []

    // MARK: - Switching on

    /// Take the audio session and the lock screen. Idempotent.
    func enable() {
        guard !enabled else { return }
        enabled = true
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .default, options: [])
        } catch {
            CommandLog.note("engine: setCategory failed \(error.localizedDescription)")
        }
        let centre = NotificationCenter.default
        centre.addObserver(self, selector: #selector(interrupted(_:)), name: AVAudioSession.interruptionNotification, object: session)
        centre.addObserver(self, selector: #selector(routeChanged(_:)), name: AVAudioSession.routeChangeNotification, object: session)
        centre.addObserver(self, selector: #selector(servicesReset(_:)), name: AVAudioSession.mediaServicesWereResetNotification, object: session)
        centre.addObserver(self, selector: #selector(becameActive), name: UIApplication.didBecomeActiveNotification, object: nil)
        centre.addObserver(self, selector: #selector(resignedActive), name: UIApplication.willResignActiveNotification, object: nil)
        registerCommands()
        CommandLog.note("engine on")
    }

    /// The session goes live only when something is about to sound — taking it
    /// at launch would stop whatever else the person was listening to.
    private func activateSession() {
        do {
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            CommandLog.note("engine: setActive failed \(error.localizedDescription)")
        }
    }

    private var appActive: Bool { UIApplication.shared.applicationState == .active }

    // MARK: - Settings

    func configure(volume: Double?, muted: Bool?, fadeIn: Double?, fadeOut: Double?, outputGain: Double?) {
        if let v = volume { userVolume = clamp(v) }
        if let m = muted { self.muted = m }
        if let f = fadeIn { self.fadeIn = max(0, f) }
        if let f = fadeOut {
            self.fadeOut = max(0, f)
            // Turning the fades off mid-song must not leave the envelope where it was.
            if self.fadeIn == 0 && self.fadeOut == 0 && retiring == nil { endFade(active, 1) }
        }
        if let g = outputGain { self.outputGain = max(0, g) }
        applyAll()
    }

    /// Stable volume measured after the song started (`audio.setLevel`).
    func setLevel(_ level: Double) {
        decks[active].level = clamp(level)
        apply(active)
    }

    // MARK: - Commands from the page

    /// A page command is from the page's latest view only if it has seen every
    /// change the engine made by itself — see "WHO DRIVES" above.
    func accepts(seq pageSeq: Int?) -> Bool {
        guard let pageSeq = pageSeq, pageSeq < seq else { return true }
        CommandLog.note("engine: refused a command from seq \(pageSeq) (now \(seq))")
        changed("stale")
        return false
    }

    /// Put a song on the active deck: the CUT (`audio.load`). `fromPage`: the
    /// page asked, so this is the song its last plan said it had moved to.
    func load(_ e: Entry, autoplay: Bool, fadeInOverride: Double?, startAt: Double, level: Double?, fromPage: Bool = false) {
        if fromPage { dropPageMove(for: e) }
        finishRetirement()
        cancelPending()
        let i = active
        let d = decks[i]
        d.ramp = nil
        d.level = level ?? gain(for: e)
        armedKey = nil
        endedAt = nil
        queueEnded = false
        guard put(e, on: i, startAt: startAt) else {
            failed(e, code: "unreachable")
            return
        }
        beginTrack(i, fadeInOverride.map { max($0, fadeIn) })
        wantsPlaying = autoplay
        if autoplay {
            activateSession()
            d.player.play()
        }
        newSong(e)
    }

    /// The real crossfade (`audio.crossfade`): the next song starts under this
    /// one on the other deck, and the two swap at once.
    func crossfade(_ e: Entry, seconds: Double, hold: Double, curve: Curve, level: Double?, fromPage: Bool = false) {
        if fromPage { dropPageMove(for: e) }
        // Two crossfades at once would need three decks — finish the one in flight.
        finishRetirement()
        cancelPending()
        let from = active
        let to = 1 - active
        let incoming = decks[to]
        incoming.ramp = nil
        incoming.fade = 0
        incoming.level = level ?? gain(for: e)
        apply(to)
        armedKey = nil
        endedAt = nil
        queueEnded = false
        guard put(e, on: to) else {
            failed(e, code: "unreachable")
            return
        }
        active = to
        retiring = from
        wantsPlaying = true
        activateSession()
        incoming.player.play()
        let held = max(0, min(hold, seconds - 0.5))
        let blend = seconds - held
        // The ramps start when the incoming song can actually sound, as the web
        // version's did after `play()` resolved.
        whenReady(to) { [weak self] in
            guard let self = self, self.active == to, self.decks[to].entry === e else { return }
            self.rampTo(to, 1, blend, curve)
            if self.retiring == from {
                self.rampTo(from, 0, blend, curve, delay: held) { [weak self] in self?.finishRetirement() }
            }
        }
        newSong(e)
    }

    func play() {
        let d = decks[active]
        guard d.entry != nil else { return }
        interruptedPlaying = false
        if d.ended {
            d.ended = false
            d.player.seek(to: .zero)
        }
        endedAt = nil
        wantsPlaying = true
        activateSession()
        d.player.play()
        if let r = retiring { decks[r].player.play() }
        ensureTimer()
        publishNowPlaying()
        emitState(force: true)
    }

    func pause() {
        interruptedPlaying = false
        finishRetirement()
        wantsPlaying = false
        for d in decks { d.player.pause() }
        publishNowPlaying()
        emitState(force: true)
    }

    func seek(_ seconds: Double) {
        let d = decks[active]
        guard let item = d.player.currentItem else { return }
        let duration = item.duration.seconds
        guard duration.isFinite, duration > 0 else { return }
        let to = max(0, min(seconds, duration))
        d.ended = false
        endedAt = nil
        d.player.seek(to: CMTime(seconds: to, preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] _ in
            DispatchQueue.main.async {
                self?.publishNowPlaying()
                self?.emitState(force: true)
            }
        }
        // Scrubbing out of the fade-out zone cancels the fade (`audio.seek`).
        if fadeOut <= 0 || duration - to > fadeOut { endFade(active, 1) }
    }

    /// Fade what is playing to silence, leaving it playing (`audio.duck`).
    func duck(_ seconds: Double) {
        rampTo(active, 0, seconds, .linear)
    }

    /// The same song from the top, with a fade (`audio.restart`) — repeat-one.
    func restart(fadeInOverride: Double?) {
        let i = active
        let d = decks[i]
        guard d.entry != nil else { return }
        d.ended = false
        d.player.seek(to: .zero)
        beginTrack(i, fadeInOverride.map { max($0, fadeIn) })
        play()
    }

    /// Stop and forget everything — a preview included (`audio.stop`).
    func stop() {
        finishRetirement()
        cancelPending()
        stopPreview()
        let d = decks[active]
        d.ramp = nil
        d.fade = 1
        d.player.pause()
        detach(d)
        d.player.replaceCurrentItem(with: nil)
        d.entry = nil
        wantsPlaying = false
        endedAt = nil
        pageMovedAt = nil
        apply(active)
        publishNowPlaying()
        emitState(force: true)
        // Nothing left to play: let whatever the person was listening to before
        // carry on.
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    /// The next stretch of the queue (`EnginePlanDraft`).
    ///
    /// ⚠️ IT MAY BE OLDER OR NEWER THAN WHAT IS PLAYING. The page builds it the
    /// moment its cursor moves, which can be before it has loaded that song (a
    /// record change lifts the arm first, a Music-library song is copied out)
    /// or just after the engine moved on by itself. `pageSeq` says which:
    ///   - `current` is what is playing: take the list as it is;
    ///   - the page is behind (`pageSeq` < `seq`) and what is playing is in the
    ///     list: the engine is ahead — drop up to it;
    ///   - the page is up to date and `current` is not playing: the page has
    ///     moved (forwards OR back) and not loaded yet — `current` goes at the
    ///     front, so if the app goes away now that is the song that follows.
    func setUpcoming(current: Entry?, entries: [Entry], previous: Entry?, repeatOne: Transition?,
                     wrap: Bool, limits: Limits, stableVolume: Bool, cueLevel: Double, notify: Bool, pageSeq: Int) {
        self.notify = notify
        self.limits = limits
        self.stableVolume = stableVolume
        self.cueLevel = cueLevel
        self.repeatOne = repeatOne
        self.wrap = wrap
        previousEntry = previous
        history = []
        let playing = decks[active].entry
        let behind = pageSeq < seq
        if let current = current, let playing = playing,
           current.key == playing.key || (current.trackId == playing.trackId && !behind) {
            playing.gain = current.gain ?? playing.gain
            playing.intro = current.intro ?? playing.intro
            playing.outro = current.outro ?? playing.outro
            // Found after the song went on (the panel's sheet, usually).
            if !current.lines.isEmpty { playing.lines = current.lines }
            upcoming = entries
            pageMovedAt = nil
        } else if behind, let playing = playing, let at = entries.firstIndex(where: { $0.key == playing.key }) {
            upcoming = Array(entries[(at + 1)...])
            pageMovedAt = nil
        } else if let current = current, playing != nil, !behind {
            upcoming = [current] + entries
            if pageMovedAt == nil { pageMovedAt = CACurrentMediaTime() }
        } else {
            upcoming = entries
            pageMovedAt = nil
        }
        if !appActive { measureAhead() }
    }

    /// The sleep timer's end (`stores/sleepStore`), or nil for off.
    func setSleep(endsAt: Date?, fadeSec: Double) {
        sleepEndsAt = endsAt
        sleepFadeSec = max(1, fadeSec)
        sleepEnded = false
        if endsAt == nil, sleepFactor != 1 {
            sleepFactor = 1
            applyAll()
        }
        ensureTimer()
    }

    // MARK: - Loading a deck

    /// The item for an entry: its file, or the Music library straight from the
    /// song's persistent ID (no copy needed — AVFoundation can open it, which is
    /// the one thing WKWebView could not).
    private func item(for e: Entry) -> AVPlayerItem? {
        if let url = e.url, !url.isFileURL || FileManager.default.fileExists(atPath: url.path) {
            return AVPlayerItem(url: url)
        }
        if let id = e.mediaId, let url = Self.libraryItem(id)?.assetURL {
            return AVPlayerItem(url: url)
        }
        return nil
    }

    static func libraryItem(_ id: UInt64) -> MPMediaItem? {
        let query = MPMediaQuery.songs()
        query.addFilterPredicate(MPMediaPropertyPredicate(value: NSNumber(value: id), forProperty: MPMediaItemPropertyPersistentID))
        guard let item = query.items?.first, !item.hasProtectedAsset else { return nil }
        return item
    }

    private func put(_ e: Entry, on i: Int, startAt: Double = 0) -> Bool {
        let d = decks[i]
        detach(d)
        d.entry = e
        d.ready = false
        d.ended = false
        d.onReady = []
        d.startAt = startAt
        guard let item = item(for: e) else {
            d.player.replaceCurrentItem(with: nil)
            d.entry = nil
            return false
        }
        d.statusObservation = item.observe(\.status, options: [.initial, .new]) { [weak self] item, _ in
            DispatchQueue.main.async { self?.statusChanged(i, item) }
        }
        let centre = NotificationCenter.default
        d.observers = [
            centre.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: item, queue: .main) { [weak self] _ in
                self?.itemEnded(i, item)
            },
            centre.addObserver(forName: .AVPlayerItemFailedToPlayToEndTime, object: item, queue: .main) { [weak self] note in
                let error = note.userInfo?[AVPlayerItemFailedToPlayToEndTimeErrorKey] as? Error
                self?.itemFailed(i, item, error)
            },
        ]
        d.player.replaceCurrentItem(with: item)
        return true
    }

    private func detach(_ d: Deck) {
        d.statusObservation?.invalidate()
        d.statusObservation = nil
        d.observers.forEach { NotificationCenter.default.removeObserver($0) }
        d.observers = []
        d.onReady = []
    }

    private func whenReady(_ i: Int, _ fn: @escaping () -> Void) {
        if decks[i].ready { fn() } else { decks[i].onReady.append(fn) }
    }

    private func statusChanged(_ i: Int, _ item: AVPlayerItem) {
        let d = decks[i]
        guard d.player.currentItem === item else { return }
        switch item.status {
        case .readyToPlay:
            guard !d.ready else { return }
            if d.startAt > 0 {
                let duration = item.duration.seconds
                let to = duration.isFinite ? min(d.startAt, max(0, duration - 2)) : d.startAt
                d.player.seek(to: CMTime(seconds: to, preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .zero)
                d.startAt = 0
            }
            d.ready = true
            let waiting = d.onReady
            d.onReady = []
            waiting.forEach { $0() }
            if i == active {
                consecutiveSkips = 0
                publishNowPlaying()
                emitState(force: true)
            }
        case .failed:
            itemFailed(i, item, item.error)
        default:
            break
        }
    }

    private func itemEnded(_ i: Int, _ item: AVPlayerItem) {
        let d = decks[i]
        guard d.player.currentItem === item else { return }
        d.ended = true
        // A song ending inside its own crossfade is the retiring deck: ignored.
        guard i == active else { return }
        if appActive {
            // The page drives: `onEnded` → `advance` decides what follows.
            wantsPlaying = false
            endedAt = CACurrentMediaTime()
            publishNowPlaying()
            var data = snapshot()
            data["currentSec"] = 0
            data["playing"] = false
            emit?("ended", data)
            ensureTimer()
        } else {
            advanceAfterEnd()
        }
    }

    private func itemFailed(_ i: Int, _ item: AVPlayerItem, _ error: Error?) {
        let d = decks[i]
        guard d.player.currentItem === item, let e = d.entry else { return }
        if i == retiring {
            finishRetirement()
            return
        }
        guard i == active else { return }
        failed(e, code: Self.describe(error))
    }

    /// A song that cannot play. `code` is a key the page translates
    /// (`errorText` in `lib/audioEngine.ts`) — the words are in `src/i18n`. The page decides what happens while it drives
    /// (`onError` → `skipPast`); while it is away the engine skips on its own,
    /// the same eight-in-a-row limit, and keeps a list for the banner.
    private func failed(_ e: Entry, code: String) {
        CommandLog.note("engine: \(e.title) failed — \(code)")
        if appActive {
            wantsPlaying = false
            var data = snapshot()
            data["key"] = e.key
            data["code"] = code
            emit?("error", data)
            return
        }
        skippedLog.append(["trackId": e.trackId, "title": e.title, "artist": e.artist, "reason": code])
        consecutiveSkips += 1
        if consecutiveSkips <= min(8, upcoming.count), !upcoming.isEmpty {
            let next = upcoming.removeFirst()
            seq += 1
            wantsPlaying = true
            load(next, autoplay: true, fadeInOverride: nil, startAt: 0, level: nil)
            changed("skipped")
        } else {
            consecutiveSkips = 0
            for d in decks { d.player.pause() }
            wantsPlaying = false
            publishNowPlaying()
            changed("failed")
        }
    }

    /// `describeError` in `audio.ts`, for what AVFoundation says — as a code.
    static func describe(_ error: Error?) -> String {
        if let error = error as NSError? {
            if error.domain == AVFoundationErrorDomain {
                switch AVError.Code(rawValue: error.code) {
                case .fileFormatNotRecognized, .decoderNotFound, .formatUnsupported: return "decode"
                case .decodeFailed, .fileFailedToParse: return "damaged"
                default: break
                }
            }
            if error.domain == NSCocoaErrorDomain || error.domain == NSURLErrorDomain { return "unreadable" }
        }
        return "wont_play"
    }

    /// Everything a new song on the active deck needs said.
    private func newSong(_ e: Entry) {
        if artworkAlbum != e.albumId {
            artwork = nil
            animatedArtwork = [:]
            artworkAlbum = nil
            loadArtwork(for: e)
        }
        artistLine = nil
        ensureTimer()
        publishNowPlaying()
        emitState(force: true)
        if !appActive {
            measureAhead()
            if notify { announce(e) }
        }
    }

    /// The page has loaded the song its plan said it had moved to: the copy
    /// `setUpcoming` put at the front comes off. ONLY that one — a repeating
    /// one-song queue's next is itself, and taking it would end the night.
    /// (Otherwise the page's new plan follows the load straight away.)
    private func dropPageMove(for e: Entry) {
        if pageMovedAt != nil, upcoming.first?.key == e.key { upcoming.removeFirst() }
        pageMovedAt = nil
    }

    // MARK: - Running the queue alone

    /// The active song ended and nobody (no page) put the next one on.
    private func advanceAfterEnd() {
        endedAt = nil
        pageMovedAt = nil
        if let t = repeatOne, let e = decks[active].entry {
            seq += 1
            wantsPlaying = true
            run(t, to: e, natural: true, restart: true)
            changed("repeat")
            return
        }
        guard let next = takeNext() else {
            // The end of the queue: stop with the needle off, at the top of the
            // last song — `advance`'s end of queue.
            queueEnded = true
            wantsPlaying = false
            for d in decks { d.player.pause() }
            decks[active].player.seek(to: .zero)
            decks[active].ended = false
            publishNowPlaying()
            changed("end")
            return
        }
        seq += 1
        wantsPlaying = true
        var t = next.auto
        // Ended already: nothing left to blend with (`naturalEnd` in `playPrepared`).
        if t.kind == .crossfade { t.kind = t.gapSec > 0 ? .change : .cut }
        run(t, to: next, natural: true)
        changed("advance")
    }

    /// The next entry, and the one being left goes to `history` (and, on a
    /// repeating queue, back on the end).
    private func takeNext() -> Entry? {
        guard !upcoming.isEmpty else { return nil }
        let next = upcoming.removeFirst()
        if let leaving = decks[active].entry {
            history.append(leaving)
            if history.count > 50 { history.removeFirst() }
            if wrap { upcoming.append(leaving) }
        }
        return next
    }

    /// Carry out a change-over the page decided.
    private func run(_ t: Transition, to e: Entry, natural: Bool, restart: Bool = false, blend: (Double, Double)? = nil) {
        switch t.kind {
        case .crossfade:
            let (seconds, hold) = blend ?? (t.blendSec, 0)
            crossfade(e, seconds: seconds, hold: hold, curve: t.curve, level: nil)
            if t.cue { playCue(e, after: t.cueDelaySec) }
        case .cut:
            if restart { self.restart(fadeInOverride: nil) } else {
                load(e, autoplay: true, fadeInOverride: nil, startAt: 0, level: nil)
            }
        case .change:
            if !natural && t.duckSec > 0 { duck(t.duckSec) }
            let work = DispatchWorkItem { [weak self] in
                guard let self = self else { return }
                self.pending = nil
                if t.cue && self.wantsPlaying { self.playCue(e, after: 0) }
                if restart {
                    if self.wantsPlaying { self.restart(fadeInOverride: t.fadeInSec) }
                } else {
                    self.load(e, autoplay: self.wantsPlaying, fadeInOverride: t.fadeInSec, startAt: 0, level: nil)
                }
            }
            cancelPending()
            pending = work
            DispatchQueue.main.asyncAfter(deadline: .now() + max(0, t.gapSec), execute: work)
            ensureTimer()
        }
    }

    private func cancelPending() {
        pending?.cancel()
        pending = nil
    }

    /// Lock-screen Next with the page away — `playPrepared`'s skip.
    private func skipNext() {
        guard let next = takeNext() else {
            // The end of the queue with repeat off: `advance` stops at the top.
            pause()
            seek(0)
            changed("end")
            return
        }
        seq += 1
        consecutiveSkips = 0
        wantsPlaying = true
        run(next.skip, to: next, natural: false)
        changed("next")
    }

    /// Lock-screen Previous with the page away: back to the top if past three
    /// seconds, as every player does — else the song before.
    private func skipPrevious() {
        if position > 3 {
            seek(0)
            return
        }
        guard let back = history.popLast() ?? previousEntry else {
            seek(0)
            return
        }
        previousEntry = nil
        if let leaving = decks[active].entry {
            if wrap, upcoming.last === back { upcoming.removeLast() }
            upcoming.insert(leaving, at: 0)
        }
        seq += 1
        wantsPlaying = true
        run(back.skip, to: back, natural: false)
        changed("previous")
    }

    /// The end-of-song crossfade, started by the engine — `maybeStartEarlyCrossfade`.
    private func autoCrossfade(remaining: Double) {
        guard retiring == nil, pending == nil, repeatOne == nil, wantsPlaying,
              let leaving = decks[active].entry, let next = upcoming.first, next.auto.kind == .crossfade else { return }
        let timing = EngineMaths.crossfadeTiming(blendSec: next.auto.blendSec, manualSec: next.auto.manualSec,
                                                 intro: next.intro, outro: leaving.outro,
                                                 remaining: remaining, limits: limits)
        // Rearmed once well clear of the end — a repeating one-song queue
        // crosses into itself every time round.
        if remaining > timing.lead + 1 { armedKey = nil }
        guard armedKey != leaving.key, remaining <= timing.lead, remaining > 0 else { return }
        armedKey = leaving.key
        _ = takeNext()
        seq += 1
        CommandLog.note("engine: crossfade into \"\(next.title)\" \(String(format: "%.1f", timing.blend))s hold \(String(format: "%.1f", timing.hold))")
        run(next.auto, to: next, natural: false, blend: (timing.blend, timing.hold))
        changed("crossfade")
    }

    /// The two ways a change-over the page started can be left half done when
    /// the app goes away: the song ended and the page had not put the next one
    /// on, or the page moved its cursor (a record change's lift, a copy being
    /// made) and had not loaded it. Either way, after a moment, the engine does.
    private func safetyNets(_ now: CFTimeInterval) {
        guard !appActive else { return }
        if let at = endedAt, now - at > 1.5 {
            CommandLog.note("engine: the page did not follow a song's end — going on alone")
            advanceAfterEnd()
            return
        }
        if let at = pageMovedAt, now - at > 1.5, pending == nil {
            pageMovedAt = nil
            guard let next = upcoming.first else { return }
            CommandLog.note("engine: the page moved to \"\(next.title)\" and went away — loading it")
            _ = upcoming.removeFirst()
            seq += 1
            wantsPlaying = true
            var t = next.skip
            t.duckSec = 0
            if t.kind == .crossfade { t.kind = .cut }
            run(t, to: next, natural: true)
            changed("caught up")
        }
    }

    // MARK: - Ramps and volume

    private func apply(_ i: Int) {
        let d = decks[i]
        let level = muted ? 0 : userVolume * d.fade * d.level * sleepFactor * outputGain
        d.player.volume = Float(clamp(level))
        // Past full, the rest is the tap's (32× at most: Loud's +30 dB).
        d.boost.value = Float(max(1, min(level, 32)))
        if level > 1.0001 { attachBoost(d) }
    }

    /// Put `BoostTap` on the deck's current item, once. The audio track is
    /// read off the main thread (it can block while the asset loads); a deck
    /// that has moved to another item by then is left alone.
    private func attachBoost(_ d: Deck) {
        guard let item = d.player.currentItem, d.boostedItem !== item, d.boosting !== item else { return }
        d.boosting = item
        let gain = d.boost
        DispatchQueue.global(qos: .userInitiated).async {
            let track = item.asset.tracks(withMediaType: .audio).first
            let mix = track.flatMap { BoostTap.mix(for: $0, gain: gain) }
            DispatchQueue.main.async {
                guard d.player.currentItem === item else { return }
                d.boosting = nil
                guard let mix = mix else {
                    CommandLog.note("engine: no boost tap for this song — held at full")
                    return
                }
                item.audioMix = mix
                d.boostedItem = item
            }
        }
    }

    private func applyAll() {
        apply(0)
        apply(1)
        previewPlayer.volume = Float(clamp(muted ? 0 : previewVolume * min(1, outputGain)))
    }

    private func gain(for e: Entry) -> Double {
        stableVolume ? clamp(e.gain ?? 1) : 1
    }

    private func endFade(_ i: Int, _ value: Double) {
        decks[i].ramp = nil
        decks[i].fade = value
        apply(i)
    }

    private func beginTrack(_ i: Int, _ override: Double?) {
        let seconds = override ?? fadeIn
        decks[i].ramp = nil
        guard seconds > 0 else {
            endFade(i, 1)
            return
        }
        decks[i].fade = 0
        apply(i)
        whenReady(i) { [weak self] in self?.rampTo(i, 1, seconds, .linear) }
    }

    private func rampTo(_ i: Int, _ to: Double, _ seconds: Double, _ curve: Curve, delay: Double = 0, done: (() -> Void)? = nil) {
        guard seconds > 0 else {
            endFade(i, to)
            done?()
            return
        }
        decks[i].ramp = Ramp(from: decks[i].fade, to: to, started: CACurrentMediaTime(), delay: delay,
                             seconds: seconds, curve: curve, done: done)
        ensureTimer()
    }

    private func step(_ i: Int, _ now: CFTimeInterval) {
        guard let r = decks[i].ramp else { return }
        let t = min(1, max(0, (now - r.started - r.delay) / r.seconds))
        decks[i].fade = EngineMaths.fade(r.from, r.to, t, r.curve)
        apply(i)
        if t >= 1 {
            decks[i].ramp = nil
            decks[i].fade = r.to
            apply(i)
            r.done?()
        }
    }

    /// Silence the deck fading out, let go of its file, put its envelope back.
    private func finishRetirement() {
        guard let i = retiring else { return }
        retiring = nil
        let d = decks[i]
        d.ramp = nil
        d.fade = 1
        d.player.pause()
        detach(d)
        d.player.replaceCurrentItem(with: nil)
        d.entry = nil
        apply(i)
    }

    // MARK: - The clock

    /// 30 ms while a ramp runs — a fade you cannot hear the steps of — and
    /// 125 ms otherwise, which is plenty to start a fade-out or a crossfade on
    /// time and a quarter of the wake-ups on a locked phone.
    private var tickMs = 0

    private func ensureTimer() {
        if timer == nil {
            let t = DispatchSource.makeTimerSource(queue: .main)
            t.setEventHandler { [weak self] in self?.tick() }
            timer = t
            tickMs = 0
            retime()
            t.resume()
        } else {
            retime()
        }
    }

    private func retime() {
        let wanted = decks.contains { $0.ramp != nil } ? 30 : 125
        guard wanted != tickMs, let t = timer else { return }
        tickMs = wanted
        t.schedule(deadline: .now() + .milliseconds(wanted), repeating: .milliseconds(wanted), leeway: .milliseconds(5))
    }

    private func tick() {
        let now = CACurrentMediaTime()
        step(0, now)
        step(1, now)
        sleepTick()
        let d = decks[active]
        if let item = d.player.currentItem, d.ready, !d.ended {
            let duration = item.duration.seconds
            let at = d.player.currentTime().seconds
            if duration.isFinite, duration > 0, at.isFinite {
                let remaining = duration - at
                fadeOutCheck(d, remaining: remaining, duration: duration)
                if !appActive { autoCrossfade(remaining: remaining) }
            }
            // The page writes the line while it is awake (`followLockLyrics`);
            // asleep, nobody else can.
            if !appActive, let e = d.entry, !e.lines.isEmpty, at.isFinite { followLines(e, at) }
        }
        safetyNets(now)
        if appActive, now - lastStateAt >= 0.25 { emitState() }
        let busy = wantsPlaying || retiring != nil || pending != nil || decks.contains { $0.ramp != nil }
            || endedAt != nil || pageMovedAt != nil
        if busy {
            retime()
        } else {
            timer?.cancel()
            timer = nil
        }
    }

    /// The user's fade-out, before a song's end — `maybeFadeOut`. Not during a
    /// crossfade, whose ramps would fight it; not on a song shorter than twice it.
    private func fadeOutCheck(_ d: Deck, remaining: Double, duration: Double) {
        guard fadeOut > 0, d.ramp == nil, retiring == nil, wantsPlaying, duration >= fadeOut * 2,
              remaining > 0, remaining <= fadeOut else { return }
        rampTo(active, 0, remaining, .linear)
    }

    private func sleepTick() {
        guard let ends = sleepEndsAt else { return }
        let left = ends.timeIntervalSinceNow
        let factor = EngineMaths.sleepGain(left, fade: sleepFadeSec)
        if factor != sleepFactor {
            sleepFactor = factor
            applyAll()
        }
        guard left <= 0 else { return }
        CommandLog.note("engine: sleep timer ended the music")
        sleepEndsAt = nil
        sleepEnded = true
        pause()
        // Full again for whenever play is next pressed — the pause ended it.
        sleepFactor = 1
        applyAll()
        changed("sleep")
    }

    // MARK: - Telling the page

    private var position: Double {
        let at = decks[active].player.currentTime().seconds
        return at.isFinite ? max(0, at) : 0
    }

    private var duration: Double {
        let d = decks[active].player.currentItem?.duration.seconds ?? 0
        return d.isFinite && d > 0 ? d : 0
    }

    private var isPlaying: Bool { wantsPlaying && decks[active].entry != nil }

    private var isLoading: Bool {
        let d = decks[active]
        guard d.entry != nil else { return false }
        return !d.ready || (wantsPlaying && d.player.timeControlStatus == .waitingToPlayAtSpecifiedRate)
    }

    func snapshot() -> [String: Any] {
        var s: [String: Any] = [
            "seq": seq,
            "playing": isPlaying,
            "loading": isLoading,
            "currentSec": position,
            "durationSec": duration,
            "crossfading": retiring != nil,
        ]
        if let e = decks[active].entry {
            s["key"] = e.key
            s["trackId"] = e.trackId
            s["cursor"] = e.cursor
        }
        return s
    }

    /// Everything the page needs on waking — and the lists it should only hear once.
    func fullSnapshot() -> [String: Any] {
        var s = snapshot()
        s["skipped"] = skippedLog
        s["queueEnded"] = queueEnded
        s["sleepEnded"] = sleepEnded
        skippedLog = []
        sleepEnded = false
        return s
    }

    /// Position and play state, four times a second while the app is active —
    /// what `timeupdate` was. Never while it is not: a page that is not
    /// running would get them all at once on waking, about songs long gone.
    private func emitState(force: Bool = false) {
        guard appActive else { return }
        let now = CACurrentMediaTime()
        guard force || now - lastStateAt >= 0.25 else { return }
        lastStateAt = now
        emit?("state", snapshot())
    }

    /// "Something changed here — come and look" (`requestSync` in the page).
    /// Carries nothing to act on, so a pile of them delivered late is harmless.
    private func changed(_ reason: String) {
        guard !changedPending else { return }
        changedPending = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
            guard let self = self else { return }
            self.changedPending = false
            self.emit?("changed", ["reason": reason, "seq": self.seq])
        }
    }

    @objc private func becameActive() {
        changed("wake")
    }

    @objc private func resignedActive() {
        measureAhead()
    }

    // MARK: - Measuring ahead, while locked

    /// What the page would have measured a song ahead (`prefetchNext`), for the
    /// songs it never got to: Stable volume's level, the next song's quiet
    /// opening and this song's dead-air ending — `LoudnessPlugin`'s readers,
    /// the same rules (`EngineMaths`).
    private func measureAhead() {
        var wanted: [(Entry, Bool)] = []
        if let e = decks[active].entry { wanted.append((e, true)) }
        if let next = upcoming.first { wanted.append((next, false)) }
        for (e, isCurrent) in wanted {
            let needGain = stableVolume && e.gain == nil
            let needIntro = !isCurrent && e.intro == nil
            let needOutro = e.outro == nil
            guard needGain || needIntro || needOutro, !measuring.contains(e.trackId) else { continue }
            guard let url = e.url ?? e.mediaId.flatMap({ Self.libraryItem($0)?.assetURL }) else { continue }
            measuring.insert(e.trackId)
            measureQueue.async { [weak self] in
                let gain = needGain ? Loudness.measure(url).map { EngineMaths.gain(forDb: $0.rms) } : nil
                let intro = needIntro ? Loudness.opening(url, seconds: 20, block: 0.2).map { EngineMaths.quietStart($0, block: 0.2) } : nil
                let outro = needOutro ? Loudness.closing(url, seconds: 20, block: 0.2).map { EngineMaths.quietEnd($0, block: 0.2) } : nil
                DispatchQueue.main.async {
                    guard let self = self else { return }
                    self.measuring.remove(e.trackId)
                    if let g = gain { e.gain = g }
                    if let i = intro { e.intro = i }
                    if let o = outro { e.outro = o }
                    // Measured after it started: down to its level now (`levelLater`).
                    if let g = gain, self.stableVolume, self.decks[self.active].entry === e {
                        self.decks[self.active].level = g
                        self.apply(self.active)
                    }
                }
            }
        }
    }

    // MARK: - Interruptions and routes

    /// Siri, a call, a timer. iOS pauses the players itself; this remembers
    /// whether the music was ours, and brings it back with a rise when iOS says
    /// it may — `interruptionEnded` / `shouldComeBack`: false is iOS saying no,
    /// a MISSING option is iOS saying nothing, and nothing means come back.
    @objc private func interrupted(_ note: Notification) {
        guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
        DispatchQueue.main.async { [self] in
            switch type {
            case .began:
                interruptedPlaying = wantsPlaying
                wantsPlaying = false
                CommandLog.note("engine: interrupted (ours=\(interruptedPlaying))")
                publishNowPlaying()
                emitState(force: true)
                changed("interrupted")
            case .ended:
                var resume: Bool?
                if let options = note.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt {
                    resume = AVAudioSession.InterruptionOptions(rawValue: options).contains(.shouldResume)
                }
                let ours = interruptedPlaying
                interruptedPlaying = false
                CommandLog.note("engine: interruption ended (ours=\(ours) resume=\(resume.map { "\($0)" } ?? "none"))")
                guard ours, resume != false, decks[active].entry != nil else { return }
                finishRetirement()
                decks[active].fade = 0
                apply(active)
                rampTo(active, 1, 0.6, .linear)
                play()
                changed("resumed")
            @unknown default:
                break
            }
        }
    }

    /// Headphones out pause on purpose (the sound must not jump to the speaker
    /// in a quiet room); any other move — AirPlay picked, a speaker connecting —
    /// keeps the music going (James, 2026-09-16).
    @objc private func routeChanged(_ note: Notification) {
        let raw = note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt ?? 0
        let reason = AVAudioSession.RouteChangeReason(rawValue: raw) ?? .unknown
        DispatchQueue.main.async { [self] in
            emit?("route", ["away": Self.routedAway()])
            if reason == .oldDeviceUnavailable {
                if wantsPlaying {
                    pause()
                    changed("device out")
                }
                return
            }
            guard wantsPlaying else { return }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [self] in
                let d = decks[active]
                if wantsPlaying, d.ready, !d.ended, d.player.rate == 0 { d.player.play() }
            }
        }
    }

    @objc private func servicesReset(_ note: Notification) {
        CommandLog.note("engine: media services were reset")
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [])
        DispatchQueue.main.async { [self] in
            if wantsPlaying { pause() }
            changed("reset")
        }
    }

    /// Whether the sound is going to another device — AirPlay, as
    /// `webkitCurrentPlaybackTargetIsWireless` meant.
    static func routedAway() -> Bool {
        AVAudioSession.sharedInstance().currentRoute.outputs.contains { $0.portType == .airPlay }
    }

    // MARK: - Lock screen

    private func registerCommands() {
        let centre = MPRemoteCommandCenter.shared()
        let actions: [(MPRemoteCommand, String)] = [
            (centre.playCommand, "play"),
            (centre.pauseCommand, "pause"),
            (centre.togglePlayPauseCommand, "toggle"),
            (centre.nextTrackCommand, "nexttrack"),
            (centre.previousTrackCommand, "previoustrack"),
        ]
        for (command, action) in actions {
            command.isEnabled = true
            command.addTarget { [weak self] _ in self?.command(action, position: nil) ?? .commandFailed }
        }
        centre.changePlaybackPositionCommand.isEnabled = true
        centre.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let seek = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
            return self?.command("seekto", position: seek.positionTime) ?? .commandFailed
        }
        // A music player's side buttons are the tracks, not ±10 s.
        centre.skipForwardCommand.isEnabled = false
        centre.skipBackwardCommand.isEnabled = false
    }

    /// A lock-screen, Control Centre, headphone or Siri command. With the app
    /// active it goes to the page, which runs the same handlers as its own
    /// buttons (`dispatchAction`); otherwise the engine acts on it here, at
    /// once — the page could not.
    private func command(_ action: String, position: Double?) -> MPRemoteCommandHandlerStatus {
        CommandLog.note("engine command \(action) app=\(UIApplication.shared.applicationState.rawValue)")
        if appActive {
            var data: [String: Any] = ["action": action]
            if let p = position { data["position"] = p }
            emit?("command", data)
            return .success
        }
        switch action {
        case "play": play()
        case "pause": pause()
        case "toggle": if wantsPlaying { pause() } else { play() }
        case "nexttrack": skipNext()
        case "previoustrack": skipPrevious()
        case "seekto": if let p = position { seek(p) }
        default: return .commandFailed
        }
        changed("remote")
        return .success
    }

    /// The whole entry, from what is on the deck — nobody else writes it while
    /// the engine is on (`NowPlayingPlugin` hands its artwork over instead).
    private func publishNowPlaying() {
        guard enabled else { return }
        let centre = MPNowPlayingInfoCenter.default()
        guard let e = decks[active].entry else {
            centre.nowPlayingInfo = nil
            centre.playbackState = .stopped
            return
        }
        var info: [String: Any] = [
            MPMediaItemPropertyTitle: e.title,
            MPMediaItemPropertyArtist: artistLine ?? e.artist,
            MPMediaItemPropertyAlbumTitle: e.album,
            MPNowPlayingInfoPropertyElapsedPlaybackTime: position,
            MPNowPlayingInfoPropertyPlaybackRate: isPlaying ? 1.0 : 0.0,
            MPNowPlayingInfoPropertyMediaType: MPNowPlayingInfoMediaType.audio.rawValue,
        ]
        if duration > 0 { info[MPMediaItemPropertyPlaybackDuration] = duration }
        if let art = artwork, artworkAlbum == e.albumId { info[MPMediaItemPropertyArtwork] = art }
        if artworkAlbum == e.albumId { for (key, value) in animatedArtwork { info[key] = value } }
        centre.nowPlayingInfo = info
        centre.playbackState = isPlaying ? .playing : .paused
    }

    /// The page's lock-screen picture (`NowPlayingPlugin.show`): the record it
    /// drew, and on iOS 26 that record turning. Only for the song it was drawn
    /// for — one arriving late, after the engine moved on, is dropped.
    func adoptArtwork(title: String, still: UIImage, animated: [String: Any]) {
        guard let e = decks[active].entry, e.title == title else { return }
        artwork = MPMediaItemArtwork(boundsSize: still.size) { _ in still }
        artworkAlbum = e.albumId
        animatedArtwork = animated
        publishNowPlaying()
    }

    /// "Lyrics on the lock screen" — a line in the artist's place, or nil.
    func setArtistLine(_ line: String?) {
        guard let e = decks[active].entry else { return }
        let wanted = (line?.isEmpty == false) ? line : nil
        guard wanted != artistLine else { return }
        artistLine = wanted == e.artist ? nil : wanted
        publishNowPlaying()
    }

    /// The line being sung at `at`, as `lockScreenLine` picks it: the last
    /// line started, or the artist back between lines and before the first.
    private func followLines(_ e: Entry, _ at: Double) {
        var line: String?
        for l in e.lines {
            if l.at > at { break }
            line = l.text
        }
        let text = line?.trimmingCharacters(in: .whitespaces)
        setArtistLine(text?.isEmpty == false ? text : nil)
    }

    /// The new-song card (`announceTrack` in `lib/trackNotify.ts`), for a song
    /// the engine put on with the page away. With the cover if it is to hand,
    /// or once it has loaded — a second and a half at most.
    private func announce(_ e: Entry) {
        guard announcedKey != e.key else { return }
        announcedKey = e.key
        announceLater?.cancel()
        if let image = artCache[e.albumId] ?? (artworkAlbum == e.albumId ? artwork?.image(at: CGSize(width: 192, height: 192)) : nil) {
            NotifyPlugin.post(title: e.title, body: Self.cardBody(e), image: image)
            return
        }
        announcePending = e
        let later = DispatchWorkItem { [weak self] in
            guard let self = self, let waiting = self.announcePending else { return }
            self.announcePending = nil
            NotifyPlugin.post(title: waiting.title, body: Self.cardBody(waiting), image: nil)
        }
        announceLater = later
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5, execute: later)
    }

    private static func cardBody(_ e: Entry) -> String {
        [e.artist, e.album].filter { !$0.isEmpty }.joined(separator: " — ")
    }

    /// A different album, changed to with the page away: its own embedded
    /// cover (or the Music library's), until the page draws the real one.
    private func loadArtwork(for e: Entry) {
        let albumId = e.albumId
        if let image = artCache[albumId] {
            setArtwork(image, for: albumId)
            return
        }
        let url = e.url
        let mediaId = e.mediaId
        DispatchQueue.global(qos: .utility).async { [weak self] in
            var image: UIImage?
            if let id = mediaId, let item = Self.libraryItem(id) {
                image = item.artwork?.image(at: CGSize(width: 600, height: 600))
            }
            if image == nil, let url = url, url.isFileURL {
                for item in AVURLAsset(url: url).commonMetadata where item.commonKey == .commonKeyArtwork {
                    if let data = item.dataValue, let found = UIImage(data: data) {
                        image = found
                        break
                    }
                }
            }
            guard let image = image else { return }
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.artCache[albumId] = image
                if self.artCache.count > 12, let first = self.artCache.keys.first(where: { $0 != albumId }) {
                    self.artCache.removeValue(forKey: first)
                }
                self.setArtwork(image, for: albumId)
            }
        }
    }

    private func setArtwork(_ image: UIImage, for albumId: String) {
        if let waiting = announcePending, waiting.albumId == albumId {
            announcePending = nil
            announceLater?.cancel()
            NotifyPlugin.post(title: waiting.title, body: Self.cardBody(waiting), image: image)
        }
        guard decks[active].entry?.albumId == albumId, artworkAlbum != albumId || artwork == nil else { return }
        artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
        artworkAlbum = albumId
        animatedArtwork = [:]
        publishNowPlaying()
    }

    // MARK: - Preview

    /// Ten seconds from ten seconds in (`startPreview`), on a player of its own
    /// so the queue's two decks are left exactly where they were.
    func startPreview(url: URL?, mediaId: UInt64?, volume: Double) {
        stopPreview()
        var source = url
        if source == nil || (source!.isFileURL && !FileManager.default.fileExists(atPath: source!.path)) {
            source = mediaId.flatMap { Self.libraryItem($0)?.assetURL }
        }
        guard let target = source else {
            emit?("previewEnded", [:])
            return
        }
        previewVolume = clamp(volume)
        applyAll()
        let item = AVPlayerItem(url: target)
        let finish: () -> Void = { [weak self] in
            self?.stopPreview()
            self?.emit?("previewEnded", [:])
        }
        previewObservation = item.observe(\.status, options: [.new]) { [weak self] item, _ in
            DispatchQueue.main.async {
                guard let self = self, self.previewPlayer.currentItem === item else { return }
                if item.status == .failed {
                    finish()
                    return
                }
                guard item.status == .readyToPlay, self.previewStop == nil else { return }
                let length = item.duration.seconds
                let known = length.isFinite && length > 0
                let from = known && length > 12 ? 10.0 : 0
                self.previewPlayer.seek(to: CMTime(seconds: from, preferredTimescale: 600)) { _ in
                    DispatchQueue.main.async { self.previewPlayer.play() }
                }
                let runFor = known ? min(10, max(1, length - from)) : 10
                let stop = DispatchWorkItem(block: finish)
                self.previewStop = stop
                DispatchQueue.main.asyncAfter(deadline: .now() + runFor, execute: stop)
            }
        }
        previewObservers = [
            NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: item, queue: .main) { _ in finish() },
            NotificationCenter.default.addObserver(forName: .AVPlayerItemFailedToPlayToEndTime, object: item, queue: .main) { _ in finish() },
        ]
        activateSession()
        previewPlayer.replaceCurrentItem(with: item)
    }

    func stopPreview() {
        previewStop?.cancel()
        previewStop = nil
        previewObservation?.invalidate()
        previewObservation = nil
        previewObservers.forEach { NotificationCenter.default.removeObserver($0) }
        previewObservers = []
        previewPlayer.pause()
        previewPlayer.replaceCurrentItem(with: nil)
    }

    func setPreviewVolume(_ volume: Double) {
        previewVolume = clamp(volume)
        applyAll()
    }

    // MARK: - Start-up cues

    /// One of `crackle.ts`'s rendered clips (`playClip`). `volume` is already
    /// the app volume × the cue's level ÷ its headroom; Quiet takes it down too,
    /// so the crackle is never louder than the music it introduces.
    func playClip(_ url: URL, volume: Double) {
        let level = clamp(muted ? 0 : volume * min(1, outputGain))
        guard level > 0, let player = try? AVAudioPlayer(contentsOf: url) else { return }
        clips.removeAll { !$0.isPlaying }
        player.volume = Float(level)
        activateSession()
        player.play()
        clips.append(player)
    }

    /// The cue for arriving at `e`, played by the engine itself (a change-over
    /// it runs alone) at the app volume and the user's cue level.
    private func playCue(_ e: Entry, after delay: Double) {
        guard let url = e.cue else { return }
        let fire = { [weak self] in
            guard let self = self else { return }
            self.playClip(url, volume: self.userVolume * self.cueLevel)
        }
        if delay > 0 { DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: fire) } else { fire() }
    }
}

// MARK: - The maths, mirrored

/// The page's arithmetic, for the decisions the engine makes alone.
///
/// ⚠️ MIRRORS, LINE FOR LINE: `fadeLevel` (`src/lib/fadeCurve.ts`),
/// `crossfadeTiming` / `introHoldFor` / `outroLeadFor` (`src/lib/enginePlan.ts`,
/// whose test pins this table — remaining, intro, outro → lead, blend, hold:
/// 10,–,– → 1.8,1.8,0 · 10,3,– → 4.8,4.8,3 · 10,3,4 → 8.8,4.8,3 ·
/// 2,3,– → 4.8,2,0.8 · 0.3,–,– → 1.8,0.6,0 for a 1.8 s blend with a 1.2 s skip),
/// `sleepGain` (`src/lib/sleep.ts`), `gainForDb` (`src/lib/loudness.ts`) and
/// `introFromBlocks` / `outroFromBlocks` (`src/lib/intro.ts`, `outro.ts`). Change
/// one side, change both.
enum EngineMaths {
    static let stagger = 0.25
    static let leadOut = 0.3

    static func fade(_ from: Double, _ to: Double, _ t: Double, _ curve: JukeboxEngine.Curve) -> Double {
        let p = min(1, max(0, t))
        switch curve {
        case .linear:
            return from + (to - from) * p
        case .staggered:
            if to >= from { return from + (to - from) * sin(max(0, (p - stagger) / (1 - stagger)) * .pi / 2) }
            return to + (from - to) * cos(min(1, p / (1 - stagger)) * .pi / 2)
        case .leadOut:
            if to >= from { return from + (to - from) * sin(p * .pi / 2) }
            return to + (from - to) * cos(min(1, p / (1 - leadOut)) * .pi / 2)
        case .equalPower:
            let quarter = p * .pi / 2
            return to >= from ? from + (to - from) * sin(quarter) : to + (from - to) * cos(quarter)
        }
    }

    static func introHold(_ intro: Double?, _ l: JukeboxEngine.Limits) -> Double {
        let hold = intro.map { $0 >= l.introMin ? min($0, l.introHoldMax) : 0 } ?? 0
        return min(hold, l.introMax)
    }

    static func outroLead(_ outro: Double?, _ l: JukeboxEngine.Limits) -> Double {
        let lead = outro.map { $0 >= l.outroMin ? min($0, l.outroLeadMax) : 0 } ?? 0
        return min(lead, l.outroMax)
    }

    static func crossfadeTiming(blendSec: Double, manualSec: Double, intro: Double?, outro: Double?,
                                remaining: Double, limits: JukeboxEngine.Limits) -> (lead: Double, blend: Double, hold: Double) {
        let hold = introHold(intro, limits)
        let blendLead = blendSec + hold
        let lead = blendLead + outroLead(outro, limits)
        let blend = max(0.6, min(blendLead, remaining))
        return (lead, blend, max(0, min(hold, blend - manualSec)))
    }

    static func sleepGain(_ left: Double, fade: Double) -> Double {
        if left >= fade { return 1 }
        if left <= 0 { return 0 }
        return pow(left / fade, 2)
    }

    /// −16 dB RMS target, never below 0.3, never above 1.
    static func gain(forDb rms: Double) -> Double {
        max(0.3, min(1, pow(10, (-16 - rms) / 20)))
    }

    static func quietStart(_ blocks: [Double], block: Double) -> Double {
        let levels = blocks.filter { $0.isFinite }
        guard let loudest = levels.max() else { return 0 }
        if loudest < -50 { return (Double(levels.count) * block * 10).rounded() / 10 }
        let first = levels.firstIndex { $0 >= loudest - 10 } ?? 0
        return (Double(first) * block * 10).rounded() / 10
    }

    static func quietEnd(_ blocks: [Double], block: Double) -> Double {
        let levels = blocks.filter { $0.isFinite }
        guard let loudest = levels.max() else { return 0 }
        if loudest < -50 { return (Double(levels.count) * block * 10).rounded() / 10 }
        var last = levels.count - 1
        while last >= 0 && levels[last] < loudest - 10 { last -= 1 }
        return (Double(levels.count - 1 - last) * block * 10).rounded() / 10
    }
}

/// A number from the page, however the bridge typed it.
func num(_ value: Any?) -> Double? {
    switch value {
    case let d as Double: return d.isFinite ? d : nil
    case let i as Int: return Double(i)
    case let n as NSNumber: return n.doubleValue
    default: return nil
    }
}

private func clamp(_ v: Double) -> Double { max(0, min(1, v)) }

/// Gain above full for one deck: an `MTAudioProcessingTap` on the item's audio
/// track that multiplies the samples by `Gain.value` (read on the audio thread;
/// a lone Float, so a torn read cannot happen on arm64) and soft-limits what
/// goes past 0.9 so a +30 dB Loud saturates rather than cracks. Only float
/// PCM is touched, which is what AVPlayer hands a tap; anything else passes
/// through at full.
enum BoostTap {
    final class Gain {
        var value: Float = 1
        fileprivate var isFloat = false
    }

    static func mix(for track: AVAssetTrack, gain: Gain) -> AVAudioMix? {
        var callbacks = MTAudioProcessingTapCallbacks(
            version: kMTAudioProcessingTapCallbacksVersion_0,
            clientInfo: UnsafeMutableRawPointer(Unmanaged.passRetained(gain).toOpaque()),
            init: { _, clientInfo, storageOut in storageOut.pointee = clientInfo },
            finalize: { tap in
                Unmanaged<Gain>.fromOpaque(MTAudioProcessingTapGetStorage(tap)).release()
            },
            prepare: { tap, _, format in
                let gain = Unmanaged<Gain>.fromOpaque(MTAudioProcessingTapGetStorage(tap)).takeUnretainedValue()
                let f = format.pointee
                gain.isFloat = f.mFormatFlags & kAudioFormatFlagIsFloat != 0 && f.mBitsPerChannel == 32
            },
            unprepare: nil,
            process: { tap, frames, _, buffers, framesOut, flagsOut in
                guard MTAudioProcessingTapGetSourceAudio(tap, frames, buffers, flagsOut, nil, framesOut) == noErr else { return }
                let gain = Unmanaged<Gain>.fromOpaque(MTAudioProcessingTapGetStorage(tap)).takeUnretainedValue()
                let g = gain.value
                guard g > 1.0001, gain.isFloat else { return }
                for buffer in UnsafeMutableAudioBufferListPointer(buffers) {
                    guard let data = buffer.mData else { continue }
                    let count = Int(buffer.mDataByteSize) / MemoryLayout<Float>.size
                    let samples = data.assumingMemoryBound(to: Float.self)
                    for i in 0..<count { samples[i] = boostLimit(samples[i] * g) }
                }
            }
        )
        var tap: MTAudioProcessingTap?
        guard MTAudioProcessingTapCreate(kCFAllocatorDefault, &callbacks, kMTAudioProcessingTapCreationFlag_PostEffects, &tap) == noErr,
              let made = tap else {
            Unmanaged<Gain>.fromOpaque(callbacks.clientInfo!).release()
            return nil
        }
        let input = AVMutableAudioMixInputParameters(track: track)
        input.audioTapProcessor = made
        let mix = AVMutableAudioMix()
        mix.inputParameters = [input]
        return mix
    }

}

/// Straight up to 0.9, then a tanh knee that never reaches 1. A free function:
/// the tap's callbacks are C function pointers and may capture nothing.
@inline(__always) private func boostLimit(_ x: Float) -> Float {
    let knee: Float = 0.9
    let m = abs(x)
    guard m > knee else { return x }
    let y = knee + (1 - knee) * tanh((m - knee) / (1 - knee))
    return x < 0 ? -y : y
}

