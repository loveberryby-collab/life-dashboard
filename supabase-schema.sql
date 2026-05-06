-- =============================================
-- Life Dashboard — Supabase Schema & RLS
-- =============================================

-- 1. Day Tasks
create table if not exists day_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  date date not null,
  is_completed boolean default false,
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table day_tasks enable row level security;

create policy "Users can view own tasks" on day_tasks
  for select using (auth.uid() = user_id);
create policy "Users can insert own tasks" on day_tasks
  for insert with check (auth.uid() = user_id);
create policy "Users can update own tasks" on day_tasks
  for update using (auth.uid() = user_id);
create policy "Users can delete own tasks" on day_tasks
  for delete using (auth.uid() = user_id);

-- 2. Habits
create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  frequency text default 'daily',
  color text,
  icon text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table habits enable row level security;

create policy "Users can view own habits" on habits
  for select using (auth.uid() = user_id);
create policy "Users can insert own habits" on habits
  for insert with check (auth.uid() = user_id);
create policy "Users can update own habits" on habits
  for update using (auth.uid() = user_id);
create policy "Users can delete own habits" on habits
  for delete using (auth.uid() = user_id);

-- 3. Habit Logs
create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references habits(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  is_completed boolean default true,
  created_at timestamptz default now(),
  unique(habit_id, date)
);

alter table habit_logs enable row level security;

create policy "Users can view own habit logs" on habit_logs
  for select using (auth.uid() = user_id);
create policy "Users can insert own habit logs" on habit_logs
  for insert with check (auth.uid() = user_id);
create policy "Users can update own habit logs" on habit_logs
  for update using (auth.uid() = user_id);
create policy "Users can delete own habit logs" on habit_logs
  for delete using (auth.uid() = user_id);

-- 4. Meals
create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  title text not null,
  calories numeric default 0,
  protein numeric default 0,
  fat numeric default 0,
  carbs numeric default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table meals enable row level security;

create policy "Users can view own meals" on meals
  for select using (auth.uid() = user_id);
create policy "Users can insert own meals" on meals
  for insert with check (auth.uid() = user_id);
create policy "Users can update own meals" on meals
  for update using (auth.uid() = user_id);
create policy "Users can delete own meals" on meals
  for delete using (auth.uid() = user_id);

-- 5. Weight Logs
create table if not exists weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  weight numeric not null,
  notes text,
  created_at timestamptz default now()
);

alter table weight_logs enable row level security;

create policy "Users can view own weight logs" on weight_logs
  for select using (auth.uid() = user_id);
create policy "Users can insert own weight logs" on weight_logs
  for insert with check (auth.uid() = user_id);
create policy "Users can update own weight logs" on weight_logs
  for update using (auth.uid() = user_id);
create policy "Users can delete own weight logs" on weight_logs
  for delete using (auth.uid() = user_id);

-- 6. Body Measurements
create table if not exists body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  chest numeric,
  waist numeric,
  hips numeric,
  belly numeric,
  thigh numeric,
  arm numeric,
  calf numeric,
  notes text,
  created_at timestamptz default now()
);

-- Run this if body_measurements table already exists:
-- alter table body_measurements add column if not exists calf numeric;

alter table body_measurements enable row level security;

create policy "Users can view own measurements" on body_measurements
  for select using (auth.uid() = user_id);
create policy "Users can insert own measurements" on body_measurements
  for insert with check (auth.uid() = user_id);
create policy "Users can update own measurements" on body_measurements
  for update using (auth.uid() = user_id);
create policy "Users can delete own measurements" on body_measurements
  for delete using (auth.uid() = user_id);

-- 7. Workouts
create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  title text not null,
  workout_type text default 'other' check (workout_type in ('strength', 'cardio', 'basketball', 'stretching', 'walking', 'other')),
  duration_minutes integer,
  notes text,
  created_at timestamptz default now()
);

alter table workouts enable row level security;

create policy "Users can view own workouts" on workouts
  for select using (auth.uid() = user_id);
create policy "Users can insert own workouts" on workouts
  for insert with check (auth.uid() = user_id);
create policy "Users can update own workouts" on workouts
  for update using (auth.uid() = user_id);
create policy "Users can delete own workouts" on workouts
  for delete using (auth.uid() = user_id);

-- 8. Mood Logs
create table if not exists mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  mood_score integer check (mood_score >= 1 and mood_score <= 10),
  energy_score integer check (energy_score >= 1 and energy_score <= 10),
  anxiety_score integer check (anxiety_score >= 1 and anxiety_score <= 10),
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

alter table mood_logs enable row level security;

create policy "Users can view own mood logs" on mood_logs
  for select using (auth.uid() = user_id);
create policy "Users can insert own mood logs" on mood_logs
  for insert with check (auth.uid() = user_id);
create policy "Users can update own mood logs" on mood_logs
  for update using (auth.uid() = user_id);
create policy "Users can delete own mood logs" on mood_logs
  for delete using (auth.uid() = user_id);
