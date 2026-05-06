'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getToday, formatDateShort } from '@/lib/utils/date'

interface Measurement {
  id: string
  date: string
  chest: number | null
  waist: number | null
  hips: number | null
  belly: number | null
  thigh: number | null
  arm: number | null
  notes: string | null
}

const FIELDS: { key: keyof Omit<Measurement, 'id' | 'date' | 'notes'>; label: string }[] = [
  { key: 'chest', label: 'Грудь' },
  { key: 'waist', label: 'Талия' },
  { key: 'hips', label: 'Бёдра' },
  { key: 'belly', label: 'Живот' },
  { key: 'thigh', label: 'Бедро' },
  { key: 'arm', label: 'Рука' },
]

export default function MeasurementsTab() {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [date, setDate] = useState(getToday())
  const [values, setValues] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      setLoading(true)
      const { data } = await supabase
        .from('body_measurements')
        .select('*')
        .order('date', { ascending: false })
        .limit(20)
      if (!cancelled) {
        setMeasurements(data ?? [])
        setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [reloadKey]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('body_measurements').insert({
      user_id: user.id,
      date,
      chest: values.chest ? Number(values.chest) : null,
      waist: values.waist ? Number(values.waist) : null,
      hips: values.hips ? Number(values.hips) : null,
      belly: values.belly ? Number(values.belly) : null,
      thigh: values.thigh ? Number(values.thigh) : null,
      arm: values.arm ? Number(values.arm) : null,
      notes: notes || null,
    })
    toast.success('Замеры сохранены')
    setDialogOpen(false)
    setValues({})
    setNotes('')
    setReloadKey((k) => k + 1)
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
  }

  return (
    <div>
      <Button onClick={() => setDialogOpen(true)} className="w-full rounded-xl gap-1 mb-4">
        <Plus className="w-4 h-4" /> Добавить замеры
      </Button>

      {measurements.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Нет замеров</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {measurements.map((m) => (
            <Card key={m.id} className="border-0 shadow-sm rounded-2xl">
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-2">{formatDateShort(m.date)}</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {FIELDS.map(({ key, label }) => {
                    const val = m[key]
                    if (val === null) return null
                    return (
                      <div key={key} className="text-center">
                        <p className="text-muted-foreground text-xs">{label}</p>
                        <p className="font-medium">{Number(val)} см</p>
                      </div>
                    )
                  })}
                </div>
                {m.notes && <p className="text-xs text-muted-foreground mt-2">{m.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Добавить замеры</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label} (см)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={values[key] ?? ''}
                    onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                    placeholder="0"
                    className="rounded-xl"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Заметка</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Необязательно" className="rounded-xl" />
            </div>
            <Button onClick={handleAdd} className="w-full rounded-xl">Сохранить</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
