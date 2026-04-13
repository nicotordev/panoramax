import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Link } from "@/i18n/navigation"
import { CalendarCheck2, MapPin, Sparkles, Ticket } from "lucide-react"

const stats = [
  { label: "Eventos guardados", value: "24", delta: "+6 esta semana" },
  { label: "Asistencias confirmadas", value: "8", delta: "+2 hoy" },
  {
    label: "Ciudades exploradas",
    value: "3",
    delta: "Santiago, Valpo, Concepción",
  },
]

const upcomingEvents = [
  {
    title: "Moral Distraída",
    date: "Sáb, 18 Abr · 23:00",
    venue: "Bar Ruta 78",
    status: "confirmado",
  },
  {
    title: "Noche de Stand-up",
    date: "Vie, 25 Abr · 21:00",
    venue: "Club Chocolate",
    status: "pendiente",
  },
  {
    title: "Festival Indie Centro",
    date: "Dom, 4 May · 16:00",
    venue: "Parque O'Higgins",
    status: "guardado",
  },
]

const recentActivity = [
  "Guardaste 3 eventos nuevos en la categoría música.",
  "Actualizaste tus preferencias de ciudad a Santiago.",
  "Confirmaste asistencia para Moral Distraída.",
]

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-300">
      <Card className="relative overflow-hidden border-white/20 bg-background/50 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-black/40">
        <div className="absolute inset-0 bg-linear-to-r from-primary/10 via-transparent to-transparent" />
        <CardHeader className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <Badge className="w-fit bg-primary/20 text-primary hover:bg-primary/30">
              Tu espacio
            </Badge>
            <CardTitle className="text-2xl">
              Bienvenido de vuelta, ya tienes planes en camino
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Revisa tu agenda, confirma asistencia y encuentra algo nuevo para
              esta semana.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/events"
              className="group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            >
              Explorar eventos
            </Link>
            <Link
              href="/this-week"
              className="group/button inline-flex shrink-0 items-center justify-center rounded-md border bg-background bg-clip-padding text-sm font-medium whitespace-nowrap shadow-xs transition-all outline-none select-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-expanded:bg-muted aria-expanded:text-foreground aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:border-input dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            >
              Ver esta semana
            </Link>
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat, i) => (
          <Card key={stat.label} className="group relative overflow-hidden border-white/20 bg-background/50 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-black/40">
            <div className="absolute inset-0 bg-linear-to-b from-transparent to-muted/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div
              className={
                i === 0
                  ? "h-1.5 w-full bg-linear-to-r from-primary to-primary/50"
                  : i === 1
                    ? "h-1.5 w-full bg-linear-to-r from-chart-2 to-chart-2/50"
                    : "h-1.5 w-full bg-linear-to-r from-chart-3 to-chart-3/50"
              }
            />
            <CardHeader className="relative z-10 pb-2">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {stat.label}
              </p>
              <CardTitle className="text-3xl font-bold tracking-tight">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 pt-0 text-sm font-medium text-muted-foreground">
              {stat.delta}
            </CardContent>
          </Card>
        ))}
      </section>

      <Tabs defaultValue="upcoming">
        <TabsList variant="line">
          <TabsTrigger value="upcoming">Próximos eventos</TabsTrigger>
          <TabsTrigger value="activity">Actividad reciente</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 focus-visible:outline-none">
          <Card className="overflow-hidden border-white/20 bg-background/50 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-black/40">
            <CardHeader className="border-b border-border/30 bg-background/40 pb-4 dark:bg-black/20">
              <CardTitle className="text-lg">Agenda</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="font-semibold">Evento</TableHead>
                    <TableHead className="font-semibold">Fecha</TableHead>
                    <TableHead className="font-semibold">Lugar</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingEvents.map((event) => (
                    <TableRow key={`${event.title}-${event.date}`} className="border-border/30 hover:bg-muted/30">
                      <TableCell className="font-medium">
                        {event.title}
                       </TableCell>
                      <TableCell className="text-muted-foreground">{event.date}</TableCell>
                      <TableCell className="text-muted-foreground">{event.venue}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            event.status === "confirmado"
                              ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                              : event.status === "pendiente"
                                ? "bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                                : "bg-primary/10 capitalize text-primary"
                          }
                        >
                          {event.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4 focus-visible:outline-none">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="overflow-hidden border-white/20 bg-background/50 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-black/40">
              <CardHeader className="border-b border-border/30 bg-background/40 pb-4 dark:bg-black/20">
                <CardTitle className="text-lg">Tu actividad</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-3">
                  {recentActivity.map((item) => (
                    <li
                      key={item}
                      className="rounded-xl border border-border/40 bg-background/60 p-4 text-sm shadow-xs transition-colors hover:bg-background/80 dark:bg-black/40 dark:hover:bg-black/60"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-white/20 bg-background/50 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-black/40">
              <CardHeader className="border-b border-border/30 bg-background/40 pb-4 dark:bg-black/20">
                <CardTitle className="text-lg">Atajos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                <Link
                  href="/events"
                  className="group flex items-center gap-3 rounded-xl border border-border/40 bg-background/60 p-3 text-sm font-medium shadow-xs transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md dark:bg-black/40"
                >
                  <Sparkles className="h-5 w-5 text-primary transition-transform group-hover:scale-110 group-hover:text-primary" />
                  Descubrir recomendaciones
                </Link>
                <Link
                  href="/dashboard/tickets"
                  className="group flex items-center gap-3 rounded-xl border border-border/40 bg-background/60 p-3 text-sm font-medium shadow-xs transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md dark:bg-black/40"
                >
                  <Ticket className="h-5 w-5 text-primary transition-transform group-hover:scale-110 group-hover:text-primary" />
                  Revisar mis tickets
                </Link>
                <Link
                  href="/this-week"
                  className="group flex items-center gap-3 rounded-xl border border-border/40 bg-background/60 p-3 text-sm font-medium shadow-xs transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md dark:bg-black/40"
                >
                  <CalendarCheck2 className="h-5 w-5 text-primary transition-transform group-hover:scale-110 group-hover:text-primary" />
                  Agenda de esta semana
                </Link>
                <div className="flex items-center gap-3 rounded-xl border border-border/20 bg-muted/30 p-3 text-sm font-medium text-muted-foreground">
                  <MapPin className="h-5 w-5 text-primary/70" />
                  Santiago, Chile
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
