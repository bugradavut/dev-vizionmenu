"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// Simple Accordion implementation without Radix dependency
interface AccordionContextType {
  openItems: string[]
  toggleItem: (value: string) => void
  type: "single" | "multiple"
}

const AccordionContext = React.createContext<AccordionContextType | null>(null)

interface AccordionProps {
  type?: "single" | "multiple"
  defaultValue?: string[]
  children: React.ReactNode
  className?: string
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  ({ type = "multiple", defaultValue = [], children, className, ...props }, ref) => {
    const [openItems, setOpenItems] = React.useState<string[]>(defaultValue)

    const toggleItem = React.useCallback((value: string) => {
      setOpenItems(prev => {
        if (type === "single") {
          return prev.includes(value) ? [] : [value]
        } else {
          return prev.includes(value) 
            ? prev.filter(item => item !== value)
            : [...prev, value]
        }
      })
    }, [type])

    return (
      <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      </AccordionContext.Provider>
    )
  }
)
Accordion.displayName = "Accordion"

interface AccordionItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={className} data-value={value} {...props}>
        {children}
      </div>
    )
  }
)
AccordionItem.displayName = "AccordionItem"

interface AccordionTriggerProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ children, className, onClick, ...props }, ref) => {
    const context = React.useContext(AccordionContext)
    const parentValue = React.useContext(AccordionItemContext)
    
    if (!context || !parentValue) {
      throw new Error("AccordionTrigger must be used within AccordionItem")
    }

    const isOpen = context.openItems.includes(parentValue)

    const handleClick = () => {
      context.toggleItem(parentValue)
      onClick?.()
    }

    return (
      <button
        ref={ref}
        className={cn(
          "flex w-full items-center justify-between py-4 font-medium transition-all hover:bg-muted/50 text-left",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        <div className="flex-1">
          {children}
        </div>
        <ChevronDown 
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200 ml-4",
            isOpen && "rotate-180"
          )} 
        />
      </button>
    )
  }
)
AccordionTrigger.displayName = "AccordionTrigger"

const AccordionItemContext = React.createContext<string>("")

const AccordionItemProvider: React.FC<{ value: string; children: React.ReactNode }> = ({ 
  value, 
  children 
}) => {
  return (
    <AccordionItemContext.Provider value={value}>
      {children}
    </AccordionItemContext.Provider>
  )
}

interface AccordionContentProps {
  children: React.ReactNode
  className?: string
}

const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ children, className, ...props }, ref) => {
    const context = React.useContext(AccordionContext)
    const parentValue = React.useContext(AccordionItemContext)
    const contentRef = React.useRef<HTMLDivElement>(null)
    
    // Combine internal ref with forwarded ref
    const combinedRef = React.useCallback((node: HTMLDivElement) => {
      contentRef.current = node
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    }, [ref])
    
    if (!context || !parentValue) {
      throw new Error("AccordionContent must be used within AccordionItem")
    }

    const isOpen = context.openItems.includes(parentValue)

    React.useEffect(() => {
      const content = contentRef.current
      if (!content) return

      if (isOpen) {
        // Remove transition temporarily
        content.style.transition = 'none'
        content.style.height = '0px'
        content.style.opacity = '0'
        
        // Force reflow
        void content.offsetHeight
        
        // Re-enable transition and animate
        content.style.transition = 'all 300ms ease-in-out'
        content.style.height = content.scrollHeight + 'px'
        content.style.opacity = '1'
        
        const timer = setTimeout(() => {
          content.style.height = 'auto'
        }, 300)
        
        return () => clearTimeout(timer)
      } else {
        // Ensure we start from current height
        content.style.transition = 'none'
        content.style.height = content.scrollHeight + 'px'
        content.style.opacity = '1'
        
        // Force reflow
        void content.offsetHeight
        
        // Re-enable transition and animate to closed
        content.style.transition = 'all 300ms ease-in-out'
        content.style.height = '0px'
        content.style.opacity = '0'
      }
    }, [isOpen])

    return (
      <div
        ref={combinedRef}
        className={cn(
          "overflow-hidden",
          className
        )}
        {...props}
      >
        <div className="pt-0">{children}</div>
      </div>
    )
  }
)
AccordionContent.displayName = "AccordionContent"

// Enhanced AccordionItem that provides context
const EnhancedAccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, children, className, ...props }, ref) => {
    return (
      <AccordionItemProvider value={value}>
        <AccordionItem ref={ref} value={value} className={className} {...props}>
          {children}
        </AccordionItem>
      </AccordionItemProvider>
    )
  }
)
EnhancedAccordionItem.displayName = "AccordionItem"

export { 
  Accordion, 
  EnhancedAccordionItem as AccordionItem, 
  AccordionTrigger, 
  AccordionContent 
}