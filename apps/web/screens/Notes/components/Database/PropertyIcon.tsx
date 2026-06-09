import {
  IconCalendar,
  IconCheckbox,
  IconChevronDown,
  IconHash,
  IconLetterT,
  IconLink,
  IconList,
} from "@tabler/icons-react"
import type { PropType } from "./model"

/** The icon representing a property's value type. */
export const PropertyIcon = ({ type, className }: { type: PropType; className?: string }) => {
  switch (type) {
    case "number":
      return <IconHash className={className} />
    case "select":
      return <IconChevronDown className={className} />
    case "multiSelect":
      return <IconList className={className} />
    case "checkbox":
      return <IconCheckbox className={className} />
    case "date":
      return <IconCalendar className={className} />
    case "url":
      return <IconLink className={className} />
    default:
      return <IconLetterT className={className} />
  }
}
