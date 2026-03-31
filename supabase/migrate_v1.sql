-- ============================================================
-- TourOps MVP — テーブル修正SQL
-- 既存の sales_records に列を追加 + review_records を新規作成
-- Supabase Dashboard > SQL Editor に貼り付けて Run
-- ============================================================

-- ============================================================
-- 既存の sales_records テーブルに不足列を追加
-- （既に存在する列はスキップされます）
-- ============================================================

-- case_name（案件名）
alter table public.sales_records
  add column if not exists case_name text not null default '';

-- partner_name（取引先名・文字列）
alter table public.sales_records
  add column if not exists partner_name text not null default '';

-- guide_name（ガイド名・文字列）
alter table public.sales_records
  add column if not exists guide_name text not null default '';

-- pax（参加人数）
alter table public.sales_records
  add column if not exists pax integer not null default 1;

-- guide_fee（ガイド費）
-- ※ 既存テーブルに guide_fee が既にある場合はスキップされます
alter table public.sales_records
  add column if not exists guide_fee integer not null default 0;

-- payment_date（入金日）
alter table public.sales_records
  add column if not exists payment_date date;

-- memo（メモ）
alter table public.sales_records
  add column if not exists memo text not null default '';

-- payment_status の型確認（既存列のチェック制約を追加）
-- ※ 既に payment_status がある場合は値を確認だけします
-- alter table public.sales_records
--   add column if not exists payment_status text not null default 'unpaid';


-- ============================================================
-- review_records テーブルを新規作成
-- ============================================================

create table if not exists public.review_records (
  id            uuid        primary key default gen_random_uuid(),
  tour_date     date        not null,
  case_name     text        not null default '',
  partner_name  text        not null default '',
  guide_name    text        not null default '',
  has_review    boolean     not null default false,
  rating        numeric(3,1),
  review_text   text        not null default '',
  good_points   text        not null default '',
  issues        text        not null default '',
  action_memo   text        not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- updated_at トリガー（関数が既にある場合はスキップ）
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- review_records のトリガー
drop trigger if exists trg_review_updated_at on public.review_records;
create trigger trg_review_updated_at
  before update on public.review_records
  for each row execute function public.set_updated_at();

-- インデックス
create index if not exists idx_review_tour_date on public.review_records(tour_date desc);
create index if not exists idx_review_guide     on public.review_records(guide_name);
create index if not exists idx_review_partner   on public.review_records(partner_name);
create index if not exists idx_review_has       on public.review_records(has_review);

-- sales_records にも念のためインデックス追加
create index if not exists idx_sales_partner on public.sales_records(partner_name);
create index if not exists idx_sales_guide   on public.sales_records(guide_name);


-- ============================================================
-- 動作確認：以下が表示されれば成功
-- ============================================================

-- テーブル確認
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('sales_records', 'review_records')
order by table_name;

-- sales_records の列確認
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'sales_records'
order by ordinal_position;
