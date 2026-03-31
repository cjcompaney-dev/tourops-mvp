import { useState } from 'react'
import { ReviewInput } from '../../types'

const EMPTY: ReviewInput = {
  tour_date: '', case_name: '', partner_name: '', guide_name: '',
  has_review: false, rating: null,
  review_text: '', good_points: '', issues: '', action_memo: '',
}

interface Props {
  initial?: Partial<ReviewInput>
  onSave: (data: ReviewInput) => Promise<void>
  onCancel: () => void
}

export default function ReviewForm({ initial, onSave, onCancel }: Props) {
  const [form, setForm] = useState<ReviewInput>({ ...EMPTY, ...initial })
  const [saving, setSaving] = useState(false)

  const set = (k: keyof ReviewInput, v: any) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.tour_date) return alert('実施日は必須です')
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

        {/* ガイド名 */}
        <div className="form-row">
          <label className="label">ガイド名</label>
          <input className="input" type="text" placeholder="例：山田太郎" value={form.guide_name}
            onChange={e => set('guide_name', e.target.value)} />
        </div>

        {/* 案件名（全幅） */}
        <div className="form-row" style={{ gridColumn: '1 / -1' }}>
          <label className="label">案件名・ツアー名</label>
          <input className="input" type="text" placeholder="例：東京1日プライベートツアー" value={form.case_name}
            onChange={e => set('case_name', e.target.value)} />
        </div>

        {/* 取引先名 */}
        <div className="form-row" style={{ gridColumn: '1 / -1' }}>
          <label className="label">取引先名</label>
          <input className="input" type="text" placeholder="例：ABC Travel" value={form.partner_name}
            onChange={e => set('partner_name', e.target.value)} />
        </div>
      </div>

      {/* レビュー取得有無 */}
      <div className="form-row">
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.has_review}
            onChange={e => set('has_review', e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer' }} />
          <span style={{ fontWeight: 500 }}>レビューを取得した</span>
        </label>
      </div>

      {/* レビュー評価（has_reviewがtrueのときのみ） */}
      {form.has_review && (
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0 16px' }}>
          <div className="form-row">
            <label className="label">評価（1〜5）</label>
            <input className="input" type="number" min={1} max={5} step={0.5}
              placeholder="例：4.5"
              value={form.rating ?? ''}
              onChange={e => set('rating', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div className="form-row">
            <label className="label">レビュー本文</label>
            <input className="input" type="text" placeholder="レビューの内容を要約"
              value={form.review_text}
              onChange={e => set('review_text', e.target.value)} />
          </div>
        </div>
      )}

      {/* 良かった点・指摘事項 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <div className="form-row">
          <label className="label">良かった点</label>
          <textarea className="input" rows={2} placeholder="ガイドの良かった点"
            value={form.good_points}
            onChange={e => set('good_points', e.target.value)}
            style={{ resize: 'vertical' }} />
        </div>
        <div className="form-row">
          <label className="label">指摘事項・課題</label>
          <textarea className="input" rows={2} placeholder="改善すべき点・課題"
            value={form.issues}
            onChange={e => set('issues', e.target.value)}
            style={{ resize: 'vertical' }} />
        </div>
      </div>

      {/* 対応メモ（全幅） */}
      <div className="form-row">
        <label className="label">対応メモ</label>
        <textarea className="input" rows={2} placeholder="フォロー内容・対応予定など"
          value={form.action_memo}
          onChange={e => set('action_memo', e.target.value)}
          style={{ resize: 'vertical' }} />
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
