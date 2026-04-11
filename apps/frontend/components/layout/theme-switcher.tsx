"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { IconCheck } from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"
import { HiComputerDesktop, HiMoon, HiSun } from "react-icons/hi2"

type ThemeSwitcherProps = {
  /** `darkNav`: glass header with light icons. `default`: sheet / standard surfaces. */
  variant?: "darkNav" | "default"
}

export default function ThemeSwitcher({
  variant = "default",
}: ThemeSwitcherProps) {
  const t = useTranslations("Navigation")
  const { theme, setTheme, resolvedTheme } = useTheme()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const triggerClass =
    variant === "darkNav"
      ? "text-white/90 hover:bg-white/10 hover:text-white aria-expanded:bg-white/15"
      : undefined

  const TriggerIcon =
    theme === "system"
      ? resolvedTheme === "dark"
        ? HiMoon
        : HiSun
      : theme === "dark"
        ? HiMoon
        : HiSun

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn(triggerClass)}
        disabled
        aria-hidden
      >
        <span className="size-5 rounded-full bg-current opacity-20" />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(triggerClass)}
            aria-label={t("themeMenu")}
          />
        }
      >
        <TriggerIcon className="size-5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="cursor-pointer gap-2"
        >
          <HiSun className="size-4 shrink-0" aria-hidden />
          <span className="flex-1">{t("themeLight")}</span>
          {theme === "light" ? (
            <IconCheck className="size-4 shrink-0 opacity-80" aria-hidden />
          ) : null}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="cursor-pointer gap-2"
        >
          <HiMoon className="size-4 shrink-0" aria-hidden />
          <span className="flex-1">{t("themeDark")}</span>
          {theme === "dark" ? (
            <IconCheck className="size-4 shrink-0 opacity-80" aria-hidden />
          ) : null}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="cursor-pointer gap-2"
        >
          <HiComputerDesktop className="size-4 shrink-0" aria-hidden />
          <span className="flex-1">{t("themeSystem")}</span>
          {theme === "system" ? (
            <IconCheck className="size-4 shrink-0 opacity-80" aria-hidden />
          ) : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
