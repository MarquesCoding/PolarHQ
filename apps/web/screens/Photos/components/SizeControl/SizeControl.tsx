import { Icon } from "@lib/icons"
import SizeControlBase, { type SizeControlProps } from "@workspace/ui/components/size-control"
import { useTranslation } from "react-i18next"

type Props = Omit<SizeControlProps, "triggerIcon" | "minIcon" | "maxIcon" | "labels">

const SizeControl = (props: Props) => {
  const { t } = useTranslation("common")
  return (
    <SizeControlBase
      {...props}
      labels={{
        photoSize: t("sizeControl.photoSize"),
        spacing: t("sizeControl.spacing"),
        lessSpacing: t("sizeControl.lessSpacing"),
        moreSpacing: t("sizeControl.moreSpacing"),
        squareTiles: t("sizeControl.squareTiles"),
        roundedCorners: t("sizeControl.roundedCorners"),
      }}
      triggerIcon={<Icon name="image-scale" className="size-5" />}
      minIcon={<Icon name="image-upscale" className="text-muted-foreground size-4 shrink-0" />}
      maxIcon={<Icon name="image-scale" className="text-muted-foreground size-5 shrink-0" />}
    />
  )
}

export default SizeControl
