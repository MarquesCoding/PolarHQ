"use client"

import { useEffect, useRef } from "react"
import { fetchPhotoPoints, runLocationBackfill } from "@lib/photoMap"
import { useQuery } from "@tanstack/react-query"
import { PageSpinner } from "@components/Spinner/Spinner"
import maplibregl from "maplibre-gl"
import Supercluster from "supercluster"
import "maplibre-gl/dist/maplibre-gl.css"

const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap © CARTO",
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
}

const PhotoMap = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])

  const { data: points, isLoading } = useQuery({
    queryKey: ["photos", "map-points"],
    queryFn: fetchPhotoPoints,
  })

  useEffect(() => {
    void runLocationBackfill()
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return
    const map = new maplibregl.Map({
      container,
      style: DARK_STYLE,
      center: [0, 20],
      zoom: 1.4,
      attributionControl: { compact: true },
    })
    map.addControl(new maplibregl.NavigationControl(), "top-left")
    mapRef.current = map
    const observer = new ResizeObserver(() => map.resize())
    observer.observe(container)
    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !points) return

    const index = new Supercluster<{ assetId: string }>({ radius: 64, maxZoom: 17 }).load(
      points.map((p) => ({
        type: "Feature",
        properties: { assetId: p.assetId },
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      })),
    )

    const render = () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      const bounds = map.getBounds()
      const bbox: [number, number, number, number] = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ]
      const clusters = index.getClusters(bbox, Math.round(map.getZoom()))
      for (const cluster of clusters) {
        const [lng, lat] = cluster.geometry.coordinates as [number, number]
        const el = document.createElement("div")
        const props = cluster.properties as { cluster?: boolean; point_count?: number }
        if (props.cluster) {
          el.textContent = String(props.point_count ?? "")
          el.className =
            "flex items-center justify-center rounded-full bg-primary/90 text-primary-foreground text-xs font-semibold shadow-lg cursor-pointer ring-2 ring-background/40"
          const size = 30 + Math.min(24, Math.log2((props.point_count ?? 1) + 1) * 6)
          el.style.width = `${size}px`
          el.style.height = `${size}px`
          el.addEventListener("click", () => {
            const zoom = index.getClusterExpansionZoom(cluster.id as number)
            map.easeTo({ center: [lng, lat], zoom })
          })
        } else {
          el.className =
            "size-3.5 rounded-full bg-primary shadow-lg ring-2 ring-background cursor-pointer"
        }
        const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map)
        markersRef.current.push(marker)
      }
    }

    const onReady = () => {
      if (points.length > 0) {
        const lons = points.map((p) => p.lng)
        const lats = points.map((p) => p.lat)
        map.fitBounds(
          [
            [Math.min(...lons), Math.min(...lats)],
            [Math.max(...lons), Math.max(...lats)],
          ],
          { padding: 80, maxZoom: 12, duration: 0 },
        )
      }
      render()
    }

    if (map.loaded()) onReady()
    else map.once("load", onReady)
    map.on("moveend", render)
    return () => {
      map.off("moveend", render)
    }
  }, [points])

  return (
    <div className="relative min-h-0 flex-1">
      {isLoading ? (
        <PageSpinner />
      ) : points && points.length === 0 ? (
        <div className="text-muted-foreground absolute inset-0 z-10 flex items-center justify-center text-sm">
          No photos with location data yet.
        </div>
      ) : null}
      <div ref={containerRef} className="absolute inset-0 overflow-hidden rounded-xl" />
    </div>
  )
}

export default PhotoMap
