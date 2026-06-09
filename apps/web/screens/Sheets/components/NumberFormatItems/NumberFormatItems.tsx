"use client"

import { Fragment } from "react"
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@workspace/ui/components/dropdown-menu"
import { NUMBER_FORMAT_GROUPS } from "@pages/Sheets/sheetModel"
import type { SheetController } from "@pages/Sheets/useSheet"

/** The shared "123" number-format menu (Automatic, Number, Currency, Date, … + decimals). */
const NumberFormatItems = ({ sheet }: { sheet: SheetController }) => (
  <>
    {NUMBER_FORMAT_GROUPS.map((group, gi) => (
      <Fragment key={gi}>
        {gi > 0 ? <DropdownMenuSeparator /> : null}
        {group.map((option) => (
          <DropdownMenuItem
            key={option.label}
            className="justify-between gap-8"
            onClick={() => sheet.applyFormat({ fmt: option.fmt, dec: undefined })}
          >
            <span>{option.label}</span>
            {option.example ? (
              <span className="text-muted-foreground text-xs tabular-nums">{option.example}</span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </Fragment>
    ))}
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => sheet.adjustDecimals(1)}>Increase decimal places</DropdownMenuItem>
    <DropdownMenuItem onClick={() => sheet.adjustDecimals(-1)}>Decrease decimal places</DropdownMenuItem>
  </>
)

export default NumberFormatItems
