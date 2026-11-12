-- =====================================================================
-- 003: ปฏิทินร้าน — ทุกคนดูได้, เฉพาะพนักงาน/เจ้าของร้านแก้ไขได้
-- รันหลังจาก 002_roles.sql (รันซ้ำได้)
-- =====================================================================

create table if not exists public.calendar_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  start_date  date not null,
  end_date    date not null,
  event_type  text not null default 'event'
              check (event_type in ('holiday','event','promotion','notice')),
  created_by  uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists calendar_events_range_idx on public.calendar_events (start_date, end_date);

alter table public.calendar_events enable row level security;

drop policy if exists "calendar read"  on public.calendar_events;
drop policy if exists "calendar write" on public.calendar_events;
create policy "calendar read"  on public.calendar_events for select using (true);
create policy "calendar write" on public.calendar_events for all
  using (public.is_staff()) with check (public.is_staff());

grant select on public.calendar_events to anon, authenticated;
grant insert, update, delete on public.calendar_events to authenticated;

-- จำนวนคิวต่อวัน (ไม่เปิดเผยข้อมูลลูกค้า) สำหรับแสดงความหนาแน่นบนปฏิทิน
create or replace function public.get_day_loads(p_from date, p_to date)
returns table (booking_date date, bookings int)
language sql stable security definer set search_path = public as $$
  select b.booking_date, count(*)::int
  from public.bookings b
  where b.booking_date between p_from and p_to and b.status <> 'cancelled'
  group by b.booking_date;
$$;
grant execute on function public.get_day_loads(date, date) to anon, authenticated;

-- ห้ามจองในวันที่ร้านประกาศหยุด
create or replace function public.check_holiday()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.calendar_events e
    where e.event_type = 'holiday' and new.booking_date between e.start_date and e.end_date
  ) then
    raise exception 'ร้านหยุดในวันที่เลือก';
  end if;
  return new;
end;
$$;
drop trigger if exists bookings_check_holiday on public.bookings;
create trigger bookings_check_holiday before insert on public.bookings
  for each row execute function public.check_holiday();
