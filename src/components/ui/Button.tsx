'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  full?: boolean
  className?: string
  children: ReactNode
}

export default function Button({
  children,
  variant = 'primary',
  full = true,
  className = '',
  ...props
}: ButtonProps) {
  const base = 'py-3 px-4 rounded-xl font-medium text-sm transition duration-300'
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300'
  }

  return (
    <button
      className={clsx(base, variants[variant], full && 'w-full', className)}
      {...props}
    >
      {children}
    </button>
  )
}
