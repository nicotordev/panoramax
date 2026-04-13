"use client"

import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { useEffect, useState } from "react"

const images = [
  "/assets/img/party/pexels-patofuente-18984542.webp",
  "/assets/img/party/pexels-patofuente-30911647.webp",
  "/assets/img/party/pexels-patofuente-30911682.webp",
  "/assets/img/party/pexels-patofuente-30911885.webp",
  "/assets/img/party/pexels-patofuente-30911927.webp",
]

export function DashboardBackground() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
  }, [])

  // Use a simple hash of the pathname to pick one of the 5 images deterministically
  const getIndex = (path: string) => {
    let hash = 0
    for (let i = 0; i < path.length; i++) {
      hash = path.charCodeAt(i) + ((hash << 5) - hash)
    }
    return Math.abs(hash) % images.length
  }

  // Strip locale prefix from pathname if present (e.g. /es/dashboard -> /dashboard)
  // This ensures the same background image regardless of language
  const normalizedPath = pathname ? pathname.replace(/^\/[^\/]+/, "") : ""
  
  const imageSrc = images[getIndex(normalizedPath || "/dashboard")]

  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[-1] overflow-hidden bg-background">
        <div className="absolute inset-0 bg-background/80" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-1 overflow-hidden bg-black">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={imageSrc}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 0.5, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <Image
            src={imageSrc}
            alt="Dashboard Background"
            fill
            className="object-cover"
            priority
          />
        </motion.div>
      </AnimatePresence>
      {/* Overlay for contrast - matching glass theme */}
      <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] transition-colors duration-500 dark:bg-black/60" />
      <div className="absolute inset-0 bg-linear-to-tr from-background/80 via-transparent to-background/50 dark:from-black/80 dark:to-black/50" />
    </div>
  )
}
