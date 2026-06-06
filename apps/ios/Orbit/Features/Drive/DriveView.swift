import SwiftUI

/// Drive also hosts documents, sheets and presentations (no dedicated tabs — they live here).
struct DriveView: View {
    var body: some View {
        ScreenScaffold(title: "Drive") {
            ComingSoon(icon: "folder", message: "Files, documents, sheets and presentations will live here.")
        }
    }
}
