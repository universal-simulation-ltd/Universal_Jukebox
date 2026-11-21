import SwiftUI

enum Route: Hashable {
    case nowPlaying, albums, artists, shelves
}

private struct ShowNowPlayingKey: EnvironmentKey {
    static let defaultValue: () -> Void = {}
}

extension EnvironmentValues {
    /// Go to Now playing — after something has started on the phone.
    var showNowPlaying: () -> Void {
        get { self[ShowNowPlayingKey.self] }
        set { self[ShowNowPlayingKey.self] = newValue }
    }
}

/// The first screen: what is playing, then the phone's own sections in the
/// phone's tab order (Artists · Albums · Songs · Shelves, or however they were
/// dragged on the phone).
struct HomeView: View {
    @EnvironmentObject private var link: PhoneLink
    @State private var path: [Route] = DebugRun.initialPath

    var body: some View {
        NavigationStack(path: $path) {
            List {
                Button { path.append(.nowPlaying) } label: { NowPlayingRow() }
                if let library = link.library, library.songs > 0 {
                    ForEach(library.sections, id: \.self) { section in
                        row(for: section, library)
                    }
                } else {
                    Text("Open Jukebox on your iPhone to see your music here.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .listRowBackground(Color.clear)
                }
            }
            .navigationTitle("Jukebox")
            .navigationDestination(for: Route.self) { route in
                switch route {
                case .nowPlaying: NowPlayingView()
                case .albums: AlbumsView()
                case .artists: ArtistsView()
                case .shelves: ShelvesView()
                }
            }
        }
        .overlay(alignment: .bottom) { NoticeView() }
        .environment(\.showNowPlaying, { path = [.nowPlaying] })
    }

    @ViewBuilder
    private func row(for section: String, _ library: WatchLibrary) -> some View {
        switch section {
        case "albums":
            NavigationLink(value: Route.albums) {
                SectionLabel(title: "Albums", icon: "square.stack", count: library.albums.count)
            }
        case "artists":
            NavigationLink(value: Route.artists) {
                SectionLabel(title: "Artists", icon: "music.mic", count: library.artists.count)
            }
        case "shelves":
            NavigationLink(value: Route.shelves) {
                SectionLabel(title: "Shelves", icon: "books.vertical", count: library.shelves.count)
            }
        case "songs":
            Button {
                link.play(WatchPick(.shortcut, "shuffle-songs")) { path = [.nowPlaying] }
            } label: {
                SectionLabel(title: "Shuffle songs", icon: "shuffle", count: library.songs)
            }
            .accessibilityHint(Text("Plays on your iPhone"))
        default:
            EmptyView()
        }
    }
}

struct SectionLabel: View {
    let title: LocalizedStringKey
    let icon: String
    let count: Int

    var body: some View {
        HStack {
            Label(title, systemImage: icon)
            Spacer(minLength: 4)
            Text(count, format: .number)
                .font(.footnote.monospacedDigit())
                .foregroundStyle(.secondary)
                .accessibilityHidden(true)
        }
    }
}

/// The top row of the first screen: the song on the phone, or that there is none.
struct NowPlayingRow: View {
    @EnvironmentObject private var link: PhoneLink

    var body: some View {
        let np = link.nowPlaying
        HStack(spacing: 8) {
            Cover(image: link.thumb(np.albumId) ?? link.art, hue: link.album(np.albumId)?.hue, side: 34)
            VStack(alignment: .leading, spacing: 1) {
                Text(np.has ? "Now playing" : "Nothing playing")
                    .font(.caption2)
                    .textCase(.uppercase)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .foregroundStyle(Color.jukeboxAccent)
                if np.has {
                    Text(np.title).font(.footnote.weight(.semibold)).lineLimit(1)
                    Text(Names.artist(np.artist)).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                }
            }
            Spacer(minLength: 0)
            if np.has {
                Image(systemName: np.playing ? "waveform" : "pause.fill")
                    .foregroundStyle(.secondary)
                    .symbolEffect(.variableColor.iterative, isActive: np.playing)
                    .accessibilityHidden(true)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

/// An album's cover from the phone, or a coloured tile like the phone's own
/// fallback (`fallbackHue`) when it has none.
struct Cover: View {
    let image: UIImage?
    let hue: Int?
    let side: CGFloat

    var body: some View {
        Group {
            if let image = image {
                Image(uiImage: image).resizable().scaledToFill()
            } else {
                ZStack {
                    Color(hue: Double(hue ?? 8) / 360, saturation: 0.45, brightness: 0.45)
                    Image(systemName: "music.note").font(.system(size: side * 0.4)).foregroundStyle(.white.opacity(0.85))
                }
            }
        }
        .frame(width: side, height: side)
        .clipShape(RoundedRectangle(cornerRadius: side * 0.14, style: .continuous))
        .accessibilityHidden(true)
    }
}

/// "Unknown artist" / "Unknown album" are the phone's English placeholders for
/// untagged files (`shownName` in `src/lib/format.ts`); shown in the watch's language.
enum Names {
    static func artist(_ name: String) -> String {
        name == "Unknown artist" ? String(localized: "Unknown artist") : name
    }

    static func album(_ name: String) -> String {
        name == "Unknown album" ? String(localized: "Unknown album") : name
    }
}

/// A word about the last request that did not work, for a few seconds.
struct NoticeView: View {
    @EnvironmentObject private var link: PhoneLink

    var body: some View {
        if let notice = link.notice {
            Text(notice.text)
                .font(.footnote)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(.thickMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .padding(.horizontal, 6)
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .accessibilityAddTraits(.isStaticText)
                .onTapGesture { link.notice = nil }
        }
    }
}
