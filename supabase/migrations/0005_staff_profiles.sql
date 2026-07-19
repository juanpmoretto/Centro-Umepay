create table staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);

alter table staff_profiles enable row level security;

create policy "staff can read staff profiles"
  on staff_profiles for select
  to authenticated
  using (true);
