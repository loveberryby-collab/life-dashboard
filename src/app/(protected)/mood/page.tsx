'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { toast } from 'sonner'
import { getToday, formatDateRu, formatDateShort } from '@/lib/utils/date'

interface MoodLog {
  id: string
  date: string
  mood_score: number | null
  energy_score: number | null
  anxiety_score: number | null
  note: string | null
}

function ScoreSlider({ label, value, onChange, emoji }: {
  label: string
  value: number
  onChange: (v: number) => void
  emoji: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{emoji} {label}</Label>
        <span className="text-lg font-bold text-primary">{value}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex-1 h-8 rounded-lg text-xs font-medium transition ${
              n <= value
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function MoodPage() {
  const [date, setDate] = useState(getToday())
  const [mood, setMood] = useState(5)
  const [energy, setEnergy] = useState(5)
  const [anxiety, setAnxiety] = useState(5)
  const [note, setNote] = useState('')
  const [existingId, setExistingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<MoodLog[]>([])
  const [reloadKey, setReloadKey] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      setLoading(true)

      const [todayRes, historyRes] = await Promise.all([
        supabase.from('mood_logs').select('*').eq('date', date).limit(1),
        supabase.from('mood_logs').select('*').order('date', { ascending: false }).limit(14),
      ])

      if (cancelled) return

      const entry = todayRes.data?.[0]
      if (entry) {
        setExistingId(entry.id)
        setMood(entry.mood_score ?? 5)
        setEnergy(entry.energy_score ?? 5)
        setAnxiety(entry.anxiety_score ?? 5)
        setNote(entry.note ?? '')
      } else {
        setExistingId(null)
        setMood(5)
        setEnergy(5)
        setAnxiety(5)
        setNote('')
      }

      setHistory(historyRes.data ?? [])
      setLoading(false)
    }
    fetchData()
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

  async function handleSave() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (existingId) {
      await supabase
        .from('mood_logs')
        .update({
          mood_score: mood,
          energy_score: energy,
          anxiety_score: anxiety,
          note: note || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingId)
    } else {
      await supabase.from('mood_logs').insert({
        user_id: user.id,
        date,
        mood_score: mood,
        energy_score: energy,
        anxiety_score: anxiety,
        note: note || null,
      })
    }

    toast.success('Настроение сохранено')
    setReloadKey((k) => k + 1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Настроение</h1>

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

      {/* Score inputs */}
      <div className="glass-card rounded-md p-6 space-y-6 mb-4">
          <ScoreSlider label="Настроение" value={mood} onChange={setMood} emoji="😊" />
          <ScoreSlider label="Энергия" value={energy} onChange={setEnergy} emoji="⚡" />
          <ScoreSlider label="Тревожность" value={anxiety} onChange={setAnxiety} emoji="😰" />

          <div className="space-y-2">
            <Label>Заметка</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Как прошёл день?"
              className="rounded-md bg-white/[0.06] border-white/[0.1]"
            />
          </div>

          <Button onClick={handleSave} className="w-full rounded-md gap-1">
            <Save className="w-4 h-4" />
            {existingId ? 'Обновить' : 'Сохранить'}
          </Button>
      </div>

      {/* Mood chart */}
      {history.length > 1 && (
        <div className="glass-card rounded-md p-4 mb-4">
          <p className="text-sm text-muted-foreground mb-3">Тренды настроения</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={[...history].reverse().map((h) => ({ date: formatDateShort(h.date), mood: h.mood_score, energy: h.energy_score, anxiety: h.anxiety_score }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(88,201,243,0.08)" />
              <XAxis dataKey="date" tick={{ fill: '#2FA0C6', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#2FA0C6', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 10]} />
              <Tooltip contentStyle={{ background: 'rgba(6,24,38,0.95)', border: '1px solid rgba(88,201,243,0.12)', borderRadius: '6px', color: '#BDE5FF', fontSize: '12px' }} />
              <defs>
                <linearGradient id="moodG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#58C9F3" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#58C9F3" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="energyG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2FA0C6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2FA0C6" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="anxietyG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#BDE5FF" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#BDE5FF" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="mood" name="Настроение" stroke="#58C9F3" fill="url(#moodG)" strokeWidth={2} connectNulls />
              <Area type="monotone" dataKey="energy" name="Энергия" stroke="#2FA0C6" fill="url(#energyG)" strokeWidth={2} connectNulls />
              <Area type="monotone" dataKey="anxiety" name="Тревожность" stroke="#BDE5FF" fill="url(#anxietyG)" strokeWidth={2} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="glass-card rounded-md p-4">
          <h3 className="font-semibold text-sm mb-3">История</h3>
          <div className="space-y-2">
            {history.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-white/[0.08] last:border-0">
                <span className="text-sm text-muted-foreground">{formatDateShort(log.date)}</span>
                <div className="flex gap-3 text-xs">
                  <span>😊 {log.mood_score ?? '—'}</span>
                  <span>⚡ {log.energy_score ?? '—'}</span>
                  <span>😰 {log.anxiety_score ?? '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
