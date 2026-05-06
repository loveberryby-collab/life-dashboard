'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ListChecks, Target, Dumbbell, Smile, Loader2 } from 'lucide-react'
import { getToday, formatDateRu } from '@/lib/utils/date'

interface DashboardStats {
  tasksCompleted: number
  tasksTotal: number
  habitsCompleted: number
  habitsTotal: number
  calories: number
  lastWeight: number | null
  moodScore: number | null
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const router = useRouter()
  const supabase = createClient()
  const today = getToday()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserName(user.email?.split('@')[0] || 'друг')

      const [tasksRes, habitsRes, habitLogsRes, mealsRes, weightRes, moodRes] = await Promise.all([
        supabase.from('day_tasks').select('id, is_completed').eq('date', today),
        supabase.from('habits').select('id').eq('is_active', true),
        supabase.from('habit_logs').select('id, habit_id').eq('date', today).eq('is_completed', true),
        supabase.from('meals').select('calories').eq('date', today),
        supabase.from('weight_logs').select('weight').order('date', { ascending: false }).limit(1),
        supabase.from('mood_logs').select('mood_score').eq('date', today).limit(1),
      ])

      setStats({
        tasksCompleted: tasksRes.data?.filter((t) => t.is_completed).length ?? 0,
        tasksTotal: tasksRes.data?.length ?? 0,
        habitsCompleted: (() => {
          const activeIds = new Set(habitsRes.data?.map((h) => h.id) ?? [])
          return habitLogsRes.data?.filter((l) => activeIds.has(l.habit_id)).length ?? 0
        })(),
        habitsTotal: habitsRes.data?.length ?? 0,
        calories: mealsRes.data?.reduce((sum, m) => sum + Number(m.calories), 0) ?? 0,
        lastWeight: weightRes.data?.[0]?.weight ?? null,
        moodScore: moodRes.data?.[0]?.mood_score ?? null,
      })
      setLoading(false)
    }
    load()
  }, [today]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const cards = [
    {
      title: 'Планы на день',
      icon: ListChecks,
      href: '/day-plans',
      gradient: 'gradient-blue',
      glow: 'glow-blue',
      iconColor: 'text-blue-300',
      stat: stats ? `${stats.tasksCompleted} / ${stats.tasksTotal} выполнено` : '—',
    },
    {
      title: 'Трекер привычек',
      icon: Target,
      href: '/habits',
      gradient: 'gradient-teal',
      glow: 'glow-teal',
      iconColor: 'text-sky-300',
      stat: stats ? `${stats.habitsCompleted} / ${stats.habitsTotal} отмечено` : '—',
    },
    {
      title: 'Красивое тело',
      icon: Dumbbell,
      href: '/body',
      gradient: 'gradient-blue-teal',
      glow: 'glow-blue',
      iconColor: 'text-blue-200',
      stat: stats
        ? `${stats.calories} ккал${stats.lastWeight ? ` · ${stats.lastWeight} кг` : ''}`
        : '—',
    },
    {
      title: 'Настроение',
      icon: Smile,
      href: '/mood',
      gradient: 'gradient-blue',
      glow: 'glow-teal',
      iconColor: 'text-sky-300',
      stat: stats?.moodScore ? `${stats.moodScore} / 10` : 'Не заполнено',
    },
  ]

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Привет, {userName}!
        </h1>
        <p className="text-muted-foreground mt-1">{formatDateRu(today)}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => (
          <div
            key={card.href}
            className={`glass-card rounded-md p-6 cursor-pointer hover:scale-[1.02] transition-all duration-300 ${card.glow}`}
            onClick={() => router.push(card.href)}
          >
            <div className={`w-12 h-12 rounded-md flex items-center justify-center ${card.gradient} mb-4`}>
              <card.icon className={`w-6 h-6 ${card.iconColor}`} />
            </div>
            <h3 className="font-semibold text-foreground text-lg">{card.title}</h3>
            <p className="text-muted-foreground text-sm mt-1">{card.stat}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
