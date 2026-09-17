# GGSoma Reseller Bot v2

بوت تليجرام لبيع الاشتراكات الرقمية فوق **GGSoma Partner API** — ثنائي اللغة (عربي/إنجليزي)، بوابات دفع قابلة للتوسيع، محفظة ذرّية آمنة.

```
الزبون ──> بوتك ──> GGSoma API ──> رابط / كود / حساب
        (رصيده عندك)  (رصيدك عندهم)      ربحك = سعرك − تكلفتك
```

**Stack:** Node 20 · grammY · Express · Supabase (Postgres) · يُستضاف على Render/Railway/VPS (يحتاج سيرفر دائم).

---

## 📁 هيكل المشروع

```
src/
├── app.js                    نقطة الدخول (server → webhook → jobs)
├── config/
│   ├── index.js              قراءة .env + التحقق (المكان الوحيد لـ process.env)
│   └── settings.registry.js  ⭐ كل الإعدادات: القيمة الافتراضية + النوع + المجموعة + التسمية بلغتين
├── i18n/
│   ├── index.js              محرّك الترجمة  t(ctx, 'key', vars)
│   └── locales/{ar,en}.js    508 مفتاح لكل لغة (المستخدم + الأدمن)
├── lib/
│   ├── db.js                 Supabase + q()/rows()/one() ترمي الخطأ بدل تجاهله + rpc()
│   ├── settings.js           كاش الإعدادات/النصوص/الإيموجي/المستويات
│   ├── logger.js  fmt.js  html.js
├── services/ggsoma.js        عميل GGSoma + تصنيف الأخطاء + backoff
├── core/                     ⭐ منطق الأعمال (بدون تليجرام)
│   ├── pricing.js  guard.js  catalog.js
│   ├── purchase.js           تدفق الشراء + قفل لكل مستخدم
│   ├── reconciler.js         حسم الطلبات العالقة (يفحص status عند GGSoma)
│   ├── monitor.js  notify.js  referrals.js  health.js
├── payments/                 ⭐ نظام بوابات الدفع
│   ├── index.js              السجل — أضف بوابتك هنا بسطر واحد
│   ├── service.js            openPayment / creditPayment (ذرّي)
│   ├── flow.js               مساعدات مشتركة (askAmount…)
│   └── gateways/
│       ├── _template.js      انسخه لإضافة بوابة جديدة
│       ├── binance.js  cryptomus.js  stars.js
├── bot/
│   ├── index.js              الربط: أوامر + callbacks + إدخال نصي
│   ├── middleware/guard.js   صيانة / حظر / لغة / بوابة الدخول
│   ├── ui/                   kb.js  nav.js  menu.js  input.js (محفوظ بالـ DB)  delivery.js
│   ├── handlers/             index.js  user.js  admin.js  (الإدخال النصي)
│   └── screens/
│       ├── user/             onboarding  shop  account  wallet  misc
│       └── admin/            dashboard  settings  products  providers  pricing  finance  users
├── web/server.js             /health · /tg/<secret> · /hooks/<gateway>/<secret>
└── jobs/                     scheduler.js (كل المهام الدورية)  broadcast.js (طابور البث)

sql/
├── 01_schema.sql             16 جدول + فهارس + RLS — آمن لإعادة التشغيل
├── 02_functions.sql          9 دوال ذرّية
└── 03_seed.sql               مُولَّد من settings.registry.js (npm run gen:seed)

scripts/
├── check-consistency.js      يفشل لو: مفتاح i18n ناقص / إعداد غير مسجّل / شاشة غير معرّفة
├── smoke-import.js           يستورد كل الموديولات
└── gen-seed.js               يولّد 03_seed.sql
tests/                        node --test
docs/                         ARCHITECTURE · RUNBOOK · PAYMENTS · SQL
```

---

## 🚀 التشغيل

```bash
cp .env.example .env          # عبّي القيم
npm install
# Supabase → SQL Editor: شغّل sql/01 ثم 02 ثم 03 بالترتيب
npm start                     # أو npm run dev (watch)
```

**قبل أي commit:** `npm run lint` (= smoke + check + test).

---

## ✅ ما تغيّر عن v1 (ملخّص)

| المشكلة في v1 | الحل في v2 |
|---|---|
| 11 عمود/جدول مستعمل بالكود وغير موجود بالـ SQL | schema كامل مُختبر على Postgres 17 (fresh + re-run) |
| 20 إعداد غير مُدرج بالـ seed → الأدمن لا يستطيع تعديلها | `settings.registry.js` مصدر واحد → seed مُولَّد + لوحة أدمن مُولَّدة + سكربت فحص |
| 104 استعلام تتجاهل الأخطاء بصمت | `q()/rows()/one()` ترمي دائماً |
| i18n موجود لكن 80% من الشاشات hardcoded | 508 مفتاح، كل شاشة (مستخدم + أدمن) عبر `t()` |
| 3 أنظمة إحالة متضاربة + `ref_daily_cap` غير مُطبّق | نظام واحد: عمولة % + مكافأة مراحل، الحدود مُطبّقة داخل SQL |
| لا قفل على زر الشراء (5 ضغطات = 5 طلبات) | قفل in-flight لكل مستخدم |
| المُصالح يعتبر أي طلب موجود = ناجح | يفحص `status` → FAILED يُرجَع، COMPLETED يُسلَّم |
| حالة الإدخال في الذاكرة (تضيع بأي restart) | جدول `input_state` |
| البث يحجز الـ webhook handler | طابور `broadcasts` + job خلفي |
| `WEBHOOK_SECRET='change-me'` + لا فحص لـ secret token | رفض التشغيل بسر ضعيف + `X-Telegram-Bot-Api-Secret-Token` |
| `admin.js` 870 سطر | 7 ملفات مركّزة + `adminScreen()` يفرض الصلاحية |
| `@XBLLT` مكتوب كـ default | إعداد `support_user` فارغ |
| إضافة بوابة دفع = تعديل 6 ملفات | ملف واحد من `_template.js` + سطر في السجل |

**إضافات:** شراء بكمية >1 (stepper) · بحث وفلاتر منتجات للأدمن · تعديل المستويات وشرائح الهامش من البوت · رسالة للمستخدم · إعادة محاولة طلب عالق · تأكيد قبل العمليات الخطرة · تقرير يومي · إشعارات مخزون بلغة المستلم · أوامر ووصف البوت بلغتين.

---

## 🔌 إضافة بوابة دفع جديدة

راجع `docs/PAYMENTS.md`. باختصار:
1. `cp src/payments/gateways/_template.js src/payments/gateways/mygw.js` وعبّي الدوال
2. أضف `pay_mygw` في `settings.registry.js` (مجموعة payments)
3. أضف نصوص `pay.mygw.*` في `ar.js` و `en.js`
4. أضفها لمصفوفة `GATEWAYS` في `payments/index.js`
5. `npm run lint`

زر الشحن، الإدخال، مراجعة الأدمن، الويبهوك — كلها تظهر تلقائياً.

---

## 🔒 ملاحظات أمان
- `SUPABASE_SERVICE_KEY` يتخطى RLS — سيرفر فقط. RLS مُفعَّل على كل الجداول فالمفاتيح العامة لا تقرأ شيئاً.
- `orders.delivery` يحوي بيانات حسابات حقيقية — لا تعرضه من أي client.
- غيّر `WEBHOOK_SECRET` لو تسرّب وحدّث رابط الويبهوك عند Cryptomus.
