// ─── 売上台帳 ──────────────────────────────────────────────
export type PaymentStatus = 'unpaid' | 'partial' | 'paid'

export interface SalesRecord {
  id:             string
  tour_date:      string          // YYYY-MM-DD
  case_name:      string
  partner_name:   string
  guide_name:     string
  pax:            number
  revenue:        number
  guide_fee:      number
  gross_profit:   number          // 自動計算（読み取り専用）
  payment_status: PaymentStatus
  payment_date:   string | null   // YYYY-MM-DD or null
  memo:           string
  created_at:     string
  updated_at:     string
}

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
  total_tours:     number        // レビュー台帳に登録されたツアー数
  review_count:    number        // has_review=true の件数
  review_rate_pct: number
  avg_rating:      number | null
}
