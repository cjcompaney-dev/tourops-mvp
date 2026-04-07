import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { supabase } from '../lib/supabase'
import { SalesRecord, ReviewRecord, DashboardAlert } from '../types'
import { computeDashboardAlerts } from '../lib/validation'

const fmt  = (n: number) => `¥${n.toLocaleString()}`
const fmtK = (n: number) => n >= 10000 ? `${(n/10000).toFixed(0)}万` : String(n)

function KpiCard({ label, value, sub, color = '#2563EB' }: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: '#6B7280',
        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color, letterSpacing: '-0.5px' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// 警告カード（件数バッジ付き）
function AlertCard({ count, label, href, level }: {
  count: number; label: string; href: string; level: 'danger' | 'warning' | 'ok'
}) {
  const styles = {
    danger:  { bg: '#FEF2F2', border: '#FECACA', countColor: '#DC2626', dot: '#DC2626' },
    warning: { bg: '#FFFBEB', border: '#FDE68A', countColor: '#92400E', dot: '#F59E0B' },
    ok:      { bg: '#F0FDF4', border: '#BBF7D0', countColor: '#15803D', dot: '#15803D' },
  }
  const s = styles[level]
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        padding: '14px 16px', borderRadius: 10,
        background: s.bg, border: `1px solid ${s.border}`,
        display: 'flex', alignItems: 'center', gap: 14,
        cursor: 'pointer', transition: 'opacity .15s',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: s.dot + '22',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 18, color: s.dot }}>
            {level === 'ok' ? '✓' : level === 'danger' ? '⚠' : '!'}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{label}</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: s.countColor, flexShrink: 0 }}>
          {count}
        </div>
      </div>
    </Link>
  )
}

function last6Months(): string[] {
  const months: string[] = []
  const d = new Date()
  for (let i = 5; i >= 0; i--) {
    const t = new Date(d.getFullYear(), d.getMonth() - i, 1)
    months.push(`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}`)
  }
  return months
}

function monthLabel(ym: string) {
  const [, m] = ym.split('-')
  return `${parseInt(m)}月`
}

