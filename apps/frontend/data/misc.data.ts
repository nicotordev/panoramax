/** Navegación principal (MVP: feed en `/events`, filtros por query cuando existan). */
const navigation = [
  { key: "home", href: "/" },
  { key: "events", href: "/events" },
  { key: "thisWeek", href: "/events?cuando=semana" },
  { key: "free", href: "/events?precio=gratis" },
] as const

export { navigation }
