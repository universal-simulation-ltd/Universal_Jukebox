import UIKit
import AVFoundation
import MediaPlayer
import Capacitor

/// The phone's own volume, set finer than its buttons can (James, 2026-09-27:
/// "some of my songs are quite loud at one volume above 0" — and then, of the
/// −50 slider, "Turning down not working on iPhone").
///
/// ⚠️ WHY THE DEVICE VOLUME AND NOT THE SONG'S. In the iPhone app the page's
/// `<audio>` element takes a `volume` and reads it back (`lib/volumeSupport.ts`)
/// but does not play any quieter for it — heard on the phone, 2026-09-27. The
/// app can't run the music through Web Audio either: iOS suspends it in the
/// background and the music stops (`lib/audioGraph.ts`). What iOS DOES let an
/// app set is the system volume, and to any value, not just the buttons'
/// sixteen steps: a step is 0.0625, and this can set 0.01.
///
/// ⚠️ THROUGH `MPVolumeView`'s SLIDER, which is the only public way. The view
/// must be in the window for the slider to take, so it is added for the
/// moment of the change and taken away again — left in, it would also hide the
/// system's volume display whenever the buttons are pressed.
@objc(DeviceVolumePlugin)
public class DeviceVolumePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DeviceVolumePlugin"
    public let jsName = "JukeboxDeviceVolume"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise)
    ]

    private var observation: NSKeyValueObservation?
    private var volumeView: MPVolumeView?
    private var removeWork: DispatchWorkItem?

    override public func load() {
        // The buttons move it too; the slider on the page follows them.
        observation = AVAudioSession.sharedInstance().observe(\.outputVolume, options: [.new]) { [weak self] _, change in
            guard let value = change.newValue else { return }
            self?.notifyListeners("change", data: ["volume": value])
        }
    }

    @objc func get(_ call: CAPPluginCall) {
        call.resolve(["volume": AVAudioSession.sharedInstance().outputVolume])
    }

    @objc func set(_ call: CAPPluginCall) {
        let value = Float(max(0, min(1, call.getDouble("volume") ?? 0)))
        DispatchQueue.main.async {
            guard let window = self.bridge?.viewController?.view.window else {
                call.reject("No window to set the volume from.", "NO_WINDOW")
                return
            }
            let view = self.volumeView ?? {
                let made = MPVolumeView(frame: CGRect(x: -1000, y: -1000, width: 10, height: 10))
                made.alpha = 0.01
                made.isUserInteractionEnabled = false
                return made
            }()
            self.volumeView = view
            if view.superview == nil { window.addSubview(view) }
            // The slider is laid out a moment after the view joins the window.
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                guard let slider = view.subviews.compactMap({ $0 as? UISlider }).first else {
                    call.reject("The system volume control was not there.", "NO_SLIDER")
                    return
                }
                slider.setValue(value, animated: false)
                slider.sendActions(for: .valueChanged)
                call.resolve(["volume": value])
                // Out of the window again once the change has gone through, so
                // the buttons show iOS's own volume display as usual.
                self.removeWork?.cancel()
                let work = DispatchWorkItem { [weak view] in view?.removeFromSuperview() }
                self.removeWork = work
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5, execute: work)
            }
        }
    }
}
