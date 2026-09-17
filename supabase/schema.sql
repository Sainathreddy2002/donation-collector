-- Run this once in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yculpogwydpxwmkerdrn/sql

create extension if not exists "pgcrypto";

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Campaigns (donation pools)
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  target_amount numeric(12, 2),
  event_date date,
  invite_code text not null unique,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists campaigns_invite_code_idx on public.campaigns (invite_code);
create index if not exists campaigns_created_by_idx on public.campaigns (created_by);

alter table public.campaigns enable row level security;

-- Membership
create table if not exists public.campaign_members (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

create index if not exists campaign_members_user_id_idx on public.campaign_members (user_id);

alter table public.campaign_members enable row level security;

-- Donations
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  donor_name text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  notes text,
  recorded_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists donations_campaign_id_idx on public.donations (campaign_id);
create index if not exists donations_donor_name_idx on public.donations (donor_name);

alter table public.donations enable row level security;

-- Helpers
create or replace function public.is_campaign_member(p_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaign_members m
    where m.campaign_id = p_campaign_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_campaign_owner(p_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaign_members m
    where m.campaign_id = p_campaign_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  );
$$;

-- Campaigns policies
create policy "Members can view their campaigns"
  on public.campaigns for select
  to authenticated
  using (public.is_campaign_member(id) or created_by = auth.uid());

create policy "Authenticated users can create campaigns"
  on public.campaigns for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Owners can update campaigns"
  on public.campaigns for update
  to authenticated
  using (public.is_campaign_owner(id))
  with check (public.is_campaign_owner(id));

-- Join by invite code (avoids opening all campaigns for select)
create or replace function public.join_campaign_by_code(p_code text)
returns public.campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.campaigns;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into c
  from public.campaigns
  where upper(invite_code) = upper(trim(p_code));

  if c.id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.campaign_members (campaign_id, user_id, role)
  values (c.id, auth.uid(), 'member')
  on conflict (campaign_id, user_id) do nothing;

  return c;
end;
$$;

grant execute on function public.join_campaign_by_code(text) to authenticated;

-- Membership policies
create policy "Members can view membership of their campaigns"
  on public.campaign_members for select
  to authenticated
  using (public.is_campaign_member(campaign_id) or user_id = auth.uid());

create policy "Users can join as themselves"
  on public.campaign_members for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Owners can manage members"
  on public.campaign_members for delete
  to authenticated
  using (public.is_campaign_owner(campaign_id) or user_id = auth.uid());

-- Donations policies
create policy "Members can view donations"
  on public.donations for select
  to authenticated
  using (
    public.is_campaign_member(campaign_id)
    and (
      deleted_at is null
      or public.is_campaign_owner(campaign_id)
    )
  );

create policy "Members can add donations"
  on public.donations for insert
  to authenticated
  with check (
    public.is_campaign_member(campaign_id)
    and auth.uid() = recorded_by
  );

create policy "Members can edit donations"
  on public.donations for update
  to authenticated
  using (public.is_campaign_member(campaign_id))
  with check (public.is_campaign_member(campaign_id));

create policy "Members can delete donations"
  on public.donations for delete
  to authenticated
  using (public.is_campaign_member(campaign_id));

-- Keep updated_at fresh
create or replace function public.set_donation_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists donations_set_updated_at on public.donations;
create trigger donations_set_updated_at
  before update on public.donations
  for each row execute function public.set_donation_updated_at();

-- Donation version history
create table if not exists public.donation_history (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  action text not null check (action in ('created', 'updated', 'deleted')),
  donor_name text not null,
  amount numeric(12, 2) not null,
  notes text,
  previous_donor_name text,
  previous_amount numeric(12, 2),
  previous_notes text,
  changed_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists donation_history_donation_id_idx
  on public.donation_history (donation_id, created_at desc);

create index if not exists donation_history_campaign_id_idx
  on public.donation_history (campaign_id);

alter table public.donation_history enable row level security;

create policy "Members can view donation history"
  on public.donation_history for select
  to authenticated
  using (public.is_campaign_member(campaign_id));

create or replace function public.log_donation_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.donation_history (
      donation_id, campaign_id, action,
      donor_name, amount, notes, changed_by
    ) values (
      new.id, new.campaign_id, 'created',
      new.donor_name, new.amount, new.notes, auth.uid()
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.deleted_at is null and new.deleted_at is not null then
      insert into public.donation_history (
        donation_id, campaign_id, action,
        donor_name, amount, notes, changed_by
      ) values (
        new.id, new.campaign_id, 'deleted',
        new.donor_name, new.amount, new.notes,
        coalesce(new.deleted_by, auth.uid())
      );
      return new;
    end if;

    if new.deleted_at is null and (
      new.donor_name is distinct from old.donor_name
      or new.amount is distinct from old.amount
      or new.notes is distinct from old.notes
    ) then
      insert into public.donation_history (
        donation_id, campaign_id, action,
        donor_name, amount, notes,
        previous_donor_name, previous_amount, previous_notes,
        changed_by
      ) values (
        new.id, new.campaign_id, 'updated',
        new.donor_name, new.amount, new.notes,
        old.donor_name, old.amount, old.notes,
        auth.uid()
      );
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.donation_history (
      donation_id, campaign_id, action,
      donor_name, amount, notes, changed_by
    ) values (
      old.id, old.campaign_id, 'deleted',
      old.donor_name, old.amount, old.notes, auth.uid()
    );
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists donations_history_insert on public.donations;
create trigger donations_history_insert
  after insert on public.donations
  for each row execute function public.log_donation_history();

drop trigger if exists donations_history_update on public.donations;
create trigger donations_history_update
  after update on public.donations
  for each row execute function public.log_donation_history();

drop trigger if exists donations_history_delete on public.donations;
create trigger donations_history_delete
  before delete on public.donations
  for each row execute function public.log_donation_history();

-- Short invite codes
create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;
