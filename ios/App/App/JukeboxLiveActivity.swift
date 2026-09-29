import Foundation
#if canImport(ActivityKit)
import ActivityKit
#endif
#if canImport(AppIntents)
import AppIntents
#endif

/// The Live Activity's shape — the song on the Lock Screen and in the Dynamic
/// Island, with the line being sung under it (James, 2026-09-29: "do all you can
/// including live activity"; the backlog's "Lyrics outside the app", shape 2).
///
/// ⚠️ COMPILED INTO BOTH TARGETS — the app, which starts and updates the
/// activity (`LiveActivityDriver` in `NowPlayingPlugin.swift`), and the widget
/// extension, which draws it (`JukeboxWidget/`). ActivityKit matches the two by
/// this type, so there must be exactly one definition, in this one file.
///
/// ⚠️ THE PICTURE RIDES IN THE STATE, AND IT IS TINY. An update has a 4 KB
/// ceiling, so `cover` is the album cover at 48 px or smaller, as a JPEG
/// (`LiveActivityDriver.fit` shrinks it until the whole state fits, or drops
/// it). The widget draws the record itself and puts the cover on it as the
/// label, where 48 px is plenty.
///
/// ⚠️ NOT AN APP GROUP, which is the usual way to hand an extension a picture,
/// and was the first design. Registering a group is the one signing step the
/// App Store Connect API key cannot do — `xcodebuild -allowProvisioningUpdates`
/// with the key answers "Authentication failed" for it (2026-09-29) — so a
/// group would have made every build of this app wait for somebody in Xcode's
/// Signing & Capabilities pane. The label needs nothing like that.
#if canImport(ActivityKit)
@available(iOS 16.1, *)
public struct JukeboxActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var title: String
        public var artist: String
        /// The line being sung, or nil between lines and for a song without timed lyrics.
        public var line: String?
        /// The next line with words — under the sung one, or on its own through
        /// an intro or a break. Nil at the end of the sheet.
        public var next: String?
        /// Whether the song has lyrics with timings: false draws the slim
        /// "no lyrics" strip, nil (still being looked up) the lyrics layout.
        public var timed: Bool?
        public var playing: Bool
        /// When the song WOULD have started, had it played straight through to
        /// now — so `Text(timerInterval:)` and the progress bar run on their own
        /// without the app waking to move them. Only meaningful while playing.
        public var startedAt: Date
        /// Where it is, for the frozen bar while paused.
        public var elapsed: Double
        public var duration: Double
        /// The album cover as a small JPEG — the record's label. Nil for none.
        public var cover: Data?
        /// The lock-screen picture's own two colours (`lockArt.ts`'s `ground`),
        /// top and bottom, as `#rrggbb` — the activity wears the same sleeve.
        public var top: String
        public var bottom: String
    }
}
#endif

extension Notification.Name {
    /// A Live Activity button, pressed — the plugin hands it to the page as a
    /// `command`, like the lock screen's own buttons (`enableCommands`).
    static let jukeboxLiveCommand = Notification.Name("uk.co.unisim.jukebox.live-command")
}

/// The Live Activity's buttons: play/pause, previous and next.
///
/// ⚠️ A `LiveActivityIntent` RUNS IN THE APP, not the extension, which is why
/// this is all it does: say which button, and let the page decide — the same
/// handlers as the lock screen's own buttons, through `dispatchAction`.
#if canImport(AppIntents)
@available(iOS 17.0, *)
struct JukeboxCommandIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Control the Jukebox"
    static let isDiscoverable = false

    @Parameter(title: "Action")
    var action: String

    init() { action = "toggle" }

    init(action: String) { self.action = action }

    func perform() async throws -> some IntentResult {
        let action = self.action
        await MainActor.run {
            NotificationCenter.default.post(name: .jukeboxLiveCommand, object: nil, userInfo: ["action": action])
        }
        return .result()
    }
}
#endif
