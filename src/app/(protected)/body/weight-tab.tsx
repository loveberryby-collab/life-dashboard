'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Loader2, TrendingDown, TrendingUp, Minus, Pencil, Trash2 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { toast } from 'sonner'
import { getToday, formatDateShort } from '@/lib/utils/date'

interface WeightLog {
  id: string
  date: string
  weight: number
  notes: string | null
}

export default function WeightTab() {
  const [logs, setLogs] = useState<WeightLog[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<WeightLog | null>(null)
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(getToday())
  const [notes, setNotes] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    async function fetchLogs() {
      setLoading(true)
      const { data } = await supabase
        .from('weight_logs')
        .select('*')
        .order('date', { ascending: false })
        .limit(30)
      if (!cancelled) {
        setLogs(data ?? [])
        setLoading(false)
      }
    }
    fetchLogs()
    return () => { cancelled = true }
  }, [reloadKey]) // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setEditingLog(null)
    setWeight('')
    setDate(getToday())
    setNotes('')
    setDialogOpen(true)
  }

  function openEdit(log: WeightLog) {
    setEditingLog(log)
    setWeight(String(Number(log.weight)))
    setDate(log.date)
    setNotes(log.notes ?? '')
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!weight) return

    if (editingLog) {
      await supabase
        .from('weight_logs')
        .update({ date, weight: Number(weight), notes: notes || null })
        .eq('id', editingLog.id)
      toast.success('Запись обновлена')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('weight_logs').insert({
        user_id: user.id,
        date,
        weight: Number(weight),
        notes: notes || null,
      })
      toast.success('Вес записан')
    }
    setDialogOpen(false)
    setReloadKey((k) => k + 1)
  }

  async function handleDelete(id: string) {
    await supabase.from('weight_logs').delete().eq('id', id)
    toast.success('Запись удалена')
    setReloadKey((k) => k + 1)
  }

  const latest = logs[0]
  const previous = logs[1]
  const diff = latest && previous ? Number(latest.weight) - Number(previous.weight) : null

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
  }

  return (
    <div>
      {/* Last weight */}
      <div className="glass-card rounded-2xl mb-4">
        <div className="p-6 text-center">
          {latest ? (
            <>
              <p className="text-3xl font-bold">{Number(latest.weight)} кг</p>
              <p className="text-sm text-muted-foreground mt-1">Последний вес · {formatDateShort(latest.date)}</p>
              {diff !== null && diff !== 0 && (
                <div className={`flex items-center justify-center gap-1 mt-2 text-sm ${diff < 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {diff < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                  {diff > 0 ? '+' : ''}{diff.toFixed(1)} кг
                </div>
              )}
              {diff === 0 && (
                <div className="flex items-center justify-center gap-1 mt-2 text-sm text-muted-foreground">
                  <Minus className="w-4 h-4" /> без изменений
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">Нет записей о весе</p>
          )}
        </div>
      </div>

      <Button onClick={openCreate} className="w-full rounded-2xl gap-1 mb-4">
        <Plus className="w-4 h-4" /> Записать вес
      </Button>

      {/* Weight chart */}
      {logs.length > 1 && (
        <div className="glass-card rounded-2xl p-4 mb-4">
          <p className="text-sm text-muted-foreground mb-3">Динамика веса</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={[...logs].reverse().map((l) => ({ date: formatDateShort(l.date), weight: Number(l.weight) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(90,140,200,0.08)" />
              <XAxis dataKey="date" tick={{ fill: '#3D7CC0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#3D7CC0', fontSize: 11 }} axisLine={false} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip contentStyle={{ background: 'rgba(10,25,48,0.95)', border: '1px solid rgba(90,140,200,0.12)', borderRadius: '6px', color: '#8EC5F0', fontSize: '12px' }} />
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5BA3E6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#5BA3E6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="weight" name="Вес (кг)" stroke="#5BA3E6" fill="url(#weightGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History */}
      {logs.length > 0 && (
        <div className="glass-card rounded-2xl">
          <div className="p-4">
            <h3 className="font-semibold text-sm mb-3">История</h3>
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-muted-foreground">{formatDateShort(log.date)}</span>
                    <span className="font-medium ml-3">{Number(log.weight)} кг</span>
                    {log.notes && <span className="text-xs text-muted-foreground ml-2 truncate">· {log.notes}</span>}
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <button onClick={() => openEdit(log)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(log.id)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition">
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl glass-strong border-white/[0.1]">
          <DialogHeader>
            <DialogTitle>{editingLog ? 'Редактировать запись' : 'Записать вес'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-2xl bg-white/[0.06] border-white/[0.1]" />
            </div>
            <div className="space-y-2">
              <Label>Вес (кг)</Label>
              <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="65.0" className="rounded-2xl bg-white/[0.06] border-white/[0.1]" />
            </div>
            <div className="space-y-2">
              <Label>Заметка</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Необязательно" className="rounded-2xl bg-white/[0.06] border-white/[0.1]" />
            </div>
            <Button onClick={handleSave} className="w-full rounded-2xl">
              {editingLog ? 'Сохранить' : 'Записать'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
