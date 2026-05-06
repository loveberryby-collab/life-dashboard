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
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getToday, formatDateShort } from '@/lib/utils/date'

interface Workout {
  id: string
  date: string
  title: string
  workout_type: string
  duration_minutes: number | null
  notes: string | null
}

const WORKOUT_TYPES: Record<string, string> = {
  strength: 'Силовая',
  cardio: 'Кардио',
  basketball: 'Баскетбол',
  stretching: 'Растяжка',
  walking: 'Ходьба',
  other: 'Другое',
}

export default function WorkoutsTab() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [date, setDate] = useState(getToday())
  const [title, setTitle] = useState('')
  const [workoutType, setWorkoutType] = useState('strength')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      setLoading(true)
      const { data } = await supabase
        .from('workouts')
        .select('*')
        .order('date', { ascending: false })
        .limit(30)
      if (!cancelled) {
        setWorkouts(data ?? [])
        setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [reloadKey]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd() {
    if (!title.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('workouts').insert({
      user_id: user.id,
      date,
      title,
      workout_type: workoutType,
      duration_minutes: duration ? Number(duration) : null,
      notes: notes || null,
    })
    toast.success('Тренировка добавлена')
    setDialogOpen(false)
    setTitle('')
    setDuration('')
    setNotes('')
    setReloadKey((k) => k + 1)
  }

  async function deleteWorkout(id: string) {
    await supabase.from('workouts').delete().eq('id', id)
    toast.success('Удалено')
    setReloadKey((k) => k + 1)
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
  }

  return (
    <div>
      <Button onClick={() => setDialogOpen(true)} className="w-full rounded-xl gap-1 mb-4">
        <Plus className="w-4 h-4" /> Добавить тренировку
      </Button>

      {workouts.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Нет тренировок</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {workouts.map((w) => (
            <Card key={w.id} className="border-0 shadow-sm rounded-2xl">
              <CardContent className="p-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{w.title}</span>
                    <Badge variant="secondary" className="text-xs">
                      {WORKOUT_TYPES[w.workout_type] ?? w.workout_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDateShort(w.date)}
                    {w.duration_minutes ? ` · ${w.duration_minutes} мин` : ''}
                  </p>
                  {w.notes && <p className="text-xs text-muted-foreground mt-0.5">{w.notes}</p>}
                </div>
                <button onClick={() => deleteWorkout(w.id)} className="p-1.5 rounded-lg hover:bg-muted transition shrink-0">
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Добавить тренировку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Тренировка ног" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select value={workoutType} onValueChange={(v) => { if (v) setWorkoutType(v) }}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(WORKOUT_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Длительность (мин)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="60" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Заметка</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Необязательно" className="rounded-xl" />
            </div>
            <Button onClick={handleAdd} className="w-full rounded-xl">Добавить</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
