import SwiftUI

/// A row that plays on the phone when tapped, and shuffles when swiped.
private struct PlayRow<Label: View>: View {
    @EnvironmentObject private var link: PhoneLink
    @Environment(\.showNowPlaying) private var showNowPlaying
    let kind: WatchPick.Kind
    let id: String
    let name: String
    @ViewBuilder let label: () -> Label

    var body: some View {
        Button {
            link.play(WatchPick(kind, id), then: showNowPlaying)
        } label: {
            label()
        }
        .swipeActions(edge: .trailing) {
            Button {
                link.play(WatchPick(kind, id, shuffle: true), then: showNowPlaying)
            } label: {
                SwiftUI.Label("Shuffle", systemImage: "shuffle")
            }
            .tint(.jukeboxAccent)
        }
        .accessibilityLabel(Text(name))
        .accessibilityHint(Text("Plays on your iPhone. Swipe left to shuffle."))
        .accessibilityAction(named: Text("Shuffle")) {
            link.play(WatchPick(kind, id, shuffle: true), then: showNowPlaying)
        }
    }
}

/// The phone's shortcut shuffles, at the top of a list.
private struct ShuffleAllRow: View {
    @EnvironmentObject private var link: PhoneLink
    @Environment(\.showNowPlaying) private var showNowPlaying
    let title: LocalizedStringKey
    let shortcut: String

    var body: some View {
        Button {
            link.play(WatchPick(.shortcut, shortcut), then: showNowPlaying)
        } label: {
            Label(title, systemImage: "shuffle").foregroundStyle(Color.jukeboxAccent)
        }
        .accessibilityHint(Text("Plays on your iPhone"))
    }
}

struct AlbumsView: View {
    @EnvironmentObject private var link: PhoneLink

    var body: some View {
        List {
            ShuffleAllRow(title: "Shuffle albums", shortcut: "shuffle-albums")
            ForEach(link.library?.albums ?? []) { album in
                PlayRow(kind: .album, id: album.id, name: "\(Names.album(album.title)), \(Names.artist(album.artist))") {
                    HStack(spacing: 8) {
                        Cover(image: link.thumb(album.id), hue: album.hue, side: 36)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(Names.album(album.title)).font(.footnote.weight(.semibold)).lineLimit(2)
                            Text(Names.artist(album.artist)).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                        }
                    }
                }
            }
        }
        .navigationTitle("Albums")
    }
}

struct ArtistsView: View {
    @EnvironmentObject private var link: PhoneLink

    var body: some View {
        List {
            ShuffleAllRow(title: "Shuffle artists", shortcut: "shuffle-artists")
            ForEach(link.library?.artists ?? []) { artist in
                PlayRow(kind: .artist, id: artist.id, name: Names.artist(artist.id)) {
                    HStack(spacing: 8) {
                        let cover = artist.albumIds.last
                        Cover(image: link.thumb(cover), hue: cover.flatMap { link.album($0)?.hue }, side: 36)
                            .clipShape(Circle())
                        VStack(alignment: .leading, spacing: 1) {
                            Text(Names.artist(artist.id)).font(.footnote.weight(.semibold)).lineLimit(2)
                            HStack(spacing: 6) {
                                Label("\(artist.albumIds.count)", systemImage: "square.stack")
                                Label("\(artist.count)", systemImage: "music.note")
                            }
                            .labelStyle(.titleAndIcon)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .accessibilityHidden(true)
                        }
                    }
                }
            }
        }
        .navigationTitle("Artists")
    }
}

struct ShelvesView: View {
    @EnvironmentObject private var link: PhoneLink

    var body: some View {
        List {
            let shelves = link.library?.shelves ?? []
            if shelves.isEmpty {
                Text("Put songs on a shelf on your iPhone and they’ll be here.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .listRowBackground(Color.clear)
            }
            ForEach(shelves) { shelf in
                PlayRow(kind: .shelf, id: shelf.id, name: shelf.name) {
                    HStack(spacing: 8) {
                        ZStack(alignment: .bottomTrailing) {
                            Cover(image: link.thumb(shelf.art), hue: shelf.art.flatMap { link.album($0)?.hue }, side: 36)
                            Image(systemName: Self.icon(shelf.kind))
                                .font(.system(size: 10, weight: .bold))
                                .padding(3)
                                .background(Circle().fill(Color.jukeboxAccent))
                                .offset(x: 4, y: 4)
                        }
                        VStack(alignment: .leading, spacing: 1) {
                            Text(shelf.name).font(.footnote.weight(.semibold)).lineLimit(2)
                            Label("\(shelf.trackIds.count)", systemImage: "music.note")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                                .accessibilityHidden(true)
                        }
                    }
                }
            }
        }
        .navigationTitle("Shelves")
    }

    static func icon(_ kind: String) -> String {
        switch kind {
        case "hits": return "chart.line.uptrend.xyaxis"
        case "most": return "flame.fill"
        case "loved": return "heart.fill"
        default: return "music.note.list"
        }
    }
}
