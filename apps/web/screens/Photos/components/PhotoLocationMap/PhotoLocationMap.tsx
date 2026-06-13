"use client"

import { Map, MapMarker, MarkerContent } from "@polarhq/ui/components/map"

interface PhotoLocationMapProps {
  lat: number
  lng: number
}

/** A small, static map with a single marker for a photo's capture location. */
const PhotoLocationMap = ({ lat, lng }: PhotoLocationMapProps) => (
  <div className="h-40 w-full overflow-hidden rounded-lg">
    <Map center={[lng, lat]} zoom={12} interactive={false}>
      <MapMarker longitude={lng} latitude={lat}>
        <MarkerContent>
          <div className="bg-primary ring-background size-3.5 rounded-full shadow-lg ring-2" />
        </MarkerContent>
      </MapMarker>
    </Map>
  </div>
)

export default PhotoLocationMap
