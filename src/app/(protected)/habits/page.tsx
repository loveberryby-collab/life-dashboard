'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Trash2, Pencil, Loader2, Check, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { getToday, formatDateRu } from '@/lib/utils/date'

interface Habit {
  id: string
  title: string
  description: string | null
  color: string | null
  icon: string | null
  is_active: boolean
  scheduled_time: string | null
}

interface HabitLog {
  habit_id: string
  is_completed: boolean
}

interface CalendarLog {
  habit_id: string
  date: string
  is_completed: boolean
}

function getLast28Days(): string[] {
  const days: string[] = []
  for (let i = 27; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    days.push(`${year}-${month}-${day}`)
  }
  return days
}

const HABIT_COLORS = ['#5BA3E6', '#A78BFA', '#F472B6', '#38BDF8', '#FBBF24', '#34D399', '#3D7CC0', '#8EC5F0']

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(HABIT_COLORS[0])
  const [scheduledTime, setScheduledTime] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [calendarLogs, setCalendarLogs] = useState<CalendarLog[]>([])
  const supabase = createClient()
  const today = getToday()
  const last28 = getLast28Days()

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      setLoading(true)
      const [habitsRes, logsRes, calRes] = await Promise.all([
        supabase.from('habits').select('*').eq('is_active', true).order('scheduled_time', { ascending: true, nullsFirst: false }),
        supabase.from('habit_logs').select('habit_id, is_completed').eq('date', today),
        supabase.from('habit_logs').select('habit_id, date, is_completed').gte('date', last28[0]).lte('date', last28[last28.length - 1]),
      ])
      if (!cancelled) {
        const sortedHabits = (habitsRes.data ?? []).sort((a: Habit, b: Habit) => {
          if (!a.scheduled_time && !b.scheduled_time) return 0
          if (!a.scheduled_time) return 1
          if (!b.scheduled_time) return -1
          return a.scheduled_time.localeCompare(b.scheduled_time)
        })
        setHabits(sortedHabits)
        setLogs(logsRes.data ?? [])
        setCalendarLogs(calRes.data ?? [])
        setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [today, reloadKey]) // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setEditingHabit(null)
    setTitle('')
    setDescription('')
    setColor(HABIT_COLORS[0])
    setScheduledTime('')
    setDialogOpen(true)
  }

  function openEdit(h: Habit) {
    setEditingHabit(h)
    setTitle(h.title)
    setDescription(h.description ?? '')
    setColor(h.color ?? HABIT_COLORS[0])
    setScheduledTime(h.scheduled_time ?? '')
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!title.trim()) return

    const payload: Record<string, unknown> = {
      title,
      description: description || null,
      color,
      updated_at: new Date().toISOString(),
    }
    if (scheduledTime) {
      payload.scheduled_time = scheduledTime
    } else {
      payload.scheduled_time = null
    }

    if (editingHabit) {
      const { error } = await supabase.from('habits').update(payload).eq('id', editingHabit.id)
      if (error) {
        if (error.message.includes('scheduled_time')) {
          delete payload.scheduled_time
          await supabase.from('habits').update(payload).eq('id', editingHabit.id)
        } else {
          toast.error('Ошибка: ' + error.message)
          return
        }
      }
      toast.success('Привычка обновлена')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('habits').insert({ ...payload, user_id: user.id })
      if (error) {
        if (error.message.includes('scheduled_time')) {
          delete payload.scheduled_time
          await supabase.from('habits').insert({ ...payload, user_id: user.id })
        } else {
          toast.error('Ошибка: ' + error.message)
          return
        }
      }
      toast.success('Привычка создана')
    }
    setDialogOpen(false)
    setReloadKey((k) => k + 1)
  }

  async function toggleHabit(habitId: string) {
    const existing = logs.find((l) => l.habit_id === habitId)
    if (existing) {
      await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('date', today)
      toast.success('Отметка снята')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('habit_logs').insert({ habit_id: habitId, user_id: user.id, date: today })
      toast.success('Привычка отмечена')
    }
    setReloadKey((k) => k + 1)
  }

  async function deleteHabit(id: string) {
    await supabase.from('habits').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id)
    toast.success('Привычка удалена')
    setReloadKey((k) => k + 1)
  }

  const activeHabitIds = new Set(habits.map((h) => h.id))
  const completed = logs.filter((l) => l.is_completed !== false && activeHabitIds.has(l.habit_id)).length
  const total = habits.length
  const progressPct = total > 0 ? Math.min((completed / total) * 100, 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Трекер привычек</h1>
        <Button onClick={openCreate} className="rounded-2xl gap-1">
          <Plus className="w-4 h-4" /> Добавить
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-2">{formatDateRu(today)}</p>

      {/* Progress */}
      <div className="glass-card rounded-2xl p-4 mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Прогресс за сегодня</span>
          <span className="font-semibold">{completed} / {total}</span>
        </div>
        <Progress value={progressPct} className="h-3" />
      </div>

      {habits.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <p className="text-muted-foreground">Добавьте свою первую привычку</p>
        </div>
      ) : (
        <div className="space-y-2">
          {habits.map((habit) => {
            const isCompleted = logs.some((l) => l.habit_id === habit.id)
            return (
              <div key={habit.id} className="glass-card rounded-2xl p-4 flex items-center gap-3">
                  <button
                    onClick={() => toggleHabit(habit.id)}
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition"
                    style={{
                      backgroundColor: isCompleted ? (habit.color ?? '#5BA3E6') : `${habit.color ?? '#5BA3E6'}20`,
                    }}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: habit.color ?? '#5BA3E6' }} />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                        {habit.title}
                      </p>
                      {habit.scheduled_time && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {habit.scheduled_time.slice(0, 5)}
                        </span>
                      )}
                    </div>
                    {habit.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{habit.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(habit)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition">
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => deleteHabit(habit.id)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition">
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Habits calendar */}
      {habits.length > 0 && (
        <div className="glass-card rounded-2xl p-4 mt-4">
          <p className="text-sm text-muted-foreground mb-3">Календарь привычек (28 дней)</p>
          <div className="space-y-3">
            {habits.map((habit) => (
              <div key={habit.id}>
                <p className="text-xs font-medium mb-1 truncate" style={{ color: habit.color ?? '#5BA3E6' }}>{habit.title}</p>
                <div className="grid grid-cols-7 gap-1">
                  {last28.map((day) => {
                    const done = calendarLogs.some((l) => l.habit_id === habit.id && l.date === day && l.is_completed)
                    const isToday = day === today
                    return (
                      <div
                        key={day}
                        title={day}
                        className={`h-5 rounded-sm transition ${isToday ? 'ring-1 ring-primary/50' : ''}`}
                        style={{
                          backgroundColor: done ? (habit.color ?? '#5BA3E6') : 'rgba(18,42,75,0.2)',
                          opacity: done ? 1 : 0.4,
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-muted-foreground">{last28[0].slice(5)}</span>
            <span className="text-[10px] text-muted-foreground">сегодня</span>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl glass-strong border-white/[0.1]">
          <DialogHeader>
            <DialogTitle>{editingHabit ? 'Редактировать привычку' : 'Новая привычка'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Медитация" className="rounded-2xl bg-white/[0.06] border-white/[0.1]" />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Необязательно" className="rounded-2xl bg-white/[0.06] border-white/[0.1]" />
            </div>
            <div className="space-y-2">
              <Label>Время</Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="rounded-2xl bg-white/[0.06] border-white/[0.1]"
                placeholder="Необязательно"
              />
              <p className="text-xs text-muted-foreground">Привычки сортируются по времени</p>
            </div>
            <div className="space-y-2">
              <Label>Цвет</Label>
              <div className="flex gap-2">
                {HABIT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-8 h-8 rounded-full transition ring-2 ring-offset-2"
                    style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : '2px solid transparent', outlineOffset: '2px', boxShadow: color === c ? `0 0 8px ${c}50` : 'none' }}
                  />
                ))}
              </div>
            </div>
            <Button onClick={handleSave} className="w-full rounded-2xl">
              {editingHabit ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
