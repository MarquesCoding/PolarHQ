"use client"

import { cn } from "@workspace/ui/lib/utils"
import type { PhotoEditorController } from "./usePhotoEditor"

/**
 * The editor's live canvas plus its draggable text overlays and crop rectangle, sized to fill the
 * Lightbox's main stage in place of the static image while editing.
 */
const EditStage = ({ controller }: { controller: PhotoEditorController }) => {
  const {
    canvasRef,
    stageRef,
    tool,
    texts,
    activeText,
    crop,
    onTextPointerDown,
    onTextPointerMove,
    onTextPointerUp,
    onCropDown,
    onCropMove,
    onCropUp,
  } = controller

  return (
    <div
      ref={stageRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      onPointerMove={(event) => {
        onTextPointerMove(event)
        onCropMove(event)
      }}
      onPointerUp={(event) => {
        onTextPointerUp(event)
        onCropUp(event)
      }}
    >
      <div className="relative max-h-full max-w-full">
        <canvas
          ref={canvasRef}
          className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
        />

        {tool === "text"
          ? texts.map((overlay) => (
              <div
                key={overlay.id}
                onPointerDown={(event) => onTextPointerDown(event, overlay)}
                style={{
                  left: `${overlay.x * 100}%`,
                  top: `${overlay.y * 100}%`,
                  color: overlay.color,
                  fontSize: `${overlay.size * 0.5}vw`,
                }}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 cursor-move font-semibold whitespace-nowrap drop-shadow select-none",
                  overlay.id === activeText && "ring-primary rounded-sm ring-2 ring-offset-1",
                )}
              >
                {overlay.text || " "}
              </div>
            ))
          : null}

        {tool === "crop" ? (
          <div
            onPointerDown={(event) => onCropDown(event, "move")}
            style={{
              left: `${crop.x * 100}%`,
              top: `${crop.y * 100}%`,
              width: `${crop.w * 100}%`,
              height: `${crop.h * 100}%`,
            }}
            className="absolute cursor-move border border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
          >
            {(["nw", "ne", "sw", "se"] as const).map((handle) => (
              <span
                key={handle}
                onPointerDown={(event) => onCropDown(event, handle)}
                className={cn(
                  "absolute size-3 rounded-full border border-black/30 bg-white",
                  handle.includes("n") ? "-top-1.5" : "-bottom-1.5",
                  handle.includes("w") ? "-left-1.5" : "-right-1.5",
                  handle === "nw" && "cursor-nwse-resize",
                  handle === "se" && "cursor-nwse-resize",
                  handle === "ne" && "cursor-nesw-resize",
                  handle === "sw" && "cursor-nesw-resize",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default EditStage
