"use client"

import React from 'react'

interface ChainOwnerGuardProps {
  children: React.ReactNode
}

export const ChainOwnerGuard: React.FC<ChainOwnerGuardProps> = ({ children }) => {
  // Just render children without any access control
  return <>{children}</>
}