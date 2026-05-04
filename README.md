# System Hub Frontend

Frontend สำหรับระบบ `System Hub` สร้างด้วย `React + TypeScript + Vite`

## Stack

- `React 19`
- `TypeScript`
- `Vite 8`
- `Tailwind CSS 4`

## Run Locally

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

ไฟล์สำหรับ production จะถูกสร้างในโฟลเดอร์ `build`

## Admin Access In Production

ไฟล์ `.env` ในเครื่องถูก ignore และจะไม่ถูก push ขึ้น GitHub ดังนั้นถ้า deploy บน Netlify, Vercel หรือ host อื่น ต้องตั้งค่า environment variables ฝั่ง host ก่อน build ด้วย:

```bash
VITE_ADMIN_ALLOWED_EMAILS=admin@example.com
VITE_ADMIN_ALLOWED_UIDS=
VITE_ADMIN_FIREBASE_API_KEY=...
VITE_ADMIN_FIREBASE_AUTH_DOMAIN=...
VITE_ADMIN_FIREBASE_PROJECT_ID=...
VITE_ADMIN_FIREBASE_STORAGE_BUCKET=...
VITE_ADMIN_FIREBASE_MESSAGING_SENDER_ID=...
VITE_ADMIN_FIREBASE_APP_ID=...
VITE_ADMIN_FIREBASE_MEASUREMENT_ID=...
```

ทางเลือกที่ปลอดภัยกว่า allow-list ใน env คือกำหนด Firebase custom claim เป็น `admin=true` หรือ `role=admin` ให้บัญชีแอดมิน แล้ว redeploy/ล็อกอินใหม่เพื่อ refresh token. ถ้าใช้ Firestore document ให้สร้าง `admins/{uid}` หรือ `admins/{email}` แล้วตั้งค่า `active=true` หรือ `role=admin` พร้อม rules ที่อนุญาตให้บัญชีแอดมินอ่านเอกสารนั้นได้.

## Deploy To Netlify

โปรเจกต์นี้มีไฟล์ `netlify.toml` ให้แล้ว โดยตั้งค่าหลักไว้ดังนี้:

- Build command: `npm run build`
- Publish directory: `build`
- Node version: `22`
- SPA fallback: ทุก path จะ fallback กลับไปที่ `index.html`

### วิธี deploy

1. Push โปรเจกต์ขึ้น GitHub, GitLab หรือ Bitbucket
2. ไปที่ Netlify แล้วเลือก `Add new site` > `Import an existing project`
3. เลือก repository นี้
4. Netlify จะอ่านค่าจาก `netlify.toml` อัตโนมัติ
5. กด deploy

ถ้าต้องการ deploy แบบ manual:

1. รัน `npm run build`
2. อัปโหลดโฟลเดอร์ `build` ขึ้น Netlify

## Use Cloudflare With Netlify

แนวทางที่แนะนำสำหรับโปรเจกต์นี้คือ:

- ให้ `Netlify` ทำหน้าที่ build และ host เว็บไซต์
- ให้ `Cloudflare` จัดการ DNS ของโดเมน
- ถ้าจะเปิด Cloudflare proxy ภายหลัง ค่อยเปิดหลังจากโดเมนใน Netlify เป็น `Active` และ SSL พร้อมแล้ว

### ขั้นตอนตั้งค่า

1. Deploy เว็บบน Netlify ให้เรียบร้อยก่อน
2. ใน Netlify ไปที่ `Site configuration` > `Domain management`
3. ถ้าใช้ external DNS อย่าง Cloudflare แนะนำให้ตั้ง `www.example.com` เป็น primary domain ก่อน แล้วค่อยให้ Netlify redirect จาก `example.com`
4. ดูค่าที่ Netlify แนะนำในหน้า `Pending DNS verification`
5. ไปที่ Cloudflare > DNS แล้วเพิ่ม record ให้ตรงกับที่ Netlify แจ้ง

### ค่าที่มักใช้บ่อย

สำหรับโดเมนหลัก (`@`)

- Type: `CNAME`
- Name: `@`
- Target: `apex-loadbalancer.netlify.com`

สำหรับ `www`

- Type: `CNAME`
- Name: `www`
- Target: `<your-site>.netlify.app`

### คำแนะนำเรื่อง Proxy

- ตอนเริ่มตั้งค่า ให้ใช้ `DNS only` ก่อนเพื่อให้ verify domain และออก certificate ผ่าน Netlify ได้ง่าย
- ถ้าต้องการใช้ Cloudflare proxy ภายหลัง ให้เปิดหลังจากสถานะโดเมนบน Netlify เป็น `Active` แล้ว
- ถ้าเปิด proxy บน Cloudflare ภายหลัง ให้ตั้งค่า SSL/TLS เป็น `Full (strict)`
- ถ้า Netlify ขอ CNAME record สำหรับ domain verification เพิ่มเติม ให้ record นั้นเป็น `DNS only` และอย่าเปิด `CNAME flattening for all CNAME records`

## Notes

- ถ้าเปลี่ยนไปใช้ routing ตาม URL ในอนาคต การตั้งค่า SPA fallback ใน `netlify.toml` รองรับไว้แล้ว
- ถ้า Netlify ขอ record เพิ่มเติมสำหรับ verification ให้ยึดค่าจากหน้า `Pending DNS verification` เป็นหลัก
- ถ้าใช้ Cloudflare เป็นผู้ดูแล DNS อยู่แล้ว โดเมนหลักแบบ `@` สามารถใช้ `CNAME` ได้ เพราะ Cloudflare รองรับ CNAME flattening ที่ zone apex
- ถ้าใช้ external DNS Netlify แนะนำให้ใช้ `www` หรือ subdomain อื่นเป็น primary domain มากกว่า apex domain (`example.com`) เพราะได้พฤติกรรมที่เหมาะกับ CDN กว่า

## References

- Netlify external DNS: https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/
- Netlify primary domain guidance: https://docs.netlify.com/manage/domains/manage-domains/manage-multiple-domains/
- Netlify redirects: https://docs.netlify.com/routing/redirects/redirect-options/
- Cloudflare CNAME flattening: https://developers.cloudflare.com/dns/cname-flattening/set-up-cname-flattening/
- Cloudflare CNAME verification troubleshooting: https://developers.cloudflare.com/dns/manage-dns-records/troubleshooting/cname-domain-verification/
- Cloudflare SSL mode: https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/
