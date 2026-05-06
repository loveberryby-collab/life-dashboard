'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Snowflake, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Неверный email или пароль')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md glass-card rounded-md p-8 glow-blue">
        <div className="text-center space-y-2 mb-6">
          <div className="mx-auto w-14 h-14 rounded-md flex items-center justify-center gradient-blue glow-blue">
            <Snowflake className="w-7 h-7 text-sky-200" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-4">Olka White Life</h1>
          <p className="text-muted-foreground text-sm">Войдите в свой аккаунт</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-md bg-white/[0.06] border-white/[0.1] focus:border-primary/50 placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm text-muted-foreground">Пароль</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded-md bg-white/[0.06] border-white/[0.1] focus:border-primary/50 placeholder:text-muted-foreground/50"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full rounded-md bg-primary hover:bg-primary/90 shadow-[0_0_15px_rgba(88,201,243,0.15)]" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Войти
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Нет аккаунта?{' '}
          <Link href="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  )
}
