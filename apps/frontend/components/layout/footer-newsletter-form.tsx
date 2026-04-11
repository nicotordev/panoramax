"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type FooterNewsletterFormProps = {
  className?: string
}

export function FooterNewsletterForm({ className }: FooterNewsletterFormProps) {
  const t = useTranslations("Footer")

  return (
    <form
      className={cn("mt-6 sm:flex sm:max-w-md sm:items-start sm:gap-3", className)}
      onSubmit={(event) => {
        event.preventDefault()
      }}
    >
      <label htmlFor="footer-email" className="sr-only">
        {t("emailLabel")}
      </label>
      <Input
        id="footer-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder={t("emailPlaceholder")}
        className="sm:min-w-0 sm:flex-1 sm:max-w-64 xl:max-w-none"
      />
      <div className="mt-3 sm:mt-0 sm:shrink-0">
        <Button type="submit" className="w-full sm:w-auto">
          {t("subscribe")}
        </Button>
      </div>
    </form>
  )
}
