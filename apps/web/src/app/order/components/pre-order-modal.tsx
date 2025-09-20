"use client"

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Calendar, Clock, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { addDays, format, isToday, isTomorrow, parseISO } from 'date-fns'
import { enCA, fr } from 'date-fns/locale'

interface PreOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (date: string, time: string) => void
  currentSchedule?: {
    date: string
    time: string
  }
  scheduleConfig?: unknown
}

type ModalStep = 'date' | 'time'

export function PreOrderModal({ isOpen, onClose, onConfirm, currentSchedule }: PreOrderModalProps) {
  const { language } = useLanguage()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const t = translations[language] || translations.en
  
  const [currentStep, setCurrentStep] = useState<ModalStep>('date')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState<string>(currentSchedule?.time || '')
  const [isLoading, setIsLoading] = useState(false)

  // Helper functions for date conversion
  const convertStringToDate = (dateString: string): Date => {
    const today = new Date()
    if (dateString === 'today') {
      return today
    } else if (dateString === 'tomorrow') {
      return addDays(today, 1)
    } else {
      return parseISO(dateString)
    }
  }

  const convertDateToString = (date: Date): string => {
    if (isToday(date)) {
      return 'today'
    } else if (isTomorrow(date)) {
      return 'tomorrow'
    } else {
      return format(date, 'yyyy-MM-dd')
    }
  }


  // Generate time slots (15-minute intervals from 11:00 AM to 10:00 PM)
  const generateTimeSlots = () => {
    const slots = []
    const start = 11 // 11 AM
    const end = 22 // 10 PM
    
    for (let hour = start; hour <= end; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = new Date()
        time.setHours(hour, minute, 0, 0)
        
        const timeString = time.toLocaleTimeString(language === 'fr' ? 'fr-CA' : 'en-CA', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
        
        slots.push({
          value: timeString,
          label: timeString
        })
      }
    }
    
    return slots
  }

  const timeSlots = generateTimeSlots()

  // Initialize modal state based on current schedule when modal opens
  useEffect(() => {
    if (isOpen) {
      if (currentSchedule?.date && currentSchedule?.time) {
        // If there's a current schedule, show it and go to time step
        const scheduledDate = convertStringToDate(currentSchedule.date)
        setSelectedDate(scheduledDate)
        setSelectedTime(currentSchedule.time)
        setCurrentMonth(new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), 1)) // Navigate to scheduled month
        setCurrentStep('time') // Go directly to time step for editing
      } else {
        // Reset to default state for new scheduling
        const initialDate = new Date()
        initialDate.setHours(0, 0, 0, 0)
        setSelectedDate(initialDate)
        setSelectedTime('')
        setCurrentMonth(new Date()) // Reset to current month
        setCurrentStep('date')
      }
      setIsLoading(false)
    }
  }, [isOpen, currentSchedule])

  const handleDateNext = () => {
    if (selectedDate) {
      setCurrentStep('time')
    }
  }

  const handleTimeBack = () => {
    setCurrentStep('date')
  }

  const handleConfirm = async () => {
    if (!selectedTime || !selectedDate) return
    
    setIsLoading(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Convert Date back to string format for backward compatibility
    const dateString = convertDateToString(selectedDate)
    onConfirm(dateString, selectedTime)
    onClose()
    
    // State will be managed by useEffect based on new currentSchedule prop
    setIsLoading(false)
  }

  const handleClose = () => {
    onClose()
    // Don't reset here - let useEffect handle the state based on props
  }

  // Get formatted display for selected date
  const getDateDisplay = (date: Date) => {
    if (isToday(date)) return language === 'fr' ? "Aujourd'hui" : 'Today'
    if (isTomorrow(date)) return language === 'fr' ? 'Demain' : 'Tomorrow'
    
    return format(date, 'EEEE, MMM d', {
      locale: language === 'fr' ? fr : enCA
    })
  }

  // Calendar navigation state
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Custom calendar component - Best Practice: Manual layout control
  const CustomCalendar = () => {
    const handleDateSelect = (date: Date) => {
      const normalizedDate = new Date(date)
      normalizedDate.setHours(0, 0, 0, 0)
      setSelectedDate(normalizedDate)
    }

    // Month navigation handlers
    const goToPreviousMonth = () => {
      setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    }

    const goToNextMonth = () => {
      setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    }

    // Generate calendar data manually for full control
    const generateCalendarData = () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      const startDate = new Date(startOfMonth)
      startDate.setDate(startDate.getDate() - startOfMonth.getDay()) // Start from Sunday
      
      const weeks = []
      let currentWeek = []
      const currentDate = new Date(startDate)

      for (let i = 0; i < 42; i++) { // 6 weeks × 7 days
        if (currentDate > endOfMonth && currentWeek.length === 0) break
        
        currentWeek.push(new Date(currentDate))
        
        if (currentWeek.length === 7) {
          weeks.push(currentWeek)
          currentWeek = []
        }
        
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      if (currentWeek.length > 0) {
        weeks.push(currentWeek)
      }
      
      return weeks
    }

    const weeks = generateCalendarData()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const monthName = format(currentMonth, 'MMMM yyyy', { 
      locale: language === 'fr' ? fr : enCA 
    })

    const isDateDisabled = (date: Date) => date < today
    const isDateSelected = (date: Date) => 
      selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
    const isDateToday = (date: Date) => isToday(date)
    const isCurrentMonth = (date: Date) => date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear()

    return (
      <div className="w-full space-y-4">
        {/* Custom Header with Navigation */}
        <div className="flex items-center justify-between px-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={goToPreviousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h3 className="text-base font-semibold">
            {monthName}
          </h3>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={goToNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Custom Calendar Grid */}
        <div className="w-full">
          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Weeks */}
          <div className="space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((date, dayIndex) => {
                  const disabled = isDateDisabled(date)
                  const selected = isDateSelected(date)
                  const todayDate = isDateToday(date)
                  const currentMonth = isCurrentMonth(date)
                  
                  return (
                    <Button
                      key={dayIndex}
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      className={`
                        h-10 w-full p-0 text-sm font-medium transition-colors rounded-lg
                        focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-primary
                        hover:bg-accent hover:text-accent-foreground
                        disabled:hover:bg-transparent disabled:opacity-30 disabled:cursor-not-allowed
                        ${!currentMonth ? 'text-muted-foreground/40' : ''}
                        ${todayDate && !selected ? 'bg-accent text-accent-foreground font-bold ring-2 ring-primary/20' : ''}
                        ${selected ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
                      `}
                      onClick={() => !disabled && handleDateSelect(date)}
                    >
                      {format(date, 'd')}
                    </Button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentStep === 'date' ? (
              <>
                <Calendar className="w-5 h-5" />
                {language === 'fr' ? 'Choisir la date' : 'Select Date'}
              </>
            ) : (
              <>
                <Clock className="w-5 h-5" />
                {language === 'fr' ? "Choisir l'heure" : 'Select Time'}
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Step Indicator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className={`flex items-center gap-2 ${currentStep === 'date' ? 'text-primary font-medium' : ''}`}>
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                currentStep === 'date' ? 'border-primary bg-primary text-white' : 
                selectedDate ? 'border-green-500 bg-green-500 text-white' : 'border-muted-foreground'
              }`}>
                1
              </span>
              {language === 'fr' ? 'Date' : 'Date'}
            </div>
            
            <ChevronRight className="w-4 h-4" />
            
            <div className={`flex items-center gap-2 ${currentStep === 'time' ? 'text-primary font-medium' : ''}`}>
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                currentStep === 'time' ? 'border-primary bg-primary text-white' : 
                selectedTime ? 'border-green-500 bg-green-500 text-white' : 'border-muted-foreground'
              }`}>
                2
              </span>
              {language === 'fr' ? 'Heure' : 'Time'}
            </div>
          </div>

          {/* Date Selection Step */}
          {currentStep === 'date' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {language === 'fr' 
                  ? 'Sélectionnez quand vous souhaitez que votre commande soit prête'
                  : 'Select when you want your order to be ready'
                }
              </p>
              
              <CustomCalendar />



              {/* Date Step Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  {language === 'fr' ? 'Annuler' : 'Cancel'}
                </Button>
                <Button
                  onClick={handleDateNext}
                  disabled={!selectedDate}
                  className="flex-1"
                >
                  {language === 'fr' ? 'Suivant' : 'Next'}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Time Selection Step */}
          {currentStep === 'time' && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {language === 'fr' ? 'Sélectionné:' : 'Selected:'} <span className="font-medium text-foreground">{selectedDate ? getDateDisplay(selectedDate) : ''}</span>
                </p>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {language === 'fr' 
                  ? "Choisissez l'heure de ramassage"
                  : 'Choose your pickup time'
                }
              </p>
              
              <ScrollArea className="h-64">
                <div className="grid grid-cols-2 gap-3 pr-4">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.value}
                      onClick={() => setSelectedTime(slot.value)}
                      className={`p-3 text-center rounded-lg border-2 transition-all hover:shadow-md ${
                        selectedTime === slot.value
                          ? 'border-primary bg-primary/10 text-primary shadow-lg font-semibold'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </ScrollArea>

              {/* Time Step Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleTimeBack}
                  className="flex-1"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  {language === 'fr' ? 'Retour' : 'Back'}
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={!selectedTime || isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {language === 'fr' ? 'Programmation...' : 'Scheduling...'}
                    </>
                  ) : (
                    <>
                      {language === 'fr' ? 'Programmer' : 'Schedule Order'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}






