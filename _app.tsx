import type { AppProps } from 'next/app'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import '../styles/globals.css'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

// 認証不要なページ
const PUBLIC_PAGES = ['/login']

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    // 初回：セッション確認
    supabase.auth.getSession().then(({ data: { session } }) => {
      const isPublic = PUBLIC_PAGES.includes(router.pathname)
      if (!session && !isPublic) {
        router.replace('/login')
      } else {
        setChecked(true)
      }
    })

    // セッション変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const isPublic = PUBLIC_PAGES.includes(router.pathname)
      if (!session && !isPublic) {
        router.replace('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router.pathname])

  // ログインページはレイアウトなしで表示
  if (router.pathname === '/login') {
    return <Component {...pageProps} />
  }

  // セッション確認が終わるまで何も表示しない（チラツキ防止）
  if (!checked) return null

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  )
}

