'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Pencil, ChevronLeft, ChevronRight, Loader2, Goal, X } from 'lucide-react'
import { toast } from 'sonner'
import { getToday, formatDateRu } from '@/lib/utils/date'

interface Task {
  id: string
  title: string
  description: string | null
  date: string
  is_completed: boolean
  priority: 'low' | 'medium' | 'high'
}

const priorityColors = {
  low: 'bg-blue-500/20 text-blue-300',
  medium: 'bg-yellow-500/20 text-yellow-300',
  high: 'bg-red-500/20 text-red-300',
}

const priorityLabels = { low: 'Низкий', medium: 'Средний', high: 'Высокий' }

interface GoalItem {
  id: string
  text: string
  done: boolean
}

function getMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(): string {
  const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
  const d = new Date()
  return `${months[d.getMonth()]} ${d.getFullYear()}`
}

function getQuarterKey(): string {
  const d = new Date()
  const q = Math.floor(d.getMonth() / 3) + 1
  return `${d.getFullYear()}-Q${q}`
}

function getQuarterLabel(): string {
  const d = new Date()
  const q = Math.floor(d.getMonth() / 3) + 1
  return `Q${q} ${d.getFullYear()}`
}

function getYearKey(): string {
  return `${new Date().getFullYear()}`
}

function getYearLabel(): string {
  return `${new Date().getFullYear()}`
}

