"use client"

import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@workspace/ui/lib/utils"

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  align = "center",
  side = "top",
  sideOffset = 8,
  ...props
}: PopoverPrimitive.Popup.Props & {
  align?: PopoverPrimitive.Positioner.Props["align"]
  side?: PopoverPrimitive.Positioner.Props["side"]
  sideOffset?: PopoverPrimitive.Positioner.Props["sideOffset"]
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        className="isolate z-50 outline-none"
        side={side}
        align={align}
        sideOffset={sideOffset}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "origin-(--transform-origin) rounded-2xl border bg-popover p-1 text-popover-foreground shadow-xl ring-1 ring-foreground/5 duration-150 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

export { Popover, PopoverTrigger, PopoverContent }
