"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PresetDateTimePicker } from './preset-datetime-picker'
import { Clock, Calendar, Settings, CheckCircle, Package, Loader2, UtensilsCrossed } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { menuService, type CreatePresetRequest, type MenuPreset, type MenuCategory, type MenuItem } from '@/services/menu.service'
// Timezone utilities imported but not used in current implementation
// import { utcToCanadaEastern, canadaEasternToUtc, debugTimezoneConversion } from '@/lib/timezone'

// Time picker component for better UX
const TimePicker = ({ value, onChange, placeholder, disabled }: {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) => {
  const { language } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  
  // Generate time slots every 15 minutes
  const timeSlots = Array.from({ length: 96 }, (_, i) => {
    const totalMinutes = i * 15
    const hour = Math.floor(totalMinutes / 60)
    const minute = totalMinutes % 60
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
  })

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="w-full justify-start text-left font-normal"
        >
          <Clock className="mr-2 h-4 w-4" />
          {value || placeholder || (language === 'fr' ? 'Sélectionner l\'heure' : 'Select time')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <ScrollArea 
          className="h-60" 
          onWheel={(e) => {
            e.stopPropagation()
            const target = e.currentTarget.querySelector('[data-radix-scroll-area-viewport]')
            if (target) {
              target.scrollTop += e.deltaY
            }
          }}
        >
          <div className="grid p-2">
            {timeSlots.map((time) => (
              <Button
                key={time}
                variant={value === time ? "default" : "ghost"}
                className="justify-start h-8 px-2 text-sm"
                onClick={() => {
                  onChange(time)
                  setIsOpen(false)
                }}
              >
                {time}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

// Enhanced form schema with daily recurring support
const presetFormSchema = z.object({
  name: z.string().min(1, 'Preset name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  capture_current_menu: z.boolean(),
  enable_scheduling: z.boolean(),
  
  // Scheduling type selection
  schedule_type: z.enum(['one-time', 'daily']).optional(),
  
  // Daily recurring fields
  daily_start_time: z.string().optional(), // "07:00"
  daily_end_time: z.string().optional(),   // "11:00"
}).refine((data) => {
  // If scheduling is enabled, schedule_type must be selected
  if (data.enable_scheduling && !data.schedule_type) {
    return false
  }
  
  // Validate daily schedule times if daily recurring is selected
  if (data.enable_scheduling && data.schedule_type === 'daily') {
    if (!data.daily_start_time || !data.daily_end_time) {
      return false
    }
    
    // Check that start time is before end time
    const startTime = data.daily_start_time.split(':').map(Number)
    const endTime = data.daily_end_time.split(':').map(Number)
    const startMinutes = startTime[0] * 60 + startTime[1]
    const endMinutes = endTime[0] * 60 + endTime[1]
    
    return startMinutes < endMinutes
  }
  return true
}, {
  message: 'Please select schedule type and ensure end time is after start time',
  path: ['schedule_type']
})

type PresetFormData = z.infer<typeof presetFormSchema>

interface PresetCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onPresetCreated: (preset: MenuPreset) => void
  preset?: MenuPreset // For editing existing preset
}

export function PresetCreateModal({ isOpen, onClose, onPresetCreated, preset }: PresetCreateModalProps) {
  const { language } = useLanguage()
  const [isCreating, setIsCreating] = useState(false)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isLoadingMenu, setIsLoadingMenu] = useState(false)
  const [selectedStartDateTime, setSelectedStartDateTime] = useState<Date | undefined>()
  const [selectedEndDateTime, setSelectedEndDateTime] = useState<Date | undefined>()

  const form = useForm<PresetFormData>({
    resolver: zodResolver(presetFormSchema),
    defaultValues: {
      name: '',
      description: '',
      capture_current_menu: false, // Default to false
      enable_scheduling: false,
      schedule_type: undefined, // No default - user must choose
      daily_start_time: undefined, // No default values
      daily_end_time: undefined, // No default values
    },
  })

  const watchEnableScheduling = form.watch('enable_scheduling')
  const watchCaptureCurrentMenu = form.watch('capture_current_menu')
  const watchScheduleType = form.watch('schedule_type')
  
  // Debug: Form values (removed to fix performance)

  // Stable callback functions - now manual only
  const handleStartDateConfirm = useCallback((dateTime: Date) => {
    // This will only be called manually, not auto-triggered
    setSelectedStartDateTime(dateTime)
  }, [])

  const handleEndDateConfirm = useCallback((dateTime: Date) => {
    // This will only be called manually, not auto-triggered  
    setSelectedEndDateTime(dateTime)
  }, [])

  // Load menu data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadMenuData()
    }
  }, [isOpen])

  // Reset datetime when scheduling is toggled
  useEffect(() => {
    if (!watchEnableScheduling) {
      setSelectedStartDateTime(undefined)
      setSelectedEndDateTime(undefined)
    }
  }, [watchEnableScheduling])

  // Reset form when preset changes (for edit mode)
  useEffect(() => {
    if (preset && isOpen) {
      // Delay the reset to ensure modal is fully opened
      setTimeout(() => {
        // Determine if preset was created with "capture current menu" or manual selection
        const wasCaptureCurrentMenu = !(preset.selected_category_ids?.length || preset.selected_item_ids?.length)
        
        const resetData = {
          name: preset.name || '',
          description: preset.description || '',
          capture_current_menu: wasCaptureCurrentMenu,
          enable_scheduling: !!(preset.scheduled_start || preset.scheduled_end || preset.daily_start_time || preset.daily_end_time),
          schedule_type: preset.schedule_type || undefined, // Don't assume default, use actual value
          // Only set daily times if it's actually a daily schedule
          daily_start_time: (preset.schedule_type === 'daily' && preset.daily_start_time) ? preset.daily_start_time.substring(0, 5) : undefined,
          daily_end_time: (preset.schedule_type === 'daily' && preset.daily_end_time) ? preset.daily_end_time.substring(0, 5) : undefined,
          // Don't set scheduled_start/end in form reset - we handle this via state
          scheduled_start: undefined,
          scheduled_end: undefined,
        }
        
        form.reset(resetData)
        
        // Set datetime states for one-time schedules - SIMPLIFIED APPROACH
        if (preset.scheduled_start) {
          // Simple approach: treat backend timestamp as local datetime
          const startDate = new Date(preset.scheduled_start.replace('Z', '').replace('+00:00', ''))
          setSelectedStartDateTime(startDate)
        } else {
          setSelectedStartDateTime(undefined)
        }
        
        if (preset.scheduled_end) {
          // Simple approach: treat backend timestamp as local datetime
          const endDate = new Date(preset.scheduled_end.replace('Z', '').replace('+00:00', ''))
          setSelectedEndDateTime(endDate)
        } else {
          setSelectedEndDateTime(undefined)
        }
        
        // Restore selected categories and items for edit mode
        if (preset.selected_category_ids?.length || preset.selected_item_ids?.length) {
          setSelectedCategories(preset.selected_category_ids || [])
          setSelectedItems(preset.selected_item_ids || [])
        } else {
          // If it was capture current menu, clear selections
          setSelectedCategories([])
          setSelectedItems([])
        }
      }, 100)
    } else if (!preset && isOpen) {
      // Reset for new preset creation
      setTimeout(() => {
        form.reset({
          name: '',
          description: '',
          capture_current_menu: false, // Default to false for new presets
          enable_scheduling: false,
          schedule_type: undefined, // No default - user must choose
          daily_start_time: '07:00',
          daily_end_time: '11:00',
        })
        setSelectedCategories([])
        setSelectedItems([])
        setSelectedStartDateTime(undefined)
        setSelectedEndDateTime(undefined)
      }, 100)
    }
  }, [preset, isOpen, form])

  const loadMenuData = async () => {
    try {
      setIsLoadingMenu(true)
      
      // Load categories and items in parallel
      const [categoriesResponse, itemsResponse] = await Promise.all([
        menuService.getCategories({ includeInactive: false }),
        menuService.getMenuItems({ limit: 1000 })
      ])
      
      if (categoriesResponse.data) {
        setCategories(categoriesResponse.data)
      }
      
      if (itemsResponse.data) {
        setMenuItems(itemsResponse.data)
      }
    } catch {
      // Failed to load menu data
    } finally {
      setIsLoadingMenu(false)
    }
  }

  const onSubmit = async (data: PresetFormData) => {
    try {
      setIsCreating(true)

      const createData: CreatePresetRequest & { capture_current_menu?: boolean } = {
        name: data.name,
        description: data.description || undefined,
        capture_current_menu: data.capture_current_menu,
        auto_apply: false
      }

      // If not capturing current menu, build custom menu data from selected categories and items
      if (!data.capture_current_menu) {
        const selectedMenuCategories = categories.filter(category => selectedCategories.includes(category.id))
        const selectedMenuItems = menuItems.filter(item => selectedItems.includes(item.id))
        
        createData.menu_data = {
          categories: selectedMenuCategories,
          items: selectedMenuItems,
          captured_at: new Date().toISOString()
        }
        
        // Also send category selection info for backend
        createData.selected_category_ids = selectedCategories
        createData.selected_item_ids = selectedItems
      }

      if (data.enable_scheduling) {
        createData.schedule_type = data.schedule_type
        
        if (data.schedule_type === 'one-time') {
          // One-time scheduling uses specific dates - SIMPLIFIED APPROACH
          if (selectedStartDateTime) {
            // Store as-is, treating local datetime as intended time
            createData.scheduled_start = selectedStartDateTime.toISOString()
          }
          
          if (selectedEndDateTime) {
            // Store as-is, treating local datetime as intended time
            createData.scheduled_end = selectedEndDateTime.toISOString()
          }
          
          // Clear daily fields for one-time schedules
          createData.daily_start_time = null
          createData.daily_end_time = null
        } else if (data.schedule_type === 'daily') {
          // Daily recurring schedules use time-only format
          createData.daily_start_time = data.daily_start_time
          createData.daily_end_time = data.daily_end_time
          createData.auto_apply = true // Daily schedules should auto-apply
          
          // Clear one-time fields for daily schedules
          createData.scheduled_start = null
          createData.scheduled_end = null
        }
      } else {
        // Clear all scheduling fields when scheduling is disabled
        createData.schedule_type = null
        createData.scheduled_start = null
        createData.scheduled_end = null
        createData.daily_start_time = null
        createData.daily_end_time = null
      }

      let response
      if (preset) {
        // Update existing preset
        response = await menuService.updatePreset(preset.id, createData)
      } else {
        // Create new preset
        response = await menuService.createPreset(createData)
      }
      
      if (response.data) {
        onPresetCreated(response.data)
        form.reset()
        onClose()
      }
    } catch {
      // Failed to create preset
    } finally {
      setIsCreating(false)
    }
  }

  // Category selection handlers
  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        // Remove category and its items
        const updatedCategories = prev.filter(id => id !== categoryId)
        const categoryItems = menuItems.filter(item => 
          item.category_id === categoryId || item.category?.id === categoryId
        )
        const categoryItemIds = categoryItems.map(item => item.id)
        setSelectedItems(prevItems => prevItems.filter(id => !categoryItemIds.includes(id)))
        return updatedCategories
      } else {
        // Add category and all its items
        const categoryItems = menuItems.filter(item => 
          item.category_id === categoryId || item.category?.id === categoryId
        )
        const categoryItemIds = categoryItems.map(item => item.id)
        setSelectedItems(prevItems => [...new Set([...prevItems, ...categoryItemIds])])
        return [...prev, categoryId]
      }
    })
  }

  // Item selection handler (for fine-tuning within selected categories)
  const handleItemToggle = (itemId: string) => {
    const item = menuItems.find(i => i.id === itemId)
    if (!item) return

    // Allow uncategorized items (no category_id) or items from selected categories
    const isUncategorized = !item.category_id && !item.category?.id
    const isCategorySelected = (item.category_id && selectedCategories.includes(item.category_id)) ||
                              (item.category?.id && selectedCategories.includes(item.category.id))
    
    if (!isUncategorized && !isCategorySelected) {
      return // Can't select items from unselected categories
    }

    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId)
      } else {
        return [...prev, itemId]
      }
    })
  }

  const handleClose = () => {
    form.reset()
    setSelectedCategories([])
    setSelectedItems([])
    setCategories([])
    setMenuItems([])
    setSelectedStartDateTime(undefined)
    setSelectedEndDateTime(undefined)
    onClose()
  }


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-600" />
            {preset 
              ? (language === 'fr' ? 'Modifier le preset' : 'Edit Preset')
              : (language === 'fr' ? 'Créer un nouveau preset' : 'Create New Preset')
            }
          </DialogTitle>
          <DialogDescription>
            {preset
              ? (language === 'fr' 
                  ? 'Modifiez les paramètres de ce preset de menu.'
                  : 'Modify the settings of this menu preset.'
                )
              : (language === 'fr' 
                  ? 'Créez un preset de menu pour basculer rapidement entre différentes configurations.'
                  : 'Create a menu preset to quickly switch between different menu configurations.'
                )
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {language === 'fr' ? 'Nom du preset' : 'Preset Name'}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={language === 'fr' ? 'ex: Menu du petit-déjeuner' : 'e.g., Breakfast Menu'}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />


              {/* Capture Current Menu Option */}
              <FormField
                control={form.control}
                name="capture_current_menu"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        {language === 'fr' ? 'Capturer le menu actuel' : 'Capture Current Menu'}
                      </FormLabel>
                      <FormDescription>
                        {language === 'fr' 
                          ? 'Sauvegarder l\'état actuel du menu (catégories et articles)'
                          : 'Save the current state of your menu (categories and items)'
                        }
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Manual Item Selection - Show when Capture Current Menu is OFF */}
              {!watchCaptureCurrentMenu && (
                <div className="space-y-6 mt-6">
                  {/* Category Selection Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <UtensilsCrossed className="h-4 w-4 text-purple-600" />
                      <h3 className="text-sm font-medium">
                        {language === 'fr' ? 'Sélectionner les catégories' : 'Select Categories'}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {selectedCategories.length} {language === 'fr' ? 'sélectionnées' : 'selected'}
                      </Badge>
                    </div>

                    {isLoadingMenu ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-xs text-muted-foreground">
                          {language === 'fr' ? 'Chargement...' : 'Loading...'}
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {categories.map((category) => (
                          <div key={category.id} className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-muted/50">
                            <Checkbox
                              id={`category-${category.id}`}
                              checked={selectedCategories.includes(category.id)}
                              onCheckedChange={() => handleCategoryToggle(category.id)}
                            />
                            <label
                              htmlFor={`category-${category.id}`}
                              className="text-sm font-medium cursor-pointer flex-1"
                            >
                              {category.name}
                            </label>
                            <Badge variant="outline" className="text-xs">
                              {menuItems.filter(item => 
                                item.category_id === category.id || item.category?.id === category.id
                              ).length}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Item Fine-tuning Section - Only show if categories are selected */}
                  {selectedCategories.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-purple-600" />
                        <h3 className="text-sm font-medium">
                          {language === 'fr' ? 'Ajuster les articles (optionnel)' : 'Fine-tune Items (Optional)'}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {selectedItems.length} {language === 'fr' ? 'sélectionnés' : 'selected'}
                        </Badge>
                      </div>

                  {isLoadingMenu ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">
                        {language === 'fr' ? 'Chargement du menu...' : 'Loading menu...'}
                      </span>
                    </div>
                  ) : (
                    <div className="border rounded-lg max-h-60">
                      <ScrollArea className="h-60">
                        <div className="p-4 space-y-4">
                          {/* Only show categories that are selected */}
                          {selectedCategories.map((categoryId) => {
                            const category = categories.find(c => c.id === categoryId)
                            if (!category) return null
                            
                            const categoryItems = menuItems.filter(item => 
                              item.category_id === categoryId || item.category?.id === categoryId
                            )
                            if (categoryItems.length === 0) return null

                            return (
                              <div key={category.id} className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-sm text-muted-foreground">
                                    {category.name}
                                  </h4>
                                  <div className="h-px bg-border flex-1" />
                                  <Badge variant="outline" className="text-xs">
                                    {categoryItems.filter(item => selectedItems.includes(item.id)).length}/{categoryItems.length}
                                  </Badge>
                                </div>
                                
                                <div className="space-y-2">
                                  {categoryItems.map((item) => (
                                    <div key={item.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`item-${item.id}`}
                                        checked={selectedItems.includes(item.id)}
                                        onCheckedChange={() => handleItemToggle(item.id)}
                                      />
                                      <label
                                        htmlFor={`item-${item.id}`}
                                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="truncate">{item.name}</span>
                                          <div className="flex-1 border-b border-dotted border-muted-foreground/30 min-w-4"></div>
                                          <span className="text-xs text-muted-foreground font-medium shrink-0">
                                            ${item.price}
                                          </span>
                                        </div>
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })}

                          {/* Show uncategorized items only if we have some selected categories */}
                          {selectedCategories.length > 0 && (() => {
                            const uncategorizedItems = menuItems.filter(item => 
                              !item.category_id && !item.category?.id
                            )
                            if (uncategorizedItems.length > 0) {
                              return (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-sm text-muted-foreground">
                                      {language === 'fr' ? 'Articles non catégorisés' : 'Uncategorized Items'}
                                    </h4>
                                    <div className="h-px bg-border flex-1" />
                                    <Badge variant="outline" className="text-xs">
                                      {uncategorizedItems.filter(item => selectedItems.includes(item.id)).length}/{uncategorizedItems.length}
                                    </Badge>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    {uncategorizedItems.map((item) => (
                                      <div key={item.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`item-${item.id}`}
                                          checked={selectedItems.includes(item.id)}
                                          onCheckedChange={() => handleItemToggle(item.id)}
                                        />
                                        <label
                                          htmlFor={`item-${item.id}`}
                                          className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <span className="truncate">{item.name}</span>
                                            <div className="flex-1 border-b border-dotted border-muted-foreground/30 min-w-4"></div>
                                            <span className="text-xs text-muted-foreground font-medium shrink-0">
                                              ${item.price}
                                            </span>
                                          </div>
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            }
                            return null
                          })()}

                          {categories.length === 0 && menuItems.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">
                                {language === 'fr' ? 'Aucun article trouvé' : 'No menu items found'}
                              </p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scheduling Options */}
            <div className="space-y-4">

              <FormField
                control={form.control}
                name="enable_scheduling"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        {language === 'fr' ? 'Activer la planification' : 'Enable Scheduling'}
                      </FormLabel>
                      <FormDescription>
                        {language === 'fr' 
                          ? 'Planifier l\'application automatique de ce preset'
                          : 'Schedule automatic application of this preset'
                        }
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Scheduling Fields */}
              {watchEnableScheduling && (
                <div className="space-y-6">
                  {/* Schedule Type Selection */}
                  <FormField
                    control={form.control}
                    name="schedule_type"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>{language === 'fr' ? 'Type de planification' : 'Schedule Type'}</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              variant={field.value === 'daily' ? 'default' : 'outline'}
                              onClick={() => field.onChange('daily')}
                              className="justify-center text-sm h-auto py-3"
                            >
                              <Clock className="w-4 h-4 mr-2" />
                              {language === 'fr' ? 'Quotidien' : 'Daily'}
                            </Button>
                            <Button
                              type="button"
                              variant={field.value === 'one-time' ? 'default' : 'outline'}
                              onClick={() => field.onChange('one-time')}
                              className="justify-center text-sm h-auto py-3"
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              {language === 'fr' ? 'Unique' : 'One-time'}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* One-time Schedule Fields */}
                  {watchScheduleType === 'one-time' && (
                    <div className="space-y-6">
                      {/* Start Date & Time */}
                      <div className="space-y-4">
                        <h4 className="font-medium">
                          {language === 'fr' ? 'Date et heure de début' : 'Start Date & Time'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {language === 'fr' 
                            ? 'Quand ce preset sera automatiquement appliqué'
                            : 'When this preset will be automatically applied'
                          }
                        </p>
                        <div className="border rounded-lg">
                          <PresetDateTimePicker
                            key={`start-${selectedStartDateTime?.getTime() || 'empty'}`}
                            selected={selectedStartDateTime}
                            onSelect={setSelectedStartDateTime}
                            onConfirm={handleStartDateConfirm}
                            onCancel={() => {}}
                            title=""
                            placeholder=""
                            compact={true}
                          />
                        </div>
                      </div>

                      {/* End Date & Time - Optional */}
                      <div className="space-y-4">
                        <h4 className="font-medium">
                          {language === 'fr' ? 'Date et heure de fin' : 'End Date & Time'}
                          <span className="text-muted-foreground ml-2 font-normal text-sm">
                            ({language === 'fr' ? 'optionnel' : 'optional'})
                          </span>
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {language === 'fr' 
                            ? 'Quand ce preset sera automatiquement désactivé'
                            : 'When this preset will be automatically deactivated'
                          }
                        </p>
                        <div className="border rounded-lg">
                          <PresetDateTimePicker
                            key={`end-${selectedEndDateTime?.getTime() || 'empty'}`}
                            selected={selectedEndDateTime}
                            onSelect={setSelectedEndDateTime}
                            onConfirm={handleEndDateConfirm}
                            onCancel={() => {}}
                            title=""
                            placeholder=""
                            compact={true}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Daily Recurring Fields */}
                  {watchScheduleType === 'daily' && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="font-medium">
                          {language === 'fr' ? 'Horaires quotidiens' : 'Daily Schedule'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {language === 'fr' 
                            ? 'Ce preset sera actif chaque jour aux heures spécifiées'
                            : 'This preset will be active every day at the specified times'
                          }
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="daily_start_time"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {language === 'fr' ? 'Heure de début' : 'Start Time'}
                                </FormLabel>
                                <FormControl>
                                  <TimePicker
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder={language === 'fr' ? 'Ex: 07:00' : 'e.g. 07:00'}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="daily_end_time"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {language === 'fr' ? 'Heure de fin' : 'End Time'}
                                </FormLabel>
                                <FormControl>
                                  <TimePicker
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder={language === 'fr' ? 'Ex: 11:00' : 'e.g. 11:00'}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>


            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </Button>
              <Button 
                type="submit" 
                disabled={
                  isCreating || 
                  (!watchCaptureCurrentMenu && selectedCategories.length === 0) ||
                  (watchEnableScheduling && !watchScheduleType) ||
                  (watchEnableScheduling && watchScheduleType === 'one-time' && !selectedStartDateTime) ||
                  (watchEnableScheduling && watchScheduleType === 'daily' && (!form.watch('daily_start_time') || !form.watch('daily_end_time')))
                }
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {preset
                      ? (language === 'fr' ? 'Mise à jour...' : 'Updating...')
                      : (language === 'fr' ? 'Création...' : 'Creating...')
                    }
                  </>
                ) : (
                  preset
                    ? (language === 'fr' ? 'Mettre à jour' : 'Update Preset')
                    : (language === 'fr' ? 'Créer le preset' : 'Create Preset')
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}