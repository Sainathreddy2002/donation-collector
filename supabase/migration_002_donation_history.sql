-- Run ONCE in Supabase SQL Editor (after migration_001 only).
-- Includes: donation version history + soft delete.

-- Soft delete columns
alter table public.donations
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles (id);

create index if not exists donations_deleted_at_idx
  on public.donations (campaign_id, deleted_at);

-- Members see active donations; owners also see soft-deleted ones
drop policy if exists "Members can view donations" on public.donations;
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

-- History table
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

drop policy if exists "Members can view donation history" on public.donation_history;
create policy "Members can view donation history"
  on public.donation_history for select
  to authenticated
  using (public.is_campaign_member(campaign_id));

-- Auto-log create / update / soft-delete
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
