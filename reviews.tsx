import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import { ReviewRecord, ReviewInput } from '../types'
import ReviewForm from '../components/reviews/ReviewForm'

const thisMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function ReviewsPage() {
  const [records,   setRecords]   = useState<ReviewRecord[]>([])
  const [loading,   setLoading]   = useState(true)
  const [month,     setMonth]     = useState(thisMonth())
  const [guideFilter, setGuideFilter] = useState('')
  const [hasFilter, setHasFilter] = useState<'all' | 'yes' | 'no'>('all')
  const [modal,     setModal]     = useState<'add' | 'edit' | null>(null)
  const [editing,   setEditing]   = useState<ReviewRecord | null>(null)
  const [tab,       setTab]       = useState<'list' | 'summary'>('list')

  // ── データ取得 ─────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('review_records')
      .select('*')
      .order('tour_date', { ascending: false })

    if (month) {
      const [y, m] = month.split('-').map(Number)
      const start = `${y}-${String(m).padStart(2,'0')}-01`
      const end   = `${m === 12 ? y+1 : y}-${String(m===12?1:m+1).padStart(2,'0')}-01`
      q = q.gte('tour_date', start).lt('tour_date', end)
    }
    if (guideFilter) q = q.eq('guide_name', guideFilter)
    if (hasFilter === 'yes') q = q.eq('has_review', true)
    if (hasFilter === 'no')  q = q.eq('has_review', false)

    const { data } = await q
    setRecords(data ?? [])
    setLoading(false)
  }, [month, guideFilter, hasFilter])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  // ── CRUD ────────────────────────────────────────────────
  async function handleSave(input: ReviewInput) {
    if (modal === 'edit' && editing) {
      const { error } = await supabase.from('review_records').update(input).eq('id', editing.id)
      if (error) { alert('更新エラー: ' + error.message); return }
    } else {
      const { error } = await supabase.from('review_records').insert(input)
      if (error) { alert('追加エラー: ' + error.message); return }
    }
    setModal(null); setEditing(null)
    fetchRecords()
  }

  async function handleDelete(id: string) {
    if (!confirm('このレコードを削除しますか？')) return
    const { error } = await supabase.from('review_records').delete().eq('id', id)
    if (error) { alert('削除エラー: ' + error.message); return }
    fetchRecords()
  }

  // ── 集計 ────────────────────────────────────────────────
  const totalCount   = records.length
  const reviewCount  = records.filter(r => r.has_review).length
  const reviewRate   = totalCount > 0 ? Math.round(reviewCount / totalCount * 100) : 0
  const ratings      = records.filter(r => r.rating !== null).map(r => r.rating!)
  const avgRating    = ratings.length > 0
    ? Math.round(ratings.reduce((s, v) => s + v, 0) / ratings.length * 10) / 10
    : null

  // ガイド別集計
  const guideNames = [...new Set(records.map(r => r.guide_name).filter(Boolean))]
  const guideSummary = guideNames.map(name => {
    const rows    = records.filter(r => r.guide_name === name)
    const rCount  = rows.filter(r => r.has_review).length
    const rRatings = rows.filter(r => r.rating !== null).map(r => r.rating!)
    return {
      name,
      total:  rows.length,
      reviewed: rCount,
      rate:   rows.length > 0 ? Math.round(rCount / rows.length * 100) : 0,
      avg:    rRatings.length > 0
        ? Math.round(rRatings.reduce((s,v)=>s+v,0)/rRatings.length*10)/10
        : null,
    }
  }).sort((a, b) => b.total - a.total)

  // ガイドの選択肢（フィルター用）
  const [allGuides, setAllGuides] = useState<string[]>([])
  useEffect(() => {
    supabase.from('review_records').select('guide_name')
      .then(({ data }) => {
        const names = [...new Set((data ?? []).map((r: any) => r.guide_name).filter(Boolean))] as string[]
        setAllGuides(names.sort())
      })
  }, [])

  return (
    <>
      <Head><title>レビュー台帳 | TourOps</title></Head>

      {/* ── ページヘッダー ── */}
      <div className="page-header">
        <h1 className="page-title">レビュー台帳</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setModal('add') }}>
          + レコード追加
        </button>
      </div>

      {/* ── フィルター ── */}
      <div className="filter-bar">
        <div>
          <label className="label" style={{ display: 'inline', marginRight: 6 }}>月</label>
          <input type="month" className="input" value={month}
            onChange={e => setMonth(e.target.value)} style={{ width: 150 }} />
        </div>
        <div>
          <label className="label" style={{ display: 'inline', marginRight: 6 }}>ガイド</label>
          <select className="input" value={guideFilter}
            onChange={e => setGuideFilter(e.target.value)} style={{ width: 150 }}>
            <option value="">すべて</option>
            {allGuides.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="label" style={{ display: 'inline', marginRight: 6 }}>レビュー</label>
          <select className="input" value={hasFilter}
            onChange={e => setHasFilter(e.target.value as any)} style={{ width: 120 }}>
            <option value="all">すべて</option>
            <option value="yes">取得済</option>
            <option value="no">未取得</option>
          </select>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchRecords}>更新</button>
      </div>

      {/* ── 集計バー ── */}
      <div className="summary-bar" style={{ marginBottom: 16 }}>
        <div className="summary-item">
          <span className="summary-label">ツアー件数</span>
          <span className="summary-value">{totalCount}件</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">レビュー取得</span>
          <span className="summary-value">{reviewCount}件</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">レビュー取得率</span>
          <span className="summary-value"
            style={{ color: reviewRate >= 60 ? '#15803D' : reviewRate >= 40 ? '#B45309' : '#DC2626' }}>
            {reviewRate}%
          </span>
        </div>
        {avgRating !== null && (
          <div className="summary-item">
            <span className="summary-label">平均評価</span>
            <span className="summary-value">★ {avgRating}</span>
          </div>
        )}
      </div>

      {/* ── タブ ── */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16,
        borderBottom: '1px solid var(--border)' }}>
        {(['list', 'summary'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '8px 20px', border: 'none', background: 'none',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              color: tab === t ? 'var(--blue)' : 'var(--text-sub)',
              borderBottom: tab === t ? '2px solid var(--blue)' : '2px solid transparent',
              marginBottom: -1,
            }}>
            {t === 'list' ? '一覧' : 'ガイド別集計'}
          </button>
        ))}
      </div>

      {/* ── 一覧タブ ── */}
      {tab === 'list' && (
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
                    <th>ガイド</th>
                    <th>取引先</th>
                    <th>レビュー</th>
                    <th>評価</th>
                    <th>良かった点・指摘</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{r.tour_date}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{r.case_name || '—'}</div>
                      </td>
                      <td>{r.guide_name || '—'}</td>
                      <td style={{ color: '#6B7280' }}>{r.partner_name || '—'}</td>
                      <td>
                        <span className={`badge ${r.has_review ? 'badge-green' : 'badge-gray'}`}>
                          {r.has_review ? '取得済' : '未取得'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {r.rating !== null ? `★ ${r.rating}` : '—'}
                      </td>
                      <td style={{ maxWidth: 220 }}>
                        {r.good_points && (
                          <div style={{ fontSize: 12, color: '#15803D' }}>
                            ◎ {r.good_points.slice(0, 40)}{r.good_points.length > 40 ? '...' : ''}
                          </div>
                        )}
                        {r.issues && (
                          <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
                            △ {r.issues.slice(0, 40)}{r.issues.length > 40 ? '...' : ''}
                          </div>
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ガイド別集計タブ ── */}
      {tab === 'summary' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {guideSummary.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>データがありません</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ガイド名</th>
                    <th style={{ textAlign: 'right' }}>ツアー件数</th>
                    <th style={{ textAlign: 'right' }}>レビュー取得数</th>
                    <th style={{ textAlign: 'right' }}>取得率</th>
                    <th style={{ textAlign: 'right' }}>平均評価</th>
                  </tr>
                </thead>
                <tbody>
                  {guideSummary.map(g => (
                    <tr key={g.name}>
                      <td style={{ fontWeight: 500 }}>{g.name}</td>
                      <td style={{ textAlign: 'right' }}>{g.total}件</td>
                      <td style={{ textAlign: 'right' }}>{g.reviewed}件</td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{
                          fontWeight: 600,
                          color: g.rate >= 60 ? '#15803D' : g.rate >= 40 ? '#B45309' : '#DC2626'
                        }}>
                          {g.rate}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {g.avg !== null ? `★ ${g.avg}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── モーダル ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <h2 className="modal-title">{modal === 'add' ? 'レコード追加' : 'レコード編集'}</h2>
            <ReviewForm
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
