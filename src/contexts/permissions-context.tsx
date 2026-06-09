'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/types'

type PermissionsMap = Record<string, Record<string, boolean>>

interface PermissionsContextValue {
  permissions: PermissionsMap
  can: (role: UserRole, module: string) => boolean
  loading: boolean
}

const PermissionsContext = createContext<PermissionsContextValue>({
  permissions: {},
  can: () => true,
  loading: true,
})

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<PermissionsMap>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('role_permissions')
      .select('role, module, allowed')
      .then(({ data }) => {
        const map: PermissionsMap = {}
        for (const row of data ?? []) {
          if (!map[row.role]) map[row.role] = {}
          map[row.role][row.module] = row.allowed
        }
        setPermissions(map)
        setLoading(false)
      })
  }, [])

  const can = (role: UserRole, module: string) => {
    if (loading) return true
    return permissions[role]?.[module] ?? false
  }

  return (
    <PermissionsContext.Provider value={{ permissions, can, loading }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export const usePermissions = () => useContext(PermissionsContext)
