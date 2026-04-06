"use client"

import * as React from "react"
import { format } from "date-fns"
import { HiCalendar } from "react-icons/hi2"
import { useTranslations } from "next-intl"

import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function EventDatePicker() {
  const t = useTranslations("HomePage")
  const [date, setDate] = React.useState<Date>()

  return (
    <Popover>
      <PopoverTrigger className="flex items-center gap-2 px-4 py-2 text-xs font-semibold">
        <HiCalendar />
        {date ? format(date, "PPP") : <span>{t("pickADate")}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={date} onSelect={setDate} />
      </PopoverContent>
    </Popover>
  )
}
