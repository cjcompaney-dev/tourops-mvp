// ─── 売上台帳 ──────────────────────────────────────────────
export type PaymentStatus = 'unpaid' | 'partial' | 'paid'
export type RecordType    = 'normal' | 'cancelled' | 'training'

export interface SalesRecord {
  id:             string
  tour_date:      string          // YYYY-MM-DD
  case_name:      string
  partner_name:   string
  guide_name:     string
  pax:            number
  revenue:        number
  guide_fee:      number
  gross_profit:   number          // 自動計算（読み取り専用・insert/update対象外）
  payment_status: PaymentStatus
  payment_date:   string | null   // YYYY-MM-DD or null
  payment_method: string          // 銀行振込 / PayPal / Stripe 等
  record_type:    RecordType
  memo:           string
  created_at:     string
  updated_at:     string
}

// gross_profit を除いた書き込み用型
export type SalesInput = Omit<SalesRecord, 'id' | 'gross_profit' | 'created_at' | 'updated_at'>

// ─── レビュー台帳 ──────────────────────────────────────────
export interface ReviewRecord {
  id:           string
  tour_date:    string
  case_name:    string
  partner_name: string
  guide_name:   string
  has_review:   boolean
  rating:       number | null     // 1.0〜5.0、未入力はnull
  review_text:  string
  good_points:  string
  issues:       string
  action_memo:  string
  created_at:   string
  updated_at:   string
}

export type ReviewInput = Omit<ReviewRecord, 'id' | 'created_at' | 'updated_at'>

// ─── キャンセルポリシー ────────────────────────────────────
export interface CancelPolicy {
  id:               string
  target_type:      'partner' | 'guide'
  target_name:      string        // 取引先名 / ガイド名 / '__all_guides__'
  tier_name:        string
  hours_before_min: number
  hours_before_max: number | null
  rate_pct:         number
  notes:            string
  created_at:       string
  updated_at:       string
}

// ─── キャンセル実績 ────────────────────────────────────────
export interface CancellationRecord {
  id:                   string
  sales_record_id:      string | null
  tour_date:            string
  cancelled_at:         string
  hours_before_start:   number | null
  partner_name:         string
  guide_name:           string
  original_revenue:     number
  original_guide_fee:   number
  revenue_collected:    number    // 取引先から徴収したキャンセル料
  guide_fee_paid:       number    // ガイドへ支払ったキャンセル補償
  partner_policy_tier:  string
  partner_rate_applied: number | null
  guide_policy_tier:    string
  guide_rate_applied:   number | null
  collection_status:    'unpaid' | 'paid' | 'waived'
  payment_status:       'unpaid' | 'paid' | 'waived'
  notes:                string
  created_at:           string
  updated_at:           string
}

export type CancellationInput = Omit<CancellationRecord, 'id' | 'created_at' | 'updated_at'>

// ─── バリデーション結果 ────────────────────────────────────
export interface ValidationResult {
  errors:   string[]   // 保存禁止（必須・型・許可値外）
  warnings: string[]   // 警告のみ（保存は通す）
}

// ─── ダッシュボード警告 ────────────────────────────────────
export interface DashboardAlert {
  unpaidCount:         number   // 未収案件数
  paymentMismatch:     number   // 入金日とstatusの矛盾
  salesDuplicates:     number   // 重複疑い件数
  lowRatingReviews:    number   // 低評価（rating <= 3）
  reviewMissing:       number   // has_review=false 件数
  cancelMismatch:      number   // cancelled判定の整合性エラー
}

// ─── 月次集計（ダッシュボード用） ──────────────────────────
export interface MonthlySalesSummary {
  month:            string        // YYYY-MM
  tour_count:       number
  revenue:          number
  guide_fee:        number
  gross_profit:     number
  gross_margin_pct: number
  avg_price:        number
  unpaid_amount:    number
}

export interface MonthlyReviewSummary {
  month:           string
  total_tours:     number
  review_count:    number
  review_rate_pct: number
  avg_rating:      number | null
}
