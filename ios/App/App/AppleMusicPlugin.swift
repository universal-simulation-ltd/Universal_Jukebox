import Foundation
import UIKit
import MediaPlayer
import AVFoundation
import Capacitor

/// The iPhone's own music library — the songs synced to it from a Mac — as a
/// source for the Jukebox, the way Marvis and every other third-party player
/// reads it (James, 2026-09-10: "I always transfer my music from my Mac to
/// iPhone").
///
/// ⚠️ WHY THIS IS NOT JUST ANOTHER FOLDER. Synced songs live in the Music app's
/// library, not in Files: no folder picker and no `readdir` can see them. The
/// only door is `MediaPlayer` — `MPMediaLibrary` for permission, `MPMediaQuery`
/// for the songs — and it hands over METADATA, not files. So the library is
/// built from the tags iOS already holds (no file is read to index it), and
/// artwork comes from `MPMediaItemArtwork`.
///
/// ⚠️ AND PLAYBACK NEEDS A COPY. A song's `assetURL` is an `ipod-library://`
/// URL, which only AVFoundation can open — WKWebView's `<audio>` cannot. So
/// `prepare` exports the song once, on first play, into a size-capped cache in
/// Library/Caches, and the web player streams that file through Capacitor's
/// local server exactly like any other track, range reads included. The export
/// is a PASSTHROUGH remux wherever the container allows (no re-encode, a
/// fraction of a second); only a source that cannot be remuxed is re-encoded
/// to AAC, as a fallback.
///
/// ⚠️ WHAT CAN NEVER WORK, AND IS SAID RATHER THAN HIDDEN. An Apple Music
/// subscription download is DRM-protected (`hasProtectedAsset`), and a
/// cloud-only song has no local file (`isCloudItem`); iOS gives neither an
/// `assetURL`, to this app or any other third-party player. They are counted
/// and reported by `songs`, never silently dropped.
@objc(AppleMusicPlugin)
public class AppleMusicPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleMusicPlugin"
    public let jsName = "JukeboxAppleMusic"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "songs", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "artwork", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "prepare", returnType: CAPPluginReturnPromise)
    ]

    /// The cache's ceiling. Played songs are copies, and a whole library played
    /// through would otherwise duplicate itself onto the phone. Least recently
    /// played goes first; iOS may also purge Caches under storage pressure,
    /// which costs nothing but a re-export.
    private static let cacheLimit: Int64 = 2 * 1024 * 1024 * 1024

    /// Serialises the cache and the waiting list. A song asked for twice while
    /// its export runs — the player and the next-track prefetch — is exported ONCE.
    private let exportQueue = DispatchQueue(label: "uk.co.unisim.jukebox.appleMusic")
    private var waiting: [String: [CAPPluginCall]] = [:]

    // MARK: - Permission

    @objc func status(_ call: CAPPluginCall) {
        call.resolve(["status": Self.name(of: MPMediaLibrary.authorizationStatus())])
    }

    /// Shows the system prompt the first time; after that iOS answers from the
    /// stored choice without asking again (a refusal is changed in Settings).
    @objc func requestAccess(_ call: CAPPluginCall) {
        MPMediaLibrary.requestAuthorization { status in
            call.resolve(["status": Self.name(of: status)])
        }
    }

    private static func name(of status: MPMediaLibraryAuthorizationStatus) -> String {
        switch status {
        case .authorized: return "authorized"
        case .denied: return "denied"
        case .restricted: return "restricted"
        case .notDetermined: return "notDetermined"
        @unknown default: return "denied"
        }
    }

    // MARK: - The songs

    /// Every song this app can actually play, with its tags, plus how many were
    /// left out and why.
    @objc func songs(_ call: CAPPluginCall) {
        guard MPMediaLibrary.authorizationStatus() == .authorized else {
            call.reject("Universal Jukebox has not been allowed to read the Music library.", "NOT_AUTHORIZED")
            return
        }
        DispatchQueue.global(qos: .userInitiated).async {
            let items = MPMediaQuery.songs().items ?? []
            var songs: [[String: Any]] = []
            var cloudOnly = 0
            var protected = 0
            for item in items {
                if item.isCloudItem { cloudOnly += 1; continue }
                guard let url = item.assetURL, !item.hasProtectedAsset else { protected += 1; continue }
                var song: [String: Any] = [
                    // ⚠️ Strings, not numbers: a persistent ID is a UInt64 and
                    // JavaScript's numbers lose precision above 2^53.
                    "id": String(item.persistentID),
                    "albumId": String(item.albumPersistentID),
                    "title": item.title ?? "",
                    "duration": item.playbackDuration,
                    "ext": url.pathExtension.lowercased(),
                    // Stable across launches, and part of the track's key.
                    "added": Int64(item.dateAdded.timeIntervalSince1970 * 1000)
                ]
                if let v = item.artist, !v.isEmpty { song["artist"] = v }
                if let v = item.albumArtist, !v.isEmpty { song["albumArtist"] = v }
                if let v = item.albumTitle, !v.isEmpty { song["album"] = v }
                if let v = item.genre, !v.isEmpty { song["genre"] = v }
                if item.albumTrackNumber > 0 { song["trackNo"] = item.albumTrackNumber }
                if item.discNumber > 0 { song["discNo"] = item.discNumber }
                if let year = Self.year(of: item) { song["year"] = year }
                songs.append(song)
            }
            call.resolve([
                "songs": songs,
                "total": items.count,
                "cloudOnly": cloudOnly,
                "protected": protected
            ])
        }
    }

    /// `releaseDate` where iOS has one; a file synced from a Mac usually carries
    /// only the plain year, under a key the SDK does not name but does answer.
    private static func year(of item: MPMediaItem) -> Int? {
        if let date = item.releaseDate {
            let year = Calendar(identifier: .gregorian).component(.year, from: date)
            if year > 0 { return year }
        }
        if let n = item.value(forProperty: "year") as? NSNumber, n.intValue > 0 { return n.intValue }
        return nil
    }

    /// One album's cover as a JPEG, or `{}` when it has none.
    @objc func artwork(_ call: CAPPluginCall) {
        guard let idString = call.getString("albumId"), let id = UInt64(idString) else {
            call.reject("No album was named.", "NO_ALBUM")
            return
        }
        let side = CGFloat(call.getInt("size") ?? 512)
        DispatchQueue.global(qos: .utility).async {
            let query = MPMediaQuery.songs()
            query.addFilterPredicate(MPMediaPropertyPredicate(
                value: NSNumber(value: id), forProperty: MPMediaItemPropertyAlbumPersistentID))
            let artwork = query.items?.lazy.compactMap { $0.artwork }.first
            guard let image = artwork?.image(at: CGSize(width: side, height: side)),
                  let data = image.jpegData(compressionQuality: 0.85) else {
                call.resolve([:])
                return
            }
            call.resolve(["mime": "image/jpeg", "data": data.base64EncodedString()])
        }
    }

    // MARK: - Playback: export on first play

    /// A playable copy of one song: `{ uri, size }`, where `uri` is a `file://`
    /// URL `Capacitor.convertFileSrc` can serve with range reads.
    @objc func prepare(_ call: CAPPluginCall) {
        guard let key = call.getString("id"), let id = UInt64(key) else {
            call.reject("No song was named.", "NO_SONG")
            return
        }
        exportQueue.async {
            if self.waiting[key] != nil {
                self.waiting[key]?.append(call)
                return
            }
            if let hit = Self.cached(key) {
                Self.touch(hit)
                call.resolve(Self.answer(hit))
                return
            }
            self.waiting[key] = [call]
            self.export(id: id, key: key) { result in
                self.exportQueue.async {
                    let calls = self.waiting.removeValue(forKey: key) ?? []
                    for waiting in calls {
                        switch result {
                        case .success(let url): waiting.resolve(Self.answer(url))
                        case .failure(let error): waiting.reject(error.localizedDescription, "UNPLAYABLE", error)
                        }
                    }
                }
            }
        }
    }

    private func export(id: UInt64, key: String, done: @escaping (Result<URL, Error>) -> Void) {
        let query = MPMediaQuery.songs()
        query.addFilterPredicate(MPMediaPropertyPredicate(
            value: NSNumber(value: id), forProperty: MPMediaItemPropertyPersistentID))
        guard let item = query.items?.first, let source = item.assetURL, !item.hasProtectedAsset else {
            done(.failure(Self.failure(
                "That song is no longer in the Music library on this iPhone, or it is protected and cannot be played by other apps.")))
            return
        }
        let asset = AVURLAsset(url: source)
        let sourceExt = source.pathExtension.lowercased()
        attempt(asset: asset, preset: AVAssetExportPresetPassthrough, sourceExt: sourceExt, key: key) { first in
            if case .success = first { done(first); return }
            // Only a source no container here can take as-is gets re-encoded.
            self.attempt(asset: asset, preset: AVAssetExportPresetAppleM4A, sourceExt: "m4a", key: key, done: done)
        }
    }

    private func attempt(asset: AVURLAsset, preset: String, sourceExt: String, key: String,
                         done: @escaping (Result<URL, Error>) -> Void) {
        guard let session = AVAssetExportSession(asset: asset, presetName: preset) else {
            done(.failure(Self.failure("That song could not be prepared for playback.")))
            return
        }
        guard let type = Self.preferredTypes(for: sourceExt).first(where: { session.supportedFileTypes.contains($0) }) else {
            done(.failure(Self.failure("That song's format cannot be copied for playback.")))
            return
        }
        let fm = FileManager.default
        let finalURL = Self.cacheDir().appendingPathComponent(key).appendingPathExtension(Self.ext(for: type))
        // ⚠️ Exported into a scratch folder and MOVED into place, so an export
        // interrupted halfway (the app suspended, the phone full) can never
        // leave a truncated file in the cache under the name `cached` trusts.
        let scratch = Self.cacheDir().appendingPathComponent("partial", isDirectory: true)
        try? fm.createDirectory(at: scratch, withIntermediateDirectories: true)
        let partial = scratch.appendingPathComponent(finalURL.lastPathComponent)
        try? fm.removeItem(at: partial)

        session.outputURL = partial
        session.outputFileType = type
        session.metadata = asset.metadata
        session.exportAsynchronously {
            guard session.status == .completed else {
                try? fm.removeItem(at: partial)
                done(.failure(session.error ?? Self.failure("That song could not be prepared for playback.")))
                return
            }
            do {
                try? fm.removeItem(at: finalURL)
                try fm.moveItem(at: partial, to: finalURL)
                Self.evict(keeping: finalURL)
                done(.success(finalURL))
            } catch {
                done(.failure(error))
            }
        }
    }

    /// Containers to try, best first, for a source of this kind. The first one
    /// the export session says it can write is used.
    private static func preferredTypes(for ext: String) -> [AVFileType] {
        switch ext {
        case "wav", "wave": return [.wav, .aiff, .m4a]
        case "aif", "aiff": return [.aiff, .wav, .m4a]
        case "caf": return [.caf, .m4a]
        // MP3 cannot be remuxed into M4A; QuickTime takes its packets as-is,
        // and WebKit plays the result.
        case "mp3": return [.mov, .m4a]
        default: return [.m4a, .mp4, .mov]
        }
    }

    private static func ext(for type: AVFileType) -> String {
        switch type {
        case .wav: return "wav"
        case .aiff: return "aiff"
        case .caf: return "caf"
        case .mov: return "mov"
        case .mp4: return "mp4"
        default: return "m4a"
        }
    }

    // MARK: - The cache

    private static func cacheDir() -> URL {
        let base = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        let dir = base.appendingPathComponent("jukebox-music-library", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    private static let cachedExts = ["m4a", "mov", "mp4", "wav", "aiff", "caf"]

    private static func cached(_ key: String) -> URL? {
        let dir = cacheDir()
        for ext in cachedExts {
            let url = dir.appendingPathComponent(key).appendingPathExtension(ext)
            if FileManager.default.fileExists(atPath: url.path) { return url }
        }
        return nil
    }

    /// Marks a cached song as just played, so eviction takes older ones first.
    private static func touch(_ url: URL) {
        try? FileManager.default.setAttributes([.modificationDate: Date()], ofItemAtPath: url.path)
    }

    private static func answer(_ url: URL) -> [String: Any] {
        let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
        return ["uri": url.absoluteString, "size": size]
    }

    /// Least recently played first, until the cache is under its ceiling. The
    /// file just exported is never the one removed — it is about to be played.
    private static func evict(keeping: URL) {
        let fm = FileManager.default
        let keys: [URLResourceKey] = [.fileSizeKey, .contentModificationDateKey, .isDirectoryKey]
        guard let files = try? fm.contentsOfDirectory(at: cacheDir(), includingPropertiesForKeys: keys) else { return }
        var entries: [(url: URL, size: Int64, date: Date)] = files.compactMap { url in
            guard let v = try? url.resourceValues(forKeys: Set(keys)), v.isDirectory != true else { return nil }
            return (url, Int64(v.fileSize ?? 0), v.contentModificationDate ?? .distantPast)
        }
        var total = entries.reduce(Int64(0)) { $0 + $1.size }
        guard total > cacheLimit else { return }
        entries.sort { $0.date < $1.date }
        for entry in entries {
            if total <= cacheLimit { break }
            if entry.url == keeping { continue }
            if (try? fm.removeItem(at: entry.url)) != nil { total -= entry.size }
        }
    }

    private static func failure(_ message: String) -> NSError {
        NSError(domain: "JukeboxAppleMusic", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
    }
}
