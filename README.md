# Life Dashboard

Личный кабинет для отслеживания планов на день, привычек, тела/питания и настроения.

## Технологии

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Supabase (Auth + Database)
- date-fns
- lucide-react

## Установка

```bash
npm install
```

## Настройка Supabase

1. Создайте проект в [Supabase](https://supabase.com)
2. Выполните SQL из файла `supabase-schema.sql` в SQL Editor
3. Создайте файл `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Запуск

```bash
npm run dev
```

## Страницы

- `/login` — вход по email/password
- `/register` — регистрация
- `/dashboard` — главный экран с карточками статистики
- `/day-plans` — планы на день (CRUD, приоритеты, фильтры)
- `/habits` — трекер привычек с ежедневными отметками
- `/body` — тело (питание, вес, замеры, тренировки)
- `/mood` — настроение (оценки 1-10, история)
