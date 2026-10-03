import SwiftUI
import WidgetKit
import ActivityKit
import AppIntents

/// The Jukebox's widget extension. For now it holds one thing: the Live
/// Activity — the song on the Lock Screen and in the Dynamic Island, with the
/// line being sung under it (James, 2026-09-29). The app starts and feeds it
/// (`App/LiveActivityDriver.swift`); nothing here runs any logic of its own.
@main
struct JukeboxWidgets: WidgetBundle {
    var body: some Widget {
        JukeboxLiveActivity()
    }
}

/// ⚠️ A LYRICS ACTIVITY, NOT A SECOND MUSIC PLAYER (James, 2026-09-29, a
/// screenshot of it under the lock screen's own player: "what is the advantage
/// of the live in this case?" — none, on a song without lyrics). The system's
/// card already has the song, the scrub bar and the buttons; what it cannot
/// have is the words. So the line being sung is the biggest thing here, the
/// next one waits under it, and a song without timed lyrics shrinks the whole
/// thing to a slim strip rather than repeating the card above it.
///
/// ⚠️ SHRUNK, NOT ENDED. iOS lets an app START a Live Activity only while it is
/// on screen, so one ended for a song without lyrics could not come back for
/// the next song that has them — not with the phone locked, which is the whole
/// point of it.
struct JukeboxLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: JukeboxActivityAttributes.self) { context in
            LockScreenView(state: context.state, stale: context.isStale)
                .activityBackgroundTint(Palette(context.state).ground)
                .activitySystemActionForegroundColor(Palette(context.state).ink)
        } dynamicIsland: { context in
            let state = context.state
            let palette = Palette(state, dark: true)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Record(state: state, size: 44)
                        .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Controls(state: state, tint: palette.accent, size: 18)
                        .padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(state.title)
                        .font(.subheadline.weight(.semibold))
                        .lineLimit(1)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 6) {
                        Words(state: state, stale: context.isStale, ink: .white, accent: palette.accent, big: .title3)
                        if state.timed != false {
                            Progress(state: state, tint: palette.accent, ink: .white)
                        }
                    }
                    .padding(.horizontal, 4)
                }
            } compactLeading: {
                Record(state: state, size: 22)
            } compactTrailing: {
                Image(systemName: state.playing ? "waveform" : "pause.fill")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(palette.accent)
            } minimal: {
                Record(state: state, size: 22)
            }
            .keylineTint(palette.accent)
        }
    }
}

// MARK: - Lock Screen

private struct LockScreenView: View {
    let state: JukeboxActivityAttributes.ContentState
    let stale: Bool
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let palette = Palette(state, dark: scheme == .dark)
        Group {
            if state.timed == false {
                // The slim strip: which song, and that it has nothing to sing.
                HStack(spacing: 10) {
                    Record(state: state, size: 30)
                    VStack(alignment: .leading, spacing: 1) {
                        Text("\(state.title) · \(state.artist)")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(palette.ink.opacity(0.8))
                            .lineLimit(1)
                        Text("♪ No lyrics for this song")
                            .font(.caption2)
                            .foregroundStyle(palette.ink.opacity(0.55))
                    }
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
            } else {
                // ⚠️ NO TITLE ROW (James, 2026-09-29: the line was cut off at one
                // line, "…and I'll learn how to…"). A Live Activity has a fixed
                // ceiling on its height, and a row naming the song — which the
                // lock screen's own card right above already names — was
                // spending it. The record and the buttons sit BESIDE the words
                // instead, so a long line gets its two lines.
                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .top, spacing: 10) {
                        Record(state: state, size: 34)
                        Words(state: state, stale: stale, ink: palette.ink, accent: palette.accent, big: .title3, lockScreen: true)
                        Controls(state: state, tint: palette.ink, size: 16)
                    }
                    Progress(state: state, tint: palette.accent, ink: palette.ink)
                }
                .padding(14)
            }
        }
        .background(
            LinearGradient(colors: [palette.top, palette.ground], startPoint: .top, endPoint: .bottom)
        )
        // Dimmed as a strip; the lyrics layout says what is wrong in words instead (`Words`).
        .opacity(stale && state.timed == false ? 0.6 : 1)
    }
}

