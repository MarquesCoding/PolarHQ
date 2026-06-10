"use client"

import { Fragment } from "react"
import { useTranslation } from "react-i18next"
import Link from "next/link"
import type { DriveNode } from "@lib/drive"
import { Icon } from "@lib/icons"
import { cn } from "@workspace/ui/lib/utils"

interface BreadcrumbsProps {
  trail: DriveNode[]
}

const hrefFor = (node: DriveNode, isRoot: boolean): string =>
  isRoot ? "/drive" : `/drive/${node.id}`

const Breadcrumbs = ({ trail }: BreadcrumbsProps) => {
  const { t } = useTranslation("drive")
  return (
    <nav className="text-muted-foreground flex min-w-0 items-center gap-1 text-sm">
      {trail.map((node, index) => {
        const last = index === trail.length - 1
        const label = node.special === "root" ? t("breadcrumbs.myDrive") : node.name
        return (
          <Fragment key={node.id}>
            {index > 0 ? <Icon name="nav-forward" className="size-3.5 shrink-0 opacity-60" /> : null}
            <Link
              href={hrefFor(node, index === 0)}
              className={cn(
                "max-w-48 truncate rounded px-1.5 py-0.5 transition",
                last ? "text-foreground font-medium" : "hover:bg-sidebar-accent/60",
              )}
            >
              {label}
            </Link>
          </Fragment>
        )
      })}
    </nav>
  )
}

export default Breadcrumbs
