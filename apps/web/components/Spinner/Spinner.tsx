import { CircleNotch } from "@phosphor-icons/react"
import { cn } from "@workspace/ui/lib/utils"

/** Small inline loading spinner. */
const Spinner = ({ className }: { className?: string }) => (
  <CircleNotch className={cn("text-muted-foreground size-5 animate-spin", className)} />
)

/** Centered full-area spinner for page/section loading states. */
export const PageSpinner = () => (
  <div className="flex flex-1 items-center justify-center p-10">
    <Spinner className="size-6" />
  </div>
)

export default Spinner
