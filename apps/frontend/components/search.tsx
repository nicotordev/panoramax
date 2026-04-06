"use client"

import { liteClient as algoliasearch } from "algoliasearch/lite"
import type { BaseHit, Hit } from "instantsearch.js"
import { ArrowDown, ArrowUp, CornerDownLeft, SearchIcon } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  Configure,
  Highlight,
  InstantSearch,
  useHits,
  useInstantSearch,
  useSearchBox,
} from "react-instantsearch"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"

type SearchAttributes = {
  primaryText: string
  secondaryText?: string
  tertiaryText?: string
  url?: string
  image?: string
}

interface SearchProps {
  applicationId: string
  apiKey: string
  indexName: string
  placeholder?: string
  hitsPerPage?: number
  attributes: SearchAttributes
  searchParameters?: Record<string, unknown>
  insights?: boolean
  openResultsInNewTab?: boolean
  darkMode?: boolean
}

function toAttributePath(attribute?: string): string | string[] | undefined {
  if (!attribute) return undefined
  return attribute.includes(".") ? attribute.split(".") : attribute
}

function getByPath<T = unknown>(obj: unknown, path?: string): T | undefined {
  if (!obj || !path) return undefined

  const parts = path.split(".")
  let current: unknown = obj

  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[part]
  }

  return current as T | undefined
}

function normalizeUrl(url?: string) {
  if (!url) return undefined
  const trimmed = url.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function AlgoliaLogo() {
  return (
    <svg
      width="80"
      height="24"
      aria-label="Algolia"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 2196.2 500"
    >
      <defs>
        <style>{`.cls-1,.cls-2{fill:#003dff}.cls-2{fill-rule:evenodd}`}</style>
      </defs>
      <path
        className="cls-2"
        d="M1070.38,275.3V5.91c0-3.63-3.24-6.39-6.82-5.83l-50.46,7.94c-2.87,.45-4.99,2.93-4.99,5.84l.17,273.22c0,12.92,0,92.7,95.97,95.49,3.33,.1,6.09-2.58,6.09-5.91v-40.78c0-2.96-2.19-5.51-5.12-5.84-34.85-4.01-34.85-47.57-34.85-54.72Z"
      />
      <rect
        className="cls-1"
        x="1845.88"
        y="104.73"
        width="62.58"
        height="277.9"
        rx="5.9"
        ry="5.9"
      />
      <path
        className="cls-1"
        d="M249.83,0C113.3,0,2,110.09,.03,246.16c-2,138.19,110.12,252.7,248.33,253.5,42.68,.25,83.79-10.19,120.3-30.03,3.56-1.93,4.11-6.83,1.08-9.51l-23.38-20.72c-4.75-4.21-11.51-5.4-17.36-2.92-25.48,10.84-53.17,16.38-81.71,16.03-111.68-1.37-201.91-94.29-200.13-205.96,1.76-110.26,92-199.41,202.67-199.41h202.69V407.41l-115-102.18c-3.72-3.31-9.42-2.66-12.42,1.31-18.46,24.44-48.53,39.64-81.93,37.34-46.33-3.2-83.87-40.5-87.34-86.81-4.15-55.24,39.63-101.52,94-101.52,49.18,0,89.68,37.85,93.91,85.95,.38,4.28,2.31,8.27,5.52,11.12l29.95,26.55c3.4,3.01,8.79,1.17,9.63-3.3,2.16-11.55,2.92-23.58,2.07-35.92-4.82-70.34-61.8-126.93-132.17-131.26-80.68-4.97-148.13,58.14-150.27,137.25-2.09,77.1,61.08,143.56,138.19,145.26,32.19,.71,62.03-9.41,86.14-26.95l150.26,133.2c6.44,5.71,16.61,1.14,16.61-7.47V9.48C499.66,4.25,495.42,0,490.18,0H249.83Z"
      />
    </svg>
  )
}

function SearchButton({ onClick }: { onClick: () => void }) {
  const [isModifierPressed, setIsModifierPressed] = useState(false)
  const [isKPressed, setIsKPressed] = useState(false)
  const modifierLabel =
    typeof navigator !== "undefined" &&
    /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform)
      ? "⌘"
      : "Ctrl"

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) setIsModifierPressed(true)
      if (event.key.toLowerCase() === "k") setIsKPressed(true)
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) setIsModifierPressed(false)
      if (event.key.toLowerCase() === "k") setIsKPressed(false)
    }

    const resetKeys = () => {
      setIsModifierPressed(false)
      setIsKPressed(false)
    }

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("keyup", handleKeyUp)
    window.addEventListener("blur", resetKeys)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("blur", resetKeys)
    }
  }, [])

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="h-auto w-full justify-between border-border/70 bg-background/70 px-4 py-3 text-left shadow-none backdrop-blur-md transition-transform duration-300 hover:-translate-y-0.5 hover:bg-background/80"
      aria-label="Open search"
    >
      <span className="flex items-center gap-3 text-muted-foreground">
        <SearchIcon className="size-5" />
        <span>Search events</span>
      </span>
      <span className="hidden gap-1 md:flex">
        <kbd
          className={cn(
            "grid h-6 min-w-6 place-items-center rounded bg-muted px-1 text-xs text-muted-foreground transition-all",
            isModifierPressed && "inset-shadow-sm inset-shadow-foreground/30"
          )}
        >
          {modifierLabel}
        </kbd>
        <kbd
          className={cn(
            "grid h-6 min-w-6 place-items-center rounded bg-muted px-1 text-xs text-muted-foreground transition-all",
            isKPressed && "inset-shadow-sm inset-shadow-foreground/30"
          )}
        >
          K
        </kbd>
      </span>
    </Button>
  )
}

