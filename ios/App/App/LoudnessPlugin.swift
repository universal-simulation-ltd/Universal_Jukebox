import Foundation
import AVFoundation
import Capacitor

/// How loud a song is — for "Stable volume" (James, 2026-09-11: "an option for
/// stable volume - keeps the volume at in a sensible min / max range so a track
/// doesn't blast your ears off"). The page turns a loud song down by this; see
/// `src/lib/loudness.ts`.
///
/// ⚠️ MEASURED HERE, NATIVELY, because the page cannot: the iPhone app runs no
/// Web Audio at all (a running AudioContext is what iOS interrupted in the
/// background — `lib/crackle.ts`), and a byte range of an M4A cannot be decoded
/// in the page without its index. `AVAssetReader` decodes any file the app can
/// play, straight to samples, off the main thread.
///
/// A gated RMS: 400 ms blocks over a minute from a quarter of the way in, blocks
/// quieter than −50 dB left out (an intro's silence is not how loud a song is).
@objc(LoudnessPlugin)
public class LoudnessPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LoudnessPlugin"
    public let jsName = "JukeboxLoudness"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "measure", returnType: CAPPluginReturnPromise)
    ]

    private let queue = DispatchQueue(label: "uk.co.unisim.jukebox.loudness", qos: .utility)

    @objc func measure(_ call: CAPPluginCall) {
        guard let raw = call.getString("uri"), let url = URL(string: raw), url.isFileURL else {
            call.reject("No file was named.", "NO_FILE")
            return
        }
        queue.async {
            let started = Date()
            guard let result = Loudness.measure(url) else {
                call.reject("That file could not be read.", "UNREADABLE")
                return
            }
            print("[jukebox:native] loudness \(url.lastPathComponent): \(String(format: "%.1f", result.rms)) dB in \(Int(Date().timeIntervalSince(started) * 1000))ms")
            call.resolve(["rmsDb": result.rms, "peakDb": result.peak, "seconds": result.seconds])
        }
    }
}

enum Loudness {
    static func measure(_ url: URL) -> (rms: Double, peak: Double, seconds: Double)? {
        let asset = AVURLAsset(url: url)
        guard let track = asset.tracks(withMediaType: .audio).first,
              let reader = try? AVAssetReader(asset: asset) else { return nil }
        let rate = 22050.0
        let output = AVAssetReaderTrackOutput(track: track, outputSettings: [
            AVFormatIDKey: kAudioFormatLinearPCM,
            AVLinearPCMBitDepthKey: 32,
            AVLinearPCMIsFloatKey: true,
            AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsNonInterleaved: false,
            AVNumberOfChannelsKey: 1,
            AVSampleRateKey: rate
        ])
        let duration = CMTimeGetSeconds(asset.duration)
        let window = duration.isFinite && duration > 0 ? min(60, duration) : 60
        let from = duration.isFinite && duration > window ? min(duration * 0.25, duration - window) : 0
        reader.timeRange = CMTimeRange(start: CMTime(seconds: from, preferredTimescale: 600),
                                       duration: CMTime(seconds: window, preferredTimescale: 600))
        guard reader.canAdd(output) else { return nil }
        reader.add(output)
        guard reader.startReading() else { return nil }

        let block = Int(rate * 0.4)
        var blockSum = 0.0
        var blockCount = 0
        var gatedSum = 0.0
        var gatedBlocks = 0
        var peak: Float = 0
        var total = 0
        while let sample = output.copyNextSampleBuffer() {
            guard let data = CMSampleBufferGetDataBuffer(sample) else { continue }
            let length = CMBlockBufferGetDataLength(data)
            let count = length / MemoryLayout<Float>.size
            guard count > 0 else { continue }
            var floats = [Float](repeating: 0, count: count)
            guard CMBlockBufferCopyDataBytes(data, atOffset: 0, dataLength: count * MemoryLayout<Float>.size, destination: &floats) == kCMBlockBufferNoErr else { continue }
            for value in floats {
                peak = max(peak, abs(value))
                blockSum += Double(value * value)
                blockCount += 1
                if blockCount == block {
                    let meanSquare = blockSum / Double(block)
                    if meanSquare > 1e-5 {
                        gatedSum += meanSquare
                        gatedBlocks += 1
                    }
                    blockSum = 0
                    blockCount = 0
                }
            }
            total += count
        }
        guard gatedBlocks > 0 else { return nil }
        return (10 * log10(gatedSum / Double(gatedBlocks)), 20 * log10(Double(max(peak, 1e-6))), Double(total) / rate)
    }
}
