-- =====================================================================
-- 002: ผู้ใช้ 3 ระดับ — ลูกค้า (customer) / พนักงาน (staff) / เจ้าของร้าน (owner)
-- รันหลังจาก 001_init.sql (รันซ้ำได้)
-- =====================================================================

-- ---------- โปรไฟล์ผู้ใช้ ----------

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text not null default '',
  phone      text,
  role       text not null default 'customer' check (role in ('customer','staff','owner')),
  created_at timestamptz not null default now()
);

-- ฟังก์ชันเช็คสิทธิ์
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('staff','owner') from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'owner' from public.profiles where id = auth.uid()), false);
$$;

-- สร้างโปรไฟล์อัตโนมัติเมื่อสมัครสมาชิก
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- สร้างโปรไฟล์ให้ผู้ใช้ที่มีอยู่แล้ว
insert into public.profiles (id, email, full_name, phone)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', ''), u.raw_user_meta_data->>'phone'
from auth.users u
on conflict (id) do nothing;

-- ย้ายแอดมินเดิม (ตาราง admins) เป็นเจ้าของร้าน
do $$
begin
  if to_regclass('public.admins') is not null then
    update public.profiles set role = 'owner' where id in (select user_id from public.admins);
  end if;
end $$;

-- กันไม่ให้ผู้ใช้เปลี่ยนสิทธิ์ตัวเอง (เปลี่ยนได้เฉพาะเจ้าของร้าน หรือรันจาก SQL Editor)
create or replace function public.protect_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.id := old.id;
  new.email := old.email;
  new.created_at := old.created_at;
  if new.role is distinct from old.role and auth.uid() is not null then
    if not public.is_owner() then
      raise exception 'เฉพาะเจ้าของร้านเท่านั้นที่เปลี่ยนสิทธิ์ผู้ใช้ได้';
    end if;
    if old.id = auth.uid() then
      raise exception 'ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles
  for each row execute function public.protect_profile();

-- ---------- สัตว์เลี้ยงของลูกค้า ----------

