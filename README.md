# MOBILOFT — Premium Telegram Mini App

Apple-grade premium Telegram Mini App for **MOBILOFT** smartphone repair shop.
iOS 18 dark glassmorphism aesthetic · silver accents · smooth animations.

## ✨ Features

### Customer View
- **Hero brand card** with MOBILOFT title
- **Order search** by ID (e.g. `MLF-2045`)
- **Beautiful result card** with timeline showing repair progress
- **Status badges** with 8 distinct colors and emojis
- **Promo banner** (admin-configurable)
- **Contact actions**: Telegram, Phone, Maps
- **iOS-style bottom tab bar**

### Admin Panel (Telegram-ID based auth)
- **Dashboard**: 4 stat cards (today, in-progress, ready, delivered)
- **Orders**: searchable, filterable by status, create/edit/delete
- **Banners**: create, edit, delete, enable/disable
- **Settings**: cleanup retention, contact info
- **Auto cleanup**: silently purges old delivered orders on boot

### Premium UI
- Black + graphite + zinc-950 backgrounds
- Silver gradients (#C0C0C0 metallic tones)
- Glassmorphism with backdrop blur
- Animated iOS-style orbs
- Smooth sheet modals from bottom
- Haptic feedback via Telegram WebApp SDK
- Native safe-area handling

## 📁 File Structure
```
mobiloft/
├── index.html        # Single HTML with all UI + styles
├── app.js            # All logic, Supabase + localStorage fallback
├── schema.sql        # Supabase database setup
└── README.md         # This file
```

## 🚀 Quick Start (Demo Mode)

1. Open `index.html` in any modern browser — it works immediately with seeded demo data via `localStorage`.
2. By default, the user is logged in as Super Admin so you can test the admin panel.
3. Search order `MLF-2045` to see the result card with timeline.

## 🔌 Production Setup (Real Supabase)

1. Create a Supabase project at https://supabase.com
2. Open SQL Editor and run `schema.sql`
3. Copy your **Project URL** and **anon key** from Supabase Dashboard → Settings → API
4. Edit `app.js` line 17-18:
   ```js
   const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
   const SUPABASE_KEY = 'YOUR-ANON-KEY';
   ```
5. Re-deploy — the app will automatically switch to Supabase mode.

## 🤖 Telegram Bot Setup

1. Open [@BotFather](https://t.me/BotFather) and create a bot (or use existing)
2. Set the WebApp URL:
   ```
   /setmenubutton
   → @your_bot
   → Menu Button text: "MOBILOFT"
   → URL: https://your-domain.com/index.html
   ```
3. Or use `/newapp` for a full Mini App launch.
4. Bot token (already configured): `8622408900:AAEmvk_Kg_1e6TcWCX_KsOYhTdSRzLow5uU`
5. Super Admin Telegram ID: `8544023815`

## 👤 Admin Authorization

Admins are stored in the `admins` table. The first row is the Super Admin (Telegram ID `8544023815`). To add more admins, run:

```sql
insert into public.admins (telegram_id, role, name)
values ('TELEGRAM_ID_HERE', 'admin', 'Admin Name');
```

Roles:
- `super_admin` — full access
- `admin` — full access (reserved for future role-based limits)

The app reads the current user's Telegram ID via `Telegram.WebApp.initDataUnsafe.user.id` and looks it up in the admins table.

## 🗑️ Data Cleanup

The app automatically removes **delivered** orders older than the configured retention (default 30 days) on every boot. You can also trigger it manually from the admin Settings panel → "Eski ma'lumotlarni tozalash".

The retention period is configurable in **Admin → Settings → Tozalash sozlamalari**.

## 🎨 Design Tokens

| Token | Value |
|---|---|
| Background | `#000` + radial silver glow |
| Cards | `bg-white/5` + `backdrop-blur-28` |
| Borders | `border-white/10` (silver gradient overlay) |
| Accent | `#C0C0C0` (silver) |
| Text | `#f5f5f7` (silver-100) |
| Muted | `#86868b` (silver-400) |
| Radius | 24-32px (iOS-style) |

## 📱 Status Badges

| Key | Label | Emoji | Color |
|---|---|---|---|
| `qabul` | Telefon qabul qilindi | 📥 | Blue |
| `navbat` | Navbatda turibdi | ⏳ | Amber |
| `korib` | Ko'rib chiqilmoqda | 🔍 | Purple |
| `zapchas` | Zapchas kelishi kutilyapti | 🚚 | Cyan |
| `tamil` | Ta'mirlanmoqda | 🔧 | Orange |
| `tekshir` | Tekshirilmoqda | ✅ | Silver |
| `tayyor` | Tayyor bo'ldi | 🎉 | Green |
| `topshirildi` | Egasiga topshirildi | 📦 | Green |

## 🌐 Deployment

You can deploy this on any static host:

- **Vercel**: `vercel deploy` (no build needed)
- **Netlify**: drag-drop the folder
- **Cloudflare Pages**: connect the folder
- **GitHub Pages**: push to `gh-pages` branch

> ⚠️ **Important**: Telegram Mini Apps require HTTPS. Use Vercel/Netlify (auto-HTTPS).

## 🛠️ Tech Stack

- Vanilla HTML/CSS/JS (no build step)
- Tailwind via CDN
- Telegram WebApp SDK
- Supabase JS REST (direct fetch)
- localStorage fallback for demo

## 📞 Contact

- Telegram: [@mobiloft_admin](https://t.me/mobiloft_admin)
- Phone: +998 90 123 45 67
- Address: Toshkent, Chilonzor

---

**Crafted with MOBILOFT © 2026** · Premium Repair Tracker
