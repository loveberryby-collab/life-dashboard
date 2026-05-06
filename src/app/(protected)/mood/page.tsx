'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react'
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
      <div className="flex items-center justify-between bg-card rounded-2xl shadow-sm px-4 py-3 mb-4">
        <button onClick={() => shiftDate(-1)} className="p-2 rounded-full hover:bg-muted transition">
          <ChevronLeft className="w-5 h-5 text-primary" />
        </button>
        <span className="text-sm font-semibold">{formatDateRu(date)}</span>
        <button onClick={() => shiftDate(1)} className="p-2 rounded-full hover:bg-muted transition">
          <ChevronRight className="w-5 h-5 text-primary" />
        </button>
      </div>

      {/* Score inputs */}
      <Card className="border-0 shadow-sm rounded-2xl mb-4">
        <CardContent className="p-6 space-y-6">
          <ScoreSlider label="Настроение" value={mood} onChange={setMood} emoji="😊" />
          <ScoreSlider label="Энергия" value={energy} onChange={setEnergy} emoji="⚡" />
          <ScoreSlider label="Тревожность" value={anxiety} onChange={setAnxiety} emoji="😰" />

          <div className="space-y-2">
            <Label>Заметка</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Как прошёл день?"
              className="rounded-xl"
            />
          </div>

          <Button onClick={handleSave} className="w-full rounded-xl gap-1">
            <Save className="w-4 h-4" />
            {existingId ? 'Обновить' : 'Сохранить'}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-3">История</h3>
            <div className="space-y-2">
              {history.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{formatDateShort(log.date)}</span>
                  <div className="flex gap-3 text-xs">
                    <span>😊 {log.mood_score ?? '—'}</span>
                    <span>⚡ {log.energy_score ?? '—'}</span>
                    <span>😰 {log.anxiety_score ?? '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
