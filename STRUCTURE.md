tourops-mvp/
├── supabase/
│   └── schema.sql               # DDL（Supabaseで実行）
│
├── data/                        # 競合・市場分析JSONデータ（静的）
│   ├── competitors.json         # 競合スコアデータ
│   ├── market_nodes.json        # 市場規模ツリー
│   └── score_axes.json          # 評価軸定義
│
├── lib/
│   └── supabase.ts              # Supabaseクライアント（1ファイル）
│
├── types/
│   └── index.ts                 # 型定義（SalesRecord / ReviewRecord）
│
├── components/
│   ├── Layout.tsx               # 共通レイアウト（上部ナビ）
│   ├── sales/
│   │   ├── SalesTable.tsx       # 売上台帳テーブル
│   │   └── SalesForm.tsx        # 売上追加・編集フォーム
│   ├── reviews/
│   │   ├── ReviewTable.tsx      # レビュー台帳テーブル
│   │   └── ReviewForm.tsx       # レビュー追加・編集フォーム
│   ├── dashboard/
│   │   ├── KpiCard.tsx          # KPIカード
│   │   └── RevenueChart.tsx     # 月次グラフ（recharts）
│   └── market/
│       ├── PositioningMap.tsx   # ポジショニングマップ
│       ├── ScoreTable.tsx       # 競合スコア一覧
│       └── MarketTree.tsx       # 市場規模ツリー
│
├── pages/
│   ├── _app.tsx                 # グローバルスタイル・レイアウト適用
│   ├── index.tsx                # / → /dashboard にリダイレクト
│   ├── dashboard.tsx            # ダッシュボード
│   ├── sales.tsx                # 売上台帳
│   ├── reviews.tsx              # レビュー台帳
│   └── market.tsx               # 競合・市場分析
│
├── styles/
│   └── globals.css              # グローバルCSS・カラー変数
│
├── .env.local                   # 環境変数（Supabase URL・Key）
├── package.json
├── next.config.js
└── tsconfig.json

# 方針メモ
# - Pages Router を使う（App Routerより単純でデプロイ安定）
# - API Routes は使わない（クライアントから直接Supabase）
# - 認証・RLS・tenant_id なし
# - 競合分析データは /data/*.json を import して使う
