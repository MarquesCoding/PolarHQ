"use client"

import { usePathname } from "@lib/router"
import { useTranslation } from "react-i18next"
import { type DocType, editorHref, editorOpensNewTab, fetchDocs } from "@polarhq/vault/docs"
import { useQuery } from "@tanstack/react-query"
import { NavRow, SectionLabel } from "@components/FlatShell"

export interface CollabNavConfig {
  type: DocType
  route: string
  icon: string
  navLabel: string
  listLabel: string
}

/** Shared nav for the collaborative apps (Docs / Sheets / Whiteboards): a home row plus the
 *  user's document list. Differs from app to app only by the config props. */
const CollabNav = ({ type, route, icon, navLabel, listLabel }: CollabNavConfig) => {
  const { t } = useTranslation("collab")
  const pathname = usePathname()
  const { data } = useQuery({ queryKey: ["docs", type], queryFn: () => fetchDocs(type) })
  const items = [...(data?.documents ?? []), ...(data?.shared ?? [])]

  return (
    <>
      <SectionLabel>{t("collabNav.library")}</SectionLabel>
      <NavRow href={route} icon={icon} label={navLabel} active={pathname === route} />

      {items.length > 0 ? (
        <>
          <SectionLabel>{listLabel}</SectionLabel>
          {items.map((item) => (
            <NavRow
              key={item.id}
              href={editorHref(type, item.id)}
              newTab={editorOpensNewTab(type)}
              icon={icon}
              label={item.name}
              active={pathname === `${route}/${item.id}`}
              compact
            />
          ))}
        </>
      ) : null}
    </>
  )
}

export default CollabNav
