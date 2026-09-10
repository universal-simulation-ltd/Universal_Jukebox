import Foundation
import UIKit
import UniformTypeIdentifiers
import Capacitor

/// "Add music from this device", done natively: iOS's own picker for AUDIO
/// FILES, copying straight into the app's music folder.
///
/// ⚠️ IT REPLACES A WEB `<input type="file" accept="audio/*">`, AND THE REASON IS
/// WHAT THAT INPUT DID ON iOS. WKWebView ignores the `accept` filter for the
/// menu it shows first, so tapping "Add music…" offered *Take Photo or Video*
/// and *Photo Library* before *Choose Files* — reported by James on the first
/// day the button existed (2026-09-10). And the files it did hand over had to
/// cross the Capacitor bridge as base64 to be written to disk, which for a
/// 40 MB FLAC is seconds of main-thread work per track.
///
/// `UIDocumentPickerViewController(forOpeningContentTypes: [.audio], asCopy:
/// true)` has no camera, filters to audio, and gives this app its own copy of
/// each file — which is then MOVED into Documents, so nothing crosses the
/// bridge but a count.
@objc(FileImportPlugin)
public class FileImportPlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate {
    public let identifier = "FileImportPlugin"
    public let jsName = "JukeboxFileImport"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "importFiles", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readText", returnType: CAPPluginReturnPromise)
    ]

    /// Main thread only.
    private var pending: CAPPluginCall?
    /// A `readText` waiting on its picker. Main thread only.
    private var pendingText: CAPPluginCall?

    /// One text file's contents — a lyrics sheet, `.lrc` or plain — as
    /// `{ name, text }`, or `{ cancelled: true }`. Filtered to text, so the
    /// picker offers nothing it cannot read, and no camera.
    @objc func readText(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let presenter = self.bridge?.viewController else {
                call.reject("There is nothing to show the file picker on.", "NO_VIEW")
                return
            }
            self.pending?.resolve(["cancelled": true])
            self.pending = nil
            self.pendingText?.resolve(["cancelled": true])
            self.pendingText = call
            var types: [UTType] = [.plainText, .text]
            if let lrc = UTType(filenameExtension: "lrc") { types.append(lrc) }
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: types, asCopy: true)
            picker.allowsMultipleSelection = false
            picker.delegate = self
            presenter.present(picker, animated: true)
        }
    }

    /// Resolves `{ imported, names }`, or `{ cancelled: true }`.
    @objc func importFiles(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let presenter = self.bridge?.viewController else {
                call.reject("There is nothing to show the file picker on.", "NO_VIEW")
                return
            }
            self.pending?.resolve(["cancelled": true])
            self.pending = call
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [UTType.audio], asCopy: true)
            picker.allowsMultipleSelection = true
            picker.delegate = self
            presenter.present(picker, animated: true)
        }
    }

    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        if let call = pendingText {
            pendingText = nil
            guard let url = urls.first else {
                call.resolve(["cancelled": true])
                return
            }
            defer { try? FileManager.default.removeItem(at: url) }
            // A lyrics sheet is a few kilobytes. Anything past half a megabyte is
            // not one, and reading it into a string would only cost memory.
            let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
            guard size <= 512 * 1024,
                  let text = (try? String(contentsOf: url, encoding: .utf8))
                    ?? (try? String(contentsOf: url, encoding: .isoLatin1)) else {
                call.reject("That file could not be read as text.", "NOT_TEXT")
                return
            }
            call.resolve(["name": url.lastPathComponent, "text": text])
            return
        }
        guard let call = pending else { return }
        pending = nil
        let fm = FileManager.default
        guard let documents = fm.urls(for: .documentDirectory, in: .userDomainMask).first else {
            call.reject("The music folder could not be found.", "NO_FOLDER")
            return
        }
        var names: [String] = []
        for url in urls {
            let target = Self.freeName(for: url.lastPathComponent, in: documents)
            do {
                // `asCopy` has already made this app's own copy in tmp, so a move
                // is a rename on the same volume — instant whatever the size.
                try fm.moveItem(at: url, to: target)
                names.append(target.lastPathComponent)
            } catch {
                if (try? fm.copyItem(at: url, to: target)) != nil { names.append(target.lastPathComponent) }
            }
        }
        call.resolve(["imported": names.count, "names": names])
    }

    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        pendingText?.resolve(["cancelled": true])
        pendingText = nil
        pending?.resolve(["cancelled": true])
        pending = nil
    }

    /// `Song.mp3`, or `Song (2).mp3` if that is taken — never an overwrite.
    private static func freeName(for name: String, in dir: URL) -> URL {
        let fm = FileManager.default
        var candidate = dir.appendingPathComponent(name)
        guard fm.fileExists(atPath: candidate.path) else { return candidate }
        let base = (name as NSString).deletingPathExtension
        let ext = (name as NSString).pathExtension
        var n = 2
        repeat {
            let next = ext.isEmpty ? "\(base) (\(n))" : "\(base) (\(n)).\(ext)"
            candidate = dir.appendingPathComponent(next)
            n += 1
        } while fm.fileExists(atPath: candidate.path)
        return candidate
    }
}
