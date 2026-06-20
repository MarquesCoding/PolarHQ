import { type ReactNode } from "react"
import { Icon } from "@workspace/screens/icons"
import { motion } from "motion/react"

interface EmptyStateProps {
  /** Icon name. */
  icon: string
  title: string
  hint?: string
  /** Optional action(s) rendered below the copy. */
  children?: ReactNode
}

/** A centered, animated empty state: a tinted icon badge, a title, supporting copy and actions. */
const EmptyState = ({ icon, title, hint, children }: EmptyStateProps) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center"
  >
    <div className="relative">
      <div className="from-primary/15 to-primary/5 ring-primary/10 text-primary flex size-20 items-center justify-center rounded-3xl bg-gradient-to-b ring-1 ring-inset">
        <Icon name={icon} className="size-9" />
      </div>
      <div className="bg-primary/20 absolute -inset-2 -z-10 rounded-[2rem] blur-2xl" />
    </div>
    <div className="space-y-1.5">
      <p className="text-foreground text-base font-semibold">{title}</p>
      {hint ? <p className="text-muted-foreground mx-auto max-w-sm text-sm">{hint}</p> : null}
    </div>
    {children ? <div className="flex items-center gap-2 pt-1">{children}</div> : null}
  </motion.div>
)

export default EmptyState
