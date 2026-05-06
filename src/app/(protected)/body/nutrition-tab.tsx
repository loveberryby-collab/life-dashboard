'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getToday } from '@/lib/utils/date'

interface Meal {
  id: string
  meal_type: string
  title: string
  calories: number
  protein: number
  fat: number
  carbs: number
  notes: string | null
}

const MEAL_TYPES: Record<string, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
}

const GOALS = { calories: 1500, protein: 90, fat: 45, carbs: 170 }

export default function NutritionTab() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [mealType, setMealType] = useState('breakfast')
  const [title, setTitle] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [fat, setFat] = useState('')
  const [carbs, setCarbs] = useState('')
  const [notes, setNotes] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const supabase = createClient()
  const today = getToday()

  useEffect(() => {
    let cancelled = false
    async function fetchMeals() {
      setLoading(true)
      const { data } = await supabase
        .from('meals')
        .select('*')
        .eq('date', today)
        .order('created_at')
      if (!cancelled) {
        setMeals(data ?? [])
        setLoading(false)
      }
    }
    fetchMeals()
    return () => { cancelled = true }
  }, [today, reloadKey]) // eslint-disable-line react-hooks/exhaustive-deps

  function openAdd() {
    setTitle('')
    setCalories('')
    setProtein('')
    setFat('')
    setCarbs('')
    setNotes('')
    setMealType('breakfast')
    setDialogOpen(true)
  }

  async function handleAdd() {
    if (!title.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('meals').insert({
      user_id: user.id,
      date: today,
      meal_type: mealType,
      title,
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      fat: Number(fat) || 0,
      carbs: Number(carbs) || 0,
      notes: notes || null,
    })
    toast.success('Приём пищи добавлен')
    setDialogOpen(false)
    setReloadKey((k) => k + 1)
  }

  async function deleteMeal(id: string) {
    await supabase.from('meals').delete().eq('id', id)
    toast.success('Удалено')
    setReloadKey((k) => k + 1)
  }

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + Number(m.calories),
      protein: acc.protein + Number(m.protein),
      fat: acc.fat + Number(m.fat),
      carbs: acc.carbs + Number(m.carbs),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  )

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
  }

  return (
    <div>
      {/* Summary */}
      <div className="glass-card rounded-2xl mb-4">
        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Итого за день</h3>
          {[
            { label: 'Калории', current: totals.calories, goal: GOALS.calories, unit: 'ккал', color: 'bg-orange-400' },
            { label: 'Белки', current: totals.protein, goal: GOALS.protein, unit: 'г', color: 'bg-red-400' },
            { label: 'Жиры', current: totals.fat, goal: GOALS.fat, unit: 'г', color: 'bg-yellow-400' },
            { label: 'Углеводы', current: totals.carbs, goal: GOALS.carbs, unit: 'г', color: 'bg-blue-400' },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={`font-medium ${item.current > item.goal ? 'text-destructive' : ''}`}>
                  {Math.round(item.current)}{item.unit} / {item.goal}{item.unit}
                </span>
              </div>
              <Progress value={Math.min((item.current / item.goal) * 100, 100)} className="h-2" />
            </div>
          ))}
        </div>
      </div>

      <Button onClick={openAdd} className="w-full rounded-xl gap-1 mb-4">
        <Plus className="w-4 h-4" /> Добавить приём пищи
      </Button>

      {meals.length === 0 ? (
        <div className="glass-card rounded-2xl">
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Нет записей о питании за сегодня</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {meals.map((meal) => (
            <div key={meal.id} className="glass-card rounded-2xl">
              <div className="p-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      {MEAL_TYPES[meal.meal_type] ?? meal.meal_type}
                    </span>
                    <span className="font-medium text-sm">{meal.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {meal.calories} ккал · Б {meal.protein}г · Ж {meal.fat}г · У {meal.carbs}г
                  </p>
                  {meal.notes && <p className="text-xs text-muted-foreground mt-0.5">{meal.notes}</p>}
                </div>
                <button onClick={() => deleteMeal(meal.id)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition shrink-0">
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl glass-strong border-white/[0.1]">
          <DialogHeader>
            <DialogTitle>Добавить приём пищи</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select value={mealType} onValueChange={(v) => { if (v) setMealType(v) }}>
                <SelectTrigger className="rounded-xl bg-white/[0.06] border-white/[0.1]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MEAL_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Овсянка с бананом" className="rounded-xl bg-white/[0.06] border-white/[0.1]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Калории</Label>
                <Input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="0" className="rounded-xl bg-white/[0.06] border-white/[0.1]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Белки (г)</Label>
                <Input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="0" className="rounded-xl bg-white/[0.06] border-white/[0.1]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Жиры (г)</Label>
                <Input type="number" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="0" className="rounded-xl bg-white/[0.06] border-white/[0.1]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Углеводы (г)</Label>
                <Input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="0" className="rounded-xl bg-white/[0.06] border-white/[0.1]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Заметка</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Необязательно" className="rounded-xl bg-white/[0.06] border-white/[0.1]" />
            </div>
            <Button onClick={handleAdd} className="w-full rounded-xl">Добавить</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
