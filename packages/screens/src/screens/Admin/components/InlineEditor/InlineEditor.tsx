import { type ReactNode } from "react"
import { CaretLeft } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import { useTranslation } from "react-i18next"

interface InlineEditorProps {
  onBack: () => void
  children: ReactNode
}

/** Master-detail frame: a Back affordance atop a scrollable pane, replacing the list in place. */
const InlineEditor = ({ onBack, children }: InlineEditorProps) => {
  const { t } = useTranslation("admin")
  return (
    <div className="scrollbar-slim flex flex-1 flex-col overflow-y-auto p-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 mb-4 w-fit gap-1.5">
        <CaretLeft className="size-4" />
        {t("editor.back")}
      </Button>
      {children}
    </div>
  )
}

export default InlineEditor
