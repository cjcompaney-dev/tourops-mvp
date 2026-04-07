import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { SalesRecord, CancelPolicy, CancellationRecord, CancellationInput } from '../../types'
import { suggestCancelAmount } from '../../lib/validation'

interface Props {
  salesRecord: SalesRecord
  // mode='new'  → 新規登録フォーム
  // mode='view' → 登録済み内容の確認表示
  mode: 'new' | 'view'
  // mode='view' のとき渡す既存レコード
  existing?: CancellationRecord
  onSaved: () => void
  onCancel: () => void
}

const fmt = (n: number) => `¥${n.toLocaleString()}`

// 取引先からの徴収状況ラベル
const COLLECTION_LABELS: Record<string, string> = {
  unpaid: '未収',
  paid:   '徴収済み',
  waived: '免除',
}

// ガイドへの支払い状況ラベル（修正1）
const PAYMENT_LABELS: Record<string, string> = {
  unpaid: '未払い',
  paid:   '支払い済み',
  waived: '支払不要',
}

export default function CancellationModal({ salesRecord, mode, existing, onSaved, onCancel }: Props) {
  const [policies,  setPolicies]  = useState<CancelPolicy[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  // フォーム state（新規登録用）
  const [cancelledAt,      setCancelledAt]      = useState(
    existing?.cancelled_at ?? new Date().toISOString().slice(0, 10)
  )
  const [hoursBeforeStart, setHoursBeforeStart] = useState<number | ''>(
    existing?.hours_before_start ?? ''
  )
  const [revenueCollected, setRevenueCollected] = useState<number>(existing?.revenue_collected ?? 0)
  const [guideFeePaid,     setGuideFeePaid]     = useState<number>(existing?.guide_fee_paid ?? 0)
  const [collectionStatus, setCollectionStatus] = useState<'unpaid'|'paid'|'waived'>(
    existing?.collection_status ?? 'unpaid'
  )
  const [paymentStatus,    setPaymentStatus]    = useState<'unpaid'|'paid'|'waived'>(
    existing?.payment_status ?? 'unpaid'
  )
  const [notes, setNotes] = useState(existing?.notes ?? '')

  // 提案値
  const [suggestion,        setSuggestion]        = useState<ReturnType<typeof suggestCancelAmount> | null>(null)
  const [suggestionApplied, setSuggestionApplied] = useState(false)

  // ポリシー取得
  useEffect(() => {
    supabase.from('cancel_policies').select('*').then(({ data, error }) => {
      if (!error) setPolicies((data ?? []) as CancelPolicy[])
      setLoading(false)
    })
  }, [])

  // hours_before_start が変わるたびに提案額を再計算（新規モードのみ）
  useEffect(() => {
    if (mode !== 'new') return
    if (hoursBeforeStart === '' || policies.length === 0) { setSuggestion(null); return }
    const s = suggestCancelAmount(
      salesRecord.partner_name,
      Number(hoursBeforeStart),
      salesRecord.revenue ?? 0,
      salesRecord.guide_fee ?? 0,
      policies,
    )
    setSuggestion(s)
    setSuggestionApplied(false)
  }, [hoursBeforeStart, policies, mode])

  function applySuggestion() {
    if (!suggestion) return
    setRevenueCollected(suggestion.partnerAmount)
    setGuideFeePaid(suggestion.guideAmount)
    setSuggestionApplied(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!cancelledAt) { setError('キャンセル日は必須です'); return }

    setSaving(true)
    const input: CancellationInput = {
      sales_record_id:      salesRecord.id,
      tour_date:            salesRecord.tour_date,
      cancelled_at:         cancelledAt,
      hours_before_start:   hoursBeforeStart === '' ? null : Number(hoursBeforeStart),
      partner_name:         salesRecord.partner_name,
      guide_name:           salesRecord.guide_name,
      original_revenue:     salesRecord.revenue ?? 0,
      original_guide_fee:   salesRecord.guide_fee ?? 0,
      revenue_collected:    revenueCollected,
      guide_fee_paid:       guideFeePaid,
      partner_policy_tier:  suggestion?.partnerTier ?? '',
      partner_rate_applied: suggestion?.partnerRatePct ?? null,
      guide_policy_tier:    suggestion?.guideTier ?? '',
      guide_rate_applied:   suggestion?.guideRatePct ?? null,
      collection_status:    collectionStatus,
      payment_status:       paymentStatus,
      notes,
    }

    const { error: err } = await supabase.from('cancellation_records').insert(input)
    setSaving(false)
    if (err) { setError('保存エラー: ' + err.message); return }
    onSaved()
  }

  // ── 確認モード（view）──────────────────────────────────
  const isView = mode === 'view'

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth: 600 }}>

        {/* ヘッダー */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h2 className="modal-title" style={{ margin: 0 }}>
              {isView ? 'キャンセル登録内容' : 'キャンセル実績を登録'}
            </h2>
            {isView && (
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 10,
                background: '#DCFCE7', color: '#15803D', fontWeight: 600,
              }}>登録済み</span>
            )}
          </div>
          <div style={{
            fontSize: 13, color: '#6B7280', padding: '8px 12px',
            background: '#FFF7ED', borderRadius: 8, border: '1px solid #FED7AA',
          }}>
            <strong>{salesRecord.case_name}</strong>
            <span style={{ margin: '0 8px', color: '#D1D5DB' }}>|</span>
            {salesRecord.tour_date}
            <span style={{ margin: '0 8px', color: '#D1D5DB' }}>|</span>
            {salesRecord.partner_name}
            <span style={{ margin: '0 8px', color: '#D1D5DB' }}>|</span>
            {salesRecord.guide_name}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF' }}>読み込み中...</div>
        ) : isView ? (
          // ── 確認モードの表示 ─────────────────────────────
          <ViewContent
            existing={existing!}
            collectionLabels={COLLECTION_LABELS}
            paymentLabels={PAYMENT_LABELS}
            onCancel={onCancel}
          />
        ) : (
          // ── 新規登録フォーム ──────────────────────────────
          <form onSubmit={handleSubmit}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div className="form-row">
                <label className="label">キャンセル発生日 *</label>
                <input className="input" type="date" value={cancelledAt}
                  onChange={e => setCancelledAt(e.target.value)} />
              </div>
              <div className="form-row">
                <label className="label">
                  ツアー開始何時間前
                  <span style={{ color: '#9CA3AF', fontWeight: 400, marginLeft: 4 }}>（提案計算に使用）</span>
                </label>
                <input className="input" type="number" min={0}
                  placeholder="例: 24（1日前）"
                  value={hoursBeforeStart}
                  onChange={e => setHoursBeforeStart(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
            </div>

            {/* ポリシー提案 */}
            {suggestion && (
              <div style={{
                padding: '12px 14px', marginBottom: 14,
                background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1E40AF', marginBottom: 8 }}>
                  ポリシーによる提案額
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                  <div>
                    <div style={{ color: '#6B7280', fontSize: 11, marginBottom: 2 }}>
                      取引先から徴収（{suggestion.partnerTier}
                      {suggestion.partnerRatePct !== null ? ` / ${suggestion.partnerRatePct}%` : ''}）
                    </div>
                    <div style={{ fontWeight: 600, color: '#1E40AF', fontSize: 16 }}>
                      {fmt(suggestion.partnerAmount)}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                      基準: {fmt(salesRecord.revenue ?? 0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#6B7280', fontSize: 11, marginBottom: 2 }}>
                      ガイドへ支払（{suggestion.guideTier}
                      {suggestion.guideRatePct !== null ? ` / ${suggestion.guideRatePct}%` : ''}）
                    </div>
                    <div style={{ fontWeight: 600, color: '#1E40AF', fontSize: 16 }}>
                      {fmt(suggestion.guideAmount)}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                      基準: {fmt(salesRecord.guide_fee ?? 0)}
                    </div>
                  </div>
                </div>
                <button type="button" className="btn btn-secondary btn-sm"
                  style={{ marginTop: 10 }}
                  onClick={applySuggestion}>
                  {suggestionApplied ? '✓ 適用済み' : '↓ この金額を適用する'}
                </button>
              </div>
            )}

            {hoursBeforeStart !== '' && policies.length === 0 && (
              <div style={{
                padding: '10px 12px', marginBottom: 14,
                background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8,
                fontSize: 13, color: '#92400E',
              }}>
                ポリシーが登録されていません。金額は手動で入力してください。
              </div>
            )}

            {/* 実際の金額 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div className="form-row">
                <label className="label">実際に徴収したキャンセル料（円）</label>
                <input className="input" type="number" min={0} step={100}
                  value={revenueCollected}
                  onChange={e => { setRevenueCollected(Number(e.target.value)); setSuggestionApplied(false) }} />
              </div>
              <div className="form-row">
                <label className="label">ガイドへ支払ったキャンセル補償（円）</label>
                <input className="input" type="number" min={0} step={100}
                  value={guideFeePaid}
                  onChange={e => { setGuideFeePaid(Number(e.target.value)); setSuggestionApplied(false) }} />
              </div>
            </div>

            {/* ステータス */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div className="form-row">
                <label className="label">取引先からの徴収状況</label>
                <select className="input" value={collectionStatus}
                  onChange={e => setCollectionStatus(e.target.value as any)}>
                  {(Object.entries(COLLECTION_LABELS) as [string, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label className="label">ガイドへの支払い状況</label>
                <select className="input" value={paymentStatus}
                  onChange={e => setPaymentStatus(e.target.value as any)}>
                  {(Object.entries(PAYMENT_LABELS) as [string, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* メモ */}
            <div className="form-row">
              <label className="label">備考</label>
              <textarea className="input" rows={2}
                placeholder="交渉経緯・特記事項など"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ resize: 'vertical' }} />
            </div>

            {error && (
              <div style={{
                padding: '10px 12px', marginBottom: 12,
                background: '#FEF2F2', border: '1px solid #FECACA',
                borderRadius: 8, fontSize: 13, color: '#B91C1C',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={onCancel}>キャンセル</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '保存中...' : '登録する'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── 確認モード専用の表示コンポーネント ──────────────────────
function ViewContent({
  existing,
  collectionLabels,
  paymentLabels,
  onCancel,
}: {
  existing: CancellationRecord
  collectionLabels: Record<string, string>
  paymentLabels: Record<string, string>
  onCancel: () => void
}) {
  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0',
      borderBottom: '1px solid #F3F4F6', fontSize: 13 }}>
      <div style={{ width: 180, flexShrink: 0, color: '#6B7280', fontSize: 12 }}>{label}</div>
      <div style={{ color: '#111827', fontWeight: 500 }}>{value}</div>
    </div>
  )

  const badge = (label: string, color: string) => (
    <span style={{
      padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
      background: color + '22', color,
    }}>{label}</span>
  )

  const collectionColor = existing.collection_status === 'paid' ? '#15803D'
    : existing.collection_status === 'waived' ? '#6B7280' : '#DC2626'
  const paymentColor = existing.payment_status === 'paid' ? '#15803D'
    : existing.payment_status === 'waived' ? '#6B7280' : '#B45309'

  return (
    <div>
      {row('キャンセル発生日',   existing.cancelled_at)}
      {row('ツアー開始何時間前', existing.hours_before_start != null
        ? `${existing.hours_before_start}時間前` : '—')}
      {row('適用ポリシー（取引先）', existing.partner_policy_tier
        ? `${existing.partner_policy_tier}${existing.partner_rate_applied != null ? ` / ${existing.partner_rate_applied}%` : ''}` : '—')}
      {row('適用ポリシー（ガイド）', existing.guide_policy_tier
        ? `${existing.guide_policy_tier}${existing.guide_rate_applied != null ? ` / ${existing.guide_rate_applied}%` : ''}` : '—')}
      {row('元の売上金額（基準）', `¥${(existing.original_revenue ?? 0).toLocaleString()}`)}
      {row('元のガイド費（基準）', `¥${(existing.original_guide_fee ?? 0).toLocaleString()}`)}
      {row('徴収したキャンセル料',
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1E40AF' }}>
          ¥{(existing.revenue_collected ?? 0).toLocaleString()}
        </span>)}
      {row('支払ったキャンセル補償',
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1E40AF' }}>
          ¥{(existing.guide_fee_paid ?? 0).toLocaleString()}
        </span>)}
      {row('取引先 徴収状況',
        badge(collectionLabels[existing.collection_status] ?? existing.collection_status, collectionColor))}
      {row('ガイド 支払い状況',
        badge(paymentLabels[existing.payment_status] ?? existing.payment_status, paymentColor))}
      {existing.notes && row('備考', existing.notes)}
      {row('登録日時', existing.created_at?.slice(0, 16).replace('T', ' ') ?? '—')}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn btn-secondary" onClick={onCancel}>閉じる</button>
      </div>
    </div>
  )
}
