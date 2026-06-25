import { type ReactNode } from "react"
import { motion } from "motion/react"
import { coreConfig } from "@workspace/core/config"
import logo from "../FlatShell/logo.png"

interface AuthLayoutProps {
  /** Tagline shown in the brand panel. */
  tagline: string
  /** Right-panel content (the form); fades/slides in on mount so swapping scenes feels animated. */
  children: ReactNode
}

/**
 * Split-screen auth scene: an animated blue brand panel on the left and a form panel on the right.
 * Shared by the sign-in screen and the desktop server-connect screen so they read as one continuous
 * flow — the brand panel stays put while the right side animates between server selection and sign-in.
 */
const AuthLayout = ({ tagline, children }: AuthLayoutProps) => {
  const appName = coreConfig().appName
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <div className="bg-primary relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(130deg, var(--primary) 0%, #8b6cfb 22%, #6d5cf6 45%, #7c5cfc 68%, #a78bfa 85%, var(--primary) 100%)",
              backgroundSize: "300% 300%",
            }}
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-black/25" />
          <div className="absolute inset-0 [background-image:radial-gradient(circle,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(80%_70%_at_50%_40%,black,transparent)]" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <img src={logo} alt="" className="size-9" draggable={false} />
          <span className="text-lg font-bold">{appName}</span>
        </div>
        <h1 className="relative z-10 max-w-md text-4xl leading-[1.1] font-bold tracking-tight text-balance">
          {tagline}
        </h1>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          {children}
        </motion.div>
      </div>
    </main>
  )
}

export default AuthLayout
