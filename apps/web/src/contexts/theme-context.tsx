"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  actualTheme: 'dark' | 'light' // Resolved theme (system preference applied)
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')
  const [actualTheme, setActualTheme] = useState<'dark' | 'light'>('light')

  useEffect(() => {
    // Get saved theme from localStorage and sync with DOM
    const savedTheme = localStorage.getItem('vizion-menu-theme') as Theme
    const root = window.document.documentElement
    
    if (savedTheme && ['dark', 'light', 'system'].includes(savedTheme)) {
      setTheme(savedTheme)
      // Sync actualTheme with what's already applied by the script
      if (root.classList.contains('dark')) {
        setActualTheme('dark')
      } else {
        setActualTheme('light')
      }
    } else {
      // If no saved theme, sync with what the script already applied
      if (root.classList.contains('dark')) {
        setActualTheme('dark')
        setTheme('dark')
      } else {
        setActualTheme('light')
        setTheme('light')
      }
    }
  }, [])

  useEffect(() => {
    const root = window.document.documentElement
    
    let resolvedTheme: 'dark' | 'light'

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      resolvedTheme = systemTheme
    } else {
      resolvedTheme = theme
    }

    // Only apply if different from current theme to prevent flashing
    if (!root.classList.contains(resolvedTheme)) {
      // Remove previous theme classes
      root.classList.remove('light', 'dark')
      // Apply new theme
      root.classList.add(resolvedTheme)
    }
    
    setActualTheme(resolvedTheme)

    // Save to localStorage
    localStorage.setItem('vizion-menu-theme', theme)
  }, [theme])

  const value = {
    theme,
    setTheme,
    actualTheme,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
} 