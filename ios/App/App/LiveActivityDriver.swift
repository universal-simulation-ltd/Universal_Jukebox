import Foundation
import UIKit
import ActivityKit

/// Starts, feeds and ends the Live Activity (`JukeboxActivityAttributes`) —
/// the song on the Lock Screen and in the Dynamic Island, and the line being
/// sung under it.
///
/// ⚠️ IT RIDES ON `NowPlayingPlugin`, and adds no bridge traffic of its own
/// but the lyric line. The page already tells that plugin about every song
/// (`show`), every play/pause and jump (`update`, at least every two seconds
/// while a song plays), and the end of the queue (`clear`); the plugin passes
/// each of them on to here. So the activity knows exactly what the lock
/// screen's own entry knows, from the same calls, and cannot disagree with it.
///
/// ⚠️ A NEW ACTIVITY CAN ONLY BE STARTED WITH THE APP ON SCREEN. `request`
/// throws from the background. That is fine for the way music starts — in the
/// app — and a song changing on a locked phone only UPDATES the running one,
/// which is allowed. What it means: switched on while the app is on screen,
/// the activity appears at once; if it was swiped away, it comes back the next
/// time a song starts with the app open, never behind the user's back.
///
/// ⚠️ THE BAR AND THE CLOCK RUN THEMSELVES. `startedAt` is when the song would
/// have begun had it played straight through to now, and the widget draws
/// `ProgressView(timerInterval:)` and `Text(timerInterval:)` from it — so the
/// system moves them every second without this app being woken at all. An
/// update goes out only when that picture would be WRONG: play or pause, a new
/// song, a jump, or a new line.
@available(iOS 16.2, *)
final class LiveActivityDriver {
    static let shared = LiveActivityDriver()

    typealias State = JukeboxActivityAttributes.ContentState

    /// The setting ("Live Activity", off by default) — sent by the page at
    /// start-up and whenever it changes.
    private(set) var enabled = false

    private var activity: Activity<JukeboxActivityAttributes>?
    private var state: State?
    /// The user swiped it away: leave it gone until the queue ends or the app
    /// is opened on a new song — see `show`.
    private var dismissed = false
    private var watcher: Task<Void, Never>?
    /// The song time the words on the card go out of date — the next timed
    /// line (`lockScreenLineUntil` in `lockLyrics.ts`). Nil: none known.
    private var lineUntil: Double?

    private init() {}

    /// Anything left over from a run that ended without `clear` — the app
    /// killed while playing — would sit on the Lock Screen for hours showing a
    /// song that is not playing. Called once at launch.
    func endLeftovers() {
        for leftover in Activity<JukeboxActivityAttributes>.activities {
            Task { await leftover.end(nil, dismissalPolicy: .immediate) }
        }
    }

    func setEnabled(_ on: Bool) {
        guard on != enabled else { return }
        enabled = on
        if !on { end() }
        CommandLog.note("live activity \(on ? "on" : "off") allowed=\(ActivityAuthorizationInfo().areActivitiesEnabled)")
    }

    /// A new song — or the same one redrawn (a different machine chosen).
    func show(title: String, artist: String, elapsed: Double, duration: Double,
              playing: Bool, cover: Data?, ground: [String]) {
        guard enabled else { return }
        let foreground = UIApplication.shared.applicationState != .background
        // Opening the app on a song is the user coming back to it — a swipe
        // away was about the last song, not every song after it.
        if foreground { dismissed = false }
        guard !dismissed, ActivityAuthorizationInfo().areActivitiesEnabled else { return }

        let next = State(
            title: title,
            artist: artist,
            line: nil,
            next: nil,
            timed: nil,
            playing: playing,
            startedAt: Date().addingTimeInterval(-elapsed),
            elapsed: elapsed,
            duration: duration,
            cover: cover,
            top: ground.first ?? "#ffffff",
            bottom: ground.count > 1 ? ground[1] : "#e2e8f0")
        let fitted = Self.fit(next)
        state = fitted
        lineUntil = nil

        if let running = activity, running.activityState == .active {
            push()
            return
        }
        activity = nil
        guard foreground else { return }
        do {
            let started = try Activity.request(
                attributes: JukeboxActivityAttributes(),
                content: ActivityContent(state: fitted, staleDate: stale(fitted)),
                pushType: nil)
            activity = started
            watch(started)
            CommandLog.note("live activity started")
        } catch {
            CommandLog.note("live activity refused: \(error.localizedDescription)")
        }
    }

    /// Where playback is. Heard at least every two seconds while a song plays,
    /// and acted on only when the running clock would otherwise be wrong.
    func progress(elapsed: Double, duration: Double, playing: Bool) {
        guard var current = state, activity != nil else { return }
        let expected = current.playing ? Date().timeIntervalSince(current.startedAt) : current.elapsed
        let jumped = abs(expected - elapsed) > 2
        let lengthChanged = duration > 0 && abs(duration - current.duration) > 0.5
        guard playing != current.playing || jumped || lengthChanged else { return }
        // A jump leaves the next line's time meaning nothing; the page sends
        // the new one with the line it lands on.
        if jumped { lineUntil = nil }
        current.playing = playing
        current.elapsed = elapsed
        current.startedAt = Date().addingTimeInterval(-elapsed)
        if duration > 0 { current.duration = duration }
        state = current
        push()
    }

    /// The line being sung and the next one; whether the song has timed lyrics.
    func lyric(line: String?, next: String?, timed: Bool?, until: Double?) {
        guard var current = state, activity != nil else { return }
        guard line != current.line || next != current.next || timed != current.timed || until != lineUntil else { return }
        lineUntil = until
        current.line = line
        current.next = next
        current.timed = timed
        state = current
        push()
    }

    /// The queue ended, or the setting went off.
    func end() {
        watcher?.cancel()
        watcher = nil
        dismissed = false
        state = nil
        lineUntil = nil
        guard let running = activity else { return }
        activity = nil
        Self.holdingOn("live activity end") { await running.end(nil, dismissalPolicy: .immediate) }
    }

    private func push() {
        guard let running = activity, var current = state else { return }
        current = Self.fit(current)
        state = current
        let content = ActivityContent(state: current, staleDate: stale(current))
        Self.holdingOn("live activity update") { await running.update(content) }
    }

    /// ⚠️ EVERY UPDATE IS SENT UNDER A BACKGROUND TASK (James's lock screen,
    /// 2026-09-29: the activity still showing the song before last, run to its
    /// end, while the page's saved log showed two changes of song handed to the
    /// plugin with the phone locked). The music plays in WebKit's own process,
    /// so THIS process is only woken for the moment a bridge call takes — and
    /// `update` is asynchronous. It was handed over and the process went back to
    /// sleep before it was sent. Asking for background time keeps it awake
    /// until the update is out, then gives the time straight back.
    private static func holdingOn(_ name: String, _ work: @escaping () async -> Void) {
        var task = UIBackgroundTaskIdentifier.invalid
        task = UIApplication.shared.beginBackgroundTask(withName: name) {
            UIApplication.shared.endBackgroundTask(task)
            task = .invalid
        }
        Task { @MainActor in
            await work()
            if task != .invalid {
                UIApplication.shared.endBackgroundTask(task)
                task = .invalid
            }
        }
    }

    /// ⚠️ A MINUTE PAST THE SONG'S END, while it plays. If the page has not
    /// said "next song" by then it has stopped being able to — the phone
    /// suspended it — and the system dims the activity rather than letting a
    /// full bar pass for a song still playing.
    ///
    /// ⚠️ AND A MOMENT PAST THE NEXT LINE, while there are words to follow
    /// (James, 2026-09-30: the words froze after one or two lines on a locked
    /// phone). iOS REFUSES these updates from an app that is in the background
    /// only for audio — `liveactivitiesd` logs "Process is only playing
    /// background media so is forbidden to update activity" — and nothing in
    /// this app can change that (APNs is the only supported way; not chosen).
    /// So every line is sent with the moment it stops being true, and if the
    /// next update has not got through by then the widget draws "Unlock to
    /// follow the words" instead of a line that is no longer being sung.
    /// `lineGrace` covers the page's tick and the bridge on a phone that IS
    /// being allowed to update.
    private func stale(_ state: State) -> Date? {
        guard state.playing, state.duration > 0 else { return nil }
        let songEnd = state.startedAt.addingTimeInterval(state.duration + 60)
        guard state.timed == true, let until = lineUntil else { return songEnd }
        return min(songEnd, state.startedAt.addingTimeInterval(until + Self.lineGrace))
    }

    static let lineGrace: TimeInterval = 2.5

    private func watch(_ running: Activity<JukeboxActivityAttributes>) {
        watcher?.cancel()
        watcher = Task { @MainActor [weak self] in
            for await change in running.activityStateUpdates {
                guard let self = self else { return }
                if change == .dismissed || change == .ended {
                    if self.activity?.id == running.id {
                        self.activity = nil
                        self.dismissed = change == .dismissed
                    }
                    CommandLog.note("live activity \(change == .dismissed ? "dismissed" : "ended")")
                    return
                }
            }
        }
    }

    /// ⚠️ THE 4 KB CEILING. ActivityKit refuses an update whose state encodes
    /// larger than that, and says so only in the device log — the activity just
    /// stops changing. The words are what matter, so it is the COVER that
    /// gives way: redrawn smaller and coarser until the whole state fits under
    /// `budget`, and left off altogether (the label is then drawn plain) if
    /// even the smallest does not.
    static let budget = 3_600

    static func fit(_ state: State) -> State {
        guard let cover = state.cover, let image = UIImage(data: cover) else { return state }
        let encoder = JSONEncoder()
        var trial = state
        if let size = try? encoder.encode(trial).count, size <= budget { return trial }
        for (side, quality) in [(40.0, 0.5), (32.0, 0.45), (24.0, 0.4)] {
            let format = UIGraphicsImageRendererFormat()
            format.scale = 1
            let small = UIGraphicsImageRenderer(size: CGSize(width: side, height: side), format: format).image { _ in
                image.draw(in: CGRect(x: 0, y: 0, width: side, height: side))
            }
            trial.cover = small.jpegData(compressionQuality: quality)
            if let size = try? encoder.encode(trial).count, size <= budget { return trial }
        }
        trial.cover = nil
        return trial
    }
}