/// The words: the line being sung, big, and the next one faint under it —
/// or, through an intro or a break, the next one on its own, waiting.
///
/// ⚠️ STALE MEANS THE WORDS ARE WRONG. The app sets the stale date a moment
/// past the next line (`LiveActivityDriver.stale`); reaching it means iOS did
/// not let that update through — which it refuses on a locked phone — so the
/// line here is no longer the one being sung. Say so, rather than show it.
///
/// ⚠️ AND SAY WHERE THEY ARE (James, 2026-10-03: "Lyrics not advancing"). With
/// the app's page hidden, the line being sung goes into the artist's place in
/// the Now Playing card, which iOS DOES let a background music app update
/// (`followLockLyrics`). On the lock screen that card sits right above this one.
private struct Words: View {
    let state: JukeboxActivityAttributes.ContentState
    let stale: Bool
    let ink: Color
    let accent: Color
    let big: Font.TextStyle
    /// The lock screen, where the Now Playing card is directly above.
    var lockScreen = false

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            if state.timed == false {
                Text("♪ No lyrics for this song")
                    .font(.system(.subheadline, design: .rounded))
                    .foregroundStyle(ink.opacity(0.6))
            } else if stale {
                Label(lockScreen ? "The words are in the player above" : "Unlock to follow the words",
                      systemImage: lockScreen ? "arrow.up" : "lock.fill")
                    .font(.system(.headline, design: .rounded))
                    .foregroundStyle(ink.opacity(0.75))
                    .lineLimit(2)
            } else if let line = state.line {
                Text(line)
                    .font(.system(big, design: .rounded).weight(.bold))
                    .foregroundStyle(ink)
                    .lineLimit(3)
                    .minimumScaleFactor(0.75)
                if let next = state.next {
                    Text(next)
                        .font(.system(.subheadline, design: .rounded))
                        .foregroundStyle(ink.opacity(0.45))
                        .lineLimit(1)
                }
            } else {
                Text(state.next.map { "♪ \($0)" } ?? "♪")
                    .font(.system(.headline, design: .rounded))
                    .foregroundStyle(ink.opacity(0.5))
                    .lineLimit(2)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Pieces

/// A record, drawn here, with the album cover as its label — the Jukebox's
/// own picture of a song, as on Now Playing and the lock screen.
///
/// ⚠️ THE COVER IS AT MOST 48 PX (see `ContentState.cover`), which is why it
/// is only ever the LABEL: about a third of the disc, where 48 px is sharp at
/// every size this is drawn. Without one the label takes the sleeve's colour.
private struct Record: View {
    let state: JukeboxActivityAttributes.ContentState
    let size: CGFloat

    var body: some View {
        let label = size * 0.42
        ZStack {
            Circle()
                .fill(RadialGradient(colors: [Color(white: 0.16), Color(white: 0.04)],
                                     center: .center, startRadius: label / 2, endRadius: size / 2))
            // Grooves — a few faint rings are enough to read as vinyl at 22 pt.
            ForEach(0..<(size > 40 ? 4 : 2), id: \.self) { ring in
                Circle()
                    .stroke(Color.white.opacity(0.09), lineWidth: 0.5)
                    .frame(width: label + (size - label) * CGFloat(ring + 1) / CGFloat(size > 40 ? 5 : 3))
            }
            // The sheen that makes a flat disc look like one.
            Circle()
                .fill(AngularGradient(colors: [.clear, Color.white.opacity(0.10), .clear, .clear,
                                               Color.white.opacity(0.07), .clear, .clear],
                                      center: .center))
            Group {
                if let data = state.cover, let image = UIImage(data: data) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                } else {
                    Palette(state, dark: true).accent
                }
            }
            .frame(width: label, height: label)
            .clipShape(Circle())
            Circle()
                .fill(Color.black)
                .frame(width: max(2, size * 0.045), height: max(2, size * 0.045))
        }
        .frame(width: size, height: size)
    }
}

/// Previous, play/pause and next — iOS 17's intents; before that the activity
/// is a picture only and a tap opens the app.
private struct Controls: View {
    let state: JukeboxActivityAttributes.ContentState
    let tint: Color
    let size: CGFloat

    var body: some View {
        if #available(iOS 17.0, *) {
            HStack(spacing: size * 0.7) {
                Button(intent: JukeboxCommandIntent(action: "toggle")) {
                    Image(systemName: state.playing ? "pause.fill" : "play.fill")
                        .font(.system(size: size, weight: .semibold))
                        .frame(width: size * 1.4, height: size * 1.4)
                }
                Button(intent: JukeboxCommandIntent(action: "nexttrack")) {
                    Image(systemName: "forward.fill")
                        .font(.system(size: size * 0.85, weight: .semibold))
                        .frame(width: size * 1.4, height: size * 1.4)
                }
            }
            .buttonStyle(.plain)
            .foregroundStyle(tint)
        }
    }
}

