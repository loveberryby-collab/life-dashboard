'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Pencil, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
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
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
}

const priorityLabels = { low: 'Низкий', medium: 'Средний', high: 'Высокий' }

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
    setDate(d.toISOString().slice(0, 10))
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

  const filtered = tasks.filter((t) => {
    if (filter === 'active') return !t.is_completed
    if (filter === 'completed') return t.is_completed
    return true
  })

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Планы на день</h1>
        <Button onClick={openCreate} className="rounded-xl gap-1">
          <Plus className="w-4 h-4" /> Добавить
        </Button>
      </div>

      {/* Date picker */}
      <div className="flex items-center justify-between bg-card rounded-2xl shadow-sm px-4 py-3 mb-4">
        <button onClick={() => shiftDate(-1)} className="p-2 rounded-full hover:bg-muted transition">
          <ChevronLeft className="w-5 h-5 text-primary" />
        </button>
        <span className="text-sm font-semibold">{formatDateRu(date)}</span>
        <button onClick={() => shiftDate(1)} className="p-2 rounded-full hover:bg-muted transition">
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
            className="rounded-xl"
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
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              {filter === 'all' ? 'Нет задач на этот день' : filter === 'active' ? 'Нет активных задач' : 'Нет выполненных задач'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <Card key={task.id} className="border-0 shadow-sm rounded-2xl">
              <CardContent className="p-4 flex items-start gap-3">
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
                  <button onClick={() => openEdit(task)} className="p-1.5 rounded-lg hover:bg-muted transition">
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => deleteTask(task.id)} className="p-1.5 rounded-lg hover:bg-muted transition">
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Редактировать задачу' : 'Новая задача'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Что нужно сделать?" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Подробности (необязательно)" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Приоритет</Label>
              <Select value={priority} onValueChange={(v) => { if (v) setPriority(v as 'low' | 'medium' | 'high') }}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкий</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full rounded-xl">
              {editingTask ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
