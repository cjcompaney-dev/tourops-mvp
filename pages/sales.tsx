import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import { SalesRecord, SalesInput, PaymentStatus, RecordType } from '../types'
import SalesForm from '../components/sales/SalesForm'

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  unpaid: '未入金', partial: '一部入金', paid: '入金済',
}
const PAYMENT_BADGE: Record<PaymentStatus, string> = {
  unpaid: 'badge-red', partial: 'badge-amber', paid: 'badge-green',
}
const TYPE_BADGE: Record<RecordType, string> = {
  normal: '', cancelled: 'badge-red', training: 'badge-blue',
}
const TYPE_LABEL: Record<RecordType, string> = {
  normal: '', cancelled: 'キャンセル', training: '研修',
}

const fmt = (n: number) => `¥${n.toLocaleString()}`
const thisMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function SalesPage() {
  const [records,         setRecords]         = useState<SalesRecord[]>([])
  const [allRecords,      setAllRecords]       = useState<SalesRecord[]>([])
  const [cancelledIds,    setCancelledIds]     = useState<Set<string>>(new Set()) // キャンセル登録済みのsales_id
  const [loading,         setLoading]         = useState(true)
  // 期間フィルター
  const [dateFrom,        setDateFrom]        = useState('')
  const [dateTo,          setDateTo]          = useState('')
  // 月フィルター（期間未指定時）
  const [month,           setMonth]           = useState(thisMonth())
  const [statusFilter,    setStatusFilter]    = useState<PaymentStatus | ''>('')
  const [typeFilter,      setTypeFilter]      = useState<RecordType | ''>('')
  const [modal,           setModal]           = useState<'add' | 'edit' | null>(null)
  const [editing,         setEditing]         = useState<SalesRecord | null>(null)

  const usingDateRange = !!(dateFrom || dateTo)

  // 重複チェック用全件 + キャンセル登録済みIDは独立取得
  useEffect(() => {
    supabase.from('sales_records')
      .select('id,tour_date,case_name,partner_name,guide_name')
      .then(({ data }) => setAllRecords((data ?? []) as any))

    supabase.from('cancellation_records')
      .select('sales_record_id')
      .then(({ data, error }) => {
        if (!error && data) {
          const ids = new Set(data.map((c: any) => c.sales_record_id).filter(Boolean) as string[])
          setCancelledIds(ids)
        }
      })
  }, [])

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('sales_records')
      .select('*')
      .order('tour_date', { ascending: false })

    if (usingDateRange) {
      if (dateFrom) q = q.gte('tour_date', dateFrom)
      if (dateTo)   q = q.lte('tour_date', dateTo)
    } else if (month) {
      const [y, m] = month.split('-').map(Number)
      const start = `${y}-${String(m).padStart(2,'0')}-01`
      const end   = `${m === 12 ? y+1 : y}-${String(m === 12 ? 1 : m+1).padStart(2,'0')}-01`
      q = q.gte('tour_date', start).lt('tour_date', end)
    }
    if (statusFilter) q = q.eq('payment_status', statusFilter)
    if (typeFilter)   q = q.eq('record_type', typeFilter)

    const { data } = await q
    setRecords(data ?? [])
    setLoading(false)
  }, [month, dateFrom, dateTo, statusFilter, typeFilter, usingDateRange])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  async function handleSave(input: SalesInput) {
    const { gross_profit, ...safeInput } = input as any
    if (modal === 'edit' && editing) {
      const { error } = await supabase.from('sales_records').update(safeInput).eq('id', editing.id)
      if (error) { alert('更新エラー: ' + error.message); return }
    } else {
      const { error } = await supabase.from('sales_records').insert(safeInput)
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

  function clearDateRange() {
    setDateFrom('')
    setDateTo('')
  }

  const totalRevenue     = records.reduce((s, r) => s + (r.revenue ?? 0), 0)
  const totalGuideFee    = records.reduce((s, r) => s + (r.guide_fee ?? 0), 0)
  const totalGrossProfit = records.reduce((s, r) => s + (r.gross_profit ?? 0), 0)
  const grossMargin      = totalRevenue > 0 ? Math.round(totalGrossProfit / totalRevenue * 100) : 0
  const unpaidAmount     = records
    .filter(r => r.payment_status !== 'paid').reduce((s, r) => s + (r.revenue ?? 0), 0)

  const forDupCheck = allRecords.map(r => ({
    id: r.id, tour_date: r.tour_date, case_name: r.case_name,
    partner_name: r.partner_name, guide_name: r.guide_name,
  }))

  return (
    <>
      <Head><title>売上台帳 | TourOps</title></Head>

      <div className="page-header">
        <h1 className="page-title">売上台帳</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setModal('add') }}>
          + 案件追加
        </button>
      </div>

      {/* フィルター */}
      <div className="filter-bar">
        {/* 期間指定（優先） */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label className="label" style={{ display: 'inline', marginRight: 4, whiteSpace: 'nowrap' }}>期間</label>
          <input type="date" className="input" value={dateFrom}
            onChange={e => setDateFrom(e.target.value)} style={{ width: 140 }} />
          <span style={{ color: '#9CA3AF', fontSize: 13 }}>〜</span>
          <input type="date" className="input" value={dateTo}
            onChange={e => setDateTo(e.target.value)} style={{ width: 140 }} />
          {usingDateRange && (
            <button className="btn btn-secondary btn-sm" onClick={clearDateRange}>クリア</button>
          )}
        </div>

        {/* 月フィルター（期間未指定時のみ） */}
        {!usingDateRange && (
          <div>
            <label className="label" style={{ display: 'inline', marginRight: 6 }}>月</label>
            <input type="month" className="input" value={month}
              onChange={e => setMonth(e.target.value)} style={{ width: 150 }} />
          </div>
        )}

        <div>
          <label className="label" style={{ display: 'inline', marginRight: 6 }}>入金</label>
          <select className="input" value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as PaymentStatus | '')} style={{ width: 110 }}>
            <option value="">すべて</option>
            {(Object.entries(PAYMENT_LABEL) as [PaymentStatus, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" style={{ display: 'inline', marginRight: 6 }}>種別</label>
          <select className="input" value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as RecordType | '')} style={{ width: 110 }}>
            <option value="">すべて</option>
            <option value="normal">通常</option>
            <option value="cancelled">キャンセル</option>
            <option value="training">研修</option>
          </select>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchRecords}>更新</button>
      </div>

      {/* 期間指定中バッジ */}
      {usingDateRange && (
        <div style={{
          fontSize: 12, color: '#2563EB', marginBottom: 8, padding: '4px 8px',
          background: '#DBEAFE', borderRadius: 6, display: 'inline-block',
        }}>
          期間指定中: {dateFrom || '—'} 〜 {dateTo || '—'}
        </div>
      )}

      {/* 集計バー */}
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

      {/* テーブル */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>読み込み中...</div>
        ) : records.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
            {usingDateRange ? '指定期間のデータがありません' : 'データがありません'}
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
                  <th style={{ textAlign: 'right' }}>粗利</th>
                  <th style={{ textAlign: 'right' }}>粗利率</th>
                  <th>入金</th>
                  <th>種別</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const margin = (r.revenue ?? 0) > 0
                    ? Math.round((r.gross_profit ?? 0) / r.revenue * 100) : 0
                  const hasCancellation = cancelledIds.has(r.id)
                  return (
                    <tr key={r.id}
                      style={r.record_type === 'cancelled' ? { background: '#FFF7ED' } :
                             r.record_type === 'training'  ? { background: '#F0F9FF' } : {}}>
                      <td style={{ whiteSpace: 'nowrap' }}>{r.tour_date}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{r.case_name}</div>
                        {r.memo && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{r.memo}</div>}
                        {/* キャンセル登録済み表示 */}
                        {r.record_type === 'cancelled' && hasCancellation && (
                          <div style={{ fontSize: 11, color: '#15803D', marginTop: 2, fontWeight: 500 }}>
                            ✓ キャンセル登録済み
                          </div>
                        )}
                        {r.record_type === 'cancelled' && !hasCancellation && (
                          <div style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>
                            △ キャンセル詳細未登録
                          </div>
                        )}
                      </td>
                      <td style={{ color: '#6B7280' }}>{r.partner_name || '—'}</td>
                      <td style={{ color: '#6B7280' }}>{r.guide_name || '—'}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {r.revenue != null ? fmt(r.revenue) : '—'}
                      </td>
                      <td style={{
                        textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 500,
                        color: (r.gross_profit ?? 0) >= 0 ? '#15803D' : '#DC2626',
                      }}>
                        {r.gross_profit != null ? fmt(r.gross_profit) : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>{margin}%</td>
                      <td>
                        <span className={`badge ${PAYMENT_BADGE[r.payment_status]}`}>
                          {PAYMENT_LABEL[r.payment_status]}
                        </span>
                      </td>
                      <td>
                        {r.record_type !== 'normal' && (
                          <span className={`badge ${TYPE_BADGE[r.record_type]}`}>
                            {TYPE_LABEL[r.record_type]}
                          </span>
                        )}
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

      {/* モーダル */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <h2 className="modal-title">{modal === 'add' ? '案件追加' : '案件編集'}</h2>
            <SalesForm
              initial={editing ?? undefined}
              editingId={editing?.id}
              existingRecords={forDupCheck}
              onSave={handleSave}
              onCancel={() => { setModal(null); setEditing(null) }}
            />
          </div>
        </div>
      )}
    </>
  )
}
