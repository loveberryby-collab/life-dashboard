'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ListChecks, Target, Weight, Smile, TrendingUp, TrendingDown } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Button } from '@/components/ui/button'

interface DayTaskRow { date: string; is_completed: boolean }
interface HabitRow { id: string; title: string }
interface HabitLogRow { habit_id: string; date: string; is_completed: boolean }
interface WeightRow { date: string; weight: number }
interface MoodRow { date: string; mood_score: number | null; energy_score: number | null; anxiety_score: number | null }

type Period = 'week' | 'month' | 'quarter' | 'year'

const PERIOD_LABELS: Record<Period, string> = {
  week: 'Неделя',
  month: 'Месяц',
  quarter: 'Квартал',
  year: 'Год',
}

const PERIOD_DAYS: Record<Period, number> = {
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
}

function getDaysRange(count: number): string[] {
  const days: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    days.push(`${year}-${month}-${day}`)
  }
  return days
}

function shortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

const chartTooltipStyle = {
  contentStyle: {
    background: 'rgba(10, 25, 48, 0.95)',
    border: '1px solid rgba(90,140,200,0.12)',
    borderRadius: '6px',
    color: '#8EC5F0',
    fontSize: '12px',
  },
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('week')
  const [tasks, setTasks] = useState<DayTaskRow[]>([])
  const [habits, setHabits] = useState<HabitRow[]>([])
  const [habitLogs, setHabitLogs] = useState<HabitLogRow[]>([])

  const [weights, setWeights] = useState<WeightRow[]>([])
  const [moods, setMoods] = useState<MoodRow[]>([])

  const supabase = createClient()
  const dayCount = PERIOD_DAYS[period]
  const days = getDaysRange(dayCount)
  const startDate = days[0]

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      const [tasksRes, habitsRes, habitLogsRes, weightsRes, moodsRes] = await Promise.all([
        supabase.from('day_tasks').select('date, is_completed').gte('date', startDate),
        supabase.from('habits').select('id, title').eq('is_active', true),
        supabase.from('habit_logs').select('habit_id, date, is_completed').gte('date', startDate),
        supabase.from('weight_logs').select('date, weight').gte('date', startDate).order('date', { ascending: true }),
        supabase.from('mood_logs').select('date, mood_score, energy_score, anxiety_score').gte('date', startDate).order('date'),
      ])

      setTasks(tasksRes.data ?? [])
      setHabits(habitsRes.data ?? [])
      setHabitLogs(habitLogsRes.data ?? [])
      setWeights(weightsRes.data ?? [])
      setMoods(moodsRes.data ?? [])
      setLoading(false)
    }
    fetchAll()
  }, [period]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Pick chart days (for large periods, sample every Nth day for chart readability)
  const chartStep = dayCount <= 30 ? 1 : dayCount <= 90 ? 3 : 7
  const chartDays = days.filter((_, i) => i % chartStep === 0 || i === days.length - 1)

  // --- TASKS ---
  const tasksTotal = tasks.length
  const tasksCompleted = tasks.filter((t) => t.is_completed).length
  const tasksCompletionRate = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0

  const tasksChartData = chartDays.map((day) => {
    const idx = days.indexOf(day)
    const rangeEnd = idx
    const rangeStart = Math.max(0, idx - chartStep + 1)
    const rangeDays = days.slice(rangeStart, rangeEnd + 1)
    const dayTasks = tasks.filter((t) => rangeDays.includes(t.date))
    return {
      date: shortDate(day),
      total: dayTasks.length,
      done: dayTasks.filter((t) => t.is_completed).length,
    }
  })

  // --- HABITS ---
  const habitsTotal = habits.length

  const habitCompletionData = chartDays.map((day) => {
    const idx = days.indexOf(day)
    const rangeStart = Math.max(0, idx - chartStep + 1)
    const rangeDays = days.slice(rangeStart, idx + 1)
    const dayLogs = habitLogs.filter((l) => rangeDays.includes(l.date) && l.is_completed)
    const possibleTotal = habitsTotal * rangeDays.length
    return {
      date: shortDate(day),
      pct: possibleTotal > 0 ? Math.round((dayLogs.length / possibleTotal) * 100) : 0,
    }
  })

  // --- WEIGHT ---
  const weightChartData = weights.map((w) => ({
    date: shortDate(w.date),
    weight: Number(w.weight),
  }))

  // --- MOOD ---
  const moodChartData = chartDays.map((day) => {
    const entry = moods.find((m) => m.date === day)
    return {
      date: shortDate(day),
      mood: entry?.mood_score ?? null,
      energy: entry?.energy_score ?? null,
      anxiety: entry?.anxiety_score ?? null,
    }
  })

  const moodEntries = moods.filter((m) => m.mood_score !== null)
  const avgMood = moodEntries.length > 0 ? (moodEntries.reduce((s, m) => s + (m.mood_score ?? 0), 0) / moodEntries.length).toFixed(1) : '—'
  const energyEntries = moods.filter((m) => m.energy_score !== null)
  const anxietyEntries = moods.filter((m) => m.anxiety_score !== null)
  const avgEnergy = energyEntries.length > 0 ? (energyEntries.reduce((s, m) => s + (m.energy_score ?? 0), 0) / energyEntries.length).toFixed(1) : '—'
  const avgAnxiety = anxietyEntries.length > 0 ? (anxietyEntries.reduce((s, m) => s + (m.anxiety_score ?? 0), 0) / anxietyEntries.length).toFixed(1) : '—'

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Аналитика</h1>
      </div>

      {/* Period switcher */}
      <div className="flex gap-2">
        {(['week', 'month', 'quarter', 'year'] as Period[]).map((p) => (
          <Button
            key={p}
            variant={period === p ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(p)}
            className="rounded-2xl"
          >
            {PERIOD_LABELS[p]}
          </Button>
        ))}
      </div>

      {/* ========= TASKS ========= */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center gradient-blue">
            <ListChecks className="w-4 h-4 text-blue-300" />
          </div>
          <h2 className="text-lg font-semibold">Планы на день</h2>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-primary">{tasksCompletionRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">Выполнение</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold">{tasksCompleted}</p>
            <p className="text-xs text-muted-foreground mt-1">Выполнено</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold">{tasksTotal}</p>
            <p className="text-xs text-muted-foreground mt-1">Всего задач</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <p className="text-sm text-muted-foreground mb-3">Задачи</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={tasksChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(90,140,200,0.06)" />
              <XAxis dataKey="date" tick={{ fill: '#3D7CC0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#3D7CC0', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...chartTooltipStyle} />
              <Bar dataKey="total" name="Всего" fill="rgba(18,42,75,0.3)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="done" name="Выполнено" fill="#5BA3E6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ========= HABITS ========= */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center gradient-teal">
            <Target className="w-4 h-4 text-sky-300" />
          </div>
          <h2 className="text-lg font-semibold">Привычки</h2>
        </div>

        <div className="glass-card rounded-2xl p-4 mb-4">
          <p className="text-sm text-muted-foreground mb-3">Выполнение (%)</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={habitCompletionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(90,140,200,0.06)" />
              <XAxis dataKey="date" tick={{ fill: '#3D7CC0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#3D7CC0', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip {...chartTooltipStyle} />
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3D7CC0" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3D7CC0" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="pct" name="%" stroke="#3D7CC0" fill="url(#tealGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </section>

      {/* ========= WEIGHT ========= */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center gradient-blue-teal">
            <Weight className="w-4 h-4 text-blue-200" />
          </div>
          <h2 className="text-lg font-semibold">График веса</h2>
        </div>

        {weightChartData.length > 1 ? (
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-sm text-muted-foreground">Динамика веса</p>
              {weightChartData.length >= 2 && (
                <span className={`text-xs font-medium ${
                  weightChartData[weightChartData.length - 1].weight < weightChartData[0].weight
                    ? 'text-green-400'
                    : weightChartData[weightChartData.length - 1].weight > weightChartData[0].weight
                    ? 'text-red-400'
                    : 'text-muted-foreground'
                }`}>
                  {weightChartData[weightChartData.length - 1].weight < weightChartData[0].weight ? (
                    <TrendingDown className="w-3 h-3 inline mr-1" />
                  ) : weightChartData[weightChartData.length - 1].weight > weightChartData[0].weight ? (
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                  ) : null}
                  {(weightChartData[weightChartData.length - 1].weight - weightChartData[0].weight) > 0 ? '+' : ''}
                  {(weightChartData[weightChartData.length - 1].weight - weightChartData[0].weight).toFixed(1)} кг
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weightChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(90,140,200,0.06)" />
                <XAxis dataKey="date" tick={{ fill: '#3D7CC0', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#3D7CC0', fontSize: 11 }} axisLine={false} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip {...chartTooltipStyle} />
                <defs>
                  <linearGradient id="aWeightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5BA3E6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#5BA3E6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="weight" name="Вес (кг)" stroke="#5BA3E6" fill="url(#aWeightGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">Недостаточно данных о весе для графика</p>
          </div>
        )}
      </section>

      {/* ========= MOOD ========= */}
      <section className="pb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center gradient-blue">
            <Smile className="w-4 h-4 text-sky-300" />
          </div>
          <h2 className="text-lg font-semibold">Настроение</h2>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="glass-card rounded-2xl p-3 text-center">
            <p className="text-lg font-bold text-blue-300">{avgMood}</p>
            <p className="text-xs text-muted-foreground mt-1">Настроение</p>
          </div>
          <div className="glass-card rounded-2xl p-3 text-center">
            <p className="text-lg font-bold text-teal-400">{avgEnergy}</p>
            <p className="text-xs text-muted-foreground mt-1">Энергия</p>
          </div>
          <div className="glass-card rounded-2xl p-3 text-center">
            <p className="text-lg font-bold text-sky-400">{avgAnxiety}</p>
            <p className="text-xs text-muted-foreground mt-1">Тревожность</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <p className="text-sm text-muted-foreground mb-3">Тренды настроения</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={moodChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(90,140,200,0.06)" />
              <XAxis dataKey="date" tick={{ fill: '#3D7CC0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#3D7CC0', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 10]} />
              <Tooltip {...chartTooltipStyle} />
              <defs>
                <linearGradient id="aMoodGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5BA3E6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#5BA3E6" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="aEnergyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3D7CC0" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3D7CC0" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="aAnxietyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8EC5F0" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8EC5F0" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="mood" name="Настроение" stroke="#5BA3E6" fill="url(#aMoodGrad)" strokeWidth={2} connectNulls />
              <Area type="monotone" dataKey="energy" name="Энергия" stroke="#3D7CC0" fill="url(#aEnergyGrad)" strokeWidth={2} connectNulls />
              <Area type="monotone" dataKey="anxiety" name="Тревожность" stroke="#8EC5F0" fill="url(#aAnxietyGrad)" strokeWidth={2} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
