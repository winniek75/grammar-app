# 中学英文法 総復習アプリ

オンラインレッスン向けのリアルタイム英文法問題演習アプリケーションです。

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
- **In-memory Store** (セッション管理)

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
```

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

### 生徒として

1. 講師から共有された6桁コードを入力
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

- ルームデータはメモリ上に保存されるため、サーバー再起動でリセットされます
- 本番環境では必要に応じてRedis等の永続化ストレージへの移行を検討してください
- Pusherの無料プランは同時接続100まで対応

## ライセンス

MIT