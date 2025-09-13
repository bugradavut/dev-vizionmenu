"use client"

import * as React from "react"
import { type DateRange } from "react-day-picker"

import { Calendar } from "@/components/ui/calendar"

interface Calendar04Props {
  selected?: DateRange
  onSelect?: (dateRange: DateRange | undefined) => void
}

export default function Calendar04({ selected, onSelect }: Calendar04Props) {
  const [internalDateRange, setInternalDateRange] = React.useState<DateRange | undefined>()
  
  // Use props if provided, otherwise use internal state
  const dateRange = selected || internalDateRange
  const handleSelectChange = onSelect || setInternalDateRange

  const handleDayClick = (day: Date) => {
    const currentComplete = dateRange?.from && dateRange?.to
    
    if (currentComplete) {
      handleSelectChange({ from: day, to: undefined })
    } else if (dateRange?.from && !dateRange?.to) {
      handleSelectChange({ from: dateRange.from, to: day })
    } else {
      handleSelectChange({ from: day, to: undefined })
    }
  }



  return (
    <Calendar
      mode="range"
      defaultMonth={dateRange?.from}
      selected={dateRange}
      onSelect={handleSelectChange}
      onDayClick={handleDayClick}
      className="rounded-lg border shadow-sm"
      numberOfMonths={1}
    />
  )
}
