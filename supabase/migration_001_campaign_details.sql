-- Run in Supabase SQL Editor (for existing projects that already ran schema.sql)

alter table public.campaigns
  add column if not exists location text,
  add column if not exists target_amount numeric(12, 2),
  add column if not exists event_date date;

comment on column public.campaigns.location is 'Optional place / locality for the collection';
comment on column public.campaigns.target_amount is 'Optional fundraising goal in INR';
comment on column public.campaigns.event_date is 'Optional event or deadline date';
