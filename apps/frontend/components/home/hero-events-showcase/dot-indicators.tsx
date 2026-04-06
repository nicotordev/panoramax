import { cn } from "@/lib/utils"
import type { DotIndicatorsProps } from "@/types/home-showcase"

export function DotIndicators({
  count,
  active,
  onSelect,
  getAriaLabel,
}: DotIndicatorsProps) {
  return (
    <div className="flex max-w-[200px] flex-wrap items-center justify-center gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={getAriaLabel(i + 1)}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            active === i ? "w-7 bg-primary" : "w-2 bg-border hover:bg-muted-foreground"
          )}
        />
      ))}
    </div>
  )
}
