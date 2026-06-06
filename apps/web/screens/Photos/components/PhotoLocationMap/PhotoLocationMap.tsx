"use client"

import { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
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

interface PhotoLocationMapProps {
  lat: number
  lng: number
}

/** A small, static map with a single marker for a photo's capture location. */
const PhotoLocationMap = ({ lat, lng }: PhotoLocationMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: [lng, lat],
      zoom: 12,
      attributionControl: false,
      interactive: false,
    })
    const marker = document.createElement("div")
    marker.className = "size-3.5 rounded-full bg-primary shadow-lg ring-2 ring-background"
    new maplibregl.Marker({ element: marker }).setLngLat([lng, lat]).addTo(map)
    return () => map.remove()
  }, [lat, lng])

  return <div ref={containerRef} className="h-40 w-full overflow-hidden rounded-lg" />
}

export default PhotoLocationMap
