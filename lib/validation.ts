/**
 * lib/validation.ts
 * 売上台帳・レビュー台帳・キャンセルの全バリデーションロジック
 * フォームとDB両方から呼べるよう、Supabase依存なし・純粋関数で記述
 */

import { SalesInput, ReviewInput, ValidationResult, CancelPolicy } from '../types'

// ─── 表記ゆれマップ ────────────────────────────────────────
const PARTNER_VARIANTS: Record<string, string[]> = {
  'Tourist Japan':      ['TI Tours', 'ti tours', 'tourist japan'],
  'Teahouse Trails LLC':['Tea house tours', 'tea house tours', 'teahouse trails'],
  '株式会社レイライン':  ['Ray Line', 'ray line', 'Rayline'],
}

// ─── 売上台帳バリデーション ────────────────────────────────
export function validateSales(
  input: SalesInput,
  existingRecords: { tour_date: string; case_name: string; partner_name: string; guide_name: string; id?: string }[],
  editingId?: string
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // A. 必須入力チェック
  if (!input.tour_date)    errors.push('実施日は必須です')
  if (!input.case_name?.trim())    errors.push('案件名は必須です')
  if (!input.partner_name?.trim()) errors.push('取引先名は必須です')
  if (!input.guide_name?.trim())   errors.push('ガイド名は必須です')

  if (input.record_type === 'normal') {
    // revenue: null / undefined / 0 すべてエラー
    if (input.revenue == null || (input.revenue as any) === '' || input.revenue === 0)
      errors.push('通常案件の売上金額は1円以上を入力してください')
    // guide_fee: null / undefined はエラー（0は許容）
    if (input.guide_fee == null)
      errors.push('通常案件はガイド費を入力してください（未発生の場合は0）')
  }

  // B. 型・範囲チェック
  if (input.pax != null && (input.pax < 1 || !Number.isInteger(input.pax)))
    errors.push('参加人数は1以上の整数で入力してください')

  if (input.revenue != null && (input.revenue < 0 || !Number.isInteger(input.revenue)))
    errors.push('売上金額は0以上の整数で入力してください')

  if (input.guide_fee != null && (input.guide_fee < 0 || !Number.isInteger(input.guide_fee)))
    errors.push('ガイド費は0以上の整数で入力してください')

  const validStatuses = ['unpaid', 'partial', 'paid']
  if (!validStatuses.includes(input.payment_status))
    errors.push('入金状況の値が不正です')

  const validTypes = ['normal', 'cancelled', 'training']
  if (!validTypes.includes(input.record_type))
    errors.push('レコード種別の値が不正です')

  // C. 整合性チェック（警告）
  if (input.payment_status === 'paid' && !input.revenue)
    warnings.push('入金済みですが売上金額が空欄です')

  if (input.payment_status === 'unpaid' && input.payment_date)
    warnings.push('未入金ですが入金日が入力されています')

  if (input.payment_date && input.payment_status === 'unpaid')
    warnings.push('入金日が入力されていますが、入金状況が「未入金」のままです')

  if (input.payment_method && input.payment_status === 'unpaid')
    warnings.push('入金方法が入力されていますが、入金状況が「未入金」のままです')

  if (input.revenue != null && input.guide_fee != null && input.guide_fee > input.revenue)
    warnings.push(`ガイド費（¥${input.guide_fee.toLocaleString()}）が売上（¥${input.revenue.toLocaleString()}）を上回っています`)

  if (input.revenue != null && input.guide_fee != null && (input.revenue - input.guide_fee) < 0)
    warnings.push('粗利がマイナスになっています')

  // E. 表記ゆれ警告
  if (input.partner_name) {
    const name = input.partner_name.trim()
    for (const [canonical, variants] of Object.entries(PARTNER_VARIANTS)) {
      if (variants.map(v => v.toLowerCase()).includes(name.toLowerCase())) {
        warnings.push(`取引先名「${name}」は「${canonical}」の表記ゆれの可能性があります`)
        break
      }
    }
  }

  // F. 重複チェック（エラー：同一条件は保存禁止）
  if (input.tour_date && input.case_name && input.partner_name && input.guide_name) {
    const dup = existingRecords.find(r =>
      r.tour_date     === input.tour_date &&
      r.case_name     === input.case_name &&
      r.partner_name  === input.partner_name &&
      r.guide_name    === input.guide_name &&
      r.id !== editingId
    )
    if (dup) errors.push('同じ日付・案件名・取引先・ガイドの記録が既に存在します（重複）')
  }

  return { errors, warnings }
}

