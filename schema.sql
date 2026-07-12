-- Create watchlist table
create table if not exists public.watchlist (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  type text not null check (type in ('movie', 'tv', 'anime')),
  status text not null check (status in ('watching', 'plan_to_watch', 'completed')),
  poster_url text,
  rating int default 0 check (rating >= 0 and rating <= 10),
  notes text,
  api_id text,
  release_year text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.watchlist enable row level security;

-- Create policy to allow all actions for service role (admin) and deny public access
create policy "Allow all service role access" on public.watchlist
  for all to service_role using (true) with check (true);
