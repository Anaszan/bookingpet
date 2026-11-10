# 🐾 ระบบจองคิวร้านอาบน้ำ-ตัดขนสัตว์เลี้ยง

Next.js 16 (App Router) + Supabase (Postgres + Auth) + Tailwind CSS

## ผู้ใช้ 3 ระดับ

| บทบาท | ทำอะไรได้ |
|---|---|
| **ลูกค้า** (customer) | สมัครสมาชิก/เข้าสู่ระบบ, บันทึกข้อมูลสัตว์เลี้ยง, จองคิว, ดูและยกเลิกคิวของตัวเอง, แก้ไขโปรไฟล์ |
| **พนักงาน** (staff) | ทุกอย่างของลูกค้า + ดูคิวร้านรายวัน, เปลี่ยนสถานะคิว, มอบหมายช่าง, ดู "งานของฉัน" |
| **เจ้าของร้าน** (owner) | ทุกอย่างของพนักงาน + รายงานรายได้รายเดือน, จัดการบริการ, ตั้งค่าร้าน, กำหนดสิทธิ์ผู้ใช้/พนักงาน |

ผู้ที่สมัครใหม่ทุกคนเป็น **ลูกค้า** — เจ้าของร้านเลื่อนสิทธิ์เป็นพนักงานได้ที่ `/owner/team`

## หน้าเว็บ

| Path | สำหรับ |
|---|---|
| `/` | หน้าแรก + รายการบริการ |
| `/login`, `/register` | เข้าสู่ระบบ / สมัครสมาชิก |
| `/book` | จองคิว (ต้องเข้าสู่ระบบ) |
| `/account` | คิวของฉัน |
| `/account/pets` | สัตว์เลี้ยงของฉัน |
| `/account/profile` | ข้อมูลส่วนตัว |
| `/staff` | คิวร้าน (พนักงาน + เจ้าของร้าน) |
| `/owner` | รายงาน (เจ้าของร้าน) |
| `/owner/services` | จัดการบริการ |
| `/owner/team` | ผู้ใช้และพนักงาน |
| `/owner/settings` | ตั้งค่าร้าน |

## ติดตั้ง

1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com)
2. เปิด **SQL Editor** แล้วรันไฟล์ตามลำดับ
   1. [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql)
   2. [`supabase/migrations/002_roles.sql`](supabase/migrations/002_roles.sql)
3. คัดลอก `.env.local.example` เป็น `.env.local` แล้วใส่ URL และ anon/publishable key จาก **Project Settings → API**
4. `npm install` แล้ว `npm run dev` → เปิด http://localhost:3000
5. สมัครสมาชิกที่ `/register` แล้วตั้งตัวเองเป็นเจ้าของร้านใน SQL Editor:
   ```sql
   update public.profiles set role = 'owner' where email = 'you@example.com';
   ```

> **การยืนยันอีเมล:** Supabase เปิด "Confirm email" ไว้เป็นค่าเริ่มต้น ผู้สมัครต้องกดลิงก์ในอีเมลก่อนเข้าสู่ระบบ
> ระหว่างพัฒนาปิดได้ที่ **Authentication → Sign In / Providers → Email → Confirm email**
> ถ้าเปิดไว้ ให้ตั้ง **Authentication → URL Configuration → Site URL** เป็นโดเมนของเว็บ (เช่น `http://localhost:3000`)

## โครงสร้าง

```
app/
  page.tsx                 หน้าแรก
  login/ register/         เข้าสู่ระบบ / สมัครสมาชิก
  auth/callback/           รับลิงก์ยืนยันอีเมล
  book/                    ฟอร์มจองคิว
  account/                 คิวของฉัน, สัตว์เลี้ยง, โปรไฟล์ (ลูกค้า)
  staff/                   คิวร้าน (พนักงาน)
  owner/                   รายงาน, บริการ, ทีม, ตั้งค่า (เจ้าของร้าน)
lib/supabase/server.ts     getSession(), requireRole()
lib/utils.ts               ฟังก์ชันช่วย + คำนวณเวลาว่าง
proxy.ts                   รีเฟรช session ของ Supabase
supabase/migrations/       SQL: ตาราง, RLS, ฟังก์ชัน
```

## ความปลอดภัย

- เปิด RLS ทุกตาราง สิทธิ์ตรวจสอบที่ฐานข้อมูลด้วย `is_staff()` / `is_owner()` ไม่ใช่แค่ที่หน้าเว็บ
- ลูกค้าเห็นเฉพาะคิวและสัตว์เลี้ยงของตัวเอง
- การจองต้องผ่าน `create_booking` (ตรวจเวลาทำการ วันหยุด คิวเต็ม และความเป็นเจ้าของสัตว์เลี้ยง พร้อม lock กันจองชน)
- ผู้ใช้เปลี่ยน `role` ของตัวเองไม่ได้ (มี trigger กันไว้) — เปลี่ยนได้เฉพาะเจ้าของร้าน
