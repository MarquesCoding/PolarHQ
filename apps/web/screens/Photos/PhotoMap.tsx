import { useEffect, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { fetchPhotoPoints, runLocationBackfill } from "@lib/photoMap"
import { useQuery } from "@tanstack/react-query"
import { PageSpinner } from "@components/Spinner/Spinner"
import { Map, MapClusterLayer, MapControls, type MapRef } from "@workspace/ui/components/map"

const PhotoMap = () => {
  const { t } = useTranslation("photos")
  const mapRef = useRef<MapRef | null>(null)

  const { data: points, isLoading } = useQuery({
    queryKey: ["photos", "map-points"],
    queryFn: fetchPhotoPoints,
  })

  useEffect(() => {
    void runLocationBackfill()
  }, [])

  const data = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point, { assetId: string }>>(
    () => ({
      type: "FeatureCollection",
      features: (points ?? []).map((point) => ({
        type: "Feature",
        properties: { assetId: point.assetId },
        geometry: { type: "Point", coordinates: [point.lng, point.lat] },
      })),
    }),
    [points],
  )

  useEffect(() => {
    const map = mapRef.current
    if (!map || !points || points.length === 0) return
    const fit = () => {
      const lons = points.map((point) => point.lng)
      const lats = points.map((point) => point.lat)
      map.fitBounds(
        [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ],
        { padding: 80, maxZoom: 12, duration: 0 },
      )
    }
    if (map.loaded()) fit()
    else map.once("load", fit)
  }, [points])

  return (
    <div className="relative w-full" style={{ height: "calc(100svh - 8rem)", minHeight: 420 }}>
      <Map ref={mapRef} className="rounded-xl">
        <MapControls position="top-left" />
        {points && points.length > 0 ? (
          <MapClusterLayer
            data={data}
            clusterRadius={64}
            clusterMaxZoom={17}
            clusterColors={["#5aa9ff", "#2f86e0", "#1f7ce8"]}
            pointColor="#5aa9ff"
          />
        ) : null}
      </Map>
      {isLoading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <PageSpinner />
        </div>
      ) : points && points.length === 0 ? (
        <div className="text-muted-foreground absolute inset-0 z-10 flex items-center justify-center text-sm">
          {t("photoMap.noLocationData")}
        </div>
      ) : null}
    </div>
  )
}

export default PhotoMap