export default function DashboardPage() {
  const [sales,         setSales]         = useState<SalesRecord[]>([])
  const [reviews,       setReviews]       = useState<ReviewRecord[]>([])
  const [allSales,      setAllSales]      = useState<SalesRecord[]>([])  // 警告用全件
  const [allReviews,    setAllReviews]    = useState<ReviewRecord[]>([]) // 警告用全件
  const [cancellations, setCancellations] = useState<{sales_record_id: string|null}[]>([])
  const [loading,       setLoading]       = useState(true)
  const [alerts,        setAlerts]        = useState<DashboardAlert | null>(null)

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      const start = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth()+1).padStart(2,'0')}-01`

      const [s, r, sAll, rAll, c] = await Promise.all([
        // グラフ用（直近6ヶ月）
        supabase.from('sales_records').select('*').gte('tour_date', start),
        supabase.from('review_records').select('*').gte('tour_date', start),
        // 警告用（全件）
        supabase.from('sales_records').select('id,tour_date,case_name,partner_name,guide_name,payment_status,payment_date,payment_method,record_type,revenue'),
        supabase.from('review_records').select('id,has_review,rating'),
        // キャンセル実績（テーブルがない場合はエラーを無視）
        supabase.from('cancellation_records').select('sales_record_id').limit(500),
      ])

      const salesData   = s.data   as SalesRecord[] ?? []
      const reviewData  = r.data   as ReviewRecord[] ?? []
      const allSalesData  = sAll.data as SalesRecord[] ?? []
      const allReviewData = rAll.data as ReviewRecord[] ?? []
      const cancelData    = c.error ? [] : (c.data ?? []) as {sales_record_id: string|null}[]

      setSales(salesData)
      setReviews(reviewData)
      setAllSales(allSalesData)
      setAllReviews(allReviewData)
      setCancellations(cancelData)

      // 警告集計
      setAlerts(computeDashboardAlerts(
        allSalesData.map(s => ({
          id:             (s as any).id,
          tour_date:      s.tour_date,
          case_name:      s.case_name,
          partner_name:   s.partner_name,
          guide_name:     s.guide_name,
          payment_status: s.payment_status,
          payment_date:   s.payment_date,
          payment_method: (s as any).payment_method ?? '',
          record_type:    (s as any).record_type ?? 'normal',
          revenue:        s.revenue,
        })),
        allReviewData.map(r => ({
          has_review: r.has_review,
          rating:     r.rating,
        })),
        cancelData,
      ))

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: '#9CA3AF' }}>読み込み中...</div>
  )

  // 今月集計
  const thisMonthSales   = sales.filter(r => r.tour_date.startsWith(currentMonth))
  const thisMonthReviews = reviews.filter(r => r.tour_date.startsWith(currentMonth))

  const totalRevenue     = thisMonthSales.reduce((s, r) => s + (r.revenue ?? 0), 0)
  const totalGrossProfit = thisMonthSales.reduce((s, r) => s + (r.gross_profit ?? 0), 0)
  const grossMargin      = totalRevenue > 0 ? Math.round(totalGrossProfit / totalRevenue * 100) : 0
  const tourCount        = thisMonthSales.length
  const avgPrice         = tourCount > 0 ? Math.round(totalRevenue / tourCount) : 0
  const unpaidAmount     = thisMonthSales
    .filter(r => r.payment_status !== 'paid').reduce((s, r) => s + (r.revenue ?? 0), 0)
  const reviewTotal      = thisMonthReviews.length
  const reviewCount      = thisMonthReviews.filter(r => r.has_review).length
  const reviewRate       = reviewTotal > 0 ? Math.round(reviewCount / reviewTotal * 100) : 0

  // グラフ
  const months = last6Months()
  const chartData = months.map(ym => {
    const ms  = sales.filter(r => r.tour_date.startsWith(ym))
    const mr  = reviews.filter(r => r.tour_date.startsWith(ym))
    const rev = ms.reduce((s, r) => s + (r.revenue ?? 0), 0)
    const gp  = ms.reduce((s, r) => s + (r.gross_profit ?? 0), 0)
    const rt  = mr.length > 0 ? Math.round(mr.filter(r=>r.has_review).length / mr.length * 100) : 0
    return { month: monthLabel(ym), 売上: rev, 粗利: gp, レビュー取得率: rt }
  })

  return (
    <>
      <Head><title>ダッシュボード | TourOps</title></Head>

      <div className="page-header">
        <h1 className="page-title">ダッシュボード</h1>
        <span style={{ fontSize: 13, color: '#6B7280' }}>
          {now.getFullYear()}年{now.getMonth()+1}月
        </span>
      </div>

      {/* ── KPIカード ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        <KpiCard label="月次売上"     value={fmt(totalRevenue)}     sub={`${tourCount}件`} />
        <KpiCard label="月次粗利"     value={fmt(totalGrossProfit)}
          sub={`粗利率 ${grossMargin}%`}
          color={totalGrossProfit >= 0 ? '#15803D' : '#DC2626'} />
        <KpiCard label="ツアー件数"   value={`${tourCount}件`} />
        <KpiCard label="平均単価"     value={avgPrice > 0 ? fmt(avgPrice) : '—'} />
        <KpiCard label="未収金"
          value={unpaidAmount > 0 ? fmt(unpaidAmount) : '¥0'}
          color={unpaidAmount > 0 ? '#DC2626' : '#15803D'}
          sub={unpaidAmount > 0 ? '要確認' : '未収なし'} />
        <KpiCard label="レビュー件数" value={`${reviewCount}/${reviewTotal}件`}
          sub={`取得率 ${reviewRate}%`}
          color={reviewRate >= 60 ? '#15803D' : reviewRate >= 40 ? '#B45309' : '#DC2626'} />
      </div>

      {/* ── 警告カード ── */}
      {alerts && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
            データ品質チェック
            <span style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF', marginLeft: 8 }}>
              全期間
            </span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 10,
          }}>
            <AlertCard
              count={alerts.unpaidCount}
              label="未収案件"
              href="/sales"
              level={alerts.unpaidCount > 0 ? 'warning' : 'ok'}
            />
            <AlertCard
              count={alerts.paymentMismatch}
              label="入金情報の矛盾"
              href="/sales"
              level={alerts.paymentMismatch > 0 ? 'danger' : 'ok'}
            />
            <AlertCard
              count={alerts.salesDuplicates}
              label="重複疑い（売上台帳）"
              href="/sales"
              level={alerts.salesDuplicates > 0 ? 'warning' : 'ok'}
            />
            <AlertCard
              count={alerts.lowRatingReviews}
              label="低評価レビュー（★3以下）"
              href="/reviews"
              level={alerts.lowRatingReviews > 0 ? 'warning' : 'ok'}
            />
            <AlertCard
              count={alerts.reviewMissing}
              label="レビュー未回収"
              href="/reviews"
              level={alerts.reviewMissing > 10 ? 'warning' : 'ok'}
            />
            <AlertCard
              count={alerts.cancelMismatch}
              label="キャンセル整合性エラー"
              href="/sales"
              level={alerts.cancelMismatch > 0 ? 'danger' : 'ok'}
            />
          </div>
        </div>
      )}

      {/* ── グラフ ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>月次売上・粗利（直近6ヶ月）</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={44} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="売上" fill="#2563EB" radius={[3,3,0,0]} />
              <Bar dataKey="粗利" fill="#0F766E" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>レビュー取得率推移（直近6ヶ月）</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Line type="monotone" dataKey="レビュー取得率" stroke="#2563EB"
                strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 直近案件 ── */}
      {thisMonthSales.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', fontWeight: 600, fontSize: 13,
            borderBottom: '1px solid var(--border)' }}>
            今月の案件（直近5件）
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>実施日</th><th>案件名</th><th>ガイド</th>
                  <th style={{ textAlign: 'right' }}>売上</th>
                  <th style={{ textAlign: 'right' }}>粗利</th>
                  <th>入金状況</th>
                </tr>
              </thead>
              <tbody>
                {thisMonthSales.slice(0, 5).map(r => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.tour_date}</td>
                    <td>{r.case_name}</td>
                    <td style={{ color: '#6B7280' }}>{r.guide_name || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(r.revenue ?? 0)}</td>
                    <td style={{ textAlign: 'right',
                      color: (r.gross_profit ?? 0) >= 0 ? '#15803D' : '#DC2626' }}>
                      {fmt(r.gross_profit ?? 0)}
                    </td>
                    <td>
                      <span className={`badge ${
                        r.payment_status === 'paid'    ? 'badge-green' :
                        r.payment_status === 'partial' ? 'badge-amber' : 'badge-red'
                      }`}>
                        {r.payment_status === 'paid' ? '入金済' :
                         r.payment_status === 'partial' ? '一部入金' : '未入金'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {thisMonthSales.length === 0 && (
        <div className="card" style={{
          textAlign: 'center', padding: '48px 24px',
          background: 'linear-gradient(135deg, rgba(27,43,75,0.03), rgba(37,99,235,0.03))',
          border: '1px dashed var(--border)',
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            今月のデータがまだありません
          </div>
          <div style={{ fontSize: 13, color: '#6B7280' }}>
            売上台帳にデータを入力するとグラフとKPIが表示されます
          </div>
        </div>
      )}
    </>
  )
}