function Modal({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    document.addEventListener("keydown", handleEscape)
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm md:pt-[10vh]"
      onClick={onClose}
    >
      <div
        className="h-full w-full overflow-hidden bg-background shadow-2xl animate-in fade-in-0 zoom-in-95 md:h-auto md:max-h-[80vh] md:w-[90%] md:max-w-[720px] md:rounded-xl"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

function SearchInput({
  inputRef,
  placeholder,
  onClose,
  onArrowDown,
  onArrowUp,
  onEnter,
  onQueryChange,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  placeholder?: string
  onClose: () => void
  onArrowDown: () => void
  onArrowUp: () => void
  onEnter: () => void
  onQueryChange: () => void
}) {
  const { status } = useInstantSearch()
  const { query, refine } = useSearchBox()

  return (
    <search
      className="flex items-center gap-3 rounded-t-sm border-b border-muted bg-background p-2"
      onSubmit={(event) => {
        event.preventDefault()
      }}
      onReset={(event) => {
        event.preventDefault()
        refine("")
        inputRef.current?.focus()
      }}
    >
      <div className="rounded-full p-2 text-muted-foreground">
        <SearchIcon className="size-5" strokeWidth={1.5} />
      </div>

      <input
        ref={inputRef}
        className="w-full bg-transparent text-lg font-light text-foreground outline-none placeholder:text-muted-foreground [::-webkit-search-cancel-button]:appearance-none [::-webkit-search-decoration]:appearance-none [::-webkit-search-results-button]:appearance-none [::-webkit-search-results-decoration]:appearance-none"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        inputMode="search"
        type="search"
        value={query}
        placeholder={placeholder}
        onChange={(event) => {
          onQueryChange()
          refine(event.currentTarget.value)
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault()
            onArrowDown()
          }

          if (event.key === "ArrowUp") {
            event.preventDefault()
            onArrowUp()
          }

          if (event.key === "Enter") {
            event.preventDefault()
            onEnter()
          }
        }}
        autoFocus
      />

      <div className="ml-auto flex items-center gap-2">
        <Button
          type="reset"
          variant="ghost"
          className="px-2 text-muted-foreground"
          hidden={!query || status === "stalled"}
        >
          Clear
        </Button>
        <Button
          type="button"
          variant="outline"
          className="px-2 text-muted-foreground"
          onClick={onClose}
        >
          esc
        </Button>
      </div>
    </search>
  )
}

function SearchResults({
  attributes,
  selectedIndex,
  onHoverIndex,
  openResultsInNewTab,
}: {
  attributes: SearchAttributes
  selectedIndex: number
  onHoverIndex: (index: number) => void
  openResultsInNewTab: boolean
}) {
  const { items, sendEvent } = useHits()
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})
  const containerRef = useRef<HTMLDivElement>(null)

  const getHitUrl = (hit: Hit<BaseHit>) =>
    normalizeUrl(getByPath<string>(hit, attributes.url))

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const selectedElement = container.querySelector(
      '[aria-selected="true"]'
    ) as HTMLElement | null

    if (!selectedElement) return

    selectedElement.scrollIntoView({ block: "nearest" })
  }, [selectedIndex, items.length])

  if (items.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="flex h-[91vh] flex-col gap-4 overflow-y-auto bg-muted p-2 md:h-[50vh]"
      role="listbox"
    >
      {items.map((hit, index) => {
        const url = getHitUrl(hit)
        const imageUrl = getByPath<string>(hit, attributes.image)
        const primaryText = getByPath<string>(hit, attributes.primaryText) || ""
        const isSelected = selectedIndex === index
        const hasImage = Boolean(imageUrl) && !failedImages[hit.objectID]

        const content = (
          <>
            {imageUrl ? (
              <div className="flex h-[100px] w-[100px] flex-[0_0_100px] items-center justify-center self-start overflow-hidden rounded-sm bg-background">
                {hasImage ? (
                  // The registry component renders remote Algolia images directly.
                  // Using `img` avoids requiring extra Next image remote config.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={primaryText}
                    className="h-full w-full rounded-sm object-cover"
                    onError={() => {
                      setFailedImages((prev) => ({
                        ...prev,
                        [hit.objectID]: true,
                      }))
                    }}
                  />
                ) : (
                  <SearchIcon className="size-5 text-muted-foreground" />
                )}
              </div>
            ) : null}

            <div className="min-w-0">
              <p className="font-medium [&_mark]:bg-transparent [&_mark]:text-secondary-foreground [&_mark]:underline [&_mark]:underline-offset-4">
                <Highlight
                  attribute={
                    toAttributePath(attributes.primaryText) as string | string[]
                  }
                  hit={hit}
                />
              </p>

              {attributes.secondaryText ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {String(getByPath(hit, attributes.secondaryText) || "")}
                </p>
              ) : null}

              {attributes.tertiaryText ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {String(getByPath(hit, attributes.tertiaryText) || "")}
                </p>
              ) : null}
            </div>
          </>
        )

        const commonProps = {
          className: cn(
            "flex cursor-pointer items-center gap-4 rounded-sm bg-background p-4 text-foreground transition-colors",
            isSelected && "bg-blue-50 dark:bg-slate-900"
          ),
          role: "option" as const,
          "aria-selected": isSelected,
          onMouseEnter: () => onHoverIndex(index),
          onMouseMove: () => onHoverIndex(index),
        }

        if (!url) {
          return (
            <div key={hit.objectID} {...commonProps}>
              {content}
            </div>
          )
        }

        return (
          <a
            key={hit.objectID}
            href={url}
            target={openResultsInNewTab ? "_blank" : undefined}
            rel={openResultsInNewTab ? "noopener noreferrer" : undefined}
            onClick={() => sendEvent("click", hit, "Hit Clicked")}
            {...commonProps}
          >
            {content}
          </a>
        )
      })}
    </div>
  )
}

