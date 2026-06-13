import { IconLoader2 } from "@tabler/icons-react"
import { cn } from "@polarhq/ui/lib/utils"

/** Small inline loading spinner. */
const Spinner = ({ className }: { className?: string }) => (
  <IconLoader2 className={cn("text-muted-foreground size-5 animate-spin", className)} />
)

/** Centered full-area spinner for page/section loading states. */
export const PageSpinner = () => (
  <div className="flex flex-1 items-center justify-center p-10">
    <Spinner className="size-6" />
  </div>
)

export default Spinner
