-- =====================================================================
-- ระบบจองคิวร้านอาบน้ำ-ตัดขนสัตว์เลี้ยง (Pet Grooming Booking)
-- รันไฟล์นี้ใน Supabase Dashboard > SQL Editor
-- =====================================================================

-- ---------- ตาราง ----------

create table if not exists public.services (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  price            numeric(10,2) not null default 0,
  duration_minutes int not null check (duration_minutes > 0),
  pet_type         text not null default 'all' check (pet_type in ('dog','cat','all')),
  is_active        boolean not null default true,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);

-- ตั้งค่าร้าน (มีแถวเดียว)
create table if not exists public.shop_settings (
  id              int primary key default 1 check (id = 1),
  shop_name       text not null default 'Happy Paws Grooming',
  phone           text,
  open_time       time not null default '09:00',
  close_time      time not null default '18:00',
  slot_minutes    int  not null default 30 check (slot_minutes in (15,30,60)),
  staff_count     int  not null default 2 check (staff_count > 0),  -- จำนวนช่างที่รับงานพร้อมกันได้
  closed_weekdays int[] not null default '{}',                     -- 0=อาทิตย์ ... 6=เสาร์
  max_days_ahead  int  not null default 30
);
insert into public.shop_settings (id) values (1) on conflict do nothing;

create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  booking_code  text not null unique default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  service_id    uuid not null references public.services(id),
  customer_name text not null,
  phone         text not null,
  pet_name      text not null,
  pet_type      text not null check (pet_type in ('dog','cat','other')),
  pet_breed     text,
  pet_weight    numeric(5,2),
  note          text,
  booking_date  date not null,
  start_time    time not null,
  end_time      time not null,
  price         numeric(10,2) not null,
  status        text not null default 'pending'
                check (status in ('pending','confirmed','in_progress','completed','cancelled')),
  created_at    timestamptz not null default now(),
  check (end_time > start_time)
);
create index if not exists bookings_date_idx  on public.bookings (booking_date);
create index if not exists bookings_phone_idx on public.bookings (phone);

-- ผู้ดูแลระบบ (ผูกกับ auth.users)
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- ---------- Helper ----------

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- RLS ----------

alter table public.services      enable row level security;
alter table public.shop_settings enable row level security;
alter table public.bookings      enable row level security;
alter table public.admins        enable row level security;

drop policy if exists "services read"  on public.services;
drop policy if exists "services admin" on public.services;
create policy "services read"  on public.services for select using (is_active or public.is_admin());
create policy "services admin" on public.services for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings read"  on public.shop_settings;
drop policy if exists "settings admin" on public.shop_settings;
create policy "settings read"  on public.shop_settings for select using (true);
create policy "settings admin" on public.shop_settings for update using (public.is_admin()) with check (public.is_admin());

-- ลูกค้าทั่วไปเข้าถึงตาราง bookings ตรง ๆ ไม่ได้ ต้องผ่าน RPC ด้านล่างเท่านั้น
drop policy if exists "bookings admin" on public.bookings;
create policy "bookings admin" on public.bookings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins self" on public.admins;
create policy "admins self" on public.admins for select using (user_id = auth.uid());

-- ---------- RPC สำหรับลูกค้า ----------

-- ช่วงเวลาที่ถูกจองแล้วในวันนั้น (ไม่เปิดเผยข้อมูลลูกค้า)
create or replace function public.get_busy_slots(p_date date)
returns table (start_time time, end_time time)
language sql stable security definer set search_path = public as $$
  select b.start_time, b.end_time from public.bookings b
  where b.booking_date = p_date and b.status <> 'cancelled';
$$;

-- สร้างการจอง พร้อมตรวจสอบคิวว่างแบบ atomic
create or replace function public.create_booking(
  p_service_id uuid, p_date date, p_start time,
  p_customer_name text, p_phone text,
  p_pet_name text, p_pet_type text, p_pet_breed text default null,
  p_pet_weight numeric default null, p_note text default null
)
returns table (id uuid, booking_code text)
language plpgsql security definer set search_path = public as $$
declare
  s        public.shop_settings;
  svc      public.services;
  v_end    time;
  v_today  date := (now() at time zone 'Asia/Bangkok')::date;
  v_now    time := (now() at time zone 'Asia/Bangkok')::time;
  v_max    int;
