import Head from 'next/head'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend
} from 'recharts'

// ── 静的データ（JSONファイルで管理。将来Supabase化を想定）──
import competitors  from '../data/competitors.json'
import marketNodes  from '../data/market_nodes.json'
import scoreAxes    from '../data/score_axes.json'

const CATEGORY_COLOR: Record<string, string> = {
  'ガイド会社':            '#2563EB',
  'OTA/プラットフォーム':  '#7C3AED',
  '総合旅行会社・DMC':     '#0F766E',
  'フリーランスガイド':    '#9CA3AF',
  '自社':                 '#DC2626',
}

const MARKET_TYPE_COLOR: Record<string, string> = {
  TAM: '#1B2B4B', SAM: '#2563EB', SOM: '#0F766E', sub: '#6B7280',
}

// レーダーチャート用データ（自社 vs JGA）
function buildRadarData(axes: typeof scoreAxes, comps: typeof competitors) {
  const seejay = comps.find(c => c.is_self)
  const jga    = comps.find(c => c.name === 'JGA')
  return axes
    .filter(a => !['M','N'].includes(a.axis_id))
    .slice(0, 8)
    .map(a => ({
      axis: a.name,
      自社:  seejay?.scores?.[a.axis_id as keyof typeof seejay.scores] ?? 0,
      JGA:   jga?.scores?.[a.axis_id as keyof typeof jga.scores]    ?? 0,
    }))
}

export default function MarketPage() {
  const radarData = buildRadarData(scoreAxes, competitors)

  return (
    <>
      <Head><title>競合・市場分析 | TourOps</title></Head>

      <div className="page-header">
        <h1 className="page-title">競合・市場分析</h1>
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>
          データ更新：data/competitors.json を編集してください
        </span>
      </div>

      {/* ── 市場規模ツリー ── */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: '#374151' }}>
          市場規模
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {marketNodes.map(node => (
            <div key={node.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              paddingLeft: node.level * 24,
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: MARKET_TYPE_COLOR[node.market_type] ?? '#9CA3AF',
              }} />
              <div className="card" style={{
                padding: '10px 16px', flex: 1,
                borderLeft: `3px solid ${MARKET_TYPE_COLOR[node.market_type] ?? '#E5E7EB'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '1px 6px',
                      borderRadius: 4, marginRight: 8,
                      background: MARKET_TYPE_COLOR[node.market_type] + '20',
                      color: MARKET_TYPE_COLOR[node.market_type],
                    }}>
                      {node.market_type}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{node.name}</span>
                    {node.seejay_flag && (
                      <span style={{
                        marginLeft: 8, fontSize: 11, padding: '1px 8px', borderRadius: 10,
                        background: node.seejay_flag === 'current' ? '#DCFCE7' : '#DBEAFE',
                        color:      node.seejay_flag === 'current' ? '#15803D' : '#1D4ED8',
                      }}>
                        {node.seejay_flag === 'current' ? '現在の主戦場' : '狙い目'}
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {node.value_億円 ? (
                      <span style={{ fontSize: 15, fontWeight: 700 }}>
                        {node.value_億円 >= 1000
                          ? `${(node.value_億円/10000).toFixed(1)}兆円`
                          : `${node.value_億円.toLocaleString()}億円`}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>要調査</span>
                    )}
                    {node.memo && (
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{node.memo}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 競合スコア一覧 ── */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: '#374151' }}>
          競合スコア一覧（12軸評価）
        </h2>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>会社名</th>
                  <th>カテゴリ</th>
                  {scoreAxes.filter(a => !['M','N'].includes(a.axis_id)).map(a => (
                    <th key={a.axis_id} style={{ textAlign: 'center', minWidth: 48 }}
                      title={a.name}>{a.axis_id}</th>
                  ))}
                  <th style={{ textAlign: 'center' }}>合計</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map(c => {
                  const axes  = scoreAxes.filter(a => !['M','N'].includes(a.axis_id))
                  const vals  = axes.map(a => c.scores?.[a.axis_id as keyof typeof c.scores] ?? 0)
                  const total = Math.round(vals.reduce((s,v)=>s+v,0) / vals.length)
                  return (
                    <tr key={c.name} style={c.is_self ? { background: '#EFF6FF' } : {}}>
                      <td>
                        <span style={{
                          fontWeight: c.is_self ? 700 : 500,
                          color: c.is_self ? '#1D4ED8' : undefined,
                        }}>
                          {c.name}{c.is_self ? ' ★' : ''}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 10,
                          background: (CATEGORY_COLOR[c.category] ?? '#6B7280') + '18',
                          color: CATEGORY_COLOR[c.category] ?? '#6B7280',
                          fontWeight: 500,
                        }}>
                          {c.category}
                        </span>
                      </td>
                      {axes.map(a => {
                        const v = c.scores?.[a.axis_id as keyof typeof c.scores] ?? 0
                        const color = v >= 80 ? '#15803D' : v >= 50 ? '#374151' : '#9CA3AF'
                        return (
                          <td key={a.axis_id} style={{ textAlign: 'center', color, fontWeight: v >= 80 ? 600 : 400 }}>
                            {v}
                          </td>
                        )
                      })}
                      <td style={{
                        textAlign: 'center', fontWeight: 700,
                        color: c.is_self ? '#1D4ED8' : '#374151',
                      }}>
                        {total}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: '#9CA3AF' }}>
          {scoreAxes.filter(a=>!['M','N'].includes(a.axis_id)).map(a => `${a.axis_id}:${a.name}`).join(' / ')}
        </div>
      </section>

      {/* ── レーダーチャート（自社 vs JGA） ── */}
      <section>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: '#374151' }}>
          ポジショニング（自社 vs JGA）
        </h2>
        <div className="card">
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#E5E7EB" />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0,100]} tick={{ fontSize: 10 }} />
              <Radar name="自社" dataKey="自社" stroke="#DC2626" fill="#DC2626" fillOpacity={0.15} />
              <Radar name="JGA" dataKey="JGA"  stroke="#2563EB" fill="#2563EB" fillOpacity={0.1}  />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  )
}
