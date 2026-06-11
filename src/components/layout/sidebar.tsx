'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users, MessageSquare, BarChart2, CheckSquare, Calendar,
  CalendarDays, DollarSign, UserCircle, FileText,
  BookOpen, LayoutDashboard, LogOut, ChevronLeft, ChevronRight,
  UserCog, ShieldCheck, Menu, X, Zap, Target
} from 'lucide-react'
import { AlertsBell } from '@/components/alerts/alerts-bell'
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
      { href: '/comissoes', label: 'Comissões',  icon: DollarSign, module: 'comissoes', step: '3' },
    ],
  },
  {
    label: 'Dia-a-Dia',
    items: [
      { href: '/tarefas',        label: 'Tarefas',        icon: CheckSquare,  module: 'tarefas' },
      { href: '/agenda',         label: 'Agenda',         icon: Calendar,     module: 'agenda' },
      { href: '/agenda-central', label: 'Agenda Central', icon: CalendarDays, module: 'agenda_central' },
      { href: '/procedimentos',  label: 'Procedimentos',  icon: BookOpen,     module: 'procedimentos' },
      { href: '/metricas',       label: 'Métricas',       icon: Target,       module: 'metricas' },
    ],
  },
  {
    label: 'Equipa',
    items: [
      { href: '/equipas',      label: 'Equipas',      icon: Users,       module: 'equipas' },
      { href: '/utilizadores', label: 'Utilizadores', icon: UserCog,     module: 'utilizadores' },
      { href: '/permissoes',   label: 'Permissões',   icon: ShieldCheck, module: 'utilizadores', adminOnly: true },
      { href: '/regras',       label: 'Regras',       icon: Zap,         module: 'regras',       adminOnly: true },
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const { can } = usePermissions()

  const allVisibleItems = navGroups.flatMap(g =>
    g.items.filter(item => item.adminOnly ? role === 'admin' : can(role, item.module))
  )

  // Bottom nav: primeiros 4 itens mais usados
  const bottomNavItems = allVisibleItems.slice(0, 4)

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className={cn(
        'hidden md:flex h-screen bg-gray-900 text-white flex-col transition-all duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}>
        {/* Logo */}
        <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-gray-700', collapsed && 'justify-center')}>
          {!collapsed ? (
            <div>
              <p className="text-sm font-bold text-white leading-tight">Gambit Labs</p>
              <p className="text-xs text-gray-400">CRM Comercial</p>
            </div>
          ) : (
            <span className="text-lg font-bold text-blue-400">G</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(item =>
              item.adminOnly ? role === 'admin' : can(role, item.module)
            )
            if (visibleItems.length === 0) return null
            return (
              <div key={group.label} className="mb-4">
                {group.label && !collapsed && (
                  <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                    {group.label}
                  </p>
                )}
                {group.label && collapsed && <div className="mx-3 mb-1 border-t border-gray-700" />}
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link key={item.href} href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
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
          {!collapsed && (
            <div className="flex items-center justify-between px-2 py-1">
              <AlertsBell />
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight size={17} /> : <><ChevronLeft size={17} /><span>Recolher</span></>}
          </button>
          {!collapsed && <div className="px-3 py-1"><p className="text-xs text-gray-400 truncate">{userName}</p></div>}
          <button onClick={onSignOut}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-red-900 hover:text-red-300 transition-colors"
            title={collapsed ? 'Sair' : undefined}
          >
            <LogOut size={17} className="shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 text-white flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <p className="text-sm font-bold">Gambit Labs CRM</p>
        <div className="flex items-center gap-1">
          <AlertsBell />
          <button onClick={() => setMobileOpen(true)} className="text-gray-300 hover:text-white p-1">
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* ── MOBILE DRAWER ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          {/* Drawer */}
          <div className="relative w-72 bg-gray-900 text-white flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
              <div>
                <p className="text-sm font-bold text-white">Gambit Labs</p>
                <p className="text-xs text-gray-400">{userName}</p>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 py-3 px-2">
              {navGroups.map((group) => {
                const visibleItems = group.items.filter(item =>
                  item.adminOnly ? role === 'admin' : can(role, item.module)
                )
                if (visibleItems.length === 0) return null
                return (
                  <div key={group.label} className="mb-4">
                    {group.label && (
                      <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                        {group.label}
                      </p>
                    )}
                    <div className="space-y-0.5">
                      {visibleItems.map((item) => {
                        const Icon = item.icon
                        const active = isActive(item.href)
                        return (
                          <Link key={item.href} href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                              active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            )}
                          >
                            <Icon size={18} className="shrink-0" />
                            <span className="flex-1">{item.label}</span>
                            {item.step && (
                              <span className="text-[10px] font-bold bg-gray-700 text-gray-400 w-4 h-4 rounded-full flex items-center justify-center">
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

            <div className="border-t border-gray-700 p-3">
              <button onClick={onSignOut}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-400 hover:bg-red-900 hover:text-red-300 transition-colors"
              >
                <LogOut size={17} />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-900 border-t border-gray-700 flex">
        {bottomNavItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors',
                active ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
              )}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
        {/* Mais */}
        <button
          onClick={() => setMobileOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium text-gray-500 hover:text-gray-300"
        >
          <Menu size={20} />
          <span>Mais</span>
        </button>
      </nav>
    </>
  )
}
