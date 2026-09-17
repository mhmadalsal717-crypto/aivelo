-- ============================================================
--  01 — SCHEMA  (tables, columns, indexes)
--
--  Safe to run on a FRESH database AND on an EXISTING one:
--    · create table if not exists
--    · alter table … add column if not exists   (upgrade path)
--    · create index if not exists
--
--  Run order:  01_schema.sql → 02_functions.sql → 03_seed.sql
-- ============================================================

-- ------------------------------------------------------------
--  users
-- ------------------------------------------------------------
create table if not exists users (
  id            bigserial primary key,
  tg_id         bigint unique not null,
  username      text,
  first_name    text,
  lang          text,                                 -- 'ar' | 'en' | null (not chosen yet)
  balance       numeric(12,2) not null default 0,
  total_spent   numeric(12,2) not null default 0,     -- drives tier
  banned        boolean not null default false,
  notify_stock  boolean not null default true,
  binance_id    text,                                 -- payout destination
  -- referrals
  referred_by   bigint references users(id),
  ref_code      text unique,
  ref_earned    numeric(12,2) not null default 0,
  ref_verified  boolean not null default false,       -- passed human check
  ref_active    boolean not null default false,       -- did a real action
  ref_rewarded  boolean not null default false,       -- counted in a paid batch
  ref_rewarded_at timestamptz,
  -- onboarding: 0 lang · 1 join · 2 human · 3 done
  onboard_step  smallint not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table users add column if not exists lang            text;
alter table users add column if not exists total_spent     numeric(12,2) not null default 0;
alter table users add column if not exists notify_stock    boolean not null default true;
alter table users add column if not exists binance_id      text;
alter table users add column if not exists ref_earned      numeric(12,2) not null default 0;
alter table users add column if not exists ref_verified    boolean not null default false;
alter table users add column if not exists ref_active      boolean not null default false;
alter table users add column if not exists ref_rewarded    boolean not null default false;
alter table users add column if not exists ref_rewarded_at timestamptz;
alter table users add column if not exists onboard_step    smallint not null default 0;
alter table users add column if not exists updated_at      timestamptz not null default now();

create index if not exists users_ref_idx      on users(referred_by);
create index if not exists users_username_idx on users(lower(username));
create index if not exists users_created_idx  on users(created_at desc);

-- ------------------------------------------------------------
--  ledger — every balance movement
-- ------------------------------------------------------------
create table if not exists ledger (
  id         bigserial primary key,
  user_id    bigint not null references users(id),
  amount     numeric(12,2) not null,      -- + credit / − debit
  type       text not null,               -- DEPOSIT PURCHASE REFUND REFERRAL WITHDRAW ADJUST
  ref        text,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists ledger_user_idx on ledger(user_id, created_at desc);
create index if not exists ledger_type_idx on ledger(type, created_at desc);

-- ------------------------------------------------------------
--  tiers — loyalty levels (discount by total spent)
-- ------------------------------------------------------------
create table if not exists tiers (
  id           serial primary key,
  name         text not null,
  emoji        text default '⭐️',
  min_spent    numeric(12,2) not null default 0,
  discount_pct numeric(5,2)  not null default 0,
  sort_order   int not null default 0
);

-- ------------------------------------------------------------
--  margin_tiers — flat profit by cost bracket (margin_mode = flat)
--  up_to inclusive; last row up_to = null → "everything above"
-- ------------------------------------------------------------
create table if not exists margin_tiers (
  id         serial primary key,
  up_to      numeric(12,2),
  add_usd    numeric(12,2) not null,
  sort_order int not null default 0
);

-- ------------------------------------------------------------
--  providers (synced from GGSoma; *_override columns are yours)
-- ------------------------------------------------------------
create table if not exists providers (
  key             text primary key,
  name            text not null,
  name_override   text,                    -- admin display name (sync never touches it)
  emoji           text,
  custom_emoji_id text,
  sort_order      int default 100,
  visible         boolean not null default true,
  full_width      boolean not null default false,   -- button takes a full row
  updated_at      timestamptz not null default now()
);
alter table providers add column if not exists name_override   text;
alter table providers add column if not exists custom_emoji_id text;
alter table providers add column if not exists full_width      boolean not null default false;

-- ------------------------------------------------------------
--  products (synced from GGSoma)
-- ------------------------------------------------------------
create table if not exists products (
  slug            text primary key,
  product_code    text,
  name            text not null,
  provider_key    text references providers(key),
  emoji           text,
  custom_emoji_id text,
  delivery_type   text,                         -- LINK | COUPON | READY_ACCOUNT
  -- pricing
  cost_price      numeric(12,2) not null,       -- yourPrice from GGSoma
  catalog_price   numeric(12,2),                -- their public price (reference only)
  sell_price      numeric(12,2) not null,       -- computed
  price_override  numeric(12,2),                -- manual price (breaks cost tracking)
  markup_pct      numeric(6,2),                 -- per-product markup (percent mode)
  last_cost       numeric(12,2),                -- cost at previous sync (guard)
  -- catalog data
  duration_days   int,
  warranty_days   int,
  in_stock        boolean not null default false,
  stock_count     int default 0,
  prev_stock      int default 0,
  max_quantity    int default 1,
  -- details pulled per product
  description        text,
  description_format text default 'TEXT',
  instructions       text,
  has_instructions   boolean default false,
  sensitive_delivery boolean default false,
  details_synced_at  timestamptz,
  details_attempts   int default 0,
  details_next_try   timestamptz,
  gg_updated_at      timestamptz,
  -- admin overrides
  desc_override   text,
  instr_override  text,
  -- state
  visible         boolean not null default true,
  paused          boolean not null default false,
  paused_reason   text,
  paused_manual   boolean not null default false,   -- paused by admin (guard won't auto-resume)
  deleted_at      timestamptz,                      -- vanished from their catalog
  sort_order      int default 100,
  updated_at      timestamptz not null default now()
);
alter table products add column if not exists catalog_price      numeric(12,2);
alter table products add column if not exists last_cost          numeric(12,2);
alter table products add column if not exists description_format text default 'TEXT';
alter table products add column if not exists instructions       text;
alter table products add column if not exists has_instructions   boolean default false;
alter table products add column if not exists sensitive_delivery boolean default false;
alter table products add column if not exists details_synced_at  timestamptz;
alter table products add column if not exists details_attempts   int default 0;
alter table products add column if not exists details_next_try   timestamptz;
alter table products add column if not exists gg_updated_at      timestamptz;
alter table products add column if not exists desc_override      text;
alter table products add column if not exists instr_override     text;
alter table products add column if not exists prev_stock         int default 0;
alter table products add column if not exists paused             boolean not null default false;
alter table products add column if not exists paused_reason      text;
alter table products add column if not exists paused_manual      boolean not null default false;
alter table products add column if not exists deleted_at         timestamptz;

create index if not exists products_provider_idx on products(provider_key, sort_order);
create index if not exists products_live_idx     on products(visible, paused, in_stock) where deleted_at is null;
create index if not exists products_details_idx  on products(details_next_try nulls first) where deleted_at is null;
create index if not exists products_name_idx     on products(lower(name));

-- ------------------------------------------------------------
--  orders
-- ------------------------------------------------------------
create table if not exists orders (
  id                bigserial primary key,
  user_id           bigint not null references users(id),
  external_order_id text unique not null,      -- our idempotency key
  product_slug      text not null,
  product_name      text,
  provider_key      text,
  quantity          int not null default 1,
  cost_usd          numeric(12,2) not null,    -- expected cost
  charged_usd       numeric(12,2) not null,    -- charged to customer
  actual_cost_usd   numeric(12,2),             -- what GGSoma actually charged
  status            text not null default 'PENDING',   -- PENDING COMPLETED FAILED REFUNDED NEEDS_REVIEW
  gg_order_code     text,
  delivery          jsonb,                     -- SENSITIVE (READY_ACCOUNT credentials)
  error_code        text,
  attempts          int not null default 0,
  last_attempt_at   timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table orders add column if not exists provider_key text;
create index if not exists orders_user_idx    on orders(user_id, created_at desc);
create index if not exists orders_pending_idx on orders(status, created_at) where status in ('PENDING','NEEDS_REVIEW');
create index if not exists orders_done_idx    on orders(created_at desc) where status = 'COMPLETED';

-- ------------------------------------------------------------
--  payments — every gateway
-- ------------------------------------------------------------
create table if not exists payments (
  id          bigserial primary key,
  user_id     bigint not null references users(id),
  method      text not null,                   -- gateway id: BINANCE_PAY | CRYPTOMUS | STARS | …
  amount_usd  numeric(12,2) not null,
  stars       int,
  status      text not null default 'PENDING', -- PENDING PAID FAILED EXPIRED CANCELLED
  order_id    text unique not null,            -- our id
  external_id text,                            -- provider uuid / charge_id / TxID
  pay_url     text,
  payload     jsonb,
  credited    boolean not null default false,  -- the idempotency flag
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists payments_user_idx     on payments(user_id, created_at desc);
create index if not exists payments_open_idx     on payments(status, expires_at) where status = 'PENDING';
create index if not exists payments_external_idx on payments(external_id) where external_id is not null;

-- ------------------------------------------------------------
--  vouchers
-- ------------------------------------------------------------
create table if not exists vouchers (
  code       text primary key,
  amount     numeric(12,2) not null,
  used_by    bigint references users(id),
  used_at    timestamptz,
  created_by bigint,
  created_at timestamptz not null default now()
);
alter table vouchers add column if not exists created_by bigint;
create index if not exists vouchers_unused_idx on vouchers(created_at desc) where used_by is null;

-- ------------------------------------------------------------
--  withdrawals
-- ------------------------------------------------------------
create table if not exists withdrawals (
  id           bigserial primary key,
  user_id      bigint not null references users(id),
  amount       numeric(12,2) not null,
  binance_id   text,
  status       text not null default 'PENDING',   -- PENDING PAID REJECTED
  admin_note   text,
  processed_at timestamptz,
  created_at   timestamptz not null default now()
);
alter table withdrawals add column if not exists processed_at timestamptz;
create index if not exists withdrawals_pending_idx on withdrawals(created_at) where status = 'PENDING';

-- ------------------------------------------------------------
--  settings / texts / ui_emoji   (all editable from the admin panel)
-- ------------------------------------------------------------
create table if not exists settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);
-- legacy columns from v1 are harmless; drop them if present to keep it clean
alter table settings drop column if exists kind;
alter table settings drop column if exists label;
alter table settings drop column if exists grp;
alter table settings drop column if exists sort_order;
alter table settings add column if not exists updated_at timestamptz not null default now();

create table if not exists texts (
  key        text primary key,          -- welcome_ar, welcome_en, policy_ar, …, binance_pay_id
  content    text,
  updated_at timestamptz not null default now()
);
alter table texts drop column if exists label;
alter table texts add column if not exists updated_at timestamptz not null default now();

create table if not exists ui_emoji (
  key       text primary key,
  fallback  text not null,
  custom_id text                          -- premium custom emoji id
);
alter table ui_emoji drop column if exists label;

-- ------------------------------------------------------------
--  stock_alerts — queue for restock / new-product broadcasts
-- ------------------------------------------------------------
create table if not exists stock_alerts (
  id         bigserial primary key,
  slug       text not null,
  kind       text not null,                    -- NEW | RESTOCK
  delta      int  not null default 0,
  stock_now  int  not null default 0,
  status     text not null default 'QUEUED',   -- QUEUED | SENT | SKIPPED
  sent       int default 0,
  failed     int default 0,
  created_at timestamptz not null default now()
);
create index if not exists stock_alerts_q on stock_alerts(status, created_at);
create index if not exists stock_alerts_slug_idx on stock_alerts(slug, created_at desc);

-- ------------------------------------------------------------
--  input_state — pending free-text input per user (survives restarts)
-- ------------------------------------------------------------
create table if not exists input_state (
  tg_id      bigint primary key,
  kind       text not null,
  payload    jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists input_state_exp_idx on input_state(expires_at);

-- ------------------------------------------------------------
--  broadcasts — admin message queue
-- ------------------------------------------------------------
create table if not exists broadcasts (
  id          bigserial primary key,
  text        text not null,
  target      text not null default 'all',
  status      text not null default 'QUEUED',   -- QUEUED RUNNING DONE
  total       int default 0,
  sent        int default 0,
  failed      int default 0,
  created_by  bigint,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz
);
create index if not exists broadcasts_q on broadcasts(status, created_at);

-- ------------------------------------------------------------
--  updated_at trigger (users, products, orders, payments, settings, texts)
-- ------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['users','products','orders','payments','settings','texts']
  loop
    execute format('drop trigger if exists %I_updated_at on %I', t, t);
    execute format('create trigger %I_updated_at before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ------------------------------------------------------------
--  Row Level Security
--  The bot uses the service_role key which BYPASSES RLS. Enabling
--  RLS with no policies means the anon/public API keys can read
--  NOTHING — which is exactly what we want for a bot backend
--  (orders.delivery holds real account credentials).
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['users','ledger','tiers','margin_tiers','providers','products','orders',
                           'payments','vouchers','withdrawals','settings','texts','ui_emoji',
                           'stock_alerts','input_state','broadcasts']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