/// The bar and the two clocks. While playing they are TIMER views, which the
/// system moves itself — no update from the app for a second of it.
private struct Progress: View {
    let state: JukeboxActivityAttributes.ContentState
    let tint: Color
    let ink: Color

    var body: some View {
        let end = state.startedAt.addingTimeInterval(max(state.duration, 1))
        VStack(spacing: 3) {
            if state.playing, state.duration > 0 {
                ProgressView(timerInterval: state.startedAt...end, countsDown: false) {
                    EmptyView()
                } currentValueLabel: {
                    EmptyView()
                }
                .tint(tint)
            } else {
                ProgressView(value: min(state.elapsed, max(state.duration, 0.01)), total: max(state.duration, 0.01))
                    .tint(tint)
            }
            // ⚠️ EACH CLOCK PINNED TO ITS OWN EDGE. A timer `Text` takes all the
            // width it is offered, so a `Spacer` between two of them does
            // nothing and the second clock landed mid-bar, without its minus
            // (James's screenshot, 2026-09-29: "1:02 … 2:09").
            HStack(spacing: 0) {
                if state.playing, state.duration > 0 {
                    Text(timerInterval: state.startedAt...end, countsDown: false)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    (Text("−") + Text(timerInterval: state.startedAt...end, countsDown: true))
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                } else {
                    Text(Self.clock(state.elapsed))
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Text(state.duration > 0 ? "−" + Self.clock(max(0, state.duration - state.elapsed)) : "")
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
            }
            .font(.caption2.monospacedDigit())
            .foregroundStyle(ink.opacity(0.6))
        }
    }

    static func clock(_ seconds: Double) -> String {
        let s = max(0, Int(seconds.rounded(.down)))
        return String(format: "%d:%02d", s / 60, s % 60)
    }
}

/// The activity's colours, from the lock-screen picture's own ground
/// (`lockArt.ts`: white fading to a faint tint of the album's hue).
///
/// ⚠️ DARK MODE GETS A DARK CARD. The ground is near-white on purpose for the
/// lock screen's picture, and a white slab glaring out of a phone at night is
/// exactly wrong for somebody listening in bed — so in dark mode the same hue
/// is used deep and dim instead, and the Dynamic Island (always black) takes
/// only the accent.
private struct Palette {
    let top: Color
    let ground: Color
    let ink: Color
    let accent: Color

    init(_ state: JukeboxActivityAttributes.ContentState, dark: Bool = false) {
        let tint = UIColor(hex: state.bottom) ?? UIColor(white: 0.9, alpha: 1)
        var hue: CGFloat = 0, sat: CGFloat = 0, bri: CGFloat = 0, alpha: CGFloat = 0
        tint.getHue(&hue, saturation: &sat, brightness: &bri, alpha: &alpha)
        // A grey sleeve has no hue worth drawing out; keep it grey.
        let grey = sat < 0.04
        if dark {
            top = Color(hue: hue, saturation: grey ? 0 : 0.35, brightness: 0.16)
            ground = Color(hue: hue, saturation: grey ? 0 : 0.45, brightness: 0.09)
            ink = .white
            accent = grey ? Color(white: 0.85) : Color(hue: hue, saturation: 0.45, brightness: 1)
        } else {
            top = Color(UIColor(hex: state.top) ?? .white)
            ground = Color(tint)
            ink = Color(red: 0.06, green: 0.09, blue: 0.16)
            accent = grey ? Color(white: 0.3) : Color(hue: hue, saturation: 0.75, brightness: 0.55)
        }
    }
}

private extension UIColor {
    convenience init?(hex: String) {
        var text = hex.trimmingCharacters(in: .whitespaces)
        if text.hasPrefix("#") { text.removeFirst() }
        guard text.count == 6, let value = UInt32(text, radix: 16) else { return nil }
        self.init(red: CGFloat((value >> 16) & 0xff) / 255,
                  green: CGFloat((value >> 8) & 0xff) / 255,
                  blue: CGFloat(value & 0xff) / 255,
                  alpha: 1)
    }
}
