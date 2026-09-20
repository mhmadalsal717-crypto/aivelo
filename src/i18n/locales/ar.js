// ============================================================
//  العربية — كل نص يظهر للمستخدم أو للأدمن
//  مرتّب حسب الشاشة. أي مفتاح هون لازم يكون له نظير بـ en.js
//  (سكربت npm run check بيتأكد).
// ============================================================
export default {
  // ---------- القائمة الثابتة ----------
  menu: {
    products: '🛒 المنتجات',
    profile:  '👤 ملفي',
    invites:  '🎁 الدعوات',
    voucher:  '💳 شحن بكود',
    topup:    '💰 شحن رصيد',
    help:     '❓ المساعدة',
    policy:   '🛡 سياسة البوت',
    lang:     '🌐 اللغة',
    admin:    '⚙️ لوحة التحكم',
  },

  // ---------- أزرار عامة ----------
  btn: {
    close: '✖️ إغلاق', back: '« رجوع', home: '🏠 الرئيسية', cancel: '❌ إلغاء',
    services: '« الخدمات', plans: '« الخطط', prev: '‹ السابق', next: 'التالي ›',
    confirm: '✅ تأكيد', yes: '✅ نعم', no: '❌ لا', retry: '🔄 إعادة', topup: '💰 شحن رصيد',
    orders: '📋 طلباتي', browse: '🛒 تصفّح المنتجات', edit: '✏️ تعديل', delete: '🗑 حذف',
    enable: '🟢 تفعيل', disable: '🔴 إطفاء', refresh: '🔄 تحديث',
  },

  // ---------- عام ----------
  sys: {
    maintenance: '🛠 البوت تحت الصيانة حالياً. جرّب بعد شوي.',
    banned:      '🚫 حسابك محظور. تواصل مع الدعم.',
    error:       '⚠️ صار خلل. جرّب مرة تانية.',
    loading:     '⏳ لحظة…',
    unknown:     'أمر غير معروف. استعمل الأزرار تحت.',
    notNumber:   '❌ أرسل رقماً فقط، مثل <code>{ex}</code>',
    saved:       '✅ تم الحفظ.',
    updated:     '✅ تم التحديث.',
    cancelled:   'تم الإلغاء.',
    inputExpired:'⌛ انتهت مهلة الإدخال. ابدأ من جديد.',
    working:     '⏳ جاري التنفيذ…',
    denied:      '⛔️ غير مصرّح.',
    yes: 'نعم', no: 'لا', on: '🟢 مفعّل', off: '🔴 مطفأ', none: '—',
  },

  // ---------- الترحيب / اللغة ----------
  welcome: {
    default: 'أهلاً فيك بمتجرنا 👋\n\nاشتراكات رقمية بتسليم فوري وأسعار منافسة.\nاختر من القائمة تحت للبدء.',
    cmdStart: 'القائمة الرئيسية', cmdMenu: 'فتح القائمة', cmdLang: 'تغيير اللغة · Change language',
    shortDesc: 'اشتراكات رقمية بتسليم فوري',
    longDesc:  'متجر اشتراكات رقمية — تسليم فوري وأسعار منافسة.\nاضغط «ابدأ» للتصفّح.',
  },
  lang: {
    title: '🌐 <b>اللغة</b>', pick: 'اختر لغة البوت:', current: 'اللغة الحالية: <b>{name}</b>',
    done: '✅ تم تغيير اللغة إلى العربية.',
    pickFirst: 'Welcome! 👋 Please choose your language.\n\nمرحباً بك! 👋 اختر لغتك المفضّلة.',
  },

  // ---------- بوابة الدخول ----------
  join: {
    text:    'مرحباً بك! 👋\n\nلاستخدام البوت يجب الانضمام إلى قناتنا/مجموعتنا أولاً.\n\n👇 اضغط الأزرار للانضمام ثم «تحقق الآن».',
    group:   '💬 انضم للمجموعة', channel: '📢 انضم للقناة', verify: '✅ تحقق الآن',
    missing: 'لسه ما انضممت للكل. اشترك وجرّب مرة تانية.',
  },
  hv: {
    title: '🤖 <b>تحقق سريع</b>\n\nاختر الرقم <b>{n}</b> من الأزرار تحت:',
    wrong: 'غلط. جرّب مرة تانية.',
  },

  // ---------- المتجر ----------
  shop: {
    pick:      'اختر الخدمة التي تريدها:',
    empty:     '📭 الكتالوج فاضي حالياً. جرّب بعد شوي.',
    available: '🟢 المتاح الآن',
    availTitle:'🟢 <b>المتاح الآن</b> · {count} منتج',
    availNone: '🟢 <b>المتاح الآن</b>\n\n📭 ما في شي متوفّر هلق. جرّب بعد شوي.',
    plans:     '<b>اختر الخطة المطلوبة:</b>',
    noPlans:   '📭 ما في خطط متاحة بهالقسم.',
    gone:      '❌ المنتج ما عاد متوفّر.',
  },
  item: {
    price:    '{emoji} <b>{price}</b>',
    duration: '{emoji} المدة: <b>{days}</b> يوم',
    warranty: '{emoji} الضمان: <b>{days}</b> يوم',
    delivery: '📥 التسليم: {type} · فوري',
    instr:    'التعليمات المهمة',
    buy:      '🛒 شراء',
    inStock:  '🟢 متوفّر', low: '🟡 متبقّي {n} فقط', out: '🔴 غير متوفّر حالياً',
    adminEdit:'✏️ تعديل المنتج',
    qty:      '🔢 الكمية: <b>{n}</b>',
    qtyPick:  'اختر الكمية:',
  },
  deliv: { link: 'رابط تفعيل', coupon: 'كود', account: 'حساب جاهز' },

  // ---------- تأكيد الشراء ----------
  confirm: {
    title:   '🧾 <b>ملخّص الطلب</b>',
    product: 'المنتج: <b>{name}</b>', qty: 'الكمية: {n}',
    unit:    'سعر الوحدة: <b>{price}</b>', total: 'الإجمالي: <b>{price}</b>',
    balance: '{emoji} رصيدك: {balance}',
    after:   'الرصيد بعد الشراء: <b>{balance}</b>',
    short:   '❌ <b>رصيد غير كافٍ</b>\nناقصك <b>{missing}</b>',
    yes:     '✅ تأكيد الشراء',
    notFound:'❌ المنتج غير موجود.',
  },

  // ---------- نتيجة الطلب ----------
  order: {
    working:  '⏳ <b>جاري تنفيذ طلبك…</b>\n{rule}\nلا تغلق المحادثة.',
    done:     '✅ <b>تم التنفيذ بنجاح</b>',
    pending:  '⏳ <b>طلبك قيد التنفيذ</b>\n{rule}\nرح يوصلك التسليم تلقائياً خلال دقايق. رصيدك محجوز.',
    failed:   '❌ <b>تعذّر التنفيذ</b>\n{rule}\n{reason}',
    busy:     'عندك طلب قيد التنفيذ الآن. انتظر لحظة.',
    // أسباب الفشل
    maint:    'الخدمة بصيانة مؤقتة عند المزوّد. جرّب بعد شوي — ما انخصم منك شي.',
    gone:     'المنتج مو متوفّر حالياً.',
    paused:   'البيع موقوف مؤقتاً على هالمنتج.',
    noStock:  'المنتج نفد من المخزون.',
    badQty:   'الكمية غير صالحة.',
    noBalance:'رصيدك ما بيكفي. المطلوب {amount}',
    refunded: 'رجّعنالك رصيدك.',
    accountIssue: 'خلل مؤقت بالنظام. رجّعنالك رصيدك، جرّب بعد شوي.',
    genericFail:  'صار خطأ بالطلب. رجّعنالك رصيدك كامل.',
    reconFail:    'تعذّر تنفيذ طلبك — رجّعنالك رصيدك كامل.',
    err: {
      OUT_OF_STOCK: 'المنتج نفد من المخزون.', PRODUCT_NOT_FOUND: 'المنتج ما عاد متوفّر.',
      PRODUCT_UNAVAILABLE: 'المنتج معطّل مؤقتاً.', PRODUCT_NOT_ALLOWED: 'المنتج غير متاح.',
      INVALID_QUANTITY: 'الكمية غير صالحة.', UNSUPPORTED_DELIVERY_TYPE: 'نوع التسليم غير مدعوم.',
    },
  },
  delivery: {
    link:    '🔗 <b>رابط التفعيل:</b>', code: '🎟 <b>الكود:</b>', account: '🔐 <b>بيانات الحساب:</b>',
    warnAcc: '⚠️ غيّر كلمة السر فوراً واحتفظ فيها بمكان آمن.',
    notes:   '📝 {text}', orderRef: '{emoji} <code>{code}</code>',
  },

  // ---------- الملف ----------
  profile: {
    title: '{emoji} <b>ملفي</b>',
    id: '🆔 معرّفك: <code>{id}</code>', name: '👤 الاسم: {name}',
    balance: '{emoji} الرصيد: <b>{balance}</b>',
    tier: '{emoji} المستوى: <b>{name}</b> · خصم {pct}%',
    purchases: '🛒 إجمالي المشتريات: <b>{n}</b>', pending: '⏳ قيد التنفيذ: <b>{n}</b>',
    spent: '💸 المصروف: <b>{amount}</b>', refEarned: '🎁 أرباح الإحالة: <b>{amount}</b>',
    since: '📅 تاريخ التسجيل: {date}',
    btnOrders: '📋 طلباتي', btnTier: '🏅 حالتي', btnLedger: '🏦 كشف المحفظة',
    btnWithdraw: '💰 طلب سحب', btnWdProfile: '🧾 ملف السحب', btnWdList: '📄 طلبات السحب',
    btnNotif: '{icon} إشعارات المخزون',
  },
  tier: {
    title: '{emoji} <b>الحالات</b>', current: 'الحالة الحالية: {emoji} <b>{name}</b> · خصم {pct}%',
    progress: '<b>التقدّم للمستوى التالي:</b>', of: '{spent} / {need}', remaining: 'المتبقّي: <b>{amount}</b>',
    next: 'المستوى التالي: {emoji} <b>{name}</b> · خصم {pct}%', max: '🎉 وصلت لأعلى مستوى.',
    all: '🪜 كل المستويات', allTitle: '🪜 <b>كل المستويات</b>',
    row: '{emoji} <b>{name}</b> — من {min} · خصم {pct}%',
  },
  orders: {
    title: '📋 <b>طلباتي</b>', none: 'ما عندك طلبات بعد.',
    row: '{icon} <b>{name}</b>\n    {amount} · {date}', view: '📄 {name}',
    notFound: '❌ الطلب غير موجود.',
    pendingNote: '⏳ قيد التنفيذ — رح يوصلك التسليم تلقائياً.',
    refundedNote: '↩️ تم إرجاع المبلغ لرصيدك.',
    reviewNote: '🔴 قيد المراجعة — تواصل مع الدعم.',
  },
  ledger: {
    title: '🏦 <b>كشف المحفظة</b>', balance: '{emoji} الرصيد: <b>{balance}</b>', none: 'ما في حركات بعد.',
    type: { DEPOSIT: 'إيداع', PURCHASE: 'شراء', REFUND: 'إرجاع', REFERRAL: 'إحالة', WITHDRAW: 'سحب', ADJUST: 'تعديل' },
  },
  notif: { on: '🔔 تم تفعيل إشعارات توفّر المنتجات.', off: '🔕 تم إيقاف إشعارات توفّر المنتجات.', label: 'إشعارات المخزون' },

  // ---------- السحب ----------
  wd: {
    profileTitle: '🧾 <b>ملف السحب</b>', hasId: 'Binance ID: <code>{id}</code>',
    noId: 'لا يوجد ملف سحب محفوظ بعد.\nاحفظ Binance ID قبل إنشاء طلب سحب.',
    editBtn: '✏️ تعديل Binance ID', editPrompt: '✏️ ابعت Binance ID تبعك (أرقام فقط):',
    badId: '❌ معرّف غير صالح.', savedId: '✅ تم حفظ Binance ID: <code>{id}</code>',
    newTitle: '💰 <b>طلب سحب</b>', min: 'أقل مبلغ سحب: <b>{min}</b>', yourBal: 'رصيدك: <b>{balance}</b>',
    prompt: 'ابعت المبلغ يلي بدك تسحبه:', tooLow: '❌ أقل مبلغ سحب {min}',
    created: '✅ تم إنشاء طلب سحب بقيمة <b>{amount}</b>.\nالمبلغ محجوز لحين المعالجة.',
    noBalance: '❌ رصيدك ما بيكفي.', needId: '❌ احفظ Binance ID أولاً.',
    listTitle: '📄 <b>طلبات السحب</b>', listNone: 'لا توجد طلبات سحب حتى الآن.',
    paid: '✅ تم تحويل <b>{amount}</b> على Binance ID تبعك.',
    rejected: '❌ تم رفض طلب السحب. رجّعنا <b>{amount}</b> لرصيدك.\n{note}',
  },

  // ---------- الشحن ----------
  topup: {
    title: '{emoji} <b>شحن رصيد</b>', balance: 'رصيدك الحالي: <b>{balance}</b>',
    pick: 'اختر طريقة الدفع المناسبة لك:', none: '⚠️ ما في طرق دفع مفعّلة. تواصل مع الأدمن.',
    log: '🧾 سجل الشحن', logTitle: '🧾 <b>سجل الشحن</b>', logNone: 'ما في دفعات بعد.',
    amountTitle: '<b>أدخل مبلغ الإيداع (USD)</b>', amountMin: 'الحد الأدنى: {min} USD', amountMax: 'الحد الأقصى: {max} USD',
    amountHint: 'أرسل أرقاماً فقط، مثال 20',
    amountRange: '❌ المبلغ لازم يكون بين {min} و {max}.',
    notConfigured: '⚠️ {name} مو مضبوط بعد.', unknownMethod: '❌ طريقة دفع غير معروفة.',
    credited: '✅ تم شحن <b>{amount}</b> لحسابك.\n💰 رصيدك: <b>{balance}</b>',
    failed: '❌ فشلت عملية الدفع أو انتهت مهلتها.',
    underpaid: '⚠️ المبلغ المستلم أقل من المطلوب. تواصل مع الدعم.',
    sessionEnded: '❌ الجلسة انتهت. ابدأ عملية شحن جديدة.',
  },
  pay: {
    binance: {
      name: 'Binance Pay', btn: '💠 الدفع عبر Binance',
      instructions: '<b>Binance Pay</b>\n\n1) افتح Pay ← Binance ← تحويل\n2) أرسل أي مبلغ USDT إلى معرّف Binance Pay هذا\n3) انسخ رقم العملية (TxID) من الإيصال\n4) الصق رقم العملية هنا\n\n<b>معرّف Binance Pay</b>\n<code>{payId}</code>\n\nالصق رقم عملية (TxID) الآن. تجده في Pay ← Binance ← سجل العمليات ← افتح التحويل ← انسخ Transaction ID / Order ID.\n\nتنتهي هذه الجلسة خلال {minutes} دقيقة.',
      badTx: '❌ رقم العملية مو بالشكل الصحيح. الصقه من إيصال Binance وجرّب مرة تانية.',
      dupTx: '❌ رقم العملية هذا مستعمل من قبل.',
      checking: '⏳ جارٍ التحقق من دفعتك... 00:0{seconds}',
      notFoundYet: '⏳ لسا ما ظهرت هذه العملية بالتحقق الآلي.\nتم تحويل طلبك لفريق الدعم وح تتأكد خلال دقائق.\nلو حابب، تأكد من رقم العملية (TxID) من إيصالك وجرّب تلصقه مرة ثانية.',
      received: '✅ وصلنا رقم العملية.\n{rule}\n🔢 <code>{tx}</code>\n\nرح نتحقّق ونضيف الرصيد. عادة خلال دقائق.',
      approved: '✅ تم تأكيد تحويلك.\n💵 انضاف <b>{amount}</b>\n💰 رصيدك: <b>{balance}</b>',
      rejected: '❌ ما قدرنا نتأكد من تحويلك. تواصل مع الدعم مع رقم العملية.',
    },
    cryptomus: {
      name: 'Cryptomus', btn: '⬛ الدفع بالعملات الرقمية اي شبكة',
      open: '🔗 فتح صفحة الدفع',
      text: 'ادفع <b>USD {amount}</b> عبر صفحة الدفع في Cryptomus.\nافتح الرابط أدناه وأكمل الدفع.\n\n<i>الرصيد بينضاف تلقائياً بعد التأكيد على الشبكة.</i>',
      unavailable: '❌ الدفع بالعملات الرقمية مو متاح حالياً. جرّب طريقة تانية.',
      createFail: '❌ تعذّر إنشاء صفحة الدفع. جرّب بعد شوي أو اختر طريقة تانية.',
    },
    nowpayments: {
      name: 'NOWPayments', btn: '⬛ الدفع بالعملات الرقمية اي شبكة',
      open: '🔗 فتح صفحة الدفع',
      text: 'ادفع <b>USD {amount}</b> عبر صفحة الدفع في NOWPayments.\nافتح الرابط أدناه واختر العملة الرقمية وأكمل الدفع.\n\n<i>الرصيد بينضاف تلقائياً بعد التأكيد على الشبكة.</i>',
      unavailable: '❌ الدفع بالعملات الرقمية مو متاح حالياً. جرّب طريقة تانية.',
      createFail: '❌ تعذّر إنشاء صفحة الدفع. جرّب بعد شوي أو اختر طريقة تانية.',
    },
    stars: {
      name: 'Telegram Stars', btn: '⭐️ الدفع عبر Telegram Stars',
      title: '⭐️ <b>Telegram Stars</b>', rate: 'المعدل: <b>1 ⭐️ = {rate} USDT</b>', range: 'النطاق المسموح: {min}–{max} نجمة',
      intro: 'ادفع نجوماً داخل تلغرام وبينضاف رصيدك فوراً.',
      pack: '{n} ⭐️ · +{usd} USDT', custom: '✏️ إدخال كمية',
      customTitle: '⭐️ <b>إدخال كمية</b>', customPrompt: 'أرسل عدد النجوم، مثل <code>250</code>',
      customRange: '❌ عدد النجوم لازم يكون بين {min} و {max}.',
      invoiceTitle: 'شحن المحفظة', invoiceDesc: '{n} نجمة → {usd} USDT رصيد محفظة',
      invoiceFail: '❌ تعذّر إنشاء فاتورة النجوم. جرّب مرة تانية.',
      expired: 'انتهت صلاحية الجلسة. ابدأ من جديد.', tempErr: 'خطأ مؤقت، جرّب مرة تانية.',
      credited: '✅ <b>تم الشحن</b>\n{rule}\n⭐️ {n} نجمة → <b>{amount}</b>\n💰 رصيدك: <b>{balance}</b>',
      creditFail: '⚠️ وصل الدفع بس صار خلل بالشحن. تواصل مع الدعم — فلوسك محفوظة.',
    },
    methodLabel: { CRYPTOMUS: '⬛ عملات رقمية', NOWPAYMENTS: '⬛ عملات رقمية', STARS: '⭐️ نجوم', BINANCE_PAY: '💠 Binance' },
  },

  // ---------- القسائم ----------
  voucher: {
    title: 'شحن بكود', prompt: 'الرجاء إرسال كود الشحن — بانتظارك:', request: '💬 طلب كود شحن',
    ok: '✅ تم شحن <b>{amount}</b>\n💰 رصيدك: <b>{balance}</b>',
    invalid: '❌ الكود غير صالح أو مستعمل من قبل.',
  },

  // ---------- الدعوات ----------
  inv: {
    menu: 'اختر إحدى الخيارات أدناه للحصول على دعوات ومكافآت مجانية.',
    btnLink: '🔗 رابط الدعوة', btnStats: '📊 إحصائيات الدعوات', btnClaim: '💰 اصرف مكافأتي', btnShare: '📤 مشاركة الرابط',
    linkTitle: '<blockquote>🔗 رابط الدعوة الخاص بك:</blockquote>',
    linkPitch: '<i>شارك هذا الرابط واربح <b>${reward}</b> مقابل كل <b>{per}</b> أشخاص ينضمون ويفعّلون البوت، بالإضافة إلى <b>{pct}%</b> من كل عملية شراء يقومون بها! 🎉</i>',
    rules: '⚠️ <b>القواعد</b>\n• بحد أقصى {daily} دعوات صالحة يومياً و{total} إجمالاً.\n• يُحتسب فقط المستخدمون الحقيقيون الذين ينضمون ويفعّلون البوت.\n• الحسابات الوهمية أو المتعددة أو المؤتمتة = إزالة المكافآت وحظر الحساب.\n📧 الدعم: {support}',
    statsTitle: '<blockquote>📊 إحصائيات الدعوات الخاصة بك:</blockquote>',
    stTotal: '👥 إجمالي المسجلين: <b>{n}</b>', stJoin: '🕐 بانتظار الانضمام: <b>{n}</b>',
    stHuman: '🤖 بانتظار التحقق البشري: <b>{n}</b>', stActive: '📱 بانتظار التفاعل مع البوت: <b>{n}</b>',
    stReady: '✅ المؤهلون لدفعة المكافآت: <b>{n}</b>', stPaid: '🎊 الدعوات التي تم مكافأتها: <b>{n}</b>',
    stEarned: '🎉 إجمالي الرصيد المكتسب: <b>{amount}</b>',
    stFoot: '📌 كل <b>{per}</b> دعوات مؤهّلة = <b>${reward}</b>.',
    claimOk: '🎉 تم صرف <b>{amount}</b> عن <b>{n}</b> دعوة مؤهّلة.\nرصيدك الآن: <b>{balance}</b>',
    claimNone: 'لسه ما وصلت للحد. بدك <b>{need}</b> دعوة مؤهّلة إضافية.',
    claimCap: 'وصلت للحد الأقصى من الدعوات المكافَأة.',
    newJoin: '{emoji} انضم مستخدم جديد عبر رابطك.',
    commission: '🎁 وصلتك عمولة إحالة <b>{amount}</b> من شراء أحد مدعوّيك.',
  },

  // ---------- المساعدة / السياسة ----------
  help:   { title: 'الدعم والمساعدة', contact: '💬 تواصل مع الدعم',
            default: '<b>الدعم والمساعدة</b>\n\nإذا كنت تحتاج المساعدة، تواصل مع خدمة العملاء {user}.\nسيتم الرد على طلبك في أقرب وقت.' },
  policy: { title: 'سياسة البوت',
            default: '<b>1. سياسة الاسترداد</b>\nلا يمكن استرداد الأموال بعد الإيداع، إلا إذا أودعت ولم تشترِ أي منتج.\n\n<b>2. سياسة الضمان</b>\nنلتزم بضمان المنتجات المذكور فيها ضمان: استبدال فوري أو إرجاع المبلغ كرصيد.\n\n<b>3. الأرصدة المجانية</b>\nلا يمكن سحب الأموال الناتجة عن أكواد الشحن أو مكافآت الإحالة.' },

  // ---------- إشعارات المخزون ----------
  stock: {
    newHead: 'تمت إضافة منتج جديد!', restockHead: 'تمت إضافة مخزون جديد!',
    added: 'تمت الإضافة: {n}', now: 'المخزون الحالي: {n}', hurry: '⚡ اسرع الآن لشراء الخدمة!',
    buyNow: 'شراء الآن',
  },

  // ============================================================
  //  لوحة التحكم
  // ============================================================
  admin: {
    title: '⚙️ <b>لوحة التحكم</b>',
    stats: { users: '👥 المستخدمين: <b>{n}</b>', wd: '📤 طلبات سحب: <b>{n}</b>', stuck: '⏳ طلبات عالقة: <b>{n}</b>',
             bp: '💠 تحويلات Binance: <b>{n}</b>', paused: '⏸ منتجات موقوفة: <b>{n}</b>', health: '{icon} GGSoma: {state}' },
    healthy: 'شغّال', unhealthy: 'متوقف ({reason})',
    btn: {
      stats: '📊 الإحصائيات', pricing: '💵 التسعير', settings: '⚙️ الإعدادات', texts: '📝 النصوص',
      emoji: '😀 الإيموجي', providers: '🗂 المزوّدين', products: '📦 المنتجات', tiers: '🏅 المستويات',
      wds: '📤 السحوبات{badge}', stuck: '⏳ الطلبات العالقة{badge}', pays: '💠 تحويلات Binance{badge}',
      paused: '⏸ موقوفة{badge}', findUser: '👤 بحث مستخدم', voucher: '🎟 إنشاء قسيمة',
      broadcast: '📣 بث رسالة', sync: '🔄 مزامنة الآن', margins: '💵 شرائح الهامش', payinfo: '💳 معلومات الدفع',
    },

    // الإحصائيات
    statsTitle: '📊 <b>الإحصائيات — آخر 30 يوم</b>',
    statsBody: '🛒 الطلبات: <b>{orders}</b>\n💵 المبيعات: <b>{rev}</b>\n💸 التكلفة: <b>{cost}</b>\n📈 الربح: <b>{profit}</b>\n📐 هامش فعلي: <b>{pct}%</b>\n{rule}\n🕐 مبيعات اليوم: <b>{dayRev}</b> ({dayN} طلب)\n🏦 أرصدة الزبائن عندك: <b>{held}</b>\n👥 مستخدمين جدد (7 أيام): <b>{newUsers}</b>\n💼 رصيدك عند GGSoma: <b>{gg}</b>',
    dailyReport: '📊 <b>تقرير اليوم</b>\n{rule}\n🛒 طلبات: <b>{orders}</b>\n💵 مبيعات: <b>{rev}</b>\n📈 ربح: <b>{profit}</b>\n💰 إيداعات: <b>{deposits}</b>\n👥 مستخدمين جدد: <b>{newUsers}</b>\n⏳ عالق: <b>{stuck}</b>\n💼 رصيد GGSoma: <b>{gg}</b>',

    // الإعدادات
    settingsTitle: '⚙️ <b>الإعدادات</b>\n{rule}\nاختر مجموعة:',
    groupTitle: '{icon} <b>{name}</b>\n{rule}\nاضغط أي إعداد لتعديله. المنطقية بتنعكس فوراً.',
    settingEdit: '✏️ <b>{label}</b>\n{rule}\nالقيمة الحالية: <code>{value}</code>\nالافتراضي: <code>{def}</code>\n\nابعت القيمة الجديدة، أو <code>-</code> للرجوع للافتراضي:',
    settingNotFound: 'إعداد غير موجود.',

    // النصوص
    textsTitle: '📝 <b>النصوص</b>\n{rule}\n⚠️ = فاضي (بيستعمل النص الافتراضي).\nالنصوص بتدعم HTML. {user} بينستبدل بيوزر الدعم.',
    textEdit: '✏️ <b>{label}</b> ({lang})\n{rule}\n<b>الحالي:</b>\n{current}\n\n{rule}\nابعت النص الجديد (HTML مسموح)، أو <code>-</code> للافتراضي:',
    textEmpty: '<i>فاضي — الافتراضي مستعمل</i>',

    // الإيموجي
    emojiTitle: '😀 <b>الإيموجي</b>\n{rule}\n{state} البريميوم — بدّله من الإعدادات ← المظهر.\n⭐️ = عليه إيموجي مخصص.\n<blockquote>الإيموجي المخصص بيشتغل بس إذا صاحب البوت عنده Telegram Premium. المستخدم العادي بيشوف البديل.</blockquote>',
    emojiEdit: '😀 <b>{label}</b>\n{rule}\nالبديل: {fallback}\nالمخصص: <code>{custom}</code>\n\nابعت <b>معرّف الإيموجي المخصص</b> (أرقام)، أو <code>-</code> للحذف.',
    emojiSaved: '✅ تم ربط الإيموجي المخصص.', emojiCleared: '✅ تم حذف الإيموجي المخصص.',

    // المنتجات
    prodsTitle: '📦 <b>المنتجات</b>\n{rule}\n👁 ظاهر · 🚫 مخفي · ⏸ موقوف · 🗑 محذوف عندهم\nبين قوسين = ربحك للوحدة.',
    prodFilter: { all: 'الكل', paused: '⏸ موقوفة', manual: '✏️ سعر يدوي', hidden: '🚫 مخفية', out: '🔴 نافدة' },
    prodSearch: '🔍 بحث', prodSearchPrompt: '🔍 ابعت جزء من اسم المنتج:', prodSearchNone: 'ما لقيت منتجات.',
    prodTitle: '📦 <b>{name}</b>',
    prodBody: '<code>{slug}</code>\n💸 تكلفتك: <b>{cost}</b>{catalog}\n💵 سعر البيع: <b>{price}</b>{manual}\n📈 الربح: <b>{profit}</b> ({pct}%)\n🏷 هامش خاص: {markup}\n📊 المخزون: {stock}\n{visibility}{deleted}\n{paused}',
    prodCatalog: '  <i>(سعرهم المعلن {price})</i>', prodManual: ' <i>(يدوي)</i>', prodMarkupGlobal: 'العام',
    prodStockIn: '🟢 {n}', prodStockOut: '🔴 نافد', prodVisible: '👁 ظاهر', prodHidden: '🚫 مخفي',
    prodDeleted: ' · 🗑 محذوف من كتالوجهم', prodPaused: '⏸ <b>البيع موقوف</b> — {reason}',
    prodDetails: '{rule}\n📄 الوصف: {desc}\n📋 التعليمات: {instr}\n🕐 آخر سحب تفاصيل: {synced}',
    prodFromGG: '🔄 من GGSoma', prodOverride: '✏️ تجاوز يدوي', prodNever: 'ما انسحبت بعد',
    prodBtn: { price: '💵 سعر يدوي', markup: '🏷 هامش خاص', hide: '🚫 إخفاء', show: '👁 إظهار',
               resume: '▶️ استئناف البيع', pause: '⏸ إيقاف البيع', desc: '📄 الوصف', instr: '📋 التعليمات',
               view: '👀 عرض كزبون', pullDetails: '⬇️ سحب التفاصيل الآن' },
    prodSet: {
      price:  'السعر اليدوي (رقم، أو <code>-</code> للرجوع للحساب التلقائي)',
      markup: 'الهامش الخاص % (رقم، أو <code>-</code> لاستعمال الهامش العام)',
      desc:   'تجاوز الوصف (HTML مسموح، أو <code>-</code> للرجوع لنص GGSoma)',
      instr:  'تجاوز التعليمات (أو <code>-</code> للرجوع لنص GGSoma)',
    },
    prodToggled: '{state}: {name}', prodResumed: '▶️ تم استئناف البيع.\n<i>لو الهامش لسّه تحت الحد، المزامنة رح توقفه مرة تانية.</i>',
    prodPausedManual: '⏸ تم إيقاف البيع يدوياً.', prodDetailsPulled: '✅ تم سحب التفاصيل.',
    prodNotFound: 'منتج غير موجود.',

    // المزوّدين
    provsTitle: '🗂 <b>المزوّدين</b>\n{rule}\n👁 ظاهر · 🙈 مخفي\n▬ سطر كامل · ▪ نص سطر\n\nاضغط مزوّد لتعديله:',
    provsNone: '📭 ما في مزوّدين. شغّل المزامنة أول.',
    provTitle: '🗂 <b>{name}</b>',
    provBody: '🔤 اسم GGSoma: <code>{ggName}</code>\n✏️ الاسم المعروض: {display}\n😀 الإيموجي: {emoji}\n🔢 الترتيب: <b>{order}</b>\n👁 الظهور: <b>{visible}</b>\n↔️ العرض: <b>{width}</b>\n📦 منتجات: <b>{products}</b> ({inStock} متوفّر)',
    provSame: '— نفس الأصلي', provNoEmoji: '— ما في', provFull: 'سطر كامل', provHalf: 'نص سطر',
    provBtn: { name: '✏️ غيّر الاسم', emoji: '😀 غيّر الإيموجي', order: '🔢 غيّر الترتيب',
               hide: '🙈 إخفاء', show: '👁 إظهار', full: '▬ سطر كامل', half: '▪ نص سطر', products: '📦 منتجاته' },
    provSet: {
      name:  '✏️ أرسل الاسم المعروض (40 حرف كحد أقصى).\nأرسل <code>-</code> للرجوع لاسم GGSoma.\n<i>المزامنة ما بتدهس تعديلك.</i>',
      emoji: '😀 أرسل الإيموجي الجديد (إيموجي واحد).\nأرسل <code>-</code> لحذفه.',
      order: '🔢 أرسل رقم الترتيب. الأصغر بيطلع أول. مثال: <code>10</code>',
    },
    provNameLong: '❌ الاسم طويل. 40 حرف كحد أقصى.', provBadEmoji: '❌ أرسل إيموجي واحد، أو <code>-</code> للحذف.',
    provNotFound: '❌ مزوّد غير موجود.',

    // المستويات
    tiersTitle: '🏅 <b>المستويات</b>\n{rule}\n{rows}\n\n<i>الصيغة للتعديل: <code>الاسم الإيموجي الحد الخصم%</code>\nمثال: <code>ذهبي 🥇 1000 3</code></i>',
    tierRow: '{emoji} <b>{name}</b> — من {min} · خصم {pct}%',
    tierAdd: '➕ إضافة مستوى', tierEditPrompt: '✏️ ابعت: <code>الاسم الإيموجي الحد الخصم%</code>\nأو <code>حذف</code> لإزالة المستوى.',
    tierBadFormat: '❌ صيغة غلط. مثال: <code>ذهبي 🥇 1000 3</code>', tierDeleted: '🗑 تم حذف المستوى.',
    tierWarnDiscount: '⚠️ الخصم {pct}% أعلى من هامشك — منتجات كتير رح تنوقف. راجع التسعير.',

    // شرائح الهامش
    marginsTitle: '💵 <b>شرائح الهامش</b>\n{rule}\nالوضع: <b>{mode}</b>\n\n{rows}\n\n<i>سعرك = التكلفة + ربح الشريحة. التكلفة بتنقرأ من GGSoma كل مزامنة فالسعر بيتحرّك لوحده.</i>\n\n<i>للتعديل ابعت الشرائح كلها بصيغة: <code>حتى:ربح</code> مفصولة بفواصل، والأخيرة <code>*:ربح</code>\nمثال: <code>15:1, 25:1.5, *:2</code></i>',
    marginRow: '{i}. تكلفة <b>{from}$ – {to}$</b> ← ربح <b>+{add}$</b>',
    marginModeFlat: '🟢 هامش ثابت بالدولار', marginModePct: '🔵 نسبة مئوية ({pct}%)',
    marginToggleFlat: '🟢 حوّل لهامش ثابت', marginTogglePct: '🔵 حوّل لنسبة مئوية', marginEdit: '✏️ تعديل الشرائح',
    marginBadFormat: '❌ صيغة غلط. مثال: <code>15:1, 25:1.5, *:2</code>', marginSaved: '✅ تم حفظ {n} شريحة. الأسعار بتنحدّث بالمزامنة الجاية.',

    // التسعير
    pricingTitle: '💵 <b>التسعير</b>',
    pricingFlat: '<b>سعرك = التكلفة + ربح الشريحة</b>', pricingPct: '<b>سعرك = التكلفة × (1 + {pct}%)</b>',
    pricingBody: 'التكلفة بتنقرأ من GGSoma كل مزامنة، فالسعر بيتحرّك معها لحاله.\n\n🔢 التقريب لأعلى: <b>{step}</b>\n⬇️ أدنى سعر: <b>{floor}</b>\n🛡 حد الإيقاف: <b>{guard}</b>\n🏅 أعلى خصم مستوى: <b>{maxD}%</b>\n\n<b>أمثلة بالإعدادات الحالية:</b>\n{demo}\n\n{rule}\n📦 المنتجات: <b>{total}</b>\n🔗 بتتابع التكلفة تلقائياً: <b>{auto}</b>\n✏️ سعر يدوي: <b>{manual}</b>\n🏷 هامش خاص: <b>{custom}</b>',
    pricingDemo: '  {cost} → <b>{price}</b>  <i>(أعلى مستوى يدفع {worst} · ربح {profit})</i>',
    pricingBtn: { manualList: '📋 المنتجات بسعر يدوي', clearManual: '♻️ إلغاء كل الأسعار اليدوية ({n})' },
    manualTitle: '✏️ <b>منتجات بسعر يدوي</b>\n{rule}\n{rows}\n\n<i>هدول ما بيتابعوا تكلفة المورّد.</i>',
    manualRow: '✏️ <b>{name}</b>\n    يدوي {manual} · محسوب {auto} ({diff})',
    manualNone: 'ما في منتجات بسعر يدوي.',
    clearManualConfirm: '⚠️ <b>تأكيد</b>\n{rule}\nرح تلغي <b>{n}</b> سعر يدوي وترجّع كل المنتجات للتسعير التلقائي.\n\nمتأكد؟',
    clearManualDone: '♻️ تم إلغاء <b>{n}</b> سعر يدوي.\n<i>الأسعار بتنحدّث بالمزامنة الجاية.</i>',

    // السحوبات
    wdsTitle: '📤 <b>طلبات السحب</b>', wdsNone: '📤 ما في طلبات سحب معلّقة.',
    wdRow: '#{id} · {amount} · {name}',
    wdTitle: '📤 <b>سحب #{id}</b>\n{rule}\n👤 {name} · <code>{tg}</code>\n💵 المبلغ: <b>{amount}</b>\n🏦 Binance ID: <code>{binance}</code>\n📅 {date}\n\n<i>المبلغ محجوز من رصيده مسبقاً. الرفض بيرجّعه.</i>',
    wdBtn: { paid: '✅ تم الدفع', reject: '❌ رفض وإرجاع' },
    wdPaid: '✅ تم تعليم السحب #{id} كمدفوع.', wdRejected: '❌ تم الرفض وإرجاع المبلغ.',
    wdNotPending: 'الطلب مو معلّق.', wdRejectNote: 'رفض إداري',
    wdNew: '📤 <b>طلب سحب #{id}</b>\n👤 {name} · <code>{tg}</code>\n💵 {amount}\n🏦 <code>{binance}</code>',

    // الطلبات العالقة
    stuckTitle: '⏳ <b>الطلبات العالقة</b>', stuckNone: '✅ ما في طلبات عالقة.',
    stuckRow: '{icon} <b>{name}</b> · {amount}\n    <code>{ext}</code>\n    👤 <code>{tg}</code> · محاولات: {attempts} · {err}',
    stuckFoot: '<i>PENDING بيتحسم تلقائياً. NEEDS_REVIEW لازم تفحصه بلوحة GGSoma قبل الإرجاع.</i>',
    stuckBtn: { refund: '↩️ إرجاع', retry: '🔄 إعادة محاولة', complete: '✅ تعليم كمكتمل' },
    refundConfirm: '⚠️ <b>إرجاع الرصيد</b>\n{rule}\n<code>{ext}</code>\n💵 {amount}\n\nتأكدت من لوحة GGSoma إن الطلب ما انفّذ؟',
    refunded: '↩️ تم إرجاع المبلغ للزبون.\n<code>{ext}</code>',
    retried: '🔄 تمت إعادة المحاولة: {state}',
    reviewAlert: '🔴 <b>طلب عالق يحتاج مراجعة</b>\n<code>{ext}</code>\nمنتج: {product}\nمخصوم: {amount}\nآخر خطأ: {err}\n\nافحص لوحة GGSoma قبل ما ترجّع الرصيد.',

    // Binance
    paysTitle: '💠 <b>تحويلات Binance Pay</b>\n{rule}\nاضغط لمراجعة التحويل.', paysNone: '💠 ما في تحويلات Binance بانتظار المراجعة.',
    payRow: '{amount} · {name}', payRowTx: '{name} · TxID <code>{tx}</code>',
    payTitle: '💠 <b>تحويل Binance Pay</b>\n{rule}\n👤 {name} · <code>{tg}</code>\n💵 المبلغ: <b>{amount}</b>\n🔢 TxID: <code>{tx}</code>\n📅 {date}\n\n<i>تحقّق من وصول التحويل بحسابك قبل الموافقة. إذا المبلغ "—" رح ينطلب منك إدخاله بعد الموافقة.</i>',
    payBtn: { approve: '✅ موافقة · {amount}', approveAsk: '✅ موافقة وإدخال المبلغ', reject: '❌ رفض' },
    payAskAmount: '💰 أرسل مبلغ الإيداع بالدولار لإضافته للزبون، مثال <code>20</code>',
    payBadAmount: '❌ المبلغ غير صالح. أرسل رقماً أكبر من صفر، مثال <code>20</code>',
    payApproved: '✅ تم شحن {amount} للزبون.\nرصيده صار {balance}.', payAlready: 'ℹ️ هالدفعة انشحنت من قبل.\nرصيد الزبون: {balance}',
    payRejected: '❌ تم رفض الدفعة.', payCantReject: '⚠️ هالدفعة انشحنت من قبل — ما بينفع ترفضها.', payNotFound: 'الدفعة غير موجودة.',
    payNew: '💠 <b>تحويل Binance Pay بانتظار المراجعة</b>\n{rule}\n👤 {name} · <code>{tg}</code>\n🔢 TxID: <code>{tx}</code>\n\nتحقّق من وصول التحويل بحسابك (Pay ← Binance ← سجل العمليات) ثم وافق وأدخل المبلغ.',

    // معلومات الدفع
    payInfoTitle: '💳 <b>معلومات الدفع</b>\n{rule}',
    payInfoBinance: '💠 Binance Pay ID: <code>{id}</code>',
    payInfoBinanceEmpty: '💠 Binance Pay ID: ⚠️ غير مضبوط',
    payInfoCrypto: '⬛ العملات الرقمية (NOWPayments): {state}',
    payInfoCryptoHint: '<i>تحتاج NOWPAYMENTS_API_KEY و NOWPAYMENTS_IPN_SECRET و WEBHOOK_URL بمتغيرات Render.</i>',
    payInfoStars: '⭐️ Telegram Stars: 🟢 جاهز',
    payInfoLimits: '💵 حدود الإيداع: {min} – {max} USD',
    payInfoEdit: '✏️ تعديل معرّف Binance Pay',
    payInfoSettings: '💳 إعدادات طرق الدفع',

    // المستخدمين
    findPrompt: '👤 ابعت معرّف تلغرام (رقم) أو @يوزر:', userNotFound: '❌ ما لقيت المستخدم.',
    userTitle: '👤 <b>{name}</b> {username}\n{rule}\n🆔 <code>{tg}</code>\n🌐 {lang}\n💰 الرصيد: <b>{balance}</b>\n💸 المصروف: {spent}\n🛒 الطلبات: {orders}\n🎁 أرباح إحالة: {ref}\n👥 مدعوّين: {invited}\n📅 {date}{banned}',
    userBanned: '\n\n🚫 <b>محظور</b>',
    userBtn: { balance: '💵 تعديل الرصيد', ban: '🚫 حظر', unban: '✅ فكّ الحظر', orders: '📋 طلباته', ledger: '🏦 كشفه', message: '✉️ رسالة' },
    balPrompt: '💵 ابعت المبلغ.\nموجب للشحن (<code>10</code>)، سالب للخصم (<code>-5</code>):',
    balZero: '❌ لازم رقم غير صفر.', balDone: '✅ الرصيد الجديد: {balance}', balTooMuch: '❌ الخصم أكبر من رصيده.',
    balUserCredit: '💰 تم شحن <b>{amount}</b> لحسابك.', balUserDebit: 'ℹ️ تم خصم <b>{amount}</b> من حسابك.',
    banned: '🚫 تم الحظر.', unbanned: '✅ تم فكّ الحظر.',
    msgPrompt: '✉️ ابعت الرسالة يلي بدك توصّلها للمستخدم:', msgSent: '✅ تم الإرسال.', msgFail: '❌ ما قدرنا نوصل — يمكن حظر البوت.',
    userOrdersTitle: '📋 <b>طلبات {name}</b>', userLedgerTitle: '🏦 <b>كشف {name}</b>',

    // القسائم
    voucherTitle: '🎟 <b>إنشاء قسيمة</b>\n{rule}\nابعت: <code>المبلغ العدد</code>\nمثال: <code>5 10</code> = 10 قسائم بقيمة 5$',
    voucherBad: '❌ صيغة غلط. مثال: <code>5 10</code>',
    voucherDone: '🎟 <b>{n} قسيمة بقيمة {amount}</b>\n{rule}\n{codes}',
    vouchersList: '🎟 قسائم غير مستعملة', vouchersTitle: '🎟 <b>قسائم غير مستعملة</b> ({n})', vouchersNone: 'ما في قسائم غير مستعملة.',

    // البث
    bcTitle: '📣 <b>بث رسالة</b>\n{rule}\nالمستلمين: <b>{n}</b>\nابعت نص الرسالة (HTML مسموح):',
    bcQueued: '📣 تمت إضافة البث للطابور — {n} مستخدم. رح يوصلك ملخّص لما يخلص.',
    bcDone: '📣 <b>انتهى البث</b>\n✅ وصل: {sent} · ❌ فشل: {failed}',

    // المزامنة
    syncDone: '🔄 <b>تمت المزامنة</b>\n{rule}\nمزوّدين: <b>{providers}</b>\nمنتجات: <b>{products}</b>\n🆕 جديد: {added} · 🔄 مخزون: {restocked} · 🗑 محذوف: {removed}\n📄 تفاصيل مسحوبة: {details}',
    syncGG: '{rule}\n💼 رصيدك عند GGSoma: <b>{balance}</b>\n📦 طلبات API: {total} (24س: {day})\n💸 إنفاق كلي: {spend}',
    syncGGFail: '⚠️ ما قدرنا نقرأ رصيد GGSoma.', syncFail: '❌ فشلت المزامنة:\n<code>{err}</code>',

    // تنبيهات تلقائية للأدمن
    alert: {
      removed: '🗑 <b>{n}</b> منتج انحذف من كتالوج GGSoma وانخفى تلقائياً.',
      priceMove: '{icon} <b>تغيّرت التكلفة عند GGSoma</b>\n{rule}\n📦 {name}\n💸 التكلفة: {old} ← <b>{new}</b> ({pct}%)\n{tail}',
      priceMoveManual: '⚠️ عندك <b>سعر يدوي</b> على هالمنتج — ما بيتحرّك لحاله.\nالسعر الحالي: {sell} · المحسوب: {calc}',
      priceMoveAuto: '💵 سعرك تحرّك تلقائياً: {old} ← <b>{new}</b>',
      paused: '⛔️ <b>وقّفنا البيع — الهامش انهار</b>\n{rule}\n📦 {name}\n💸 التكلفة: <b>{cost}</b>\n💵 أوطى سعر بيدفعه زبون: <b>{floor}</b>\n📉 الربح: <b>{profit}</b>\n\nالسبب: {reason}\n\n<i>عدّل السعر وبيرجع البيع تلقائياً.</i>',
      pausedBtn: { fix: '💵 عدّل السعر', details: '📦 تفاصيل المنتج', resume: '▶️ استئناف رغم ذلك' },
      resumed: '▶️ رجع البيع تلقائياً: <b>{name}</b> — الهامش صار سليم.',
      stockSent: '🔔 انبعت {alerts} إشعار مخزون لـ {users} مستخدم.',
      lossOnOrder: '⚠️ <b>خسارة بالهامش</b>\nطلب: <code>{ext}</code>\n📦 {name}\nخصمنا من الزبون: {charged}\nGGSoma خصمت منّا: {actual}\nراجع التسعير.',
      lowWallet: '⚠️ <b>رصيدك عند GGSoma: {balance}</b>\nاشحن فوراً — لما يفضى بيوقف البيع لكل زبائنك.',
      walletReadFail: '⚠️ ما قدرنا نقرأ رصيد GGSoma: {err}',
      accountIssue: '🚨 خلل بحساب GGSoma: <code>{code}</code>\n{msg}\nreq: {req}',
      marginRejected: '⛔️ حاول زبون يشتري <b>{name}</b> بربح {profit} — رفضنا.',
      maintenance: '🛠 <b>GGSoma بوضع الصيانة</b>\nوقّفنا الشراء مؤقتاً. الطلبات المعلّقة رح يكمّلها المُصالح لما ترجع.',
      unreachable: '🔴 <b>ما قدرنا نوصل لـ GGSoma</b>\n<code>{reason}</code>\nوقّفنا الشراء مؤقتاً.',
      recovered: '🟢 <b>GGSoma رجعت</b> — الشراء اشتغل من جديد.',
      sale: '🛒 بيع: <b>{name}</b>\n👤 <code>{tg}</code> · دفع {charged} · تكلفة {cost} · ربح <b>{profit}</b>',
      deposit: '💰 إيداع {method}: <b>{amount}</b> · <code>{tg}</code>',
      underpaid: '⚠️ دفعة ناقصة: <code>{order}</code>\nالمطلوب {need} · المدفوع {paid}',
      badSig: '⚠️ وصل ويبهوك {gw} بتوقيع غير صالح — تجاهلناه.',
      starsCreditFail: '🔴 دفعة نجوم وصلت وما انشحنت!\norder: <code>{order}</code>\ncharge: <code>{charge}</code>\n{err}',
    },
  },
};