function EmptyState({
  query,
  onClear,
}: {
  query: string
  onClear: () => void
}) {
  return (
    <div className="flex h-[91vh] flex-col items-center justify-center gap-2 bg-muted p-4 text-foreground md:h-[50vh]">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-muted-foreground">
        <SearchIcon className="size-5" />
      </div>
      <p className="text-lg font-medium">No results for &quot;{query}&quot;</p>
      <p className="text-sm text-muted-foreground">
        Try a different query or clear the current one.
      </p>
      <Button variant="outline" onClick={onClear}>
        Clear query
      </Button>
    </div>
  )
}

function Footer() {
  const basePoweredByUrl =
    "https://www.algolia.com/developers?utm_medium=referral&utm_content=powered_by&utm_campaign=sitesearch"
  const poweredByHref =
    typeof window !== "undefined"
      ? `${basePoweredByUrl}&utm_source=${encodeURIComponent(window.location.hostname)}`
      : basePoweredByUrl

  return (
    <div className="flex items-center justify-between rounded-b-sm bg-background p-4">
      <div className="inline-flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <kbd className="flex h-6 items-center justify-center rounded-sm bg-muted p-1 text-muted-foreground">
            <CornerDownLeft size={20} />
          </kbd>
          <span className="text-muted-foreground">Open</span>
        </div>

        <div className="flex items-center gap-2">
          <kbd className="flex h-6 items-center justify-center rounded-sm bg-muted p-1 text-muted-foreground">
            <ArrowUp size={20} />
          </kbd>
          <kbd className="flex h-6 items-center justify-center rounded-sm bg-muted p-1 text-muted-foreground">
            <ArrowDown size={20} />
          </kbd>
          <span className="text-muted-foreground">Navigate</span>
        </div>
      </div>

      <a
        className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
        href={poweredByHref}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="hidden md:block">Powered by</span>
        <AlgoliaLogo />
      </a>
    </div>
  )
}

