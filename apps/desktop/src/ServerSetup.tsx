import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { normalizeServerUrl, probeServer, saveServerUrl } from "@lib/server"
import Spinner from "@components/Spinner/Spinner"
import logo from "@components/FlatShell/logo.png"

interface ServerSetupProps {
  /** Called with the validated, normalised origin once the server responds to `/health`. */
  onConnected: (url: string) => void
}

/**
 * First-run screen for the desktop shell: the user enters the address of their self-hosted PolarHQ
 * server. We probe `/health` to confirm it's reachable, persist it, and hand the origin back so the
 * app can boot against it. This is shell-level (pre-i18n) chrome, so its copy is intentionally plain.
 */
const ServerSetup = ({ onConnected }: ServerSetupProps) => {
  const [value, setValue] = useState("")
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = async () => {
    const url = normalizeServerUrl(value)
    if (!url) {
      setError("Enter your server address.")
      return
    }
    setChecking(true)
    setError(null)
    try {
      await probeServer(url)
      await saveServerUrl(url)
      onConnected(url)
    } catch {
      setChecking(false)
      setError("Couldn't reach a PolarHQ server at that address. Check the URL and try again.")
    }
  }

  return (
    <main className="bg-background flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src={logo} alt="" className="size-12" />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Connect to your server</h1>
            <p className="text-muted-foreground text-sm">
              Enter the address of your self-hosted PolarHQ server to get started.
            </p>
          </div>
        </div>

        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            void connect()
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="server">Server address</Label>
            <Input
              id="server"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="https://demo.polarhq.app"
            />
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
          </div>
          <Button type="submit" size="lg" disabled={checking}>
            {checking ? (
              <>
                <Spinner className="size-4" />
                Connecting…
              </>
            ) : (
              "Connect"
            )}
          </Button>
        </form>
      </div>
    </main>
  )
}

export default ServerSetup
