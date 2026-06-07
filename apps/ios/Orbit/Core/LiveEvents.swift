import Foundation

/// Subscribes to the server's `/ws` event stream (same one the web uses) and bumps a per-domain
/// revision when a change arrives, so views can reload for live cross-device sync. Reconnects on drop.
@MainActor
final class LiveEvents: ObservableObject {
    @Published private(set) var photosTick = 0
    @Published private(set) var driveTick = 0

    private var task: URLSessionWebSocketTask?
    private var baseURL: URL?
    private var token: String?
    private var closed = true

    func connect(baseURL: URL, token: String) {
        self.baseURL = baseURL
        self.token = token
        closed = false
        open()
    }

    func disconnect() {
        closed = true
        task?.cancel(with: .goingAway, reason: nil)
        task = nil
    }

    private func open() {
        guard let baseURL, let token, !closed else { return }
        var components = URLComponents(
            url: baseURL.appendingPathComponent("ws"),
            resolvingAgainstBaseURL: false
        )
        components?.scheme = baseURL.scheme == "https" ? "wss" : "ws"
        guard let url = components?.url else { return }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let task = URLSession.shared.webSocketTask(with: request)
        self.task = task
        task.resume()
        listen()
    }

    private func listen() {
        task?.receive { [weak self] result in
            Task { @MainActor in
                guard let self, !self.closed else { return }
                switch result {
                case let .success(message):
                    if case let .string(text) = message { self.handle(text) }
                    self.listen()
                case .failure:
                    self.reconnect()
                }
            }
        }
    }

    private func handle(_ text: String) {
        guard let data = text.data(using: .utf8),
              let event = try? JSONDecoder().decode(Event.self, from: data)
        else { return }
        if event.type.hasPrefix("photos") { photosTick += 1 }
        if event.type.hasPrefix("drive") { driveTick += 1 }
    }

    private func reconnect() {
        guard !closed else { return }
        task = nil
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(2))
            self.open()
        }
    }

    private struct Event: Decodable {
        let type: String
    }
}
