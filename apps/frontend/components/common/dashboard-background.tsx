"use client"

import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const images = [
  "/assets/img/party/pexels-patofuente-18984542.webp",
  "/assets/img/party/pexels-patofuente-30911647.webp",
  "/assets/img/party/pexels-patofuente-30911682.webp",
  "/assets/img/party/pexels-patofuente-30911885.webp",
  "/assets/img/party/pexels-patofuente-30911927.webp",
]

export interface RandomBackgroundProps {
  className?: string
  variant?: "light" | "dark"
}

export function RandomBackground({
  className,
  variant = "dark",
}: RandomBackgroundProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Un timeout de 0 o simplemente setMounted(true) está bien para el fix de hidratación
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
  }, [])

  // Hash simple para elegir la imagen de forma determinista según la ruta
  const getIndex = (path: string) => {
    let hash = 0
    for (let i = 0; i < path.length; i++) {
      hash = path.charCodeAt(i) + ((hash << 5) - hash)
    }
    return Math.abs(hash) % images.length
  }

  // Elimina solo el prefijo de idioma de 2 letras (ej. /es, /en) para no afectar rutas raíz
  const normalizedPath = pathname
    ? pathname.replace(/^\/[a-zA-Z]{2}(?=\/|$)/, "")
    : ""

  const imageSrc = images[getIndex(normalizedPath || "/dashboard")]

  if (!mounted) {
    return (
      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-1 overflow-hidden bg-background",
          className
        )}
      >
        <div className="absolute inset-0 bg-background/80" />
      </div>
    )
  }

  return (
    // Se agregó pointer-events-none para garantizar que el fondo nunca bloquee los clics de la UI
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-0 overflow-hidden",
        className
      )}
    >
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
            alt="" // Accesibilidad: se deja vacío para imágenes puramente decorativas
            fill
            className="object-cover"
            priority
          />
        </motion.div>
      </AnimatePresence>

      {/* Overlay de contraste limpio, sin duplicar las clases de color base */}
      <div
        className={cn(
          "absolute inset-0 backdrop-blur-[2px] transition-colors duration-500",
          variant === "light" ? "bg-white/20" : "bg-black/20"
        )}
      />

      {/* Overlay de gradiente limpio */}
      <div
        className={cn(
          "absolute inset-0 bg-linear-to-tr",
          variant === "light"
            ? "from-white/60 to-white/50"
            : "from-black/60 to-black/50"
        )}
      />
    </div>
  )
}
