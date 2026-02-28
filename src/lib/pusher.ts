import Pusher from 'pusher'

// ─────────────────────────────────────────────
// Pusher サーバー用クライアント（シングルトン）
// API Route からイベントをトリガーする
// ─────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var pusherServer: Pusher | undefined
}

function createPusherServer(): Pusher {
  const appId = process.env.PUSHER_APP_ID
  const key = process.env.NEXT_PUBLIC_PUSHER_APP_KEY
  const secret = process.env.PUSHER_SECRET
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER

  if (!appId || !key || !secret || !cluster) {
    throw new Error(
      '環境変数が設定されていません。.env.local に PUSHER_APP_ID / NEXT_PUBLIC_PUSHER_APP_KEY / PUSHER_SECRET / NEXT_PUBLIC_PUSHER_CLUSTER を設定してください。'
    )
  }

  return new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  })
}

// サーバーレス関数でも再利用できるようグローバルにキャッシュ
export const pusherServer: Pusher =
  global.pusherServer ?? (global.pusherServer = createPusherServer())

// ─────────────────────────────────────────────
// チャンネル名ヘルパー
// ─────────────────────────────────────────────

export function getRoomChannel(roomId: string): string {
  return `room-${roomId}`
}

// ─────────────────────────────────────────────
// イベント送信ヘルパー
// ─────────────────────────────────────────────

export async function triggerRoomEvent(
  roomId: string,
  event: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
): Promise<void> {
  await pusherServer.trigger(getRoomChannel(roomId), event, data)
}
