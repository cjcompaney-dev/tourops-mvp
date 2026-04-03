import { createBrowserClient } from '@supabase/ssr'

// ブラウザ用クライアント（認証セッションをCookieで管理）
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
