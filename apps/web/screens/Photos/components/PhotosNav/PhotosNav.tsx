"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { Icon } from "@lib/icons"
import { fetchAlbums, fetchTags } from "@lib/photos"
import { IconChevronRight } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@polarhq/ui/components/button"
import { cn } from "@polarhq/ui/lib/utils"
import { ActiveBg, NavRow, SectionLabel, navRowClass } from "@components/FlatShell"

const isActive = (pathname: string, href: string): boolean =>
  href === "/photos" ? pathname === href : pathname.startsWith(href)

/** Photos-specific nav rows (library + expandable albums + tags) for the shared FlatSidebar. */
const PhotosNav = () => {
  const { t } = useTranslation("photos")
  const pathname = usePathname()
  const NAV = [
    { href: "/photos", label: t("photosNav.allPhotos"), icon: "images-3" },
    { href: "/photos/albums", label: t("photosNav.albums"), icon: "album-3" },
    { href: "/photos/map", label: t("photosNav.map"), icon: "map-pin" },
    { href: "/photos/favourites", label: t("photosNav.favourites"), icon: "favourites" },
    { href: "/photos/trash", label: t("photosNav.trash"), icon: "trash" },
  ]
  const { data: albums } = useQuery({ queryKey: ["photos", "albums"], queryFn: fetchAlbums })
  const { data: tags } = useQuery({ queryKey: ["photos", "tags"], queryFn: fetchTags })
  const [albumsOpen, setAlbumsOpen] = useState(true)

  return (
    <>
      <SectionLabel>{t("photosNav.library")}</SectionLabel>
      {NAV.map((item) => {
        const active = isActive(pathname, item.href)
        if (item.icon === "album-3" && albums && albums.length > 0) {
          return (
            <div key={item.href}>
              <div className={navRowClass(active)}>
                {active ? <ActiveBg /> : null}
                <Icon name={item.icon} className="relative size-[18px] shrink-0" />
                <Link href={item.href} className="relative min-w-0 flex-1 truncate">
                  {item.label}
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={albumsOpen ? t("photosNav.collapse") : t("photosNav.expand")}
                  className="relative -me-1 size-5"
                  onClick={() => setAlbumsOpen((value) => !value)}
                >
                  <IconChevronRight
                    className={cn("size-3.5 transition-transform", albumsOpen && "rotate-90")}
                  />
                </Button>
              </div>
              {albumsOpen ? (
                <ul className="border-border/50 mt-0.5 ms-[18px] flex flex-col gap-0.5 border-s ps-2.5">
                  {albums.slice(0, 8).map((album) => (
                    <li key={album.id}>
                      <Link
                        href={`/photos/albums/${album.id}`}
                        className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40 flex items-center justify-between gap-2 rounded-md px-2 py-1 text-[13px] transition"
                      >
                        <span className="truncate">{album.name}</span>
                        <span className="shrink-0 opacity-60">{album.assetCount}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )
        }
        return (
          <NavRow
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={active}
          />
        )
      })}

      {tags && tags.length > 0 ? (
        <>
          <SectionLabel>{t("photosNav.tags")}</SectionLabel>
          {tags.map((tag) => (
            <NavRow
              key={tag.id}
              href={`/photos/tags/${tag.id}`}
              icon="tag"
              label={tag.name}
              active={pathname === `/photos/tags/${tag.id}`}
              compact
            />
          ))}
        </>
      ) : null}
    </>
  )
}

export default PhotosNav
