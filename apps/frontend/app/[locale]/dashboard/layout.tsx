import { Badge } from "@/components/ui/badge"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { CalendarDays, Compass, Home, Settings, Ticket } from "lucide-react"
import { RandomBackground } from "../../../components/common/dashboard-background"

type DashboardLayoutProps = {
  children: React.ReactNode
}

const dashboardLinks = [
  { href: "/dashboard", label: "Resumen", icon: Home },
  { href: "/events", label: "Explorar eventos", icon: Compass },
  { href: "/this-week", label: "Esta semana", icon: CalendarDays },
  { href: "/dashboard/tickets", label: "Mis tickets", icon: Ticket },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings },
] as const

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="relative min-h-screen">
      <RandomBackground />
      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl animate-in grid-cols-1 px-4 py-4 duration-300 fade-in-0 zoom-in-95 md:gap-6 lg:grid-cols-[260px_1fr] lg:p-6">
        <aside className="flex flex-col gap-6 rounded-3xl border border-white/20 bg-background/60 p-5 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-black/40">
          <div className="flex animate-in items-center justify-between duration-300 fade-in-0 zoom-in-95">
            <Link href="/" className="text-xl font-bold tracking-tight">
              Panoramax
            </Link>
            <Badge
              variant="secondary"
              className="bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary hover:bg-primary/30"
            >
              Beta
            </Badge>
          </div>

          <nav className="grid gap-1.5">
            {dashboardLinks.map((item) => {
              const Icon = item.icon
              const isDefault = item.href === "/dashboard"
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isDefault
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "text-muted-foreground hover:bg-foreground/10 hover:text-foreground active:scale-95"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-white/20 bg-background/60 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-black/40">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border/30 bg-background/40 px-6 py-5 backdrop-blur-md dark:bg-black/20">
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Dashboard
              </p>
              <h1 className="text-2xl font-bold tracking-tight">
                Panel de usuario
              </h1>
            </div>
            <Link
              href="/events"
              className="rounded-xl border border-primary/30 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:shadow-lg hover:shadow-primary/25 active:scale-95"
            >
              Ver eventos
            </Link>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:p-8">
            {children}
          </main>
        </section>
      </div>
    </div>
  )
}
