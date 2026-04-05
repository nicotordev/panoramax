import type { Event } from "@/types/api"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../ui/card"

export default function EventsList({ events }: { events: Event[] }) {
  return (
    <div className="flex flex-1 flex-wrap gap-4">
      {events.map((event) => (
        <Card key={event.id} size="sm" className="w-80 flex-shrink-0">
          {event.imageUrl && (
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-40 object-cover"
              loading="lazy"
            />
          )}
          <CardHeader>
            <CardTitle>{event.title}</CardTitle>
            {event.subtitle && (
              <CardDescription>{event.subtitle}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-1">
              {event.venueName}
              {event.city ? `, ${event.city}` : ""}
              {" · "}
              {new Date(event.startAt).toLocaleString([], {
                dateStyle: "medium",
                timeStyle: event.allDay ? undefined : "short",
              })}
            </div>
            {event.summary && (
              <div className="text-sm line-clamp-2">{event.summary}</div>
            )}
          </CardContent>
          <CardFooter>
            <span
              className={`px-2 py-0.5 rounded text-xs ${
                event.isFree
                  ? "bg-green-200 text-green-800"
                  : "bg-blue-200 text-blue-800"
              }`}
            >
              {event.isFree ? "Free" : event.priceText ?? "Paid"}
            </span>
            {!!event.categoryPrimary && (
              <span className="ml-auto px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                {event.categoryPrimary.replace("_", " ")}
              </span>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
