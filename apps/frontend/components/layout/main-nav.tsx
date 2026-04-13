"use client"

import { navigation } from "@/data/misc.data"
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { HiArrowLongRight } from "react-icons/hi2"
import Logo from "../common/logo"
import MobileMenu from "../home/mobile-menu"
import ThemeSwitcher from "./theme-switcher"

export default function MainNav() {
  const t = useTranslations("HomePage")
  const { isSignedIn, isLoaded, sessionClaims } = useAuth()
  const userRole =
    (sessionClaims?.metadata as { role?: string } | undefined)?.role ??
    (sessionClaims?.public_metadata as { role?: string } | undefined)?.role
  const dashboardHref = userRole === "admin" ? "/admin/dashboard" : "/dashboard"

  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <div className="flex lg:flex-1">
          <Logo className="h-9 w-auto brightness-0 invert" />{" "}
          {/* Asegura que el logo sea blanco sobre el video */}
        </div>

        <div className="flex items-center gap-1.5 lg:hidden">
          <ThemeSwitcher variant="darkNav" />
          <MobileMenu />
        </div>

        <div className="hidden lg:flex lg:gap-x-10">
          {navigation.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="text-sm font-semibold text-white/90 transition-all hover:scale-105 hover:text-primary"
            >
              {t(item.key)}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-end lg:gap-3">
          <ThemeSwitcher variant="darkNav" />
          {isLoaded &&
            (isSignedIn ? (
              <>
                <Link
                  href={dashboardHref}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-primary/50 hover:text-primary"
                >
                  Dashboard
                </Link>
                {userRole === "admin" && (
                  <Link
                    href="/admin/dashboard"
                    className="rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
                  >
                    Admin
                  </Link>
                )}
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "size-9 ring-2 ring-white/20",
                    },
                  }}
                />
              </>
            ) : (
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="group relative inline-flex cursor-pointer items-center gap-2 overflow-hidden rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:pr-8 hover:shadow-[0_0_25px_var(--cta-glow-inner)]"
                >
                  <span>{t("login")}</span>
                  <HiArrowLongRight className="size-4 transition-all group-hover:translate-x-1" />
                </button>
              </SignInButton>
            ))}
        </div>
      </nav>
    </header>
  )
}
