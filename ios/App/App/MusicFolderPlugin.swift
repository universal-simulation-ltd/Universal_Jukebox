import Foundation
import UIKit
import UniformTypeIdentifiers
import Capacitor

/// The music folder on iOS: one the person CHOOSES, and keeps.
///
/// Registered under the JS name `JukeboxMusicFolder` — the same name, and the
/// same three methods, as Android's `MusicFolderPlugin.java`. The web code
/// (`usesChosenFolder` in `src/lib/nativeFile.ts`) turns the chosen-folder route
/// on wherever a plugin of that name is registered, so this file IS the iOS half
/// of "let me choose my own library folder" (James, 2026-09-10) and no call site
/// in the web app knows which platform answered.
///
/// ⚠️ THE WHOLE TRICK IS THE SECURITY-SCOPED BOOKMARK. A folder picked through
/// `UIDocumentPickerViewController` — in iCloud Drive, On My iPhone, a USB drive,
/// another app's storage — is readable only while this process holds
/// `startAccessingSecurityScopedResource()` on it, and that grant dies with the
/// process. What survives is bookmark data, kept here in `UserDefaults` and keyed
/// by the uri the library stores as `Root.nativePath`. Every launch resolves the
/// bookmarks and re-takes access in `load()` — BEFORE any page script runs — so
/// the library plays after a relaunch with nothing to confirm, exactly like the
/// Android grant and exactly like the Documents route before it.
///
/// ⚠️ Access has to be held for PLAYBACK too, not just the walk. Scanning and
/// playing both go through Capacitor's local server (`/_capacitor_file_/…`,
/// see `WebViewAssetHandler`), which reads the file in THIS process — so a track
/// in the chosen folder plays only while the grant is held. That is why access is
/// taken at launch and kept for the life of the app rather than taken around each
/// walk: a scoped walk would scan fine and then fail every play afterwards.
///
/// ⚠️ READING IS NOT DONE HERE. Only paths and metadata cross the bridge. Moving
/// bytes through a plugin means base64, which is the out-of-memory crash the
/// header of `src/lib/scan.ts` forbids.
@objc(MusicFolderPlugin)
public class MusicFolderPlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate {
    public let identifier = "MusicFolderPlugin"
    public let jsName = "JukeboxMusicFolder"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "pick", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "walk", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "release", returnType: CAPPluginReturnPromise)
    ]

    private static let bookmarksKey = "uk.co.unisim.jukebox.musicFolderBookmarks"

    /// Guards `accessing` and the stored bookmarks: plugin calls arrive on
    /// Capacitor's background queue, the picker answers on the main thread.
    private let state = DispatchQueue(label: "uk.co.unisim.jukebox.musicFolder")
    /// uri → the resolved URL this process currently holds access to.
    private var accessing: [String: URL] = [:]
    /// The `pick` call waiting on the picker. Main thread only.
    private var pendingPick: CAPPluginCall?

    override public func load() {
        state.sync {
            for uri in Self.storedBookmarks().keys {
                _ = self.accessLocked(uri)
            }
        }
    }

    // MARK: - pick

    /// Show the system folder picker. Resolves `{ uri, name }`, or
    /// `{ cancelled: true }` when backed out of — never a rejection for that.
    @objc func pick(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let presenter = self.bridge?.viewController else {
                call.reject("There is nothing to show the folder picker on.", "NO_VIEW")
                return
            }
            // A second press while the picker is up supersedes the first; the
            // first is answered rather than left hanging forever.
            self.pendingPick?.resolve(["cancelled": true])
            self.pendingPick = call

            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [UTType.folder])
            picker.delegate = self
            picker.allowsMultipleSelection = false
            // ⚠️ Opens IN the app's own folder, so "use the Universal Jukebox
            // folder" is one tap — choosing a folder is an extra option, not the
            // loss of the one the app already had. The person can go anywhere
            // from here: iCloud Drive, On My iPhone, a connected drive.
            picker.directoryURL = Self.documentsURL()
            presenter.present(picker, animated: true)
        }
    }

    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let call = pendingPick else { return }
        pendingPick = nil
        guard let url = urls.first else {
            call.resolve(["cancelled": true])
            return
        }
        // Returns false for a folder inside our own container (it needs no
        // scope). That is fine — it is readable either way.
        let started = url.startAccessingSecurityScopedResource()
        do {
            let bookmark = try url.bookmarkData(options: [], includingResourceValuesForKeys: nil, relativeTo: nil)
            let uri = url.absoluteString
            state.sync {
                var all = Self.storedBookmarks()
                all[uri] = bookmark
                Self.store(all)
                if accessing[uri] != nil {
                    // Already held from an earlier pick of the same folder: give
                    // back the second grant so the counts stay balanced.
                    if started { url.stopAccessingSecurityScopedResource() }
                } else {
                    accessing[uri] = url
                }
            }
            call.resolve(["uri": uri, "name": url.lastPathComponent])
        } catch {
            if started { url.stopAccessingSecurityScopedResource() }
            call.reject("iOS would not let Universal Jukebox keep access to that folder.", "NOT_PERSISTABLE", error)
        }
    }

    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        pendingPick?.resolve(["cancelled": true])
        pendingPick = nil
    }

    // MARK: - walk

    /// Every file under a folder, as `{ path, uri, name, size, mtime }`.
    ///
    /// ⚠️ Rejects with `NO_ACCESS` when the folder can no longer be reached —
    /// deleted, moved beyond what the bookmark can follow, or on a drive that is
    /// gone — rather than resolving an empty list. "Your folder is empty" and "I
    /// could not look" need different things from the person. A sub-folder that
    /// will not open is skipped instead, as on the web and on Android.
    ///
    /// The empty uri is the app's own Documents folder, so a library scanned
    /// before folder choice existed (`Root.nativePath === ''`) still walks.
    @objc func walk(_ call: CAPPluginCall) {
        let uri = call.getString("uri") ?? ""
        guard let root = state.sync(execute: { accessLocked(uri) }) else {
            call.reject("Universal Jukebox no longer has access to that folder.", "NO_ACCESS")
            return
        }
        // Off the plugin queue: a big library in iCloud Drive is a lot of stat
        // calls, and every plugin shares that queue.
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                call.resolve(try Self.walkTree(root))
            } catch {
                call.reject("That folder could not be read.", "UNREADABLE", error)
            }
        }
    }

    private static let walkKeys: [URLResourceKey] = [
        .isDirectoryKey, .fileSizeKey, .contentModificationDateKey,
        .isUbiquitousItemKey, .ubiquitousItemDownloadingStatusKey
    ]

    private static func walkTree(_ root: URL) throws -> [String: Any] {
        let fm = FileManager.default
        // The ROOT must be listable. Failing here is "I could not look".
        _ = try fm.contentsOfDirectory(at: root, includingPropertiesForKeys: nil)

        let rootPath = root.resolvingSymlinksInPath().path
        var files: [[String: Any]] = []
        var notDownloaded = 0

        guard let walker = fm.enumerator(
            at: root,
            includingPropertiesForKeys: walkKeys,
            options: [],
            errorHandler: { _, _ in true } // an unreadable sub-folder is skipped
        ) else {
            throw NSError(domain: "JukeboxMusicFolder", code: 1,
                          userInfo: [NSLocalizedDescriptionKey: "The folder could not be listed."])
        }

        for case let url as URL in walker {
            let name = url.lastPathComponent
            let values = try? url.resourceValues(forKeys: Set(walkKeys))
            let isDirectory = values?.isDirectory == true

            // ⚠️ AN iCLOUD FILE MAY NOT BE ON THE PHONE YET. Older iOS shows one as
            // a hidden `.Name.mp3.icloud` placeholder; newer iOS shows the real
            // name with a downloading status. Either way its bytes are not here,
            // so a range read of it fails. Ask iOS to fetch it and leave it out
            // of THIS walk — the next scan picks it up — rather than filing a
            // track whose every read errors.
            if name.hasPrefix(".") {
                if name.hasSuffix(".icloud") {
                    let real = url.deletingLastPathComponent()
                        .appendingPathComponent(String(name.dropFirst().dropLast(".icloud".count)))
                    try? fm.startDownloadingUbiquitousItem(at: real)
                    notDownloaded += 1
                } else if isDirectory {
                    walker.skipDescendants()
                }
                continue
            }
            if name == "node_modules" { walker.skipDescendants(); continue }
            if isDirectory { continue }
            if values?.isUbiquitousItem == true,
               let status = values?.ubiquitousItemDownloadingStatus, status != .current {
                try? fm.startDownloadingUbiquitousItem(at: url)
                notDownloaded += 1
                continue
            }

            let full = url.resolvingSymlinksInPath().path
            let relative = full.hasPrefix(rootPath + "/") ? String(full.dropFirst(rootPath.count + 1)) : name
            let modified = values?.contentModificationDate?.timeIntervalSince1970 ?? 0
            files.append([
                "path": relative,
                "uri": url.absoluteString,
                "name": name,
                "size": values?.fileSize ?? 0,
                // ⚠️ 0, never "now", when there is none: mtime is part of
                // `trackKey`, and a fresh value every scan would orphan every play
                // count and cover fix keyed to the track.
                "mtime": Int64(modified * 1000)
            ])
        }
        if notDownloaded > 0 {
            CAPLog.print("⚡️  [jukebox] \(notDownloaded) file(s) are still in iCloud; asked iOS to download them.")
        }
        return ["files": files, "notDownloaded": notDownloaded]
    }

    // MARK: - release

    /// Give back a folder the library no longer reads.
    @objc func release(_ call: CAPPluginCall) {
        let uri = call.getString("uri") ?? ""
        state.sync {
            accessing.removeValue(forKey: uri)?.stopAccessingSecurityScopedResource()
            var all = Self.storedBookmarks()
            all.removeValue(forKey: uri)
            Self.store(all)
        }
        call.resolve()
    }

    // MARK: - Access and storage

    /// The URL for a uri, with access held. Call on `state` only.
    private func accessLocked(_ uri: String) -> URL? {
        if uri.isEmpty { return Self.documentsURL() }
        if let held = accessing[uri] { return held }
        guard let data = Self.storedBookmarks()[uri] else { return nil }
        var stale = false
        guard let url = try? URL(resolvingBookmarkData: data, options: [], relativeTo: nil,
                                 bookmarkDataIsStale: &stale) else { return nil }
        let started = url.startAccessingSecurityScopedResource()
        guard started || FileManager.default.isReadableFile(atPath: url.path) else { return nil }
        // ⚠️ A stale bookmark still resolved — the folder moved or was renamed —
        // but will not next time. Re-mint it now, under the SAME key: the key is
        // what the library stored, and changing it would orphan the root.
        if stale, let fresh = try? url.bookmarkData(options: [], includingResourceValuesForKeys: nil, relativeTo: nil) {
            var all = Self.storedBookmarks()
            all[uri] = fresh
            Self.store(all)
        }
        accessing[uri] = url
        return url
    }

    private static func documentsURL() -> URL? {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
    }

    private static func storedBookmarks() -> [String: Data] {
        UserDefaults.standard.dictionary(forKey: bookmarksKey) as? [String: Data] ?? [:]
    }

    private static func store(_ all: [String: Data]) {
        UserDefaults.standard.set(all, forKey: bookmarksKey)
    }
}
