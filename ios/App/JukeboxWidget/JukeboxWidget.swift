import WidgetKit
import SwiftUI
import Security

// "Resume listening" on the Home Screen and the Lock Screen: the last song
// Jukebox played, on the record and machine that played it, and one tap to
// carry on from the same second.
//
// The app writes what to show (`ios/App/App/WidgetShare.swift`, from
// `NowPlayingPlugin.show`) into a shared keychain item; this only reads it. A tap opens
// `unisim-jukebox://widget/resume`, which `SceneDelegate` hands to the page as
// the Siri "play" action (`src/lib/shortcuts.ts` → `playMusic`): carry on with
// what is loaded, else the saved session — the same thing the in-app
// "Resume listening" card does.
//
// ⚠️ NO NETWORK, NO LIBRARY ACCESS. Everything here comes from that item;
// the widget never reads the music folder or asks anything of anyone.

private enum ResumeStore {
    // ⚠️ Shared with `WidgetShare.swift` in the app (a keychain item, not an
    // App Group — see the note there). Change one, change both.
    static let accessGroup = "ZH9C5TS86A.uk.co.unisim.jukebox.widget"
    static let service = "uk.co.unisim.jukebox.widget"
    static let account = "resume"

    static func load() -> ResumeEntry {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecAttrAccessGroup as String: accessGroup,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data,
              let saved = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              let title = saved["title"] as? String, !title.isEmpty else {
            return ResumeEntry(date: Date(), song: nil)
        }
        let sleeve = (saved["sleeve"] as? String)
            .flatMap { Data(base64Encoded: $0) }
            .flatMap { UIImage(data: $0) }
        return ResumeEntry(date: Date(), song: Song(
            title: title,
            artist: saved["artist"] as? String ?? "",
            album: saved["album"] as? String ?? "",
            sleeve: sleeve))
    }
}

struct Song {
    let title: String
    let artist: String
    let album: String
    let sleeve: UIImage?
}

struct ResumeEntry: TimelineEntry {
    let date: Date
    /// nil until the app has played something.
    let song: Song?

    var link: URL {
        URL(string: song == nil ? "unisim-jukebox://widget/open" : "unisim-jukebox://widget/resume")!
    }
}

struct ResumeProvider: TimelineProvider {
    /// The gallery and a first draw: a song from the app's own made-up example
    /// library (`src/lib/exampleLibrary.ts`), never a real artist's.
    private var sample: ResumeEntry {
        ResumeEntry(date: Date(), song: Song(title: "Counterweight", artist: "The Tone Arms", album: "Sides A and B", sleeve: nil))
    }

    func placeholder(in context: Context) -> ResumeEntry { sample }

    func getSnapshot(in context: Context, completion: @escaping (ResumeEntry) -> Void) {
        let entry = ResumeStore.load()
        completion(context.isPreview && entry.song == nil ? sample : entry)
    }

    /// Changes only when the app says so (`reloadAllTimelines` on a new song).
    func getTimeline(in context: Context, completion: @escaping (Timeline<ResumeEntry>) -> Void) {
        completion(Timeline(entries: [ResumeStore.load()], policy: .never))
    }
}

// MARK: - Look

/// Jukebox's own colours: Tailwind orange-400 / orange-700 on slate.
private enum Palette {
    static let orange = Color(red: 0xfb / 255, green: 0x92 / 255, blue: 0x3c / 255)
    static let orangeDeep = Color(red: 0xc2 / 255, green: 0x41 / 255, blue: 0x0c / 255)

    static func ground(_ scheme: ColorScheme) -> LinearGradient {
        let colours: [Color] = scheme == .dark
            ? [Color(red: 0x1e / 255, green: 0x29 / 255, blue: 0x3b / 255), Color(red: 0x02 / 255, green: 0x06 / 255, blue: 0x17 / 255)]
            : [Color(red: 0xff / 255, green: 0xf7 / 255, blue: 0xed / 255), Color(red: 0xfe / 255, green: 0xd7 / 255, blue: 0xaa / 255)]
        return LinearGradient(colors: colours, startPoint: .top, endPoint: .bottom)
    }

    static func accent(_ scheme: ColorScheme) -> Color { scheme == .dark ? orange : orangeDeep }
}

/// The record on its machine, or a disc drawn here before the app has made one.
private struct Sleeve: View {
    let image: UIImage?

