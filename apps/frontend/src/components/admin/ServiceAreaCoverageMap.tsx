"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const UK_CENTER: L.LatLngTuple = [54.35, -2.8];
const DEFAULT_ZOOM = 6;
const DETAIL_ZOOM = 11;

const MI_TO_M = 1609.344;

export { MI_TO_M };

export function metresToUnitDisplay(metres: number | null, unit: "mi" | "km"): number | null {
  if (metres === null || metres <= 0 || !Number.isFinite(metres)) return null;
  return unit === "mi" ? metres / MI_TO_M : metres / 1000;
}

export function unitInputToMetres(value: number | null, unit: "mi" | "km"): number | null {
  if (value === null || !Number.isFinite(value) || value <= 0) return null;
  const m = unit === "mi" ? value * MI_TO_M : value * 1000;
  return Math.min(500_000, Math.max(50, Math.round(m)));
}

type MapClickHandlerProps = {
  disabled: boolean;
  onPick: (lat: number, lng: number) => void;
};

function MapClickHandler({ disabled, onPick }: MapClickHandlerProps): null {
  useMapEvents({
    click(e) {
      if (!disabled) onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

type FitCentreProps = {
  centre: L.LatLngTuple | null;
};
function FitCentre({ centre }: FitCentreProps): null {
  const map = useMap();
  useEffect(() => {
    if (centre) {
      map.setView(centre, DETAIL_ZOOM);
    } else {
      map.setView(UK_CENTER, DEFAULT_ZOOM);
    }
  }, [centre, map]);
  return null;
}

const centreDotIcon = L.divIcon({
  className: "service-area-centre-icon",
  html: '<div style="width:14px;height:14px;background:#2563eb;border:2px solid #fff;border-radius:999px;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export type ServiceAreaCoverageMapProps = {
  centreLat: number | null;
  centreLng: number | null;
  radiusMetres: number | null;
  interactive: boolean;
  onCentreChange: (lat: number | null, lng: number | null) => void;
};

export function ServiceAreaCoverageMap({
  centreLat,
  centreLng,
  radiusMetres,
  interactive,
  onCentreChange,
}: ServiceAreaCoverageMapProps) {
  const centre: L.LatLngTuple | null = useMemo(() => {
    if (
      centreLat !== null &&
      centreLng !== null &&
      Number.isFinite(centreLat) &&
      Number.isFinite(centreLng)
    ) {
      return [centreLat, centreLng];
    }
    return null;
  }, [centreLat, centreLng]);

  const mapCentre = centre ?? UK_CENTER;
  const zoom = centre ? DETAIL_ZOOM : DEFAULT_ZOOM;

  const onPick = useCallback(
    (lat: number, lng: number) => {
      onCentreChange(lat, lng);
    },
    [onCentreChange],
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
      <div className="relative h-[340px] w-full [&_.leaflet-control-attribution]:text-[10px]">
        <MapContainer center={mapCentre} zoom={zoom} className="h-full w-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitCentre centre={centre} />
          <MapClickHandler disabled={!interactive} onPick={onPick} />
          {centre !== null ? (
            <>
              <Marker
                position={centre}
                draggable={interactive}
                icon={centreDotIcon}
                eventHandlers={{
                  dragend: (e) => {
                    const ll = e.target.getLatLng();
                    onCentreChange(ll.lat, ll.lng);
                  },
                }}
              />
              {radiusMetres !== null && radiusMetres >= 50 ? (
                <Circle
                  center={centre}
                  radius={radiusMetres}
                  pathOptions={{ color: "#2563eb", weight: 2, fillOpacity: 0.12 }}
                />
              ) : null}
            </>
          ) : null}
        </MapContainer>
      </div>
      <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
        {interactive
          ? "Click the map or drag the pin to set the service centre. Coverage circle uses straight-line (great-circle) distance."
          : "Read-only map preview."}{" "}
        Basemap: OpenStreetMap (no API key).
      </p>
    </div>
  );
}