function useGoals(storageKey: string): {
  goals: GoalItem[]
  newGoal: string
  setNewGoal: (v: string) => void
  addGoal: () => void
  toggleGoal: (id: string) => void
  removeGoal: (id: string) => void
} {
  const [goals, setGoals] = useState<GoalItem[]>(() => {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem(storageKey)
    return saved ? JSON.parse(saved) : []
  })
  const [newGoal, setNewGoal] = useState('')

  function saveGoals(updated: GoalItem[]) {
    setGoals(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  function addGoal() {
    if (!newGoal.trim()) return
    saveGoals([...goals, { id: Date.now().toString(), text: newGoal.trim(), done: false }])
    setNewGoal('')
  }

  function toggleGoal(id: string) {
    saveGoals(goals.map((g) => g.id === id ? { ...g, done: !g.done } : g))
  }

  function removeGoal(id: string) {
    saveGoals(goals.filter((g) => g.id !== id))
  }

  return { goals, newGoal, setNewGoal, addGoal, toggleGoal, removeGoal }
}

function GoalsBlock({ icon, title, hook }: {
  icon: React.ReactNode
  title: string
  hook: ReturnType<typeof useGoals>
}) {
  return (
    <div className="glass-card rounded-md p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      <div className="flex gap-2 mb-3">
        <Input
          value={hook.newGoal}
          onChange={(e) => hook.setNewGoal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && hook.addGoal()}
          placeholder="Новая цель..."
          className="rounded-md bg-white/[0.06] border-white/[0.1] flex-1"
        />
        <Button onClick={hook.addGoal} size="sm" className="rounded-md">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {hook.goals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">Добавьте цели</p>
      ) : (
        <div className="space-y-1">
          {hook.goals.map((g) => (
            <div key={g.id} className="flex items-center gap-2 py-1.5">
              <button
                onClick={() => hook.toggleGoal(g.id)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${
                  g.done ? 'bg-primary border-primary' : 'border-border hover:border-primary'
                }`}
              >
                {g.done && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <span className={`flex-1 text-sm ${g.done ? 'line-through text-muted-foreground' : ''}`}>{g.text}</span>
              <button onClick={() => hook.removeGoal(g.id)} className="p-1 rounded-lg hover:bg-white/[0.06] transition">
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
      {hook.goals.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          {hook.goals.filter((g) => g.done).length} / {hook.goals.length} выполнено
        </p>
      )}
    </div>
  )
}

export default function DayPlansPage() {
  const [date, setDate] = useState(getToday())
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [reloadKey, setReloadKey] = useState(0)
  const supabase = createClient()

  const monthGoals = useGoals(`goals-${getMonthKey()}`)
  const quarterGoals = useGoals(`goals-${getQuarterKey()}`)
  const yearGoals = useGoals(`goals-${getYearKey()}`)

  useEffect(() => {
    let cancelled = false
    async function fetchTasks() {
      setLoading(true)
      const { data } = await supabase
        .from('day_tasks')
        .select('*')
        .eq('date', date)
        .order('created_at', { ascending: true })
      if (!cancelled) {
        setTasks(data ?? [])
        setLoading(false)
      }
    }
    fetchTasks()
    return () => { cancelled = true }
  }, [date, reloadKey]) // eslint-disable-line react-hooks/exhaustive-deps

  function shiftDate(days: number) {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() + days)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    setDate(`${year}-${month}-${day}`)
  }

  function openCreate() {
    setEditingTask(null)
    setTitle('')
    setDescription('')
    setPriority('medium')
    setDialogOpen(true)
  }

  function openEdit(task: Task) {
    setEditingTask(task)
    setTitle(task.title)
    setDescription(task.description ?? '')
    setPriority(task.priority)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!title.trim()) return

    if (editingTask) {
      const { error } = await supabase
        .from('day_tasks')
        .update({ title, description: description || null, priority, updated_at: new Date().toISOString() })
        .eq('id', editingTask.id)
      if (!error) {
        toast.success('Задача обновлена')
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase
        .from('day_tasks')
        .insert({ user_id: user.id, title, description: description || null, date, priority })
      if (!error) {
        toast.success('Задача добавлена')
      }
    }
    setDialogOpen(false)
    setReloadKey((k) => k + 1)
  }

  async function toggleComplete(task: Task) {
    await supabase
      .from('day_tasks')
      .update({ is_completed: !task.is_completed, updated_at: new Date().toISOString() })
      .eq('id', task.id)
    setReloadKey((k) => k + 1)
  }

  async function deleteTask(id: string) {
    await supabase.from('day_tasks').delete().eq('id', id)
    toast.success('Задача удалена')
    setReloadKey((k) => k + 1)
  }

  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }

  const filtered = tasks
    .filter((t) => {
      if (filter === 'active') return !t.is_completed
      if (filter === 'completed') return t.is_completed
      return true
    })
    .sort((a, b) => (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1))

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Планы на день</h1>
        <Button onClick={openCreate} className="rounded-md gap-1">
          <Plus className="w-4 h-4" /> Добавить
        </Button>
      </div>

      {/* Date picker */}
      <div className="flex items-center justify-between glass rounded-md px-4 py-3 mb-4">
        <button onClick={() => shiftDate(-1)} className="p-2 rounded-full hover:bg-white/[0.06] transition">
          <ChevronLeft className="w-5 h-5 text-primary" />
        </button>
        <span className="text-sm font-semibold">{formatDateRu(date)}</span>
        <button onClick={() => shiftDate(1)} className="p-2 rounded-full hover:bg-white/[0.06] transition">
          <ChevronRight className="w-5 h-5 text-primary" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(['all', 'active', 'completed'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className="rounded-md"
          >
            {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'Выполненные'}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-md p-8 text-center">
          <p className="text-muted-foreground">
            {filter === 'all' ? 'Нет задач на этот день' : filter === 'active' ? 'Нет активных задач' : 'Нет выполненных задач'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <div key={task.id} className="glass-card rounded-md p-4 flex items-start gap-3">
                <button
                  onClick={() => toggleComplete(task)}
                  className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${
                    task.is_completed
                      ? 'bg-primary border-primary'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  {task.is_completed && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{task.description}</p>
                  )}
                  <Badge className={`mt-2 text-xs ${priorityColors[task.priority]}`} variant="secondary">
                    {priorityLabels[task.priority]}
                  </Badge>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(task)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition">
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => deleteTask(task.id)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition">
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
            </div>
          ))}
        </div>
      )}

      {/* Goals sections */}
      <div className="space-y-4 mt-6">
        <GoalsBlock
          icon={<Goal className="w-5 h-5 text-primary" />}
          title={`Цели на месяц — ${getMonthLabel()}`}
          hook={monthGoals}
        />
        <GoalsBlock
          icon={<Goal className="w-5 h-5 text-sky-400" />}
          title={`Цели на 3 месяца — ${getQuarterLabel()}`}
          hook={quarterGoals}
        />
        <GoalsBlock
          icon={<Goal className="w-5 h-5 text-teal-400" />}
          title={`Цели на год — ${getYearLabel()}`}
          hook={yearGoals}
        />
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-md glass-strong border-white/[0.1]">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Редактировать задачу' : 'Новая задача'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Что нужно сделать?" className="rounded-md bg-white/[0.06] border-white/[0.1]" />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Подробности (необязательно)" className="rounded-md bg-white/[0.06] border-white/[0.1]" />
            </div>
            <div className="space-y-2">
              <Label>Приоритет</Label>
              <Select value={priority} onValueChange={(v) => { if (v) setPriority(v as 'low' | 'medium' | 'high') }}>
                <SelectTrigger className="rounded-md bg-white/[0.06] border-white/[0.1]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкий</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full rounded-md">
              {editingTask ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
