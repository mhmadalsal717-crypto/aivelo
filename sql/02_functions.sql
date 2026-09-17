-- ============================================================
--  02 — ATOMIC FUNCTIONS   (all financial safety lives here)
--
--  Every function that touches balance uses `select … for update`
--  and puts the balance condition INSIDE the update, so two
--  concurrent calls can never overspend or double-credit.
--
--  Functions returning TABLE are dropped first: CREATE OR REPLACE
--  cannot change a return signature. Safe to re-run any time.
-- ============================================================

drop function if exists debit_and_open_order(bigint, text, text, text, int, numeric, numeric, text);
drop function if exists redeem_voucher(bigint, text);
drop function if exists credit_payment(text, text);
drop function if exists pay_referral_rewards(bigint, int, numeric, int, int);
drop function if exists pay_referral_rewards(bigint, int, numeric, int);

-- ------------------------------------------------------------
--  debit_and_open_order — charge customer + open PENDING order
-- ------------------------------------------------------------
create or replace function debit_and_open_order(
  p_tg_id bigint, p_slug text, p_name text, p_provider text,
  p_qty int, p_charge numeric, p_cost numeric, p_ext text
) returns table (order_id bigint, new_balance numeric)
language plpgsql as $$
declare v_user_id bigint; v_bal numeric; v_oid bigint;
begin
  select id into v_user_id from users where tg_id = p_tg_id for update;
  if v_user_id is null then raise exception 'USER_NOT_FOUND'; end if;

  update users set balance = balance - p_charge
   where id = v_user_id and balance >= p_charge
  returning balance into v_bal;
  if v_bal is null then raise exception 'INSUFFICIENT_BALANCE'; end if;

  insert into orders (user_id, external_order_id, product_slug, product_name, provider_key,
                      quantity, cost_usd, charged_usd, status)
  values (v_user_id, p_ext, p_slug, p_name, p_provider, p_qty, p_cost, p_charge, 'PENDING')
  returning id into v_oid;

  insert into ledger (user_id, amount, type, ref) values (v_user_id, -p_charge, 'PURCHASE', p_ext);
  return query select v_oid, v_bal;
end $$;

-- ------------------------------------------------------------
--  complete_order — mark COMPLETED, bump total_spent, pay referral %
-- ------------------------------------------------------------
create or replace function complete_order(
  p_ext text, p_gg_code text, p_actual numeric, p_delivery jsonb, p_ref_pct numeric default 0
) returns void language plpgsql as $$
declare v_order orders%rowtype; v_ref_id bigint; v_bonus numeric;
begin
  select * into v_order from orders where external_order_id = p_ext for update;
  if not found or v_order.status = 'COMPLETED' then return; end if;

  update orders set status = 'COMPLETED', gg_order_code = p_gg_code, actual_cost_usd = p_actual,
                    delivery = p_delivery, error_code = null
   where id = v_order.id;

  update users set total_spent = total_spent + v_order.charged_usd where id = v_order.user_id;

  if p_ref_pct > 0 then
    select referred_by into v_ref_id from users where id = v_order.user_id;
    if v_ref_id is not null then
      v_bonus := round(v_order.charged_usd * p_ref_pct / 100, 2);
      if v_bonus > 0 then
        update users set balance = balance + v_bonus, ref_earned = ref_earned + v_bonus where id = v_ref_id;
        insert into ledger (user_id, amount, type, ref) values (v_ref_id, v_bonus, 'REFERRAL', p_ext);
      end if;
    end if;
  end if;
end $$;

-- ------------------------------------------------------------
--  refund_order — idempotent refund (never twice, never after COMPLETED)
-- ------------------------------------------------------------
create or replace function refund_order(p_ext text, p_error_code text)
returns numeric language plpgsql as $$
declare v_order orders%rowtype; v_bal numeric;
begin
  select * into v_order from orders where external_order_id = p_ext for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if v_order.status in ('COMPLETED', 'REFUNDED') then
    select balance into v_bal from users where id = v_order.user_id;
    return v_bal;
  end if;

  update users set balance = balance + v_order.charged_usd where id = v_order.user_id returning balance into v_bal;
  insert into ledger (user_id, amount, type, ref, note) values (v_order.user_id, v_order.charged_usd, 'REFUND', p_ext, p_error_code);
  update orders set status = 'REFUNDED', error_code = p_error_code where id = v_order.id;
  return v_bal;