begin
  -- ป้องกันการจองชนกันในวันเดียวกัน
  perform pg_advisory_xact_lock(hashtext('booking:' || p_date::text));

  select * into s from public.shop_settings where shop_settings.id = 1;
  select * into svc from public.services where services.id = p_service_id and is_active;
  if svc.id is null then raise exception 'ไม่พบบริการที่เลือก'; end if;

  if coalesce(trim(p_customer_name),'') = '' or coalesce(trim(p_pet_name),'') = '' then
    raise exception 'กรุณากรอกชื่อและชื่อสัตว์เลี้ยง';
  end if;
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
  insert into public.bookings (service_id, customer_name, phone, pet_name, pet_type, pet_breed,
                               pet_weight, note, booking_date, start_time, end_time, price)
  values (svc.id, trim(p_customer_name), p_phone, trim(p_pet_name), p_pet_type, nullif(trim(p_pet_breed),''),
          p_pet_weight, nullif(trim(p_note),''), p_date, p_start, v_end, svc.price)
  returning bookings.id, bookings.booking_code;
end;
$$;

-- ลูกค้าเช็คคิวของตัวเองด้วยเบอร์โทร
create or replace function public.find_my_bookings(p_phone text)
returns table (booking_code text, service_name text, pet_name text, booking_date date,
               start_time time, end_time time, price numeric, status text)
language sql stable security definer set search_path = public as $$
  select b.booking_code, s.name, b.pet_name, b.booking_date, b.start_time, b.end_time, b.price, b.status
  from public.bookings b join public.services s on s.id = b.service_id
  where b.phone = p_phone
    and b.booking_date >= (now() at time zone 'Asia/Bangkok')::date - 30
  order by b.booking_date desc, b.start_time desc
  limit 20;
$$;

-- ลูกค้ายกเลิกคิวเอง (ต้องรู้ทั้งรหัสจองและเบอร์โทร)
create or replace function public.cancel_my_booking(p_code text, p_phone text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.bookings set status = 'cancelled'
  where booking_code = upper(p_code) and phone = p_phone
    and status in ('pending','confirmed')
    and booking_date >= (now() at time zone 'Asia/Bangkok')::date;
  return found;
end;
$$;

grant execute on function public.get_busy_slots(date) to anon, authenticated;
grant execute on function public.create_booking(uuid,date,time,text,text,text,text,text,numeric,text) to anon, authenticated;
grant execute on function public.find_my_bookings(text) to anon, authenticated;
grant execute on function public.cancel_my_booking(text,text) to anon, authenticated;

-- ---------- ข้อมูลตัวอย่าง ----------

insert into public.services (name, description, price, duration_minutes, pet_type, sort_order)
select * from (values
  ('อาบน้ำ (สุนัขเล็ก < 10 กก.)', 'อาบน้ำ เป่าแห้ง ตัดเล็บ เช็ดหู', 300, 60,  'dog', 1),
  ('อาบน้ำ (สุนัขใหญ่ ≥ 10 กก.)', 'อาบน้ำ เป่าแห้ง ตัดเล็บ เช็ดหู', 500, 90,  'dog', 2),
  ('อาบน้ำ + ตัดขน (สุนัข)',     'อาบน้ำ ตัดขนตามทรง ตัดเล็บ เช็ดหู', 700, 120, 'dog', 3),
  ('อาบน้ำแมว',                   'อาบน้ำ เป่าแห้ง ตัดเล็บ',          400, 60,  'cat', 4),
  ('ตัดขนแมว (ไถทั้งตัว)',        'ไถขนทั้งตัว ตัดเล็บ',               600, 90,  'cat', 5),
  ('ตัดเล็บ',                     'ตัดและตะไบเล็บ',                    100, 30,  'all', 6),
  ('สปาขน + มาส์กบำรุง',          'อาบน้ำ สปาขน มาส์กบำรุง',           800, 120, 'all', 7)
) v
where not exists (select 1 from public.services);

-- ---------- ตั้งค่าแอดมิน ----------
-- 1) สร้างผู้ใช้ใน Dashboard > Authentication > Users > Add user (email + password)
-- 2) รันคำสั่งนี้ (เปลี่ยนอีเมล):
-- insert into public.admins (user_id) select id from auth.users where email = 'admin@example.com';
