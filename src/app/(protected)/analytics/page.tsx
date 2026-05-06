'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ListChecks, Target, Dumbbell, Smile, TrendingUp, TrendingDown, Flame } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface DayTaskRow { date: string; is_completed: boolean }
interface HabitRow { id: string; title: string }
interface HabitLogRow { habit_id: string; date: string; is_completed: boolean }
interface MealRow { date: string; calories: number; protein: number; fat: number; carbs: number }
interface WeightRow { date: string; weight: number }
interface WorkoutRow { date: string; workout_type: string; duration_minutes: number | null }
interface MoodRow { date: string; mood_score: number | null; energy_score: number | null; anxiety_score: number | null }

function getLast7Days(): string[] {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    days.push(`${year}-${month}-${day}`)
  }
  return days
}

function getLast30Days(): string[] {
  const days: string[] = []
  for (let i = 29; i >= 0; i--) {
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
    background: 'rgba(6, 24, 38, 0.95)',
    border: '1px solid rgba(88,201,243,0.12)',
    borderRadius: '6px',
    color: '#BDE5FF',
    fontSize: '12px',
  },
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<DayTaskRow[]>([])
  const [habits, setHabits] = useState<HabitRow[]>([])
  const [habitLogs, setHabitLogs] = useState<HabitLogRow[]>([])
  const [meals, setMeals] = useState<MealRow[]>([])
  const [weights, setWeights] = useState<WeightRow[]>([])
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([])
  const [moods, setMoods] = useState<MoodRow[]>([])

  const supabase = createClient()
  const last30 = getLast30Days()
  const last7 = getLast7Days()
  const startDate = last30[0]

  useEffect(() => {
    async function fetchAll() {
      const [tasksRes, habitsRes, habitLogsRes, mealsRes, weightsRes, workoutsRes, moodsRes] = await Promise.all([
        supabase.from('day_tasks').select('date, is_completed').gte('date', startDate),
        supabase.from('habits').select('id, title').eq('is_active', true),
        supabase.from('habit_logs').select('habit_id, date, is_completed').gte('date', startDate),
        supabase.from('meals').select('date, calories, protein, fat, carbs').gte('date', startDate),
        supabase.from('weight_logs').select('date, weight').order('date', { ascending: true }).limit(60),
        supabase.from('workouts').select('date, workout_type, duration_minutes').gte('date', startDate),
        supabase.from('mood_logs').select('date, mood_score, energy_score, anxiety_score').gte('date', startDate).order('date'),
      ])

      setTasks(tasksRes.data ?? [])
      setHabits(habitsRes.data ?? [])
      setHabitLogs(habitLogsRes.data ?? [])
      setMeals(mealsRes.data ?? [])
      setWeights(weightsRes.data ?? [])
      setWorkouts(workoutsRes.data ?? [])
      setMoods(moodsRes.data ?? [])
      setLoading(false)
    }
    fetchAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // --- TASKS ANALYTICS ---
  const tasksTotal30 = tasks.length
  const tasksCompleted30 = tasks.filter((t) => t.is_completed).length
  const tasksCompletionRate = tasksTotal30 > 0 ? Math.round((tasksCompleted30 / tasksTotal30) * 100) : 0

  const tasksChartData = last7.map((day) => {
    const dayTasks = tasks.filter((t) => t.date === day)
    return {
      date: shortDate(day),
      total: dayTasks.length,
      done: dayTasks.filter((t) => t.is_completed).length,
    }
  })

  // --- HABITS ANALYTICS ---
  const habitsTotal = habits.length
  const habitCompletionByDay = last7.map((day) => {
    const dayLogs = habitLogs.filter((l) => l.date === day && l.is_completed)
    return {
      date: shortDate(day),
      completed: dayLogs.length,
      total: habitsTotal,
      pct: habitsTotal > 0 ? Math.round((dayLogs.length / habitsTotal) * 100) : 0,
    }
  })

  const habitStreaks: { title: string; streak: number }[] = habits.map((h) => {
    const logsForHabit = habitLogs
      .filter((l) => l.habit_id === h.id && l.is_completed)
      .map((l) => l.date)
      .sort()
      .reverse()

    let streak = 0
    const today = last7[last7.length - 1]
    let checkDate = today
    for (let i = 0; i < 365; i++) {
      if (logsForHabit.includes(checkDate)) {
        streak++
        const d = new Date(checkDate + 'T00:00:00')
        d.setDate(d.getDate() - 1)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        checkDate = `${year}-${month}-${day}`
      } else {
        break
      }
    }
    return { title: h.title, streak }
  }).sort((a, b) => b.streak - a.streak)

  // --- BODY ANALYTICS ---
  const weekMeals = meals.filter((m) => last7.includes(m.date))
  const avgCalories = weekMeals.length > 0 ? Math.round(weekMeals.reduce((s, m) => s + Number(m.calories), 0) / 7) : 0
  const avgProtein = weekMeals.length > 0 ? Math.round(weekMeals.reduce((s, m) => s + Number(m.protein), 0) / 7) : 0
  const avgFat = weekMeals.length > 0 ? Math.round(weekMeals.reduce((s, m) => s + Number(m.fat), 0) / 7) : 0
  const avgCarbs = weekMeals.length > 0 ? Math.round(weekMeals.reduce((s, m) => s + Number(m.carbs), 0) / 7) : 0

  const caloriesChartData = last7.map((day) => {
    const dayMeals = meals.filter((m) => m.date === day)
    return {
      date: shortDate(day),
      calories: dayMeals.reduce((s, m) => s + Number(m.calories), 0),
    }
  })

  const weightChartData = weights.map((w) => ({
    date: shortDate(w.date),
    weight: Number(w.weight),
  }))

  const weekWorkouts = workouts.filter((w) => last7.includes(w.date))
  const totalWorkoutMinutes = weekWorkouts.reduce((s, w) => s + (w.duration_minutes ?? 0), 0)

  const workoutsByType: Record<string, number> = {}
  weekWorkouts.forEach((w) => {
    workoutsByType[w.workout_type] = (workoutsByType[w.workout_type] ?? 0) + 1
  })

  const WORKOUT_LABELS: Record<string, string> = {
    strength: 'Силовая',
    cardio: 'Кардио',
    basketball: 'Баскетбол',
    stretching: 'Растяжка',
    walking: 'Ходьба',
    other: 'Другое',
  }

  // --- MOOD ANALYTICS ---
  const moodChartData = last7.map((day) => {
    const entry = moods.find((m) => m.date === day)
    return {
      date: shortDate(day),
      mood: entry?.mood_score ?? null,
      energy: entry?.energy_score ?? null,
      anxiety: entry?.anxiety_score ?? null,
    }
  })

  const moodEntries30 = moods.filter((m) => m.mood_score !== null)
  const avgMood = moodEntries30.length > 0 ? (moodEntries30.reduce((s, m) => s + (m.mood_score ?? 0), 0) / moodEntries30.length).toFixed(1) : '—'
  const avgEnergy = moodEntries30.length > 0 ? (moodEntries30.reduce((s, m) => s + (m.energy_score ?? 0), 0) / moodEntries30.length).toFixed(1) : '—'
  const avgAnxiety = moodEntries30.length > 0 ? (moodEntries30.reduce((s, m) => s + (m.anxiety_score ?? 0), 0) / moodEntries30.length).toFixed(1) : '—'

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Аналитика</h1>

      {/* ========= TASKS ========= */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center gradient-blue">
            <ListChecks className="w-4 h-4 text-blue-300" />
          </div>
          <h2 className="text-lg font-semibold">Планы на день</h2>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="glass-card rounded-md p-4 text-center">
            <p className="text-2xl font-bold text-primary">{tasksCompletionRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">Выполнение за 30 дней</p>
          </div>
          <div className="glass-card rounded-md p-4 text-center">
            <p className="text-2xl font-bold">{tasksCompleted30}</p>
            <p className="text-xs text-muted-foreground mt-1">Выполнено</p>
          </div>
          <div className="glass-card rounded-md p-4 text-center">
            <p className="text-2xl font-bold">{tasksTotal30}</p>
            <p className="text-xs text-muted-foreground mt-1">Всего задач</p>
          </div>
        </div>

        <div className="glass-card rounded-md p-4">
          <p className="text-sm text-muted-foreground mb-3">Задачи за неделю</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={tasksChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fill: '#2FA0C6', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#2FA0C6', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...chartTooltipStyle} />
              <Bar dataKey="total" name="Всего" fill="rgba(28,78,117,0.3)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="done" name="Выполнено" fill="#58C9F3" radius={[4, 4, 0, 0]} />
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

        <div className="glass-card rounded-md p-4 mb-4">
          <p className="text-sm text-muted-foreground mb-3">Выполнение за неделю (%)</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={habitCompletionByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fill: '#2FA0C6', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#2FA0C6', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip {...chartTooltipStyle} />
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2FA0C6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#2FA0C6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="pct" name="%" stroke="#2FA0C6" fill="url(#tealGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {habitStreaks.length > 0 && (
          <div className="glass-card rounded-md p-4">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-sky-400" />
              <p className="text-sm text-muted-foreground">Серии (streak)</p>
            </div>
            <div className="space-y-2">
              {habitStreaks.map((h) => (
                <div key={h.title} className="flex items-center justify-between">
                  <span className="text-sm">{h.title}</span>
                  <span className={`text-sm font-bold ${h.streak > 0 ? 'text-sky-400' : 'text-muted-foreground'}`}>
                    {h.streak > 0 ? `${h.streak} дн.` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ========= BODY ========= */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center gradient-blue-teal">
            <Dumbbell className="w-4 h-4 text-blue-200" />
          </div>
          <h2 className="text-lg font-semibold">Красивое тело</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="glass-card rounded-md p-3 text-center">
            <p className="text-lg font-bold">{avgCalories}</p>
            <p className="text-xs text-muted-foreground">ккал/день</p>
          </div>
          <div className="glass-card rounded-md p-3 text-center">
            <p className="text-lg font-bold">{avgProtein}г</p>
            <p className="text-xs text-muted-foreground">белки</p>
          </div>
          <div className="glass-card rounded-md p-3 text-center">
            <p className="text-lg font-bold">{avgFat}г</p>
            <p className="text-xs text-muted-foreground">жиры</p>
          </div>
          <div className="glass-card rounded-md p-3 text-center">
            <p className="text-lg font-bold">{avgCarbs}г</p>
            <p className="text-xs text-muted-foreground">углеводы</p>
          </div>
        </div>

        <div className="glass-card rounded-md p-4 mb-4">
          <p className="text-sm text-muted-foreground mb-3">Калории за неделю</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={caloriesChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fill: '#2FA0C6', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#2FA0C6', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...chartTooltipStyle} />
              <Bar dataKey="calories" name="Калории" fill="#2FA0C6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {weightChartData.length > 1 && (
          <div className="glass-card rounded-md p-4 mb-4">
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
                  {(weightChartData[weightChartData.length - 1].weight - weightChartData[0].weight).toFixed(1)} кг
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={weightChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fill: '#2FA0C6', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#2FA0C6', fontSize: 11 }} axisLine={false} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip {...chartTooltipStyle} />
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#58C9F3" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#58C9F3" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="weight" name="Вес (кг)" stroke="#58C9F3" fill="url(#weightGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card rounded-md p-4 text-center">
            <p className="text-2xl font-bold text-primary">{weekWorkouts.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Тренировок за неделю</p>
          </div>
          <div className="glass-card rounded-md p-4 text-center">
            <p className="text-2xl font-bold">{totalWorkoutMinutes}</p>
            <p className="text-xs text-muted-foreground mt-1">Минут тренировок</p>
          </div>
        </div>

        {Object.keys(workoutsByType).length > 0 && (
          <div className="glass-card rounded-md p-4 mt-3">
            <p className="text-sm text-muted-foreground mb-2">По типам (неделя)</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(workoutsByType).map(([type, count]) => (
                <span key={type} className="text-xs bg-primary/15 text-primary px-3 py-1.5 rounded-lg">
                  {WORKOUT_LABELS[type] ?? type}: {count}
                </span>
              ))}
            </div>
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
          <div className="glass-card rounded-md p-3 text-center">
            <p className="text-lg font-bold text-blue-300">{avgMood}</p>
            <p className="text-xs text-muted-foreground mt-1">Настроение</p>
          </div>
          <div className="glass-card rounded-md p-3 text-center">
            <p className="text-lg font-bold text-teal-400">{avgEnergy}</p>
            <p className="text-xs text-muted-foreground mt-1">Энергия</p>
          </div>
          <div className="glass-card rounded-md p-3 text-center">
            <p className="text-lg font-bold text-sky-400">{avgAnxiety}</p>
            <p className="text-xs text-muted-foreground mt-1">Тревожность</p>
          </div>
        </div>

        <div className="glass-card rounded-md p-4">
          <p className="text-sm text-muted-foreground mb-3">Тренды за неделю</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={moodChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fill: '#2FA0C6', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#2FA0C6', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 10]} />
              <Tooltip {...chartTooltipStyle} />
              <defs>
                <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1C4E75" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#1C4E75" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2FA0C6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2FA0C6" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="anxietyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2FA0C6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2FA0C6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="mood" name="Настроение" stroke="#1C4E75" fill="url(#moodGrad)" strokeWidth={2} connectNulls />
              <Area type="monotone" dataKey="energy" name="Энергия" stroke="#2FA0C6" fill="url(#energyGrad)" strokeWidth={2} connectNulls />
              <Area type="monotone" dataKey="anxiety" name="Тревожность" stroke="#2FA0C6" fill="url(#anxietyGrad)" strokeWidth={2} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
