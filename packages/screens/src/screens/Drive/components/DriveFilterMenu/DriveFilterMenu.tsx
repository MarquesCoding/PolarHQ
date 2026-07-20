import { useTranslation } from "react-i18next"
import { Check, FunnelSimple, Heart } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { setDriveFilter } from "@workspace/screens/store/uiSlice"
import { useAppDispatch, useAppSelector } from "@workspace/screens/store/hooks"
import { STORAGE_KINDS } from "@pages/Drive/nodeKind"

/** Filter control: keep only certain file kinds and/or favourites. Its own toolbar bubble. */
const DriveFilterMenu = () => {
  const { t } = useTranslation("drive")
  const dispatch = useAppDispatch()
  const filter = useAppSelector((state) => state.ui.driveFilter)
  const active = filter.kinds.length > 0 || filter.favoritesOnly

  const toggleKind = (kind: (typeof STORAGE_KINDS)[number]) =>
    dispatch(
      setDriveFilter({
        ...filter,
        kinds: filter.kinds.includes(kind)
          ? filter.kinds.filter((k) => k !== kind)
          : [...filter.kinds, kind],
      }),
    )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("toolbar.filter.label")}
            className="rounded-full"
          >
            <FunnelSimple className={active ? "text-primary size-4" : "size-4"} weight={active ? "fill" : "regular"} />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => dispatch(setDriveFilter({ ...filter, favoritesOnly: !filter.favoritesOnly }))}
          className="justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <Heart className="size-4" weight={filter.favoritesOnly ? "fill" : "regular"} />
            {t("toolbar.filter.favorites")}
          </span>
          {filter.favoritesOnly ? <Check className="size-4" weight="bold" /> : null}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {STORAGE_KINDS.map((kind) => (
          <DropdownMenuItem
            key={kind}
            onClick={() => toggleKind(kind)}
            className="justify-between gap-2"
          >
            {t(`overview.kinds.${kind}`)}
            {filter.kinds.includes(kind) ? <Check className="size-4" weight="bold" /> : null}
          </DropdownMenuItem>
        ))}

        {active ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => dispatch(setDriveFilter({ kinds: [], favoritesOnly: false }))}
              className="text-muted-foreground"
            >
              {t("toolbar.filter.reset")}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default DriveFilterMenu
