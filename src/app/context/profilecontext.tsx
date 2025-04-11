'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface Profile {
  name: string
  email?: string
  subscriptionStatus?: string
  // 필요한 다른 필드 (전화, 주소, 건강 정보 등)
  [key: string]: any
}

interface ProfileContextType {
  activeProfile: Profile | null
  setActiveProfile: (profile: Profile) => void
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)

  return (
    <ProfileContext.Provider value={{ activeProfile, setActiveProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}
