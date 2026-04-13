"use client"

import { SignIn, SignUp } from "@clerk/nextjs"
import { useLocale, useTranslations } from "next-intl"
import Image from "next/image"
import { Link } from "@/i18n/navigation"
import Logo from "@/components/common/logo"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { routing } from "@/i18n/routing"
import { cn } from "@/lib/utils"

type AuthSplitLayoutProps = {
  mode: "sign-in" | "sign-up"
  heroSrc: string
}

function useLocalizedAuthHref(path: "/auth/sign-in" | "/auth/sign-up") {
  const locale = useLocale()
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`
  return `${prefix}${path}`
}

export function AuthSplitLayout({ mode, heroSrc }: AuthSplitLayoutProps) {
  const t = useTranslations("Auth")
  const heroAlt = mode === "sign-in" ? t("signInHeroAlt") : t("signUpHeroAlt")
  const signInHref = useLocalizedAuthHref("/auth/sign-in")
  const signUpHref = useLocalizedAuthHref("/auth/sign-up")

  const clerkAppearance = {
    elements: {
      rootBox: "w-full",
      card: "w-full gap-6 border-0 bg-transparent p-0 shadow-none",
      header: "hidden",
      formButtonPrimary:
        "bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary/90",
      socialButtonsBlockButton:
        "border border-input bg-background font-semibold text-foreground hover:bg-muted",
      formFieldInput:
        "rounded-md border border-input bg-background shadow-xs focus-visible:ring-2 focus-visible:ring-ring",
      footerAction: "hidden",
      footerActionLink: "text-primary font-semibold",
      identityPreviewEditButton: "text-primary",
      formFieldLabel: "text-foreground",
      formFieldErrorText: "text-destructive",
      dividerLine: "bg-border",
      dividerText: "text-muted-foreground",
      otpCodeFieldInput:
        "rounded-md border border-input bg-background shadow-xs",
    },
  } as const

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      {/* Left (Form) Side */}
      <div className="flex w-full flex-col justify-center px-4 py-8 sm:px-6 lg:w-1/2 lg:px-12 xl:px-24">
        <Card className="mx-auto w-full max-w-md gap-8 border-0 bg-transparent py-0 shadow-none ring-0">
          <CardHeader className="px-0">
            <Logo className="text-foreground" href="/" />
            <CardTitle className="mt-8 font-heading text-2xl font-bold tracking-tight text-foreground">
              {mode === "sign-in" ? t("signInTitle") : t("signUpTitle")}
            </CardTitle>
            <CardDescription className="mt-2 text-base">
              {mode === "sign-in" ? (
                <>
                  {t("signInSubtitle")}{" "}
                  <Link
                    href="/auth/sign-up"
                    className={cn(
                      buttonVariants({ variant: "link" }),
                      "h-auto p-0 font-semibold text-primary"
                    )}
                  >
                    {t("signInLink")}
                  </Link>
                </>
              ) : (
                <>
                  {t("signUpSubtitle")}{" "}
                  <Link
                    href="/auth/sign-in"
                    className={cn(
                      buttonVariants({ variant: "link" }),
                      "h-auto p-0 font-semibold text-primary"
                    )}
                  >
                    {t("signUpLink")}
                  </Link>
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-10 px-0">
            {mode === "sign-in" ? (
              <SignIn signUpUrl={signUpHref} appearance={clerkAppearance} />
            ) : (
              <SignUp signInUrl={signInHref} appearance={clerkAppearance} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right (Image) Side */}
      <div className="relative h-56 w-full sm:h-64 md:h-80 lg:h-auto lg:w-1/2">
        <Image
          alt={heroAlt}
          src={heroSrc}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1023px) 100vw, 50vw"
        />
        {/* Overlay for better contrast on mobile */}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/30 via-black/10 to-transparent lg:bg-none"></div>
      </div>
    </div>
  )
}
