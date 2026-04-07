import { useState, useEffect } from 'react'
import { SalesInput, PaymentStatus, RecordType, ValidationResult } from '../../types'
import { validateSales } from '../../lib/validation'
import ValidationAlert from '../ui/ValidationAlert'

const EMPTY: SalesInput = {
  tour_date: '', case_name: '', partner_name: '', guide_name: '',
  pax: 1, revenue: 0, guide_fee: 0,
  payment_status: 'unpaid', payment_date: null,
  payment_method: '', record_type: 'normal', memo: '',
}

const STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: '未入金', partial: '一部入金', paid: '入金済',
}

const TYPE_LABELS: Record<RecordType, string> = {
  normal: '通常', cancelled: 'キャンセル', training: '研修',
}

interface Props {
  initial?: Partial<SalesInput>
  editingId?: string
  existingRecords: { tour_date: string; case_name: string; partner_name: string; guide_name: string; id?: string }[]
  onSave: (data: SalesInput) => Promise<void>
  onCancel: () => void
}

export default function SalesForm({ initial, editingId, existingRecords, onSave, onCancel }: Props) {
  const [form, setForm]     = useState<SalesInput>({ ...EMPTY, ...initial })
  const [saving, setSaving] = useState(false)
  const [validation, setValidation] = useState<ValidationResult>({ errors: [], warnings: [] })
  const [submitted, setSubmitted] = useState(false)

  const set = (k: keyof SalesInput, v: any) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (submitted) {
      setValidation(validateSales(form, existingRecords, editingId))
    }
  }, [form, submitted])

  const grossProfit = (form.revenue ?? 0) - (form.guide_fee ?? 0)
  const grossMargin = (form.revenue ?? 0) > 0
    ? Math.round(grossProfit / form.revenue * 100) : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    const result = validateSales(form, existingRecords, editingId)
    setValidation(result)

    if (result.errors.length > 0) return

    if (result.warnings.length > 0) {
      const msg = result.warnings.join('\n') + '\n\n警告を確認した上で保存しますか？'
      if (!confirm(msg)) return
    }

    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit}>
      {submitted && <ValidationAlert result={validation} />}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <div className="form-row">
          <label className="label">実施日 *</label>
          <input className="input" type="date" value={form.tour_date}
            onChange={e => set('tour_date', e.target.value)} />
        </div>

        <div className="form-row">
          <label className="label">種別</label>
          <select className="input" value={form.record_type}
            onChange={e => set('record_type', e.target.value as RecordType)}>
            {(Object.entries(TYPE_LABELS) as [RecordType, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="form-row" style={{ gridColumn: '1 / -1' }}>
          <label className="label">案件名 *</label>
          <input className="input" type="text" placeholder="例：Tokyo day tour"
            value={form.case_name}
            onChange={e => set('case_name', e.target.value)} />
        </div>

        <div className="form-row">
          <label className="label">取引先名 *</label>
          <input className="input" type="text" placeholder="例：Tourist Japan"
            value={form.partner_name}
            onChange={e => set('partner_name', e.target.value)} />
        </div>

        <div className="form-row">
          <label className="label">ガイド名 *</label>
          <input className="input" type="text" placeholder="例：Daniel Shaw"
            value={form.guide_name}
            onChange={e => set('guide_name', e.target.value)} />
        </div>

        <div className="form-row">
          <label className="label">参加人数</label>
          <input className="input" type="number" min={1}
            value={form.pax}
            onChange={e => set('pax', Number(e.target.value))} />
        </div>

        <div className="form-row">
          <label className="label">
            売上金額（円）{form.record_type === 'cancelled' ? '（キャンセル料）' : form.record_type === 'normal' ? ' *' : ''}
          </label>
          <input className="input" type="number" min={0} step={1000}
            value={form.revenue ?? ''}
            onChange={e => set('revenue', e.target.value === '' ? null : Number(e.target.value))} />
        </div>

        <div className="form-row">
          <label className="label">
            ガイド費（円）{form.record_type === 'cancelled' ? '（補償額）' : form.record_type === 'normal' ? ' *' : ''}
          </label>
          <input className="input" type="number" min={0} step={1000}
            value={form.guide_fee ?? ''}
            onChange={e => set('guide_fee', e.target.value === '' ? null : Number(e.target.value))} />
        </div>
      </div>

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
        <div className="form-row">
          <label className="label">入金状況</label>
          <select className="input" value={form.payment_status}
            onChange={e => set('payment_status', e.target.value as PaymentStatus)}>
            {(Object.entries(STATUS_LABELS) as [PaymentStatus, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label className="label">入金日</label>
          <input className="input" type="date"
            value={form.payment_date ?? ''}
            onChange={e => set('payment_date', e.target.value || null)} />
        </div>

        <div className="form-row" style={{ gridColumn: '1 / -1' }}>
          <label className="label">入金方法</label>
          <select className="input" value={form.payment_method}
            onChange={e => set('payment_method', e.target.value)}>
            <option value="">未選択</option>
            <option value="銀行振込">銀行振込</option>
            <option value="PayPal">PayPal</option>
            <option value="Stripe">Stripe</option>
            <option value="現金">現金</option>
            <option value="その他">その他</option>
          </select>
        </div>

        <div className="form-row" style={{ gridColumn: '1 / -1' }}>
          <label className="label">メモ</label>
          <textarea className="input" rows={2} placeholder="備考・特記事項"
            value={form.memo}
            onChange={e => set('memo', e.target.value)}
            style={{ resize: 'vertical' }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>キャンセル</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  )
}