    var body: some View {
        if let image = image {
            Image(uiImage: image)
                .resizable()
                .aspectRatio(contentMode: .fill)
        } else {
            ZStack {
                Circle().fill(Color.black)
                Circle().stroke(Color.white.opacity(0.08), lineWidth: 1).padding(6)
                Circle().stroke(Color.white.opacity(0.08), lineWidth: 1).padding(14)
                Circle().fill(Palette.orange).frame(width: 22, height: 22)
                Circle().fill(Color.black).frame(width: 4, height: 4)
            }
            .padding(10)
        }
    }
}

private struct ResumeLabel: View {
    let scheme: ColorScheme

    var body: some View {
        Label {
            Text("Resume listening").textCase(.uppercase)
        } icon: {
            Image(systemName: "play.fill")
        }
        .font(.caption2.weight(.bold))
        .foregroundColor(Palette.accent(scheme))
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .widgetAccentable()
    }
}

private struct EmptyMessage: View {
    var body: some View {
        Text("Play something and it waits here.")
            .font(.footnote)
            .foregroundColor(.secondary)
    }
}

struct SmallView: View {
    let entry: ResumeEntry
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Sleeve(image: entry.song?.sleeve)
                .frame(width: 64, height: 64)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            Spacer(minLength: 0)
            ResumeLabel(scheme: scheme)
            if let song = entry.song {
                Text(song.title).font(.subheadline.weight(.semibold)).lineLimit(2)
                if !song.artist.isEmpty {
                    Text(song.artist).font(.caption).foregroundColor(.secondary).lineLimit(1)
                }
            } else {
                EmptyMessage()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

struct MediumView: View {
    let entry: ResumeEntry
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        HStack(spacing: 14) {
            Sleeve(image: entry.song?.sleeve)
                .aspectRatio(1, contentMode: .fit)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            VStack(alignment: .leading, spacing: 4) {
                ResumeLabel(scheme: scheme)
                if let song = entry.song {
                    Text(song.title).font(.headline).lineLimit(2)
                    if !song.artist.isEmpty {
                        Text(song.artist).font(.subheadline).foregroundColor(.secondary).lineLimit(1)
                    }
                    if !song.album.isEmpty {
                        Text(song.album).font(.caption).foregroundColor(.secondary).lineLimit(1)
                    }
                } else {
                    Text(verbatim: "Universal Jukebox").font(.headline)
                    EmptyMessage()
                }
                Spacer(minLength: 0)
                Image(systemName: "play.circle.fill")
                    .font(.title)
                    .foregroundColor(Palette.accent(scheme))
                    .widgetAccentable()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

/// Lock Screen, beside the clock: what to resume, in two lines.
struct RectangularView: View {
    let entry: ResumeEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Label {
                Text("Resume listening")
            } icon: {
                Image(systemName: "play.fill")
            }
            .font(.caption2.weight(.bold))
            .widgetAccentable()
            if let song = entry.song {
                Text(song.title).font(.headline).lineLimit(1)
                if !song.artist.isEmpty { Text(song.artist).font(.caption).lineLimit(1) }
            } else {
                Text(verbatim: "Universal Jukebox").font(.headline).lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Lock Screen, a round button: a record with ▶ on its label.
struct CircularView: View {
    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            Circle().stroke(lineWidth: 1).opacity(0.35).padding(7)
            Image(systemName: "play.fill").font(.title3.weight(.bold)).widgetAccentable()
        }
    }
}

/// Lock Screen, the line above the clock.
struct InlineView: View {
    let entry: ResumeEntry

    var body: some View {
        Label {
            if let song = entry.song { Text(song.title) } else { Text("Resume listening") }
        } icon: {
            Image(systemName: "play.fill")
        }
    }
}

struct ResumeWidgetView: View {
    let entry: ResumeEntry
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        content
            .widgetURL(entry.link)
            .containerBackground(for: .widget) {
                switch family {
                case .systemSmall, .systemMedium: Palette.ground(scheme)
                default: Color.clear
                }
            }
    }

    @ViewBuilder private var content: some View {
        switch family {
        case .systemMedium: MediumView(entry: entry)
        case .accessoryRectangular: RectangularView(entry: entry)
        case .accessoryCircular: CircularView()
        case .accessoryInline: InlineView(entry: entry)
        default: SmallView(entry: entry)
        }
    }
}

struct ResumeWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "uk.co.unisim.jukebox.resume", provider: ResumeProvider()) { entry in
            ResumeWidgetView(entry: entry)
        }
        .configurationDisplayName("Resume listening")
        .description("The last song you played, ready to carry on from the same second.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular, .accessoryInline])
    }
}

@main
struct JukeboxWidgets: WidgetBundle {
    var body: some Widget {
        ResumeWidget()
    }
}
