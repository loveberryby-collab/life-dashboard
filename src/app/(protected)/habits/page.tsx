'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Trash2, Pencil, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { getToday, formatDateRu } from '@/lib/utils/date'

interface Habit {
  id: string
  title: string
  description: string | null
  color: string | null
  icon: string | null
  is_active: boolean
}

interface HabitLog {
  habit_id: string
  is_completed: boolean
}

const HABIT_COLORS = ['#D9A7A0', '#A8D5BA', '#8ECAE6', '#FFB4A2', '#C3B1E1', '#F9C74F']

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(HABIT_COLORS[0])
  const [reloadKey, setReloadKey] = useState(0)
  const supabase = createClient()
  const today = getToday()

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      setLoading(true)
      const [habitsRes, logsRes] = await Promise.all([
        supabase.from('habits').select('*').eq('is_active', true).order('created_at'),
        supabase.from('habit_logs').select('habit_id, is_completed').eq('date', today),
      ])
      if (!cancelled) {
        setHabits(habitsRes.data ?? [])
        setLogs(logsRes.data ?? [])
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
    setDialogOpen(true)
  }

  function openEdit(h: Habit) {
    setEditingHabit(h)
    setTitle(h.title)
    setDescription(h.description ?? '')
    setColor(h.color ?? HABIT_COLORS[0])
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!title.trim()) return

    if (editingHabit) {
      await supabase
        .from('habits')
        .update({ title, description: description || null, color, updated_at: new Date().toISOString() })
        .eq('id', editingHabit.id)
      toast.success('Привычка обновлена')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('habits').insert({ user_id: user.id, title, description: description || null, color })
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

  const completed = logs.filter((l) => l.is_completed !== false).length
  const total = habits.length
  const progressPct = total > 0 ? (completed / total) * 100 : 0

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
        <Button onClick={openCreate} className="rounded-xl gap-1">
          <Plus className="w-4 h-4" /> Добавить
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-2">{formatDateRu(today)}</p>

      {/* Progress */}
      <Card className="border-0 shadow-sm rounded-2xl mb-4">
        <CardContent className="p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Прогресс за сегодня</span>
            <span className="font-semibold">{completed} / {total}</span>
          </div>
          <Progress value={progressPct} className="h-3" />
        </CardContent>
      </Card>

      {habits.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Добавьте свою первую привычку</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {habits.map((habit) => {
            const isCompleted = logs.some((l) => l.habit_id === habit.id)
            return (
              <Card key={habit.id} className="border-0 shadow-sm rounded-2xl">
                <CardContent className="p-4 flex items-center gap-3">
                  <button
                    onClick={() => toggleHabit(habit.id)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition"
                    style={{
                      backgroundColor: isCompleted ? (habit.color ?? '#D9A7A0') : `${habit.color ?? '#D9A7A0'}20`,
                    }}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: habit.color ?? '#D9A7A0' }} />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                      {habit.title}
                    </p>
                    {habit.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{habit.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(habit)} className="p-1.5 rounded-lg hover:bg-muted transition">
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => deleteHabit(habit.id)} className="p-1.5 rounded-lg hover:bg-muted transition">
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingHabit ? 'Редактировать привычку' : 'Новая привычка'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Медитация" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Необязательно" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Цвет</Label>
              <div className="flex gap-2">
                {HABIT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-8 h-8 rounded-full transition ring-2 ring-offset-2"
                    style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : '2px solid transparent', outlineOffset: '2px' }}
                  />
                ))}
              </div>
            </div>
            <Button onClick={handleSave} className="w-full rounded-xl">
              {editingHabit ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
