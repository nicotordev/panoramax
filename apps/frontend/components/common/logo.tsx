import { Raleway } from "next/font/google"
import { cn } from "@/lib/utils"
import Link from "next/link"
const ralewayHeading = Raleway({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-logo",
})

interface LogoProps {
  className?: string
  href?: string
  srText?: string
}
export default function Logo({
  className = "",
  href = "/",
  srText = "homepage",
}: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "text-2xl font-bold tracking-tight",
        ralewayHeading.className,
        className
      )}
      style={{ letterSpacing: "-0.025em" }}
      aria-label="Panoramax logo"
    >
      Panoramax <span className="sr-only">{srText}</span>
    </Link>
  )
}
