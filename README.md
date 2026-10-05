# Everwell — หน้า Home (EN)

เว็บคลินิกจิตบำบัดออนไลน์ ทำด้วย **Next.js 14 + Three.js** แปลงจากดีไซน์ Figma "Everwell"

---

## 1. รันบนเครื่อง

ต้องมี Node.js 18 ขึ้นไป

```bash
npm install      # ติดตั้งครั้งแรกครั้งเดียว
npm run dev      # เปิด http://localhost:3000
```

ตรวจก่อน deploy: `npm run build`

---

## 2. Deploy ขึ้น Vercel

**วิธีง่ายสุด (ผ่าน GitHub)**
1. push โฟลเดอร์นี้ขึ้น GitHub
2. เข้า vercel.com → **Add New → Project** → เลือก repo
3. กด **Deploy** (ไม่ต้องตั้งค่าอะไร Vercel รู้เองว่าเป็น Next.js)

**วิธีใช้คำสั่ง**
```bash
npx vercel --prod
```

---

## 3. โครงสร้างไฟล์

```
app/
  page.tsx          ← เนื้อหาทั้งหน้า (แก้ข้อความที่นี่)
  globals.css       ← สี ฟอนต์ ระยะห่าง
  layout.tsx        ← ชื่อเว็บ, ฟอนต์
components/
  FlowLines.tsx     ← Effect เส้นไหลใน Hero
  Jellyfish.tsx     ← Effect วงแหวนในส่วน Support
  RatesReveal.tsx   ← ตัวเลขราคาหมุนตอนเลื่อน
  GlowField.tsx     ← Effect แสงในส่วน Contact
  Nav.tsx, SupportList.tsx, TeamSlider.tsx
lib/loop.ts         ← ตัวควบคุม Effect (หยุดเมื่อไม่อยู่บนจอ)
```

---

## 4. แก้อะไรได้ง่ายๆ

| อยากแก้ | ไปที่ |
|---|---|
| ข้อความ / เมนู / Footer | `app/page.tsx`, `components/Nav.tsx` |
| ราคา | `components/RatesReveal.tsx` (ตัวแปร `RATES`) |
| รายชื่อนักจิตวิทยา | `components/TeamSlider.tsx` (ตัวแปร `TEAM`) |
| สีทั้งเว็บ | `app/globals.css` (บนสุด `:root`) |
| ความเข้มของเส้น Hero | `components/FlowLines.tsx` (`uOpacity`) |

---

## 5. ก่อนเปิดใช้งานจริง

- [ ] ใส่รูปจริงแทนภาพไล่สี (รูปนักจิตวิทยา, พื้นหลัง)
- [ ] ใส่ **เลขที่ใบอนุญาต**, อีเมล, เบอร์โทร, ลิงก์ Social ใน Footer (ตอนนี้เป็นค่าตัวอย่าง)
- [ ] เปลี่ยนชื่อนักจิตวิทยาและราคา (ตอนนี้เป็นข้อมูลสมมติ)
- [ ] ตั้งชื่อบริษัทให้ตรงกับที่จดทะเบียน

## หมายเหตุ

- Effect หยุดอัตโนมัติเมื่อเลื่อนพ้นจอ และปิดแอนิเมชันถ้าผู้ใช้ตั้งค่า *reduced motion*
- ฟอนต์ (Cormorant Garamond, DM Sans) ติดมากับโปรเจกต์ ไม่ต้องโหลดจาก Google
- มีเฉพาะหน้า Home ภาษาอังกฤษ — หน้า TH และหน้าอื่นยังไม่ได้ทำ

## ขั้นตอนดึงรูปจริงจาก Figma (ทำครั้งเดียวก่อนรัน)

รูปใน `public/images` ต้องดึงจาก Figma ด้วยคำสั่ง:

```bash
npm install
npm run assets   # ดาวน์โหลดรูปลง public/images (ลิงก์ Figma หมดอายุ ~7 วัน)
npm run dev
```

ถ้าลิงก์หมดอายุ ให้ export รูปจาก Figma เองแล้ววางชื่อไฟล์ตามที่ระบุใน `scripts/fetch-assets.mjs`