create table if not exists public.pets (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name       text not null,
  pet_type   text not null check (pet_type in ('dog','cat','other')),
  breed      text,
  weight     numeric(5,2),
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists pets_owner_idx on public.pets (owner_id);

-- ---------- การจอง: ผูกกับลูกค้า สัตว์เลี้ยง และช่าง ----------

alter table public.bookings add column if not exists user_id  uuid references public.profiles(id) on delete set null;
alter table public.bookings add column if not exists pet_id   uuid references public.pets(id)     on delete set null;
alter table public.bookings add column if not exists staff_id uuid references public.profiles(id) on delete set null;
create index if not exists bookings_user_idx  on public.bookings (user_id);
create index if not exists bookings_staff_idx on public.bookings (staff_id);

-- ---------- RLS ----------

alter table public.profiles enable row level security;
alter table public.pets     enable row level security;

-- ลบ policy เดิมที่อิง is_admin() (ต้องลบก่อนลบฟังก์ชัน)
drop policy if exists "services read"  on public.services;
drop policy if exists "services admin" on public.services;
drop policy if exists "settings admin" on public.shop_settings;
drop policy if exists "bookings admin" on public.bookings;
drop table if exists public.admins;          -- policy ของตารางนี้ถูกลบไปด้วย
drop function if exists public.is_admin();

-- services: ทุกคนเห็นบริการที่เปิด, พนักงานเห็นทั้งหมด, เจ้าของร้านแก้ไขได้
drop policy if exists "services owner" on public.services;
create policy "services read"  on public.services for select using (is_active or public.is_staff());
create policy "services owner" on public.services for all using (public.is_owner()) with check (public.is_owner());

-- shop_settings: เจ้าของร้านแก้ไขได้
drop policy if exists "settings owner" on public.shop_settings;
create policy "settings owner" on public.shop_settings for update using (public.is_owner()) with check (public.is_owner());

-- bookings: ลูกค้าเห็นของตัวเอง, พนักงานเห็นและอัปเดตทั้งหมด, เจ้าของร้านลบได้
-- (การสร้างและยกเลิกของลูกค้าต้องผ่าน RPC)
drop policy if exists "bookings select" on public.bookings;
drop policy if exists "bookings staff update" on public.bookings;
drop policy if exists "bookings owner delete" on public.bookings;
create policy "bookings select" on public.bookings for select using (user_id = auth.uid() or public.is_staff());
create policy "bookings staff update" on public.bookings for update using (public.is_staff()) with check (public.is_staff());
create policy "bookings owner delete" on public.bookings for delete using (public.is_owner());

-- profiles: เห็น/แก้ของตัวเอง, พนักงานเห็นทุกคน, เจ้าของร้านแก้ได้ทุกคน
drop policy if exists "profiles select" on public.profiles;
drop policy if exists "profiles update" on public.profiles;
create policy "profiles select" on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy "profiles update" on public.profiles for update
  using (id = auth.uid() or public.is_owner()) with check (id = auth.uid() or public.is_owner());

-- pets: เจ้าของสัตว์จัดการเอง, พนักงานดูได้
drop policy if exists "pets own"        on public.pets;
drop policy if exists "pets staff read" on public.pets;
create policy "pets own" on public.pets for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "pets staff read" on public.pets for select using (public.is_staff());

-- ---------- RPC ----------

drop function if exists public.find_my_bookings(text);
drop function if exists public.cancel_my_booking(text, text);
drop function if exists public.create_booking(uuid,date,time,text,text,text,text,text,numeric,text);

-- จองคิว (ต้องล็อกอิน) ตรวจคิวว่างแบบ atomic
create or replace function public.create_booking(
  p_service_id uuid, p_date date, p_start time, p_pet_id uuid,
  p_customer_name text, p_phone text, p_note text default null
)
returns table (id uuid, booking_code text)
language plpgsql security definer set search_path = public as $$
declare
  s       public.shop_settings;
  svc     public.services;
  pet     public.pets;
  v_end   time;
  v_today date := (now() at time zone 'Asia/Bangkok')::date;
  v_now   time := (now() at time zone 'Asia/Bangkok')::time;
  v_max   int;
begin
  if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบก่อนจองคิว'; end if;

  perform pg_advisory_xact_lock(hashtext('booking:' || p_date::text));

  select * into s   from public.shop_settings where shop_settings.id = 1;
  select * into svc from public.services where services.id = p_service_id and is_active;
  if svc.id is null then raise exception 'ไม่พบบริการที่เลือก'; end if;

  select * into pet from public.pets where pets.id = p_pet_id and owner_id = auth.uid();
  if pet.id is null then raise exception 'ไม่พบข้อมูลสัตว์เลี้ยง'; end if;
  if svc.pet_type <> 'all' and svc.pet_type <> pet.pet_type then
    raise exception 'บริการนี้ไม่รองรับสัตว์เลี้ยงประเภทนี้';
  end if;

  if coalesce(trim(p_customer_name), '') = '' then raise exception 'กรุณากรอกชื่อผู้จอง'; end if;
  if p_phone !~ '^0[0-9]{8,9}$' then raise exception 'เบอร์โทรไม่ถูกต้อง'; end if;

  if p_date < v_today or p_date > v_today + s.max_days_ahead then
    raise exception 'วันที่ไม่อยู่ในช่วงที่เปิดรับจอง';
  end if;
  if extract(dow from p_date)::int = any (s.closed_weekdays) then
    raise exception 'ร้านปิดในวันที่เลือก';
  end if;
  if p_date = v_today and p_start <= v_now then
    raise exception 'เวลาที่เลือกผ่านไปแล้ว';
  end if;

  v_end := p_start + make_interval(mins => svc.duration_minutes);
  if p_start < s.open_time or v_end > s.close_time or v_end <= p_start then
    raise exception 'เวลาที่เลือกอยู่นอกเวลาทำการ';
  end if;

  -- จำนวนงานที่ซ้อนกันสูงสุดในช่วง [p_start, v_end)
  select coalesce(max(c), 0) into v_max from (
    select (select count(*) from public.bookings b
            where b.booking_date = p_date and b.status <> 'cancelled'
              and b.start_time <= t and b.end_time > t) as c
    from (
      select p_start as t
      union
      select b.start_time from public.bookings b
      where b.booking_date = p_date and b.status <> 'cancelled'
        and b.start_time > p_start and b.start_time < v_end
    ) pts
  ) x;
  if v_max >= s.staff_count then raise exception 'ช่วงเวลานี้ถูกจองเต็มแล้ว'; end if;

  return query
  insert into public.bookings (user_id, pet_id, service_id, customer_name, phone,
                               pet_name, pet_type, pet_breed, pet_weight, note,
                               booking_date, start_time, end_time, price)
  values (auth.uid(), pet.id, svc.id, trim(p_customer_name), p_phone,
          pet.name, pet.pet_type, pet.breed, pet.weight,
          nullif(trim(coalesce(p_note, '') || case when pet.note is not null then ' [ประวัติ: ' || pet.note || ']' else '' end), ''),
          p_date, p_start, v_end, svc.price)
  returning bookings.id, bookings.booking_code;
end;
$$;

-- ลูกค้ายกเลิกคิวของตัวเอง
create or replace function public.cancel_my_booking(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.bookings set status = 'cancelled'
  where id = p_id and user_id = auth.uid()
    and status in ('pending','confirmed')
    and booking_date >= (now() at time zone 'Asia/Bangkok')::date;
  return found;
end;
$$;

revoke execute on function public.create_booking(uuid,date,time,uuid,text,text,text) from public, anon;
revoke execute on function public.cancel_my_booking(uuid) from public, anon;
grant  execute on function public.create_booking(uuid,date,time,uuid,text,text,text) to authenticated;
grant  execute on function public.cancel_my_booking(uuid) to authenticated;

-- ---------- ตั้งเจ้าของร้านคนแรก ----------
-- 1) สมัครสมาชิกผ่านหน้าเว็บ (/register) หรือ Dashboard > Authentication > Add user
-- 2) รันคำสั่งนี้ (เปลี่ยนอีเมล):
-- update public.profiles set role = 'owner' where email = 'owner@example.com';
-- หลังจากนั้นเจ้าของร้านตั้งพนักงานได้เองที่หน้า /owner/team