end $$;

-- ------------------------------------------------------------
--  credit_user — admin adjust / generic credit (negative allowed, no overdraft)
-- ------------------------------------------------------------
create or replace function credit_user(p_tg_id bigint, p_amount numeric, p_type text, p_ref text)
returns numeric language plpgsql as $$
declare v_user_id bigint; v_bal numeric;
begin
  select id into v_user_id from users where tg_id = p_tg_id for update;
  if v_user_id is null then raise exception 'USER_NOT_FOUND'; end if;
  update users set balance = balance + p_amount where id = v_user_id returning balance into v_bal;
  if v_bal < 0 then raise exception 'INSUFFICIENT_BALANCE'; end if;
  insert into ledger (user_id, amount, type, ref) values (v_user_id, p_amount, p_type, p_ref);
  return v_bal;
end $$;

-- ------------------------------------------------------------
--  redeem_voucher — single use, atomic
-- ------------------------------------------------------------
create or replace function redeem_voucher(p_tg_id bigint, p_code text)
returns table (amount numeric, new_balance numeric) language plpgsql as $$
declare v_user_id bigint; v_amount numeric; v_bal numeric;
begin
  select id into v_user_id from users where tg_id = p_tg_id for update;
  if v_user_id is null then raise exception 'USER_NOT_FOUND'; end if;

  update vouchers set used_by = v_user_id, used_at = now()
   where code = p_code and used_by is null
  returning vouchers.amount into v_amount;
  if v_amount is null then raise exception 'VOUCHER_INVALID'; end if;

  update users set balance = balance + v_amount where id = v_user_id returning balance into v_bal;
  insert into ledger (user_id, amount, type, ref) values (v_user_id, v_amount, 'DEPOSIT', 'voucher:' || p_code);
  return query select v_amount, v_bal;
end $$;

-- ------------------------------------------------------------
--  open_withdrawal — reserve amount immediately
-- ------------------------------------------------------------
create or replace function open_withdrawal(p_tg_id bigint, p_amount numeric)
returns bigint language plpgsql as $$
declare v_user_id bigint; v_bin text; v_bal numeric; v_id bigint;
begin
  select id, binance_id into v_user_id, v_bin from users where tg_id = p_tg_id for update;
  if v_user_id is null then raise exception 'USER_NOT_FOUND'; end if;
  if v_bin is null or v_bin = '' then raise exception 'NO_BINANCE_ID'; end if;

  update users set balance = balance - p_amount where id = v_user_id and balance >= p_amount returning balance into v_bal;
  if v_bal is null then raise exception 'INSUFFICIENT_BALANCE'; end if;

  insert into withdrawals (user_id, amount, binance_id) values (v_user_id, p_amount, v_bin) returning id into v_id;
  insert into ledger (user_id, amount, type, ref) values (v_user_id, -p_amount, 'WITHDRAW', 'wd:' || v_id);
  return v_id;
end $$;

-- ------------------------------------------------------------
--  reject_withdrawal — return reserved amount
-- ------------------------------------------------------------
create or replace function reject_withdrawal(p_id bigint, p_note text)
returns void language plpgsql as $$
declare w withdrawals%rowtype;
begin
  select * into w from withdrawals where id = p_id for update;
  if not found or w.status <> 'PENDING' then return; end if;
  update users set balance = balance + w.amount where id = w.user_id;
  insert into ledger (user_id, amount, type, ref, note) values (w.user_id, w.amount, 'REFUND', 'wd:' || p_id, p_note);
  update withdrawals set status = 'REJECTED', admin_note = p_note, processed_at = now() where id = p_id;
end $$;

-- ------------------------------------------------------------
--  credit_payment — credit a payment EXACTLY ONCE
--  Output columns prefixed out_ to avoid ambiguity with payments.*
-- ------------------------------------------------------------
create or replace function credit_payment(p_order_id text, p_external text default null)
returns table (out_credited boolean, out_balance numeric, out_amount numeric)
language plpgsql as $$
declare v_pay payments%rowtype; v_bal numeric; v_ok boolean;
begin
  select * into v_pay from payments where payments.order_id = p_order_id for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;

  update payments set status = 'PAID', credited = true, external_id = coalesce(p_external, payments.external_id)
   where payments.id = v_pay.id and payments.credited = false
  returning true into v_ok;

  if v_ok is null then
    select users.balance into v_bal from users where users.id = v_pay.user_id;
    return query select false, v_bal, v_pay.amount_usd;
    return;
  end if;

  update users set balance = users.balance + v_pay.amount_usd where users.id = v_pay.user_id returning users.balance into v_bal;
  insert into ledger (user_id, amount, type, ref, note) values (v_pay.user_id, v_pay.amount_usd, 'DEPOSIT', p_order_id, v_pay.method);
  return query select true, v_bal, v_pay.amount_usd;
end $$;

-- ------------------------------------------------------------
--  pay_referral_rewards — milestone rewards with daily/total caps
--
--  Qualified invitee = onboard_step >= 3 AND ref_verified AND ref_active
--                      AND not yet ref_rewarded.
--  Pays floor(qualified / per_reward) batches, marks exactly that many
--  invitees as rewarded (oldest first). Caps:
--    p_total_cap — max rewarded invitees ever for this referrer
--    p_daily_cap — max invitees rewarded in the last 24h
-- ------------------------------------------------------------
create or replace function pay_referral_rewards(
  p_referrer_tg bigint, p_per_reward int, p_reward_usd numeric, p_total_cap int, p_daily_cap int default 0
) returns table (out_batches int, out_paid numeric, out_balance numeric)
language plpgsql as $$
declare
  v_ref_id bigint; v_ready int; v_paid_total int; v_paid_today int;
  v_room int; v_batches int; v_n int; v_amount numeric; v_bal numeric;
begin
  select id into v_ref_id from users where tg_id = p_referrer_tg for update;
  if v_ref_id is null then raise exception 'USER_NOT_FOUND'; end if;

  select count(*) into v_ready from users
   where referred_by = v_ref_id and onboard_step >= 3 and ref_verified and ref_active and not ref_rewarded;

  select count(*) into v_paid_total from users where referred_by = v_ref_id and ref_rewarded;
  select count(*) into v_paid_today from users
   where referred_by = v_ref_id and ref_rewarded and ref_rewarded_at > now() - interval '24 hours';

  -- how many invitees may still be rewarded under the caps
  v_room := greatest(0, p_total_cap - v_paid_total);
  if p_daily_cap > 0 then v_room := least(v_room, greatest(0, p_daily_cap - v_paid_today)); end if;
  if v_room <= 0 and v_ready >= p_per_reward then raise exception 'REF_CAP_REACHED'; end if;

  v_batches := least(v_ready, v_room) / p_per_reward;
  if v_batches < 1 then
    select balance into v_bal from users where id = v_ref_id;
    return query select 0, 0::numeric, v_bal;
    return;
  end if;

  v_n := v_batches * p_per_reward;
  v_amount := round(v_batches * p_reward_usd, 2);

  update users set ref_rewarded = true, ref_rewarded_at = now()
   where id in (select id from users
                 where referred_by = v_ref_id and onboard_step >= 3 and ref_verified and ref_active and not ref_rewarded
                 order by created_at limit v_n);

  update users set balance = balance + v_amount, ref_earned = ref_earned + v_amount
   where id = v_ref_id returning balance into v_bal;
  insert into ledger (user_id, amount, type, ref, note)
  values (v_ref_id, v_amount, 'REFERRAL', 'milestone', v_n || ' invites');

  return query select v_batches, v_amount, v_bal;
end $$;
