'use client'

import { useAuth } from '@/contexts/auth-context'
import { Sidebar } from '@/components/layout/sidebar'
import { PermissionsProvider } from '@/contexts/permissions-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <PermissionsProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar role={user.role} userName={user.full_name} onSignOut={handleSignOut} />
        <main className="flex-1 overflow-y-auto pt-0 md:pt-0">
          {/* Top bar spacer mobile */}
          <div className="h-14 md:hidden shrink-0" />
          <div className="p-4 md:p-6 max-w-7xl mx-auto pb-24 md:pb-6">
            {children}
          </div>
        </main>
      </div>
    </PermissionsProvider>
  )
}
