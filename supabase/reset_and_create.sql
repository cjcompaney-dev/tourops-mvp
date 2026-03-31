-- ============================================================
-- TourOps MVP — テーブル完全リセット＆再作成
-- 古い sales_records（Phase1設計）を捨てて MVP設計で作り直す
-- review_records も新規作成
--
-- ⚠️ 注意：sales_records の既存データは全て削除されます
--    今はデータが入っていないので問題ありません
-- ============================================================

-- 既存テーブルを削除（依存オブジェクトごと）
drop table if exists public.sales_records cascade;
drop table if exists public.review_records cascade;

-- ============================================================
-- 売上台帳（MVP設計・シンプル版）
-- ============================================================
create table public.sales_records (
  id             uuid        primary key default gen_random_uuid(),
  tour_date      date        not null,
  case_name      text        not null default '',
  partner_name   text        not null default '',
  guide_name     text        not null default '',
  pax            integer     not null default 1,
  revenue        integer     not null default 0,
  guide_fee      integer     not null default 0,
  gross_profit   integer     generated always as (revenue - guide_fee) stored,
  payment_status text        not null default 'unpaid'
                             check (payment_status in ('unpaid','partial','paid')),
  payment_date   date,
  memo           text        not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table  public.sales_records                 is '売上台帳（MVP版）';
comment on column public.sales_records.partner_name    is '取引先名。将来はFKマスタ化を想定';
comment on column public.sales_records.guide_name      is 'ガイド名。将来はFKマスタ化を想定';
comment on column public.sales_records.gross_profit    is '粗利 = revenue - guide_fee（自動計算）';
comment on column public.sales_records.payment_status  is 'unpaid=未入金 / partial=一部入金 / paid=入金済';

create index idx_sales_tour_date on public.sales_records(tour_date desc);
create index idx_sales_partner   on public.sales_records(partner_name);
create index idx_sales_guide     on public.sales_records(guide_name);
create index idx_sales_payment   on public.sales_records(payment_status);

-- ============================================================
-- レビュー台帳
-- ============================================================
create table public.review_records (
  id           uuid        primary key default gen_random_uuid(),
  tour_date    date        not null,
  case_name    text        not null default '',
  partner_name text        not null default '',
  guide_name   text        not null default '',
  has_review   boolean     not null default false,
  rating       numeric(3,1),
  review_text  text        not null default '',
  good_points  text        not null default '',
  issues       text        not null default '',
  action_memo  text        not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table  public.review_records              is 'レビュー台帳';
comment on column public.review_records.has_review   is 'true=レビュー取得済 / false=未取得';
comment on column public.review_records.rating       is '1.0〜5.0。未入力はNULL';
comment on column public.review_records.partner_name is '取引先名。将来はFKマスタ化を想定';
comment on column public.review_records.guide_name   is 'ガイド名。将来はFKマスタ化を想定';

create index idx_review_tour_date on public.review_records(tour_date desc);
create index idx_review_guide     on public.review_records(guide_name);
create index idx_review_partner   on public.review_records(partner_name);
create index idx_review_has       on public.review_records(has_review);

-- ============================================================
-- updated_at 自動更新トリガー
-- ============================================================
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

create trigger trg_review_updated_at
  before update on public.review_records
  for each row execute function public.set_updated_at();

-- ============================================================
-- 動作確認（以下の結果が出れば成功）
-- ============================================================
select
  table_name,
  (select count(*) from information_schema.columns c
   where c.table_schema = 'public' and c.table_name = t.table_name) as column_count
from information_schema.tables t
where table_schema = 'public'
  and table_name in ('sales_records', 'review_records')
order by table_name;

-- 期待される結果:
-- review_records  | 13
-- sales_records   | 14
