"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { WaiterCallButton } from './waiter-call-button'

interface DraggableWaiterButtonProps {
  branchId: string
  tableNumber: number
  zone?: string
}

export function DraggableWaiterButton({
  branchId,
  tableNumber,
  zone
}: DraggableWaiterButtonProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const buttonRef = useRef<HTMLDivElement>(null)

  // Initialize position on mount
  useEffect(() => {
    const updatePosition = () => {
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // Default position: bottom-right with some margin
      const defaultX = viewportWidth - 80 // 64px button + 16px margin
      const defaultY = viewportHeight - 120 // Above mobile nav/cart area

      setPosition({ x: defaultX, y: defaultY })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)

    return () => window.removeEventListener('resize', updatePosition)
  }, [])

  // Handle mouse/touch start
  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true)
    setDragStart({
      x: clientX - position.x,
      y: clientY - position.y
    })
  }

  // Handle mouse/touch move
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const buttonSize = 64 // 56px + 8px margin

    // Calculate new position
    let newX = clientX - dragStart.x
    let newY = clientY - dragStart.y

    // Constrain to viewport bounds
    newX = Math.max(8, Math.min(viewportWidth - buttonSize, newX))
    newY = Math.max(8, Math.min(viewportHeight - buttonSize, newY))

    setPosition({ x: newX, y: newY })
  }, [isDragging, dragStart.x, dragStart.y])

  // Handle mouse/touch end
  const handleEnd = useCallback(() => {
    setIsDragging(false)

    // Snap to edges for better UX
    const viewportWidth = window.innerWidth
    const centerX = viewportWidth / 2
    const buttonSize = 64

    setPosition(prev => ({
      x: prev.x < centerX
        ? 16 // Snap to left edge
        : viewportWidth - buttonSize, // Snap to right edge
      y: prev.y
    }))
  }, [])

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleStart(e.clientX, e.clientY)
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX, e.clientY)
  }, [handleMove])

  const handleMouseUp = useCallback(() => {
    handleEnd()
  }, [handleEnd])

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    handleStart(touch.clientX, touch.clientY)
  }

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0]
      handleMove(touch.clientX, touch.clientY)
    }
  }, [handleMove])

  const handleTouchEnd = useCallback(() => {
    handleEnd()
  }, [handleEnd])

  // Add/remove global event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  return (
    <div
      ref={buttonRef}
      className={`fixed z-50 transition-all duration-200 ${
        isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: isDragging ? 'none' : 'translateZ(0)', // Hardware acceleration when not dragging
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <WaiterCallButton
        branchId={branchId}
        tableNumber={tableNumber}
        zone={zone}
        className="rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 min-w-0 w-14 h-14 flex items-center justify-center text-white font-bold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 select-none"
      />
    </div>
  )
}