import SwiftUI

/// Universal Jukebox on the Apple Watch: a remote for the iPhone (James,
/// 2026-11-21). It holds no music and plays none: it shows what the phone is
/// playing, moves it on, and starts the phone's albums, artists and shelves.
/// The phone does every bit of the playing — see `Shared/WatchProtocol.swift`
/// for how the two talk, and `App/WatchBridge.swift` for the phone's end.
@main
struct JukeboxWatchApp: App {
    @StateObject private var link = PhoneLink.shared
    @Environment(\.scenePhase) private var phase

    var body: some Scene {
        WindowGroup {
            HomeView()
                .environmentObject(link)
                .tint(.jukeboxAccent)
                .onAppear { link.start() }
        }
        .onChange(of: phase) { _, now in link.onScreen(now == .active) }
    }
}

extension Color {
    /// The phone app's record-label red, in its dark-mode shade (`native.css`):
    /// the watch is always on black.
    static let jukeboxAccent = Color(red: 0xE5 / 255, green: 0x73 / 255, blue: 0x5F / 255)
}