function SearchDialog({
  config,
  onClose,
}: {
  config: SearchProps
  onClose: () => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { query, refine } = useSearchBox()
  const { results } = useInstantSearch()
  const { items, sendEvent } = useHits()

  const getHitUrl = (hit: Hit<BaseHit>) =>
    normalizeUrl(getByPath<string>(hit, config.attributes.url))

  const {
    selectedIndex,
    moveDown,
    moveUp,
    activateSelection,
    hoverIndex,
    resetSelection,
  } = useKeyboardNavigation(
    items,
    getHitUrl,
    config.openResultsInNewTab ?? true
  )

  const hasQuery = query.trim().length > 0
  const noResults = hasQuery && results?.nbHits === 0

  return (
    <>
      <Configure
        hitsPerPage={config.hitsPerPage || 8}
        {...config.searchParameters}
      />

      <div className="flex flex-col">
        <SearchInput
          inputRef={inputRef}
          placeholder={config.placeholder || "What are you looking for?"}
          onClose={onClose}
          onArrowDown={moveDown}
          onArrowUp={moveUp}
          onQueryChange={resetSelection}
          onEnter={() => {
            const hit = items[selectedIndex]
            if (hit) sendEvent("click", hit, "Hit Clicked")
            activateSelection()
          }}
        />

        {hasQuery && !noResults ? (
          <SearchResults
            attributes={config.attributes}
            selectedIndex={selectedIndex}
            onHoverIndex={hoverIndex}
            openResultsInNewTab={config.openResultsInNewTab ?? true}
          />
        ) : null}

        {noResults ? (
          <EmptyState
            query={query}
            onClear={() => {
              refine("")
              inputRef.current?.focus()
            }}
          />
        ) : null}
      </div>

      <Footer />
    </>
  )
}

export default function Search({
  applicationId,
  apiKey,
  indexName,
  placeholder,
  hitsPerPage,
  attributes,
  searchParameters,
  insights = true,
  openResultsInNewTab = true,
}: SearchProps) {
  const [isOpen, setIsOpen] = useState(false)

  const searchClient = useMemo(() => {
    const client = algoliasearch(applicationId, apiKey)
    client.addAlgoliaAgent("algolia-sitesearch")
    return client
  }, [applicationId, apiKey])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setIsOpen(true)
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  return (
    <>
      <SearchButton onClick={() => setIsOpen(true)} />

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <InstantSearch
          searchClient={searchClient}
          indexName={indexName}
          future={{ preserveSharedStateOnUnmount: true }}
          insights={insights}
        >
          <SearchDialog
            config={{
              applicationId,
              apiKey,
              indexName,
              placeholder,
              hitsPerPage,
              attributes,
              searchParameters,
              insights,
              openResultsInNewTab,
            }}
            onClose={() => setIsOpen(false)}
          />
        </InstantSearch>
      </Modal>
    </>
  )
}
