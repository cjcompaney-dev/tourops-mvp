import { useState } from 'react'
import { SalesInput, PaymentStatus } from '../../types'

const EMPTY: SalesInput = {
  tour_date: '', case_name: '', partner_name: '', guide_name: '',
  pax: 1, revenue: 0, guide_fee: 0,
  payment_status: 'unpaid', payment_date: null, memo: '',
}

const STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: '未入金', partial: '一部入金', paid: '入金済',
}

interface Props {
  initial?: Partial<SalesInput>
  onSave: (data: SalesInput) => Promise<void>
  onCancel: () => void
}

export default function SalesForm({ initial, onSave, onCancel }: Props) {
  const [form, setForm] = useState<SalesInput>({ ...EMPTY, ...initial })
  const [saving, setSaving] = useState(false)

  const set = (k: keyof SalesInput, v: any) => setForm(f => ({ ...f, [k]: v }))

  const grossProfit = form.revenue - form.guide_fee
  const grossMargin = form.revenue > 0 ? Math.round(grossProfit / form.revenue * 100) : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.tour_date || !form.case_name) return alert('実施日と案件名は必須です')
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        {/* 実施日 */}
        <div className="form-row">
          <label className="label">実施日 *</label>
          <input className="input" type="date" value={form.tour_date}
            onChange={e => set('tour_date', e.target.value)} required />
        </div>

        {/* 人数 */}
        <div className="form-row">
          <label className="label">参加人数</label>
          <input className="input" type="number" min={1} value={form.pax}
            onChange={e => set('pax', Number(e.target.value))} />
        </div>

        {/* 案件名（全幅） */}
        <div className="form-row" style={{ gridColumn: '1 / -1' }}>
          <label className="label">案件名 *</label>
          <input className="input" type="text" placeholder="例：東京1日ツアー" value={form.case_name}
            onChange={e => set('case_name', e.target.value)} required />
        </div>

        {/* 取引先名 */}
        <div className="form-row">
          <label className="label">取引先名</label>
          <input className="input" type="text" placeholder="例：ABC Travel" value={form.partner_name}
            onChange={e => set('partner_name', e.target.value)} />
        </div>

        {/* ガイド名 */}
        <div className="form-row">
          <label className="label">ガイド名</label>
          <input className="input" type="text" placeholder="例：山田太郎" value={form.guide_name}
            onChange={e => set('guide_name', e.target.value)} />
        </div>

        {/* 売上金額 */}
        <div className="form-row">
          <label className="label">売上金額（円）</label>
          <input className="input" type="number" min={0} step={1000} value={form.revenue}
            onChange={e => set('revenue', Number(e.target.value))} />
        </div>

        {/* ガイド費 */}
        <div className="form-row">
          <label className="label">ガイド費（円）</label>
          <input className="input" type="number" min={0} step={1000} value={form.guide_fee}
            onChange={e => set('guide_fee', Number(e.target.value))} />
        </div>
      </div>

      {/* 粗利プレビュー */}
      <div style={{
        display: 'flex', gap: 24, padding: '10px 14px', marginBottom: 14,
        background: grossProfit >= 0 ? '#F0FDF4' : '#FEF2F2',
        borderRadius: 8, border: `1px solid ${grossProfit >= 0 ? '#BBF7D0' : '#FECACA'}`,
        fontSize: 13,
      }}>
        <span>粗利：<strong style={{ color: grossProfit >= 0 ? '#15803D' : '#DC2626' }}>
          ¥{grossProfit.toLocaleString()}
        </strong></span>
        <span>粗利率：<strong>{grossMargin}%</strong></span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        {/* 入金状況 */}
        <div className="form-row">
          <label className="label">入金状況</label>
          <select className="input" value={form.payment_status}
            onChange={e => set('payment_status', e.target.value as PaymentStatus)}>
            {(Object.entries(STATUS_LABELS) as [PaymentStatus, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* 入金日 */}
        <div className="form-row">
          <label className="label">入金日</label>
          <input className="input" type="date"
            value={form.payment_date ?? ''}
            onChange={e => set('payment_date', e.target.value || null)} />
        </div>

        {/* メモ（全幅） */}
        <div className="form-row" style={{ gridColumn: '1 / -1' }}>
          <label className="label">メモ</label>
          <textarea className="input" rows={2} placeholder="備考・特記事項" value={form.memo}
            onChange={e => set('memo', e.target.value)} style={{ resize: 'vertical' }} />
        </div>
      </div>

      {/* ボタン */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>キャンセル</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  )
}
