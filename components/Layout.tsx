import Link from 'next/link'
import { useRouter } from 'next/router'
import { ReactNode } from 'react'

const NAV = [
  { href: '/dashboard', label: 'ダッシュボード' },
  { href: '/sales',     label: '売上台帳' },
  { href: '/reviews',   label: 'レビュー台帳' },
  { href: '/market',    label: '競合・市場分析' },
]

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useRouter()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <header style={{
        background: '#1B2B4B', borderBottom: '1px solid rgba(255,255,255,0.08)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 52 }}>
          {/* ロゴ */}
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 32 }}>
            <span style={{
              background: '#2563EB', borderRadius: 8, width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M1 4h14M1 8h10M1 12h7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>TourOps</span>
          </Link>

          {/* ナビ */}
          <nav style={{ display: 'flex', gap: 4 }}>
            {NAV.map(n => {
              const active = pathname === n.href || pathname.startsWith(n.href + '/')
              return (
                <Link key={n.href} href={n.href} style={{
                  padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                  color:       active ? '#fff' : 'rgba(255,255,255,0.6)',
                  background:  active ? 'rgba(255,255,255,0.12)' : 'transparent',
                  transition: 'all .15s',
                }}>
                  {n.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main style={{ flex: 1, maxWidth: 1280, margin: '0 auto', width: '100%', padding: '24px 20px' }}>
        {children}
      </main>
    </div>
  )
}
