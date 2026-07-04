import { motion } from "motion/react"
import { cn } from "@workspace/ui/lib/utils"
import { useTranslation } from "react-i18next"
import type { Mode } from "./types"

const MODES: { id: Mode; label: string }[] = [
  { id: "grid", label: "Grid" },
  { id: "canvas", label: "Canvas" },
  { id: "infinity", label: "Infinity" },
]

/** Floating bottom-centre segmented switcher for the workspace layout modes. */
const PhotoChrome = ({ mode, onMode }: { mode: Mode; onMode: (mode: Mode) => void }) => {
  const { t } = useTranslation("photos")
  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-30 flex justify-end">
      <div className="bg-background/70 pointer-events-auto flex items-center rounded-full border p-1 shadow-lg backdrop-blur-xl">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onMode(item.id)}
            className={cn(
              "relative rounded-full px-4 py-1.5 text-sm font-medium transition",
              mode === item.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {mode === item.id ? (
              <motion.span
                layoutId="workspace-mode-pill"
                className="bg-muted absolute inset-0 rounded-full"
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              />
            ) : null}
            <span className="relative">{t(`modes.${item.id}`, { defaultValue: item.label })}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default PhotoChrome
