"use client"

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { navigation } from "@/data/misc.data"
import { Link } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { HiOutlineBars3, HiOutlineXMark } from "react-icons/hi2"
import Logo from "../common/logo"
import ThemeSwitcher from "../layout/theme-switcher"

export default function MobileMenu() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const t = useTranslations("Navigation")
  const { isSignedIn, isLoaded } = useAuth()

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const onChange = () => {
      if (mq.matches) setMobileMenuOpen(false)
    }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  return (
    <>
      <div className="flex lg:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-foreground"
          onClick={() => setMobileMenuOpen(true)}
          aria-label={t("openMainMenu")}
        >
          <HiOutlineBars3 className="size-6" aria-hidden />
        </Button>
      </div>
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full gap-0 overflow-y-auto p-6 sm:max-w-sm"
        >
          <div className="flex items-center justify-between">
            <Logo className="h-9 w-auto brightness-0 invert" />
            <div className="flex items-center gap-1">
              <ThemeSwitcher variant="default" />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-foreground"
                onClick={() => setMobileMenuOpen(false)}
                aria-label={t("closeMenu")}
              >
                <HiOutlineXMark className="size-6" aria-hidden />
              </Button>
            </div>
          </div>
          <div className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-border">
              <div className="space-y-2 py-6">
                {navigation.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-foreground hover:bg-accent"
                  >
                    {t(item.key)}
                  </Link>
                ))}
              </div>
              <div className="py-6">
                {isLoaded &&
                  (isSignedIn ? (
                    <div className="-mx-3 flex justify-center rounded-lg px-3 py-2">
                      <UserButton />
                    </div>
                  ) : (
                    <SignInButton mode="modal">
                      <button
                        type="button"
                        className="-mx-3 block w-full rounded-lg px-3 py-2.5 text-left text-base/7 font-semibold text-foreground hover:bg-accent"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {t("login")}
                      </button>
                    </SignInButton>
                  ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
