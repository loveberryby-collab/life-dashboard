'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, ListChecks, Target, Dumbbell, Smile, BarChart3, LogOut, Snowflake } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { href: '/dashboard', label: 'Главная', icon: LayoutDashboard },
  { href: '/day-plans', label: 'Планы', icon: ListChecks },
  { href: '/habits', label: 'Привычки', icon: Target },
  { href: '/body', label: 'Тело', icon: Dumbbell },
  { href: '/mood', label: 'Настроение', icon: Smile },
  { href: '/analytics', label: 'Аналитика', icon: BarChart3 },
]

export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-56 glass border-r border-white/[0.08] flex-col p-4 z-40">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-8 h-8 rounded-2xl flex items-center justify-center gradient-blue glow-blue">
            <Snowflake className="w-5 h-5 text-sky-200" />
          </div>
          <span className="font-bold text-foreground text-sm">Olka White Life</span>
        </div>
        <nav className="flex-1 space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200',
                pathname === href
                  ? 'bg-primary/20 text-primary shadow-[0_0_12px_rgba(90,140,200,0.12)]'
                  : 'text-muted-foreground hover:bg-white/[0.06] hover:text-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          Выйти
        </button>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-white/[0.08] z-50 safe-area-bottom">
        <div className="flex justify-around py-2">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1 text-xs font-medium transition-all duration-200',
                pathname === href ? 'text-primary drop-shadow-[0_0_6px_rgba(90,140,200,0.2)]' : 'text-muted-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