// ─── レビュー台帳バリデーション ───────────────────────────
export function validateReview(
  input: ReviewInput,
  salesRecords: { tour_date: string; case_name: string; partner_name: string; guide_name: string }[],
  existingReviews: { tour_date: string; case_name: string; guide_name: string; id?: string }[],
  editingId?: string
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // A. 必須入力
  if (!input.tour_date)            errors.push('実施日は必須です')
  if (!input.case_name?.trim())    errors.push('案件名は必須です')
  if (!input.partner_name?.trim()) errors.push('取引先名は必須です')
  if (!input.guide_name?.trim())   errors.push('ガイド名は必須です')

  if (input.has_review && (input.rating == null))
    errors.push('レビュー取得済みの場合、評価（rating）は必須です')

  // B. 型チェック
  if (input.rating != null && (input.rating < 1 || input.rating > 5))
    errors.push('評価は1〜5の範囲で入力してください')

  // C. 整合性チェック（警告）
  if (!input.has_review && (input.rating != null || input.review_text))
    warnings.push('レビュー未取得ですが、評価またはレビュー本文が入力されています')

  if (input.has_review && !input.good_points && !input.issues)
    warnings.push('レビュー取得済みですが、良かった点・指摘事項がどちらも空欄です')

  // 売上台帳との照合（警告）
  if (input.tour_date && input.case_name && salesRecords.length > 0) {
    const matched = salesRecords.find(s =>
      s.tour_date    === input.tour_date &&
      s.case_name    === input.case_name &&
      s.guide_name   === input.guide_name
    )
    if (!matched) warnings.push('売上台帳に対応する案件が見つかりません。案件名・ガイド名・日付を確認してください')
  }

  // 重複チェック（警告）
  if (input.tour_date && input.case_name && input.guide_name) {
    const dup = existingReviews.find(r =>
      r.tour_date  === input.tour_date &&
      r.case_name  === input.case_name &&
      r.guide_name === input.guide_name &&
      r.id !== editingId
    )
    if (dup) warnings.push('同じ日付・案件名・ガイドのレビューが既に存在します（重複の可能性）')
  }

  return { errors, warnings }
}

// ─── ダッシュボード警告集計 ───────────────────────────────
export function computeDashboardAlerts(
  sales: { payment_status: string; payment_date: string | null; payment_method: string; tour_date: string; case_name: string; partner_name: string; guide_name: string; record_type: string }[],
  reviews: { has_review: boolean; rating: number | null }[],
  cancellations: { sales_record_id: string | null }[],
) {
  // 未収件数
  const unpaidCount = sales.filter(s => s.payment_status === 'unpaid').length

  // 入金日とstatusの矛盾
  const paymentMismatch = sales.filter(s =>
    (s.payment_status === 'unpaid' && s.payment_date != null) ||
    (s.payment_status === 'unpaid' && s.payment_method)
  ).length

  // 重複疑い（同日・同案件・同取引先・同ガイドが複数）
  const seen = new Map<string, number>()
  for (const s of sales) {
    const key = `${s.tour_date}|${s.case_name}|${s.partner_name}|${s.guide_name}`
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }
  const salesDuplicates = [...seen.values()].filter(v => v > 1).length

  // 低評価レビュー（3以下）
  const lowRatingReviews = reviews.filter(r => r.rating != null && r.rating <= 3).length

  // レビュー未取得
  const reviewMissing = reviews.filter(r => !r.has_review).length

  // キャンセル整合性エラー（cancellation_recordsがあるのにrecord_type!=cancelled）
  const cancelledIds = new Set(sales.filter(s => s.record_type === 'cancelled').map((s: any) => s.id))
  const cancelMismatch = cancellations.filter(c =>
    c.sales_record_id && !cancelledIds.has(c.sales_record_id)
  ).length

  return { unpaidCount, paymentMismatch, salesDuplicates, lowRatingReviews, reviewMissing, cancelMismatch }
}

// ─── キャンセル金額自動提案 ───────────────────────────────

export interface CancelSuggestion {
  partnerAmount:  number        // 取引先から徴収する提案額
  guideAmount:    number        // ガイドへ支払う提案額
  partnerTier:    string        // 適用したポリシー区分名
  guideTier:      string        // 適用したポリシー区分名
  partnerRate:    number | null // 適用率（%）
  guideRate:      number | null // 適用率（%）
}

/**
 * キャンセル金額を自動提案する
 * - '__all_guides__' は全ガイド共通ポリシーとして扱う
 * - hours_before_max が null のときは「その時間以上」を意味する
 */
export function suggestCancelAmount(
  partnerName:       string,
  guideName:         string,
  hoursBeforeStart:  number,
  originalRevenue:   number,
  originalGuideFee:  number,
  policies:          CancelPolicy[]
): CancelSuggestion {

  function findPolicy(type: 'partner' | 'guide', name: string): CancelPolicy | null {
    // 完全一致を優先、なければ __all_guides__ を探す
    const exact = policies.find(p =>
      p.target_type === type &&
      p.target_name === name &&
      p.hours_before_min <= hoursBeforeStart &&
      (p.hours_before_max === null || hoursBeforeStart < p.hours_before_max)
    )
    if (exact) return exact

    if (type === 'guide') {
      return policies.find(p =>
        p.target_type === 'guide' &&
        p.target_name === '__all_guides__' &&
        p.hours_before_min <= hoursBeforeStart &&
        (p.hours_before_max === null || hoursBeforeStart < p.hours_before_max)
      ) ?? null
    }
    return null
  }

  const partnerPolicy = findPolicy('partner', partnerName)
  const guidePolicy   = findPolicy('guide',   guideName)

  const partnerAmount = partnerPolicy
    ? Math.round(originalRevenue  * partnerPolicy.rate_pct / 100)
    : 0

  const guideAmount = guidePolicy
    ? Math.round(originalGuideFee * guidePolicy.rate_pct / 100)
    : 0

  return {
    partnerAmount,
    guideAmount,
    partnerTier:  partnerPolicy?.tier_name ?? '該当ポリシーなし',
    guideTier:    guidePolicy?.tier_name   ?? '該当ポリシーなし',
    partnerRate:  partnerPolicy?.rate_pct  ?? null,
    guideRate:    guidePolicy?.rate_pct    ?? null,
  }
}
