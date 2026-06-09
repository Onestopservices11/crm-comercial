'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users, MessageSquare, BarChart2, CheckSquare, Calendar,
  CalendarDays, DollarSign, UserCircle, FileText, FileEdit,
  BookOpen, LayoutDashboard, LogOut, ChevronLeft, ChevronRight,
  UserCog, ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserRole } from '@/types'
import { useState } from 'react'
import { usePermissions } from '@/contexts/permissions-context'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  module: string
  step?: string
  adminOnly?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: '',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
      { href: '/chat',      label: 'Chat',       icon: MessageSquare,  module: 'chat' },
    ],
  },
  {
    label: 'Fluxo Comercial',
    items: [
      { href: '/clientes',  label: 'Clientes',   icon: UserCircle, module: 'clientes',  step: '1' },
      { href: '/pipeline',  label: 'Pipeline',   icon: BarChart2,  module: 'pipeline',  step: '2' },
      { href: '/propostas', label: 'Propostas',  icon: FileEdit,   module: 'propostas', step: '3' },
      { href: '/faturacao', label: 'Faturação',  icon: FileText,   module: 'faturacao', step: '4' },
      { href: '/comissoes', label: 'Comissões',  icon: DollarSign, module: 'comissoes', step: '5' },
    ],
  },
  {
    label: 'Dia-a-Dia',
    items: [
      { href: '/tarefas',        label: 'Tarefas',        icon: CheckSquare,  module: 'tarefas' },
      { href: '/agenda',         label: 'Agenda',         icon: Calendar,     module: 'agenda' },
      { href: '/agenda-central', label: 'Agenda Central', icon: CalendarDays, module: 'agenda_central' },
      { href: '/procedimentos',  label: 'Procedimentos',  icon: BookOpen,     module: 'procedimentos' },
    ],
  },
  {
    label: 'Equipa',
    items: [
      { href: '/equipas',      label: 'Equipas',      icon: Users,       module: 'equipas' },
      { href: '/utilizadores', label: 'Utilizadores', icon: UserCog,     module: 'utilizadores' },
      { href: '/permissoes',   label: 'Permissões',   icon: ShieldCheck, module: 'utilizadores', adminOnly: true },
    ],
  },
]

interface SidebarProps {
  role: UserRole
  userName: string
  onSignOut: () => void
}

export function Sidebar({ role, userName, onSignOut }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { can } = usePermissions()

  return (
    <aside
      className={cn(
        'h-screen bg-gray-900 text-white flex flex-col transition-all duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-gray-700', collapsed && 'justify-center')}>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-white leading-tight">Gambit Labs</p>
            <p className="text-xs text-gray-400">CRM Comercial</p>
          </div>
        )}
        {collapsed && <span className="text-lg font-bold text-blue-400">G</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(item => {
            if (item.adminOnly) return role === 'admin'
            return can(role, item.module)
          })
          if (visibleItems.length === 0) return null
          return (
            <div key={group.label} className="mb-4">
              {group.label && !collapsed && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                  {group.label}
                </p>
              )}
              {group.label && collapsed && (
                <div className="mx-3 mb-1 border-t border-gray-700" />
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon
                  const active = pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon size={17} className="shrink-0" />
                      {!collapsed && <span className="flex-1">{item.label}</span>}
                      {!collapsed && item.step && (
                        <span className="text-[10px] font-bold bg-gray-700 text-gray-400 w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                          {item.step}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-700 p-2 space-y-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight size={17} /> : <><ChevronLeft size={17} /><span>Recolher</span></>}
        </button>
        {!collapsed && (
          <div className="px-3 py-2">
            <p className="text-xs text-gray-400 truncate">{userName}</p>
          </div>
        )}
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-red-900 hover:text-red-300 transition-colors"
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut size={17} className="shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  )
}
