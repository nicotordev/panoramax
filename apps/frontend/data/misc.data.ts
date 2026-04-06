/** Navegación principal (MVP: feed en `/events`, filtros por query cuando existan). */
const navigation = [
  { name: "Inicio", href: "/" },
  { name: "Eventos", href: "/events" },
  { name: "Esta semana", href: "/events?cuando=semana" },
  { name: "Gratis", href: "/events?precio=gratis" },
] as const

export { navigation }
