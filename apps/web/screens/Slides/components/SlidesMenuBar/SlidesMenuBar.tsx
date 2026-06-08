"use client"

import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { toast } from "sonner"

const Menu = ({ label, children }: { label: string; children: ReactNode }) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      render={
        <Button variant="ghost" size="sm" className="px-2 font-normal">
          {label}
        </Button>
      }
    />
    <DropdownMenuContent align="start" className="min-w-52">
      {children}
    </DropdownMenuContent>
  </DropdownMenu>
)

interface SlidesMenuBarProps {
  onNewSlide: () => void
  onDeleteSlide: () => void
  onPresent: () => void
  onExport: () => void
  canDelete: boolean
}

const SlidesMenuBar = ({
  onNewSlide,
  onDeleteSlide,
  onPresent,
  onExport,
  canDelete,
}: SlidesMenuBarProps) => {
  const router = useRouter()
  return (
    <div className="bg-card flex items-center gap-0.5 border-b px-1.5 py-0.5 text-sm">
      <Menu label="File">
        <DropdownMenuItem onClick={onExport}>Download PowerPoint (.pptx)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.print()}>
          Print
          <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/slides")}>Back to Slides</DropdownMenuItem>
      </Menu>

      <Menu label="Slide">
        <DropdownMenuItem onClick={onNewSlide}>
          New slide
          <DropdownMenuShortcut>⌘M</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canDelete} onClick={onDeleteSlide}>
          Delete slide
        </DropdownMenuItem>
      </Menu>

      <Menu label="View">
        <DropdownMenuItem onClick={onPresent}>
          Present
          <DropdownMenuShortcut>⌘⏎</DropdownMenuShortcut>
        </DropdownMenuItem>
      </Menu>

      <Menu label="Help">
        <DropdownMenuItem
          onClick={() =>
            toast.info("Add text/shapes from the canvas toolbar · drag to move · double-click text to edit")
          }
        >
          Tips
        </DropdownMenuItem>
      </Menu>
    </div>
  )
}

export default SlidesMenuBar
