"use client"

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Calendar, Clock, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

interface PreOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (date: string, time: string) => void
  currentSchedule?: {
    date: string
    time: string
  }
}

type ModalStep = 'date' | 'time'

export function PreOrderModal({ isOpen, onClose, onConfirm, currentSchedule }: PreOrderModalProps) {
  const { language } = useLanguage()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const t = translations[language] || translations.en
  
  const [currentStep, setCurrentStep] = useState<ModalStep>('date')
  const [selectedDate, setSelectedDate] = useState<string>(currentSchedule?.date || 'today')
  const [selectedTime, setSelectedTime] = useState<string>(currentSchedule?.time || '')
  const [isLoading, setIsLoading] = useState(false)

  // Generate next 10 days
  const generateDates = () => {
    const dates = []
    const today = new Date()
    
    for (let i = 0; i < 10; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      
      let label = ''
      if (i === 0) {
        label = language === 'fr' ? "Aujourd'hui" : 'Today'
      } else if (i === 1) {
        label = language === 'fr' ? 'Demain' : 'Tomorrow'
      } else {
        label = date.toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        })
      }
      
      dates.push({
        value: i === 0 ? 'today' : i === 1 ? 'tomorrow' : date.toISOString().split('T')[0],
        label,
        date
      })
    }
    
    return dates
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

  const dates = generateDates()
  const timeSlots = generateTimeSlots()

  // Initialize modal state based on current schedule when modal opens
  useEffect(() => {
    if (isOpen) {
      if (currentSchedule?.date && currentSchedule?.time) {
        // If there's a current schedule, show it and go to time step
        setSelectedDate(currentSchedule.date)
        setSelectedTime(currentSchedule.time)
        setCurrentStep('time') // Go directly to time step for editing
      } else {
        // Reset to default state for new scheduling
        setSelectedDate('today')
        setSelectedTime('')
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
    if (!selectedTime) return
    
    setIsLoading(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    onConfirm(selectedDate, selectedTime)
    onClose()
    
    // State will be managed by useEffect based on new currentSchedule prop
    setIsLoading(false)
  }

  const handleClose = () => {
    onClose()
    // Don't reset here - let useEffect handle the state based on props
  }

  // Get formatted display for selected date
  const getDateDisplay = (dateValue: string) => {
    if (dateValue === 'today') return language === 'fr' ? "Aujourd'hui" : 'Today'
    if (dateValue === 'tomorrow') return language === 'fr' ? 'Demain' : 'Tomorrow'
    
    const date = new Date(dateValue)
    return date.toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA', {
      weekday: 'long',
      month: 'short', 
      day: 'numeric'
    })
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
              
              <ScrollArea className="h-80">
                <div className="grid grid-cols-1 gap-3 pr-4">
                  {dates.map((date) => (
                    <button
                      key={date.value}
                      onClick={() => setSelectedDate(date.value)}
                      className={`p-4 text-left rounded-xl border-2 transition-all hover:shadow-md ${
                        selectedDate === date.value
                          ? 'border-primary bg-primary/10 text-primary shadow-lg'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-base block">{date.label}</span>
                          {date.value === 'today' && (
                            <span className="text-xs text-muted-foreground">
                              {language === 'fr' ? 'Prêt dans 25 minutes' : 'Ready in 25 minutes'}
                            </span>
                          )}
                        </div>
                        {selectedDate === date.value && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>

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
                  {language === 'fr' ? 'Sélectionné:' : 'Selected:'} <span className="font-medium text-foreground">{getDateDisplay(selectedDate)}</span>
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