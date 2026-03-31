-- ============================================================
-- TourOps MVP — シンプルDB設計
-- 認証・RLS・tenant_id なし。まず動かすことが目的。
-- Supabase Dashboard > SQL Editor に貼り付けて Run
-- ============================================================

-- ============================================================
-- 売上台帳
-- ============================================================
create table if not exists public.sales_records (
  id              uuid primary key default gen_random_uuid(),

  -- ツアー基本情報
  tour_date       date           not null,               -- 実施日
  case_name       text           not null,               -- 案件名
  partner_name    text           not null default '',    -- 取引先名（将来マスタ化可）
  guide_name      text           not null default '',    -- ガイド名（将来マスタ化可）
  pax             integer        not null default 1,     -- 参加人数

  -- 金額
  revenue         integer        not null default 0,     -- 売上金額（円）
  guide_fee       integer        not null default 0,     -- ガイド費（円）
  gross_profit    integer        generated always as (revenue - guide_fee) stored,
                                                         -- 粗利（自動計算）

  -- 入金管理
  payment_status  text           not null default 'unpaid'
                                 check (payment_status in ('unpaid','partial','paid')),
                                                         -- unpaid=未入金 partial=一部 paid=入金済
  payment_date    date,                                  -- 入金日

  -- メモ
  memo            text           not null default '',

  -- システム
  created_at      timestamptz    not null default now(),
  updated_at      timestamptz    not null default now()
);

comment on table  public.sales_records                is '売上台帳';
comment on column public.sales_records.revenue        is '売上金額（税込・円）';
comment on column public.sales_records.guide_fee      is 'ガイド費合計（円）';
comment on column public.sales_records.gross_profit   is '粗利 = revenue - guide_fee（自動計算）';
comment on column public.sales_records.payment_status is 'unpaid=未入金 / partial=一部入金 / paid=入金済';
comment on column public.sales_records.partner_name   is '取引先名。将来はpartners.idへのFK化を想定';
comment on column public.sales_records.guide_name     is 'ガイド名。将来はguides.idへのFK化を想定';

-- updated_at 自動更新トリガー
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_sales_updated_at
  before update on public.sales_records
  for each row execute function public.set_updated_at();

-- よく使う絞り込みを高速化するインデックス
create index if not exists idx_sales_tour_date    on public.sales_records(tour_date desc);
create index if not exists idx_sales_partner      on public.sales_records(partner_name);
create index if not exists idx_sales_guide        on public.sales_records(guide_name);
create index if not exists idx_sales_payment      on public.sales_records(payment_status);


-- ============================================================
-- レビュー台帳
-- ============================================================
create table if not exists public.review_records (
  id              uuid primary key default gen_random_uuid(),

  -- ツアー基本情報
  tour_date       date           not null,               -- ツアー実施日
  case_name       text           not null default '',    -- 案件名・ツアー名
  partner_name    text           not null default '',    -- 取引先名（将来マスタ化可）
  guide_name      text           not null default '',    -- ガイド名（将来マスタ化可）

  -- レビュー情報
  has_review      boolean        not null default false, -- レビュー取得有無
  rating          numeric(3,1),                          -- 評価（1.0〜5.0、空欄可）
  review_text     text           not null default '',    -- レビュー本文

  -- 内部メモ
  good_points     text           not null default '',    -- 良かった点
  issues          text           not null default '',    -- 指摘事項
  action_memo     text           not null default '',    -- 対応メモ

  -- システム
  created_at      timestamptz    not null default now(),
  updated_at      timestamptz    not null default now()
);

comment on table  public.review_records              is 'レビュー台帳';
comment on column public.review_records.has_review   is 'true=レビュー取得済 / false=未取得';
comment on column public.review_records.rating       is '1.0〜5.0の評価。未入力はNULL';
comment on column public.review_records.partner_name is '取引先名。将来はFK化を想定';
comment on column public.review_records.guide_name   is 'ガイド名。将来はFK化を想定';

create trigger trg_review_updated_at
  before update on public.review_records
  for each row execute function public.set_updated_at();

create index if not exists idx_review_tour_date on public.review_records(tour_date desc);
create index if not exists idx_review_guide     on public.review_records(guide_name);
create index if not exists idx_review_partner   on public.review_records(partner_name);
create index if not exists idx_review_has       on public.review_records(has_review);


-- ============================================================
-- 動作確認
-- ============================================================
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('sales_records', 'review_records')
order by table_name;
-- → 2行表示されれば成功
