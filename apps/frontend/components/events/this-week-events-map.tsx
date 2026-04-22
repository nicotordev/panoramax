"use client"

import { buttonVariants } from "@/data/variants.data";
import { Link } from "@/i18n/navigation"
import { eventCardTitle, eventCoordinates } from "@/lib/event-display"
import { cn } from "@/lib/utils";
import type { Event } from "@/types/api"
import type { LatLngExpression } from "leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { useTranslations } from "next-intl"
import Image from "next/image";
import { useEffect, useMemo } from "react"
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet"

type PlacedEvent = {
  event: Event
  position: LatLngExpression
}

function createEventPinIcon() {
  return L.divIcon({
    className: "this-week-map-pin",
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -34],
    html: `
      <div style="position: relative; width: 30px; height: 42px; display: flex; align-items: flex-start; justify-content: center;">
        <span style="position: absolute; top: 2px; left: 50%; width: 22px; height: 22px; transform: translateX(-50%); border-radius: 999px; background: rgba(124, 58, 237, 0.22);"></span>
        <span style="position: absolute; top: 6px; left: 50%; width: 18px; height: 18px; transform: translateX(-50%) rotate(-45deg); border-radius: 999px 999px 999px 2px; background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); box-shadow: 0 7px 18px rgba(91, 33, 182, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.28);"></span>
        <span style="position: absolute; top: 11px; left: 50%; width: 8px; height: 8px; transform: translateX(-50%); border-radius: 999px; background: rgba(255, 255, 255, 0.95);"></span>
      </div>
    `,
  })
}

function FitBounds({ positions }: { positions: LatLngExpression[] }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length === 0) return
    if (positions.length === 1) {
      const p = positions[0]
      const lat = Array.isArray(p) ? p[0] : p.lat
      const lng = Array.isArray(p) ? p[1] : p.lng
      map.setView([lat, lng], 13)
      return
    }
    const bounds = L.latLngBounds(positions)
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 })
  }, [map, positions])
  return null
}

export type ThisWeekEventsMapProps = {
  events: Event[]
}

export function ThisWeekEventsMap({ events }: ThisWeekEventsMapProps) {
  const t = useTranslations("ThisWeekPage")
  const pinIcon = useMemo(() => createEventPinIcon(), [])

  const placed = useMemo(() => {
    const list: PlacedEvent[] = []
    for (const event of events) {
      const c = eventCoordinates(event)
      if (!c) continue
      list.push({ event, position: [c.lat, c.lng] })
    }
    return list
  }, [events])

  if (placed.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/20 bg-background/40 px-6 py-12 text-center backdrop-blur-xl dark:border-white/10 dark:bg-black/40">
        <p className="max-w-md text-sm font-medium text-muted-foreground">
          {t("mapNoCoordinates")}
        </p>
      </div>
    )
  }

  const positions = placed.map((p) => p.position)

  return (
    <div className="overflow-hidden rounded-3xl border border-white/20 shadow-2xl dark:border-white/10">
      <MapContainer
        className="z-0 h-[min(70vh,520px)] w-full [&_.leaflet-control-attribution]:text-[10px]"
        center={positions[0] as [number, number]}
        zoom={12}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          referrerPolicy="strict-origin-when-cross-origin"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds positions={positions} />
        {placed.map(({ event, position }) => (
          <Marker key={event.id} icon={pinIcon} position={position}>
            <Popup className="[&_.leaflet-popup-content]:m-0! [&_.leaflet-popup-content]:min-w-[220px] [&_.leaflet-popup-content]:p-0 [&_.leaflet-popup-content-wrapper]:rounded-2xl [&_.leaflet-popup-content-wrapper]:bg-white/95 [&_.leaflet-popup-content-wrapper]:shadow-xl">
              <div className="space-y-3 rounded-2xl border border-black/5 px-4 py-3 text-sm">
                {event.imageUrl ? (
                  <div className="mb-2 rounded-xl overflow-hidden border border-gray-200">
                    {/* Next.js Image is not usable here - using a plain img */}
                    <Image
                      src={event.imageUrl}
                      alt={eventCardTitle(event)}
                      className="w-full h-24 object-cover"
                      style={{ maxWidth: "100%", borderRadius: "0.75rem 0.75rem 0 0" }}
                      width={220}
                      height={120}
                    />
                  </div>
                ) : null}
                <p className="text-[13px] leading-snug font-semibold text-slate-900">
                  {eventCardTitle(event)}
                </p>
                {event.venueName || event.commune ? (
                  <p className="text-xs text-muted-foreground">
                    {[event.venueName, event.commune].filter(Boolean).join(", ")}
                  </p>
                ) : null}
                <Link
                  href={`/events/${event.slug}`}
                  className={cn(buttonVariants({ variant: "default" }), "text-white!")}
                >
                  {t("mapViewEvent")}
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}


      </MapContainer>
    </div>
  )
}
