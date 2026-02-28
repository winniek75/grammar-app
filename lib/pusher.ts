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

  // ビルド時はダミー値を使用
  if (!appId || !key || !secret || !cluster) {
    console.warn('Pusher environment variables not set. Using dummy values for build.')
    return new Pusher({
      appId: 'dummy',
      key: 'dummy',
      secret: 'dummy',
      cluster: 'ap3',
      useTLS: true,
    })
  }

  return new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  })
}

// サーバーレス関数でも再利用できるようグローバルにキャッシュ（遅延初期化）
let pusherServerInstance: Pusher | null = null

export function getPusherServer(): Pusher {
  if (!pusherServerInstance) {
    if (!global.pusherServer) {
      global.pusherServer = createPusherServer()
    }
    pusherServerInstance = global.pusherServer
  }
  return pusherServerInstance
}

// 後方互換性のためのエクスポート
export const pusherServer = new Proxy({} as Pusher, {
  get(target, prop) {
    const server = getPusherServer()
    return server[prop as keyof Pusher]
  }
})

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
  data: Record<string, unknown>
): Promise<void> {
  // 実行時にのみPusherを使用
  const server = getPusherServer()
  await server.trigger(getRoomChannel(roomId), event, data)
}
