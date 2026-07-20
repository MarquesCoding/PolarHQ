import { useTranslation } from "react-i18next"
import { ArrowsDownUp, Check } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { type DriveSortKey, type SortDir, setDriveSort } from "@workspace/screens/store/uiSlice"
import { useAppDispatch, useAppSelector } from "@workspace/screens/store/hooks"

const KEYS: DriveSortKey[] = ["name", "size", "modified", "kind"]
const DIRS: SortDir[] = ["asc", "desc"]

/** Sort control: pick the key (name/size/modified/kind) and direction; lives in its own toolbar bubble. */
const DriveSortMenu = () => {
  const { t } = useTranslation("drive")
  const dispatch = useAppDispatch()
  const sort = useAppSelector((state) => state.ui.driveSort)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("toolbar.sort.label")}
            className="rounded-full"
          >
            <ArrowsDownUp className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-44">
        {KEYS.map((key) => (
          <DropdownMenuItem
            key={key}
            onClick={() => dispatch(setDriveSort({ key, dir: sort.dir }))}
            className="justify-between gap-2"
          >
            {t(`toolbar.sort.${key}`)}
            {sort.key === key ? <Check className="size-4" weight="bold" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {DIRS.map((dir) => (
          <DropdownMenuItem
            key={dir}
            onClick={() => dispatch(setDriveSort({ key: sort.key, dir }))}
            className="justify-between gap-2"
          >
            {t(`toolbar.sort.${dir}`)}
            {sort.dir === dir ? <Check className="size-4" weight="bold" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default DriveSortMenu
