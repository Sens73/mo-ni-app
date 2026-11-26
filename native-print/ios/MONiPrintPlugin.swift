import Capacitor
import Foundation
import UIKit

@objc(MONiPrintPlugin)
public final class MONiPrintPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MONiPrintPlugin"
    public let jsName = "MONiPrint"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "printPdf", returnType: CAPPluginReturnPromise)
    ]

    @objc public func printPdf(_ call: CAPPluginCall) {
        guard let urlText = call.getString("url"),
              let url = URL(string: urlText),
              ["https", "http"].contains(url.scheme?.lowercased() ?? "") else {
            call.reject("Die PDF-Adresse ist ungültig.")
            return
        }

        let title = call.getString("title") ?? "MO-Ni-Aufgabenblatt"
        URLSession.shared.dataTask(with: url) { [weak self] data, _, error in
            guard let self else { return }
            if let error {
                call.reject("Das Aufgabenblatt konnte nicht geladen werden.", nil, error)
                return
            }
            guard let data, UIPrintInteractionController.canPrint(data) else {
                call.reject("Dieses Aufgabenblatt kann auf dem Gerät nicht gedruckt werden.")
                return
            }

            DispatchQueue.main.async {
                let controller = UIPrintInteractionController.shared
                let information = UIPrintInfo(dictionary: nil)
                information.outputType = .general
                information.jobName = title
                controller.printInfo = information
                controller.printingItem = data
                controller.showsPageRange = true

                let presented: Bool
                if UIDevice.current.userInterfaceIdiom == .pad,
                   let webView = self.bridge?.webView {
                    let source = CGRect(x: webView.bounds.midX, y: 0, width: 1, height: 1)
                    presented = controller.present(from: source, in: webView, animated: true)
                } else {
                    presented = controller.present(animated: true)
                }

                if presented {
                    call.resolve()
                } else {
                    call.reject("Der iOS-Druckdialog konnte nicht geöffnet werden.")
                }
            }
        }.resume()
    }
}
