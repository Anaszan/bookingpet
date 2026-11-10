# 🐾 ระบบจองคิวร้านอาบน้ำ-ตัดขนสัตว์เลี้ยง

Next.js 16 (App Router) + Supabase (Postgres + Auth) + Tailwind CSS

## ฟีเจอร์

**ลูกค้า**
- ดูรายการบริการและราคา (อาบน้ำ ตัดขน ตัดเล็บ สปา ฯลฯ)
- จองคิว: เลือกชนิดสัตว์ → บริการ → วัน → เวลาว่าง → กรอกข้อมูล
- ระบบคำนวณเวลาว่างตามระยะเวลาบริการและจำนวนช่าง (กันจองชนแบบ atomic ในฐานข้อมูล)
- เช็คคิว / ยกเลิกคิวด้วยเบอร์โทร

**ร้านค้า (`/admin`)**
- ดูคิวรายวัน กรองตามสถานะ ค้นหาชื่อ/เบอร์/รหัส
- เปลี่ยนสถานะ: รอยืนยัน → ยืนยันแล้ว → กำลังให้บริการ → เสร็จสิ้น / ยกเลิก
- สรุปจำนวนคิวและรายได้ของวัน
- จัดการบริการ (เพิ่ม/แก้ไข/เปิด-ปิด)
- ตั้งค่าร้าน: เวลาเปิด-ปิด, จำนวนช่าง, วันหยุด, ช่วงเวลา, จองล่วงหน้ากี่วัน

## ติดตั้ง

1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com)
2. เปิด **SQL Editor** แล้วรันไฟล์ [`supabase/schema.sql`](supabase/schema.sql)
3. สร้างบัญชีแอดมิน: **Authentication → Users → Add user** (ใส่อีเมล+รหัสผ่าน, ติ๊ก Auto confirm)
   แล้วรันใน SQL Editor:
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'admin@example.com';
   ```
4. คัดลอก `.env.local.example` เป็น `.env.local` แล้วใส่ URL และ anon key จาก **Project Settings → API**
5. รัน
   ```bash
   npm install
   npm run dev
   ```
   เปิด http://localhost:3000 (หน้าร้าน: http://localhost:3000/admin)

## โครงสร้าง

```
app/
  page.tsx                 หน้าแรก + รายการบริการ
  book/                    ฟอร์มจองคิว + หน้าจองสำเร็จ
  check/                   เช็ค/ยกเลิกคิวด้วยเบอร์โทร
  admin/login/             เข้าสู่ระบบร้าน
  admin/(dash)/            คิวจอง, บริการ, ตั้งค่าร้าน
  admin/actions.ts         Server Actions ของแอดมิน
lib/supabase/              Supabase client (browser / server)
lib/utils.ts               ฟังก์ชันช่วย + คำนวณเวลาว่าง
proxy.ts                   รีเฟรช session ของ Supabase
supabase/schema.sql        ตาราง, RLS, ฟังก์ชัน RPC, ข้อมูลตัวอย่าง
```

## ความปลอดภัย

- เปิด RLS ทุกตาราง ลูกค้า (anon) **อ่านตาราง bookings ตรง ๆ ไม่ได้**
- ลูกค้าใช้งานผ่านฟังก์ชัน `security definer` เท่านั้น:
  `get_busy_slots` (เห็นแค่ช่วงเวลา ไม่เห็นข้อมูลลูกค้า), `create_booking`, `find_my_bookings`, `cancel_my_booking`
- `create_booking` ตรวจสอบเวลาทำการ วันหยุด วันย้อนหลัง และคิวเต็ม โดยใช้ advisory lock กันจองชนกัน
- เฉพาะผู้ใช้ในตาราง `admins` เท่านั้นที่จัดการข้อมูลได้
