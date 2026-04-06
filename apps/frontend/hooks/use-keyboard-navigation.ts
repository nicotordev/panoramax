"use client"

import type { BaseHit, Hit } from "instantsearch.js"
import { useCallback, useState } from "react"

interface UseKeyboardNavigationReturn {
  selectedIndex: number
  moveDown: () => void
  moveUp: () => void
  activateSelection: () => boolean
  hoverIndex: (index: number) => void
  resetSelection: () => void
  selectionOrigin: "keyboard" | "pointer" | "init"
}

export function useKeyboardNavigation(
  hits: Hit<BaseHit>[],
  getHitUrl: (hit: Hit<BaseHit>) => string | undefined,
  openResultsInNewTab = true
): UseKeyboardNavigationReturn {
  const [rawSelectedIndex, setSelectedIndex] = useState(0)
  const [selectionOrigin, setSelectionOrigin] = useState<
    "keyboard" | "pointer" | "init"
  >("init")

  const totalItems = hits.length
  const selectedIndex =
    totalItems === 0 ? -1 : Math.min(rawSelectedIndex, totalItems - 1)

  const moveDown = useCallback(() => {
    if (totalItems === 0) return
    setSelectedIndex((prev) => (prev + 1) % totalItems)
    setSelectionOrigin("keyboard")
  }, [totalItems])

  const moveUp = useCallback(() => {
    if (totalItems === 0) return
    setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems)
    setSelectionOrigin("keyboard")
  }, [totalItems])

  const hoverIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalItems) return
      setSelectedIndex(index)
      setSelectionOrigin("pointer")
    },
    [totalItems]
  )

  const activateSelection = useCallback(() => {
    const hit = hits[selectedIndex]
    const url = hit ? getHitUrl(hit) : undefined

    if (!url) return false

    if (openResultsInNewTab) {
      window.open(url, "_blank", "noopener,noreferrer")
    } else {
      window.location.assign(url)
    }

    return true
  }, [getHitUrl, hits, openResultsInNewTab, selectedIndex])

  const resetSelection = useCallback(() => {
    setSelectedIndex(0)
    setSelectionOrigin("init")
  }, [])

  return {
    selectedIndex,
    moveDown,
    moveUp,
    activateSelection,
    hoverIndex,
    resetSelection,
    selectionOrigin,
  }
}
