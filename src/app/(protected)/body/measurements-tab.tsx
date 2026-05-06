'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
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
  calf: number | null
  notes: string | null
}

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

const FIELDS: { key: keyof Omit<Measurement, 'id' | 'date' | 'notes'>; label: string }[] = [
  { key: 'chest', label: 'Грудь' },
  { key: 'waist', label: 'Талия' },
  { key: 'hips', label: 'Бёдра' },
  { key: 'belly', label: 'Живот' },
  { key: 'thigh', label: 'Бедро' },
  { key: 'arm', label: 'Рука' },
  { key: 'calf', label: 'Голень' },
]

const CHART_COLORS = ['#58C9F3', '#2FA0C6', '#BDE5FF', '#1C4E75', '#7DD8F8', '#3BB5D9', '#4DC8E0']

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

export default function MeasurementsTab() {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMeasurement, setEditingMeasurement] = useState<Measurement | null>(null)
  const [date, setDate] = useState(getToday())
  const [values, setValues] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [period, setPeriod] = useState<Period>('month')
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      setLoading(true)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - PERIOD_DAYS[period])
      const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`

      const { data } = await supabase
        .from('body_measurements')
        .select('*')
        .gte('date', startStr)
        .order('date', { ascending: true })
      if (!cancelled) {
        setMeasurements(data ?? [])
        setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [reloadKey, period]) // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setEditingMeasurement(null)
    setDate(getToday())
    setValues({})
    setNotes('')
    setDialogOpen(true)
  }

  function openEdit(m: Measurement) {
    setEditingMeasurement(m)
    setDate(m.date)
    const vals: Record<string, string> = {}
    for (const f of FIELDS) {
      const v = m[f.key]
      if (v !== null) vals[f.key] = String(Number(v))
    }
    setValues(vals)
    setNotes(m.notes ?? '')
    setDialogOpen(true)
  }

  async function handleSave() {
    const payload: Record<string, unknown> = {
      date,
      chest: values.chest ? Number(values.chest) : null,
      waist: values.waist ? Number(values.waist) : null,
      hips: values.hips ? Number(values.hips) : null,
      belly: values.belly ? Number(values.belly) : null,
      thigh: values.thigh ? Number(values.thigh) : null,
      arm: values.arm ? Number(values.arm) : null,
      calf: values.calf ? Number(values.calf) : null,
      notes: notes || null,
    }

    if (editingMeasurement) {
      await supabase.from('body_measurements').update(payload).eq('id', editingMeasurement.id)
      toast.success('Замеры обновлены')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('body_measurements').insert({ ...payload, user_id: user.id })
      toast.success('Замеры сохранены')
    }
    setDialogOpen(false)
    setValues({})
    setNotes('')
    setReloadKey((k) => k + 1)
  }

  async function handleDelete(id: string) {
    await supabase.from('body_measurements').delete().eq('id', id)
    toast.success('Замеры удалены')
    setReloadKey((k) => k + 1)
  }

  const chartData = measurements.map((m) => {
    const row: Record<string, unknown> = { date: shortDate(m.date) }
    for (const f of FIELDS) {
      row[f.key] = m[f.key] !== null ? Number(m[f.key]) : null
    }
    return row
  })

  const hasChartData = chartData.length > 1

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
  }

  const displayMeasurements = [...measurements].reverse()

  return (
    <div>
      <Button onClick={openCreate} className="w-full rounded-md gap-1 mb-4">
        <Plus className="w-4 h-4" /> Добавить замеры
      </Button>

      {/* Period switcher */}
      <div className="flex gap-2 mb-4">
        {(['week', 'month', 'quarter', 'year'] as Period[]).map((p) => (
          <Button
            key={p}
            variant={period === p ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(p)}
            className="rounded-md text-xs"
          >
            {PERIOD_LABELS[p]}
          </Button>
        ))}
      </div>

      {/* Charts per metric */}
      {hasChartData && (
        <div className="space-y-4 mb-4">
          {FIELDS.map((f, fi) => {
            const hasData = chartData.some((d) => d[f.key] !== null)
            if (!hasData) return null
            return (
              <div key={f.key} className="glass-card rounded-md p-4">
                <p className="text-sm text-muted-foreground mb-3">{f.label}</p>
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(88,201,243,0.08)" />
                    <XAxis dataKey="date" tick={{ fill: '#2FA0C6', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#2FA0C6', fontSize: 10 }} axisLine={false} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip {...chartTooltipStyle} />
                    <defs>
                      <linearGradient id={`mGrad_${f.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS[fi]} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={CHART_COLORS[fi]} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey={f.key} name={`${f.label} (см)`} stroke={CHART_COLORS[fi]} fill={`url(#mGrad_${f.key})`} strokeWidth={2} connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )
          })}
        </div>
      )}

      {/* History */}
      {displayMeasurements.length === 0 ? (
        <div className="glass-card rounded-md">
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Нет замеров за выбранный период</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {displayMeasurements.map((m) => (
            <div key={m.id} className="glass-card rounded-md">
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">{formatDateShort(m.date)}</p>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition">
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
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
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-md glass-strong border-white/[0.1]">
          <DialogHeader>
            <DialogTitle>{editingMeasurement ? 'Редактировать замеры' : 'Добавить замеры'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md bg-white/[0.06] border-white/[0.1]" />
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
                    className="rounded-md bg-white/[0.06] border-white/[0.1]"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Заметка</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Необязательно" className="rounded-md bg-white/[0.06] border-white/[0.1]" />
            </div>
            <Button onClick={handleSave} className="w-full rounded-md">
              {editingMeasurement ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
