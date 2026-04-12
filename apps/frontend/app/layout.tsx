import { ClerkProvider } from "@clerk/nextjs"
import { Geist_Mono, Public_Sans, Raleway } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { getLocale } from "next-intl/server"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { clerkLocalizationForAppLocale } from "@/lib/clerk-localization"
import { cn } from "@/lib/utils"

const ralewayHeading = Raleway({
  subsets: ["latin"],
  variable: "--font-heading",
})

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const clerkLocalization = clerkLocalizationForAppLocale(locale)

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        publicSans.variable,
        ralewayHeading.variable
      )}
    >
      <body>
        <ClerkProvider localization={clerkLocalization}>
          <NextIntlClientProvider>
            <ThemeProvider>
              <TooltipProvider>{children}</TooltipProvider>
            </ThemeProvider>
          </NextIntlClientProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
