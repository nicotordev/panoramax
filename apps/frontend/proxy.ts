import { routing } from "@/i18n/routing"
import {
  clerkClient,
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server"
import createIntlMiddleware from "next-intl/middleware"
import { NextResponse } from "next/server"

const assetsMatcher = createRouteMatcher([
  "/(.*).(webm|mp4|mov|avi|mkv|flv|wmv|m4v|jpg|jpeg|png|webp|gif|svg|avif|ico|bmp|heic|heif|apng|pdf|doc|docx|xls|xlsx|ppt|pptx|csv|txt|ttf|woff|woff2|eot|otf|zip|tar|gz|rar|7z|xml|json|yaml|yml|md|webmanifest)",
])

function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean)
  const [first, ...rest] = segments
  if (
    first &&
    routing.locales.includes(first as (typeof routing.locales)[number])
  ) {
    return `/${rest.join("/")}` || "/"
  }
  return pathname
}

function localePrefixFromPath(pathname: string): string {
  const first = pathname.split("/").filter(Boolean)[0]
  if (
    first &&
    first !== routing.defaultLocale &&
    routing.locales.includes(first as (typeof routing.locales)[number])
  ) {
    return `/${first}`
  }
  return ""
}

const intlMiddleware = createIntlMiddleware(routing)

export default clerkMiddleware(async (auth, req) => {
  // 1. Permitir el paso de assets estáticos inmediatamente
  if (assetsMatcher(req)) {
    return NextResponse.next()
  }

  const pathname = req.nextUrl.pathname
  const normalizedPath = stripLocalePrefix(pathname)
  const localePrefix = localePrefixFromPath(pathname)

  const isDashboardRoute = normalizedPath.startsWith("/dashboard")
  const isAdminDashboardRoute = normalizedPath.startsWith("/admin/dashboard")

  // 2. Proteger rutas privadas
  if (isDashboardRoute || isAdminDashboardRoute) {
    await auth.protect()
  }

  // 3. Validar rol admin en /admin/dashboard
  if (isAdminDashboardRoute) {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.redirect(
        new URL(`${localePrefix}/auth/sign-in`, req.url)
      )
    }
    const actualClerkClient = await clerkClient()
    const actualUser = await actualClerkClient.users.getUser(userId)

    if (actualUser.publicMetadata.role !== "admin") {
      return NextResponse.redirect(
        new URL(`${localePrefix}/dashboard`, req.url)
      )
    }
  }

  // Delegar rutas públicas a next-intl. Evita loops por redirects
  // a rutas de auth no implementadas en esta app.
  return intlMiddleware(req)
})

export const config = {
  matcher: [
    // Excluir todos los assets estáticos internos de Next.js, incluyendo .json
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|json|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|webm|mp4)).*)",
    "/(api|trpc)(.*)",
  ],
}
