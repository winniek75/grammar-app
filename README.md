# 先生と英文法レッスン（授業用）

先生が問題をえらんで進行し、生徒が同時に答える**授業用**のリアルタイム英文法ツールです。
生徒がひとりで自習するアプリではありません（先生が問題を出すまで、生徒の画面に問題は出ません）。

## 機能概要

- 講師が問題を選択・進行し、生徒がリアルタイムで回答
- 300問の中学英文法問題（中1〜中3）を収録
- 選択問題、タイピング、並べ替えの3つの出題モード
- リアルタイム通信によるインタラクティブな授業体験
- 認証不要のシンプルなルーム方式

## 技術スタック

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Pusher** (WebSocket通信)
- **Supabase** (ルーム・参加者・回答の保存。サーバ側から service_role キーで読み書き)

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local.example` を `.env.local` にコピーして編集：

```bash
cp .env.local.example .env.local
```

Pusherのアカウントを作成し、認証情報を設定：

```env
NEXT_PUBLIC_PUSHER_APP_KEY=your_pusher_app_key
NEXT_PUBLIC_PUSHER_CLUSTER=ap3
PUSHER_APP_ID=your_pusher_app_id
PUSHER_SECRET=your_pusher_secret
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key   # サーバ専用。NEXT_PUBLIC_ を付けない
```

Supabase の SQL Editor で `docs/supabase-grammar-rooms.sql` を実行してください
（テーブル・RLS・同時回答で記録が消えないようにする関数）。

### 3. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアプリケーションにアクセスできます。

## 使い方

### 講師として

1. トップページで「ルームを作成する」をクリック
2. 生徒用の6桁コードを共有
3. 講師URLにアクセスして授業を開始
4. 問題を選択して進行
5. 「回答待ち／未回答者／全員回答済み」を見て「正答と解説を表示」
6. 「授業を終了」でルームを閉じる

### 回答の本人確認

- 入室時にサーバが参加者ID と sessionId（本人だけに返す合言葉）を発行します
- 回答送信では、参加者ID がそのルームの参加者であること・sessionId が一致することをサーバで照合します
- 出題中の問題以外への回答、正答表示後の回答、同じ問題への2回目の回答は受け付けません
- 講師画面のデータ取得・操作には講師URLの `key` が必要です

### 生徒として

1. 講師から共有された6桁コードを入力（`/?room=ABC123` のリンクならコード入力済みで開きます）
2. 名前を入力して入室
3. 講師が選択した問題に回答
4. リアルタイムでフィードバックを確認

## プロジェクト構造

```
├── app/                      # Next.js App Router
│   ├── api/rooms/           # API エンドポイント
│   ├── teacher/room/[id]/   # 講師画面
│   ├── room/[code]/         # 生徒画面
│   └── page.tsx             # トップページ
├── lib/                     # ユーティリティ
│   ├── pusher.ts           # Pusherサーバー設定
│   ├── pusher-client.ts    # Pusherクライアント
│   └── room-store.ts       # ルーム状態管理
├── src/
│   ├── components/         # UIコンポーネント
│   ├── data/questions.ts   # 問題データ（300問）
│   └── types/             # 型定義
└── types/index.ts         # 共通型定義
```

## APIエンドポイント

- `POST /api/rooms` - ルーム作成
- `GET /api/rooms/code/[code]` - コードでルーム検索
- `GET /api/rooms/[id]/state` - ルーム状態取得
- `POST /api/rooms/[id]/join` - 生徒入室
- `POST /api/rooms/[id]/answer` - 回答送信
- `POST /api/rooms/[id]/control` - 講師操作

## リアルタイムイベント

- `question-change` - 問題変更
- `show-answer` - 正答表示
- `answer-submitted` - 回答送信
- `participant-joined` - 参加者入室
- `room-finished` - ルーム終了

## デプロイ

### Vercel へのデプロイ

1. GitHubにプッシュ
2. Vercelでプロジェクトをインポート
3. 環境変数を設定
4. デプロイ

## 注意事項

- Pusher の通知が届かなくても、講師・生徒の画面は数秒ごとに最新の状態を取り直します
- Pusherの無料プランは同時接続100まで対応

## ライセンス

MIT