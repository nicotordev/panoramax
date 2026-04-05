"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { HiOutlineBars3 } from "react-icons/hi2"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import Logo from "../common/logo"
import { HiOutlineXMark } from "react-icons/hi2"
import { navigation } from "@/data/misc.data"


export default function MobileMenu() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
          aria-label="Open main menu"
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
            <Logo />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-foreground"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <HiOutlineXMark className="size-6" aria-hidden />
            </Button>
          </div>
          <div className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-border">
              <div className="space-y-2 py-6">
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-foreground hover:bg-accent"
                  >
                    {item.name}
                  </a>
                ))}
              </div>
              <div className="py-6">
                <a
                  href="#"
                  className="-mx-3 block rounded-lg px-3 py-2.5 text-base/7 font-semibold text-foreground hover:bg-accent"
                >
                  Log in
                </a>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
