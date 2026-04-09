import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { SalesRecord, CancelPolicy, CancellationInput } from '../../types'
import { suggestCancelAmount } from '../../lib/validation'

interface Props {
  salesRecord: SalesRecord   // 元のキャンセル案件（sales_records の1行）
  onSaved: () => void
  onCancel: () => void
}

const fmt = (n: number) => `¥${n.toLocaleString()}`

const STATUS_LABELS = {
  unpaid: '未収',
  paid:   '徴収済',
  waived: '免除',
}

export default function CancellationModal({ salesRecord, onSaved, onCancel }: Props) {
  const [policies,  setPolicies]  = useState<CancelPolicy[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  // フォーム state
  const [cancelledAt,       setCancelledAt]       = useState(new Date().toISOString().slice(0, 10))
  const [hoursBeforeStart,  setHoursBeforeStart]  = useState<number | ''>('')
  const [revenueCollected,  setRevenueCollected]  = useState<number>(0)
  const [guideFeePaid,      setGuideFeePaid]       = useState<number>(0)
  const [collectionStatus,  setCollectionStatus]  = useState<'unpaid' | 'paid' | 'waived'>('unpaid')
  const [paymentStatus,     setPaymentStatus]      = useState<'unpaid' | 'paid' | 'waived'>('unpaid')
  const [notes,             setNotes]             = useState('')

  // 提案値
  const [suggestion, setSuggestion] = useState<ReturnType<typeof suggestCancelAmount> | null>(null)
  const [suggestionApplied, setSuggestionApplied] = useState(false)

  // ポリシー取得
  useEffect(() => {
    supabase
      .from('cancel_policies')
      .select('*')
      .then(({ data, error }) => {
        if (!error) setPolicies((data ?? []) as CancelPolicy[])
        setLoading(false)
      })
  }, [])

  // hours_before_start が変わるたびに提案額を再計算
  useEffect(() => {
    if (hoursBeforeStart === '' || policies.length === 0) {
      setSuggestion(null)
      return
    }
    const s = suggestCancelAmount(
      salesRecord.partner_name,
      Number(hoursBeforeStart),
      salesRecord.revenue ?? 0,
      salesRecord.guide_fee ?? 0,
      policies,
    )
    setSuggestion(s)
    setSuggestionApplied(false)
  }, [hoursBeforeStart, policies])

  // 提案額を適用
  function applysuggestion() {
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
      sales_record_id:     salesRecord.id,
      tour_date:           salesRecord.tour_date,
      cancelled_at:        cancelledAt,
      hours_before_start:  hoursBeforeStart === '' ? null : Number(hoursBeforeStart),
      partner_name:        salesRecord.partner_name,
      guide_name:          salesRecord.guide_name,
      original_revenue:    salesRecord.revenue ?? 0,
      original_guide_fee:  salesRecord.guide_fee ?? 0,
      revenue_collected:   revenueCollected,
      guide_fee_paid:      guideFeePaid,
      partner_policy_tier: suggestion?.partnerTier ?? '',
      partner_rate_applied: suggestion?.partnerRatePct ?? null,
      guide_policy_tier:   suggestion?.guideTier ?? '',
      guide_rate_applied:  suggestion?.guideRatePct ?? null,
      collection_status:   collectionStatus,
      payment_status:      paymentStatus,
      notes,
    }

    const { error: insertError } = await supabase
      .from('cancellation_records')
      .insert(input)

    setSaving(false)

    if (insertError) {
      setError('保存エラー: ' + insertError.message)
      return
    }
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        {/* ヘッダー */}
        <div style={{ marginBottom: 20 }}>
          <h2 className="modal-title" style={{ marginBottom: 4 }}>キャンセル実績を登録</h2>
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
        ) : (
          <form onSubmit={handleSubmit}>

            {/* ─── キャンセル日時 ─── */}
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

            {/* ─── ポリシー提案 ─── */}
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
                  onClick={applysuggestion}>
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

            {/* ─── 実際の金額 ─── */}
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

            {/* ─── ステータス ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div className="form-row">
                <label className="label">取引先からの徴収状況</label>
                <select className="input" value={collectionStatus}
                  onChange={e => setCollectionStatus(e.target.value as any)}>
                  {(Object.entries(STATUS_LABELS) as [string, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label className="label">ガイドへの支払状況</label>
                <select className="input" value={paymentStatus}
                  onChange={e => setPaymentStatus(e.target.value as any)}>
                  {(Object.entries(STATUS_LABELS) as [string, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ─── メモ ─── */}
            <div className="form-row">
              <label className="label">備考</label>
              <textarea className="input" rows={2}
                placeholder="交渉経緯・特記事項など"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ resize: 'vertical' }} />
            </div>

            {/* エラー */}
            {error && (
              <div style={{
                padding: '10px 12px', marginBottom: 12,
                background: '#FEF2F2', border: '1px solid #FECACA',
                borderRadius: 8, fontSize: 13, color: '#B91C1C',
              }}>
                {error}
              </div>
            )}

            {/* ボタン */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={onCancel}>
                キャンセル
              </button>
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
