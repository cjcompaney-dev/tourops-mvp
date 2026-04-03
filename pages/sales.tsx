import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import { SalesRecord, SalesInput, PaymentStatus } from '../types'
import SalesForm from '../components/sales/SalesForm'

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  unpaid: '未入金', partial: '一部入金', paid: '入金済',
}
const PAYMENT_BADGE: Record<PaymentStatus, string> = {
  unpaid: 'badge-red', partial: 'badge-amber', paid: 'badge-green',
}

const fmt = (n: number) => `¥${n.toLocaleString()}`
const thisMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function SalesPage() {
  const [records,     setRecords]     = useState<SalesRecord[]>([])
  const [loading,     setLoading]     = useState(true)
  const [month,       setMonth]       = useState(thisMonth())
  const [statusFilter,setStatusFilter]= useState<PaymentStatus | ''>('')
  const [modal,       setModal]       = useState<'add' | 'edit' | null>(null)
  const [editing,     setEditing]     = useState<SalesRecord | null>(null)

  // ── データ取得 ────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('sales_records')
      .select('*')
      .order('tour_date', { ascending: false })

    if (month) {
      const [y, m] = month.split('-').map(Number)
      const start = `${y}-${String(m).padStart(2,'0')}-01`
      const end   = `${m === 12 ? y+1 : y}-${String(m === 12 ? 1 : m+1).padStart(2,'0')}-01`
      q = q.gte('tour_date', start).lt('tour_date', end)
    }
    if (statusFilter) q = q.eq('payment_status', statusFilter)

    const { data } = await q
    setRecords(data ?? [])
    setLoading(false)
  }, [month, statusFilter])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  // ── CRUD ─────────────────────────────────────────────────
  async function handleSave(input: SalesInput) {
    if (modal === 'edit' && editing) {
      const { error } = await supabase.from('sales_records').update(input).eq('id', editing.id)
      if (error) { alert('更新エラー: ' + error.message); return }
    } else {
      const { error } = await supabase.from('sales_records').insert(input)
      if (error) { alert('追加エラー: ' + error.message); return }
    }
    setModal(null); setEditing(null)
    fetchRecords()
  }

  async function handleDelete(id: string) {
    if (!confirm('この案件を削除しますか？')) return
    const { error } = await supabase.from('sales_records').delete().eq('id', id)
    if (error) { alert('削除エラー: ' + error.message); return }
    fetchRecords()
  }

  // ── 集計 ─────────────────────────────────────────────────
  const totalRevenue    = records.reduce((s, r) => s + r.revenue, 0)
  const totalGuideFee   = records.reduce((s, r) => s + r.guide_fee, 0)
  const totalGrossProfit= records.reduce((s, r) => s + r.gross_profit, 0)
  const grossMargin     = totalRevenue > 0 ? Math.round(totalGrossProfit / totalRevenue * 100) : 0
  const unpaidAmount    = records.filter(r => r.payment_status !== 'paid').reduce((s, r) => s + r.revenue, 0)

  return (
    <>
      <Head><title>売上台帳 | TourOps</title></Head>

      {/* ── ページヘッダー ── */}
      <div className="page-header">
        <h1 className="page-title">売上台帳</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setModal('add') }}>
          + 案件追加
        </button>
      </div>

      {/* ── フィルター ── */}
      <div className="filter-bar">
        <div>
          <label className="label" style={{ display: 'inline', marginRight: 6 }}>月</label>
          <input type="month" className="input" value={month}
            onChange={e => setMonth(e.target.value)}
            style={{ width: 150 }} />
        </div>
        <div>
          <label className="label" style={{ display: 'inline', marginRight: 6 }}>入金状況</label>
          <select className="input" value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as PaymentStatus | '')}
            style={{ width: 130 }}>
            <option value="">すべて</option>
            {(Object.entries(PAYMENT_LABEL) as [PaymentStatus, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchRecords}>更新</button>
      </div>

      {/* ── 集計バー ── */}
      <div className="summary-bar" style={{ marginBottom: 16 }}>
        <div className="summary-item">
          <span className="summary-label">件数</span>
          <span className="summary-value">{records.length}件</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">売上合計</span>
          <span className="summary-value">{fmt(totalRevenue)}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">ガイド費合計</span>
          <span className="summary-value">{fmt(totalGuideFee)}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">粗利合計</span>
          <span className="summary-value" style={{ color: totalGrossProfit >= 0 ? '#15803D' : '#DC2626' }}>
            {fmt(totalGrossProfit)}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">粗利率</span>
          <span className="summary-value">{grossMargin}%</span>
        </div>
        {unpaidAmount > 0 && (
          <div className="summary-item">
            <span className="summary-label">未収金</span>
            <span className="summary-value" style={{ color: '#DC2626' }}>{fmt(unpaidAmount)}</span>
          </div>
        )}
      </div>

      {/* ── テーブル ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>読み込み中...</div>
        ) : records.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
            {month}のデータがありません
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>実施日</th>
                  <th>案件名</th>
                  <th>取引先</th>
                  <th>ガイド</th>
                  <th style={{ textAlign: 'right' }}>売上</th>
                  <th style={{ textAlign: 'right' }}>ガイド費</th>
                  <th style={{ textAlign: 'right' }}>粗利</th>
                  <th style={{ textAlign: 'right' }}>粗利率</th>
                  <th>入金状況</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const margin = r.revenue > 0 ? Math.round(r.gross_profit / r.revenue * 100) : 0
                  return (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{r.tour_date}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{r.case_name}</div>
                        {r.memo && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{r.memo}</div>}
                      </td>
                      <td style={{ color: '#6B7280' }}>{r.partner_name || '—'}</td>
                      <td style={{ color: '#6B7280' }}>{r.guide_name || '—'}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(r.revenue)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap', color: '#6B7280' }}>{fmt(r.guide_fee)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap',
                                   color: r.gross_profit >= 0 ? '#15803D' : '#DC2626', fontWeight: 500 }}>
                        {fmt(r.gross_profit)}
                      </td>
                      <td style={{ textAlign: 'right' }}>{margin}%</td>
                      <td>
                        <span className={`badge ${PAYMENT_BADGE[r.payment_status]}`}>
                          {PAYMENT_LABEL[r.payment_status]}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm"
                            onClick={() => { setEditing(r); setModal('edit') }}>編集</button>
                          <button className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(r.id)}>削除</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── モーダル ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <h2 className="modal-title">{modal === 'add' ? '案件追加' : '案件編集'}</h2>
            <SalesForm
              initial={editing ?? undefined}
              onSave={handleSave}
              onCancel={() => { setModal(null); setEditing(null) }}
            />
          </div>
        </div>
      )}
    </>
  )
}
