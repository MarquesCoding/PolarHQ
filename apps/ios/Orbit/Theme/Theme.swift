import SwiftUI
import UIKit

/// Orbit's colour scheme, mirrored from the web suite (`packages/ui` tokens):
/// brand blue `#288dff` on neutral greys, 12pt corner radius.
enum Theme {
    static let radius: CGFloat = 12

    static let primary = Color(hex: 0x288DFF)
    static let primaryForeground = Color.white

    static let background = Color(light: 0xEFEFEF, dark: 0x141416)
    static let card = Color(light: 0xE8E8E8, dark: 0x1C1C1E)
    static let secondary = Color(light: 0xDEDEDE, dark: 0x2A2A2D)
    static let foreground = Color(light: 0x1A1A1A, dark: 0xFAFAFA)
    static let mutedForeground = Color(light: 0x737373, dark: 0xA6A6A6)
    static let border = Color(lightAlpha: (0x000000, 0.09), darkAlpha: (0xFFFFFF, 0.08))
    static let destructive = Color(hex: 0xE5484D)
}

extension Color {
    init(hex: UInt) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }

    /// A dynamic colour that resolves differently in light and dark mode.
    init(light: UInt, dark: UInt) {
        self.init(uiColor: UIColor { traits in
            UIColor(hex: traits.userInterfaceStyle == .dark ? dark : light, alpha: 1)
        })
    }

    init(lightAlpha: (UInt, Double), darkAlpha: (UInt, Double)) {
        self.init(uiColor: UIColor { traits in
            let value = traits.userInterfaceStyle == .dark ? darkAlpha : lightAlpha
            return UIColor(hex: value.0, alpha: value.1)
        })
    }
}

extension UIColor {
    convenience init(hex: UInt, alpha: Double) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: CGFloat(alpha)
        )
    }
}
