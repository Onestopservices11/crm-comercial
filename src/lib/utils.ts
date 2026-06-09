import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { UserRole } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function roleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: 'Admin',
    diretor_comercial: 'Diretor Comercial',
    comercial: 'Comercial',
  }
  return labels[role]
}

export function roleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    admin: 'bg-purple-100 text-purple-800',
    diretor_comercial: 'bg-blue-100 text-blue-800',
    comercial: 'bg-green-100 text-green-800',
  }
  return colors[role]
}

export function canAccess(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole)
}

export function isAdmin(role: UserRole): boolean {
  return role === 'admin'
}

export function isDirector(role: UserRole): boolean {
  return role === 'diretor_comercial' || role === 'admin'
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}
