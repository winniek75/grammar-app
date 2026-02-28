'use client'

import PusherJS from 'pusher-js'

// ─────────────────────────────────────────────
// Pusher ブラウザ用クライアント（シングルトン）
// コンポーネントや hooks から購読に使う
// ─────────────────────────────────────────────

let pusherClientInstance: PusherJS | null = null

export function getPusherClient(): PusherJS {
  if (typeof window === 'undefined') {
    throw new Error('Pusher client can only be used in the browser')
  }

  if (!pusherClientInstance) {
    const key = process.env.NEXT_PUBLIC_PUSHER_APP_KEY
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER

    if (!key || !cluster) {
      throw new Error(
        '環境変数が設定されていません。NEXT_PUBLIC_PUSHER_APP_KEY と NEXT_PUBLIC_PUSHER_CLUSTER を設定してください。'
      )
    }

    pusherClientInstance = new PusherJS(key, {
      cluster,
      enabledTransports: ['ws', 'wss'],
    })
  }

  return pusherClientInstance
}

// エクスポート用のクライアント（互換性のため）
export const pusherClient = typeof window !== 'undefined' ? getPusherClient() : null!

// チャンネル名ヘルパー
export function getRoomChannel(roomId: string): string {
  return `room-${roomId}`
}

// チャンネル購読のヘルパー
export function subscribeToRoom(roomId: string) {
  const client = getPusherClient()
  const channelName = `room-${roomId}`
  return client.subscribe(channelName)
}

export function unsubscribeFromRoom(roomId: string) {
  const client = getPusherClient()
  client.unsubscribe(`room-${roomId}`)
}
