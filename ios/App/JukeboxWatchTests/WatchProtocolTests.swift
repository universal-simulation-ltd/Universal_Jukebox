import XCTest

/// The Apple Watch remote's protocol (`Shared/WatchProtocol.swift`): the
/// library the page writes, decoded as the phone and the watch decode it, and
/// the phone's turning of a watch's pick into what the page / planner plays.
/// `library.json` is the fixture `src/lib/watchLibrary.test.ts` holds the
/// page's own output to, so a field renamed on either side fails a suite.
final class WatchProtocolTests: XCTestCase {
    private func fixture() throws -> WatchLibrary {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "library", withExtension: "json"))
        return try JSONDecoder().decode(WatchLibrary.self, from: Data(contentsOf: url))
    }

    func testDecodesThePagesLibrary() throws {
        let library = try fixture()
        XCTAssertEqual(library.v, 1)
        XCTAssertEqual(library.sections, ["albums", "artists", "songs", "shelves"])
        XCTAssertEqual(library.albums.map(\.title), ["The Long Player", "Quiet Rooms", "Sides A and B"])
        XCTAssertEqual(library.albums.first?.count, 2)
        XCTAssertEqual(library.artists.last?.albumIds, ["a-sides", "a-long"])
        XCTAssertEqual(library.shelves.map(\.kind), ["most", "shelf"])
        XCTAssertEqual(library.shelves.last?.art, "a-long")
        XCTAssertEqual(library.songs, 5)
        XCTAssertFalse(library.example)
    }

    func testPackageRoundTrips() throws {
        let package = WatchPackage(library: try fixture(), thumbs: ["a-sides": "AAAA"])
        let back = try JSONDecoder().decode(WatchPackage.self, from: JSONEncoder().encode(package))
        XCTAssertEqual(back.library, package.library)
        XCTAssertEqual(back.thumbs, ["a-sides": "AAAA"])
    }

    func testPickRoundTripsAsAMessage() {
        let pick = WatchPick(.shelf, "s2", shuffle: true)
        XCTAssertEqual(WatchPick(message: pick.message), pick)
        XCTAssertNil(WatchPick(message: [WatchMessage.type: WatchMessage.transport, WatchMessage.action: "toggle"]))
        XCTAssertNil(WatchPick(message: [WatchMessage.type: WatchMessage.play, WatchMessage.kind: "playlist", WatchMessage.id: "x"]))
    }

    func testResolvesPicksIntoWhatThePagePlays() throws {
        let library = try fixture()
        let album = try XCTUnwrap(WatchRequest.resolve(WatchPick(.album, "a-quiet"), in: library))
        XCTAssertEqual(album.action, "collection")
        XCTAssertEqual(album.request?["albums"] as? [String], ["a-quiet"])
        XCTAssertEqual(album.request?["shuffle"] as? Bool, false)

        let artist = try XCTUnwrap(WatchRequest.resolve(WatchPick(.artist, "The Tone Arms", shuffle: true), in: library))
        XCTAssertEqual(artist.request?["albums"] as? [String], ["a-sides", "a-long"])
        XCTAssertEqual(artist.request?["shuffle"] as? Bool, true)

        let shelf = try XCTUnwrap(WatchRequest.resolve(WatchPick(.shelf, "most"), in: library))
        XCTAssertEqual(shelf.request?["tracks"] as? [String], ["t3", "t1"])

        let shortcut = try XCTUnwrap(WatchRequest.resolve(WatchPick(.shortcut, "shuffle-albums"), in: library))
        XCTAssertEqual(shortcut.action, "shuffle-albums")
        XCTAssertNil(shortcut.request)
    }

    func testRefusesWhatTheLibraryNoLongerHas() throws {
        let library = try fixture()
        XCTAssertNil(WatchRequest.resolve(WatchPick(.artist, "Nobody"), in: library))
        XCTAssertNil(WatchRequest.resolve(WatchPick(.shelf, "gone"), in: library))
        XCTAssertNil(WatchRequest.resolve(WatchPick(.shelf, "most"), in: nil))
        XCTAssertNil(WatchRequest.resolve(WatchPick(.shortcut, "delete-everything"), in: library))
    }

    func testNowPlayingMovesOnWhilePlayingAndStopsAtTheEnd() {
        let start = Date(timeIntervalSince1970: 1_000)
        var np = WatchNowPlaying(has: true, title: "Run-out", artist: "The Tone Arms", album: "Run-out", albumId: "a",
                                 playing: true, elapsed: 10, duration: 30, at: 1_000)
        XCTAssertEqual(np.position(at: start.addingTimeInterval(5)), 15, accuracy: 0.001)
        XCTAssertEqual(np.position(at: start.addingTimeInterval(500)), 30, accuracy: 0.001)
        np.playing = false
        XCTAssertEqual(np.position(at: start.addingTimeInterval(5)), 10, accuracy: 0.001)
    }

    func testNowPlayingIsResentOnlyOnARealChange() {
        let now = Date(timeIntervalSince1970: 2_000)
        let a = WatchNowPlaying(has: true, title: "T", artist: "A", album: "L", albumId: "x",
                                playing: true, elapsed: 10, duration: 200, at: 2_000)
        var b = a
        b.elapsed = 10.5
        b.at = 2_000.4
        XCTAssertTrue(a.sameAs(b, now: now))
        b.playing = false
        XCTAssertFalse(a.sameAs(b, now: now))
        var c = a
        c.elapsed = 40
        XCTAssertFalse(a.sameAs(c, now: now))
        XCTAssertEqual(WatchNowPlaying(data: a.data), a)
        XCTAssertNil(WatchNowPlaying(data: Data("nope".utf8)))
    }

    func testTrimsAPackageToFitAReplyKeepingTheWholeLibrary() throws {
        let library = try fixture()
        let big = String(repeating: "A", count: 3_000)
        let package = WatchPackage(library: library, thumbs: ["a-long": big, "a-quiet": big, "a-sides": big])
        let bare = try JSONEncoder().encode(WatchPackage(library: library, thumbs: [:])).count
        let cut = try XCTUnwrap(package.trimmed(to: bare + 6_200))
        let back = try JSONDecoder().decode(WatchPackage.self, from: cut)
        XCTAssertEqual(back.library, library)
        XCTAssertEqual(Set(back.thumbs.keys), ["a-long", "a-quiet"])
        XCTAssertNil(package.trimmed(to: bare - 1))
    }
}
