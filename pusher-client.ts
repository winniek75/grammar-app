'use client'

import PusherJS from 'pusher-js'

// ─────────────────────────────────────────────
// Pusher ブラウザ用クライアント（シングルトン）
// コンポーネントや hooks から購読に使う
// ─────────────────────────────────────────────

let pusherClient: PusherJS | null = null

export function getPusherClient(): PusherJS {
  if (pusherClient) return pusherClient

  const key = process.env.NEXT_PUBLIC_PUSHER_APP_KEY
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER

  if (!key || !cluster) {
    throw new Error(
      '環境変数が設定されていません。NEXT_PUBLIC_PUSHER_APP_KEY と NEXT_PUBLIC_PUSHER_CLUSTER を設定してください。'
    )
  }

  pusherClient = new PusherJS(key, {
    cluster,
    enabledTransports: ['ws', 'wss'],
  })

  return pusherClient
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
