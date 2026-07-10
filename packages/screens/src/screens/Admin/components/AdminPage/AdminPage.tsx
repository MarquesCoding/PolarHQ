import { type ReactNode } from "react"
import UpdateBanner from "@pages/Admin/components/UpdateBanner/UpdateBanner"

interface AdminPageProps {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}

/** Shared admin page frame: scrollable, centred readable column with a consistent title row. The
 *  header reserves right padding so its action clears the settings-modal close button. */
const AdminPage = ({ title, description, action, children }: AdminPageProps) => (
  <div className="scrollbar-slim flex flex-1 flex-col overflow-y-auto p-6">
    <div className="mx-auto w-full max-w-3xl">
      <UpdateBanner />
      <div className="mb-6 flex items-start justify-between gap-4 pr-10">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{title}</h1>
          {description ? (
            <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </div>
  </div>
)

export default AdminPage
