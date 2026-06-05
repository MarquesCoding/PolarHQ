"use client"

import { type ReactNode, useRef, useState } from "react"
import { IconUpload } from "@tabler/icons-react"

interface DropZoneProps {
  onFiles: (files: FileList) => void
  className?: string
  children: ReactNode
}

/** A drag-and-drop file target with a "Drop to upload" overlay, shared by Photos + Drive. */
const DropZone = ({ onFiles, className, children }: DropZoneProps) => {
  const depth = useRef(0)
  const [dragging, setDragging] = useState(false)

  return (
    <div
      className={className}
      onDragEnter={(event) => {
        if (event.dataTransfer.types.includes("Files")) {
          depth.current += 1
          setDragging(true)
        }
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault()
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1)
        if (depth.current === 0) setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        depth.current = 0
        setDragging(false)
        onFiles(event.dataTransfer.files)
      }}
    >
      {children}
      {dragging ? (
        <div className="bg-background/80 border-primary pointer-events-none fixed inset-4 z-50 flex flex-col items-center justify-center gap-3 rounded-xl border-2 backdrop-blur-sm">
          <IconUpload className="text-primary size-10" />
          <p className="text-lg font-medium">Drop to upload</p>
        </div>
      ) : null}
    </div>
  )
}

export default DropZone
