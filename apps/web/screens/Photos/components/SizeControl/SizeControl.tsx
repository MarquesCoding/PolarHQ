"use client"

import { Icon } from "@lib/icons"
import SizeControlBase, { type SizeControlProps } from "@workspace/ui/components/size-control"

type Props = Omit<SizeControlProps, "triggerIcon" | "minIcon" | "maxIcon">

const SizeControl = (props: Props) => (
  <SizeControlBase
    {...props}
    triggerIcon={<Icon name="image-scale" className="size-5" />}
    minIcon={<Icon name="image-upscale" className="text-muted-foreground size-4 shrink-0" />}
    maxIcon={<Icon name="image-scale" className="text-muted-foreground size-5 shrink-0" />}
  />
)

export default SizeControl
