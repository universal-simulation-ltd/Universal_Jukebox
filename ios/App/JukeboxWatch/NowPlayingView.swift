import SwiftUI
import WatchKit

/// What the phone is playing, with its buttons. The Digital Crown turns the
/// iPhone's own volume (`PhoneVolume`), as Apple's Now Playing does.
///
/// ⚠️ THE PHONE'S VOLUME, NOT THE APP'S. The engine's own level is audible
/// (AVPlayer, unlike WebKit's `<audio>`), but the iPhone app shows no volume
/// slider, so a level turned down from the wrist would be a quiet the phone
/// could not explain. The system volume is the one every other control —
/// the buttons, Control Centre — already shows.
struct NowPlayingView: View {
    @EnvironmentObject private var link: PhoneLink

    var body: some View {
        let np = link.nowPlaying
        VStack(spacing: 6) {
            HStack(spacing: 8) {
                Cover(image: link.thumb(np.albumId) ?? link.art, hue: link.album(np.albumId)?.hue, side: 52)
                VStack(alignment: .leading, spacing: 1) {
                    Text(np.has ? np.title : String(localized: "Nothing playing"))
                        .font(.headline)
                        .lineLimit(2)
                        .minimumScaleFactor(0.8)
                    if np.has {
                        Text(Names.artist(np.artist)).font(.footnote).foregroundStyle(.secondary).lineLimit(1)
                        if !np.album.isEmpty {
                            Text(Names.album(np.album)).font(.caption2).foregroundStyle(.tertiary).lineLimit(1)
                        }
                    }
                }
                Spacer(minLength: 0)
            }
            .accessibilityElement(children: .combine)

            Progress(np: np)

            HStack {
                Button { link.transport("previoustrack") } label: {
                    Image(systemName: "backward.fill").font(.title3)
                }
                .accessibilityLabel(Text("Previous"))
                .disabled(!np.has)

                Button { link.playPause() } label: {
                    Image(systemName: np.has && np.playing ? "pause.fill" : "play.fill")
                        .font(.title2)
                        .frame(width: 52, height: 52)
                        .background(Circle().fill(Color.jukeboxAccent.opacity(0.9)))
                }
                .buttonStyle(.plain)
                .accessibilityLabel(np.has && np.playing ? Text("Pause") : Text("Play"))

                Button { link.transport("nexttrack") } label: {
                    Image(systemName: "forward.fill").font(.title3)
                }
                .accessibilityLabel(Text("Next"))
                .disabled(!np.has)
            }
            .buttonStyle(.borderless)
            .frame(maxWidth: .infinity)
        }
        .padding(.horizontal, 4)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                PhoneVolume().frame(width: 30, height: 30)
            }
        }
        .containerBackground(Color.jukeboxAccent.gradient.opacity(0.45), for: .navigation)
        .overlay(alignment: .bottom) { NoticeView() }
    }
}

/// How far into the song — moving by itself while it plays.
private struct Progress: View {
    let np: WatchNowPlaying

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let at = np.position(at: context.date)
            VStack(spacing: 1) {
                ProgressView(value: np.duration > 0 ? min(1, at / np.duration) : 0)
                    .tint(.white)
                HStack {
                    Text(Self.clock(at))
                    Spacer()
                    Text(np.duration > 0 ? "-" + Self.clock(max(0, np.duration - at)) : "")
                }
                .font(.system(size: 11).monospacedDigit())
                .foregroundStyle(.secondary)
            }
            .opacity(np.has ? 1 : 0)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(Text("\(Self.clock(at)) of \(Self.clock(np.duration))"))
        }
    }

    static func clock(_ seconds: Double) -> String {
        let s = Int(seconds.rounded(.down))
        return String(format: "%d:%02d", s / 60, s % 60)
    }
}

/// The iPhone's volume on the Digital Crown — WatchKit's companion volume
/// control, the one Apple's own Now Playing uses.
struct PhoneVolume: WKInterfaceObjectRepresentable {
    func makeWKInterfaceObject(context: Context) -> WKInterfaceVolumeControl {
        let control = WKInterfaceVolumeControl(origin: .companion)
        control.setTintColor(UIColor(red: 0xE5 / 255, green: 0x73 / 255, blue: 0x5F / 255, alpha: 1))
        return control
    }

    func updateWKInterfaceObject(_ control: WKInterfaceVolumeControl, context: Context) {
        DispatchQueue.main.async { control.focus() }
    }
}
