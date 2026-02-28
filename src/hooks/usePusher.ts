import { useEffect, useRef } from 'react'
import { getPusherClient } from '@/lib/pusher-client'
import type { Channel } from 'pusher-js'

type EventCallback = (data: unknown) => void

export function usePusher(
  channelName: string | null,
  events: Record<string, EventCallback>
) {
  const channelRef = useRef<Channel | null>(null)
  const eventsRef = useRef(events)
  eventsRef.current = events

  useEffect(() => {
    if (!channelName) return

    const pusher = getPusherClient()
    const channel = pusher.subscribe(channelName)
    channelRef.current = channel

    Object.keys(eventsRef.current).forEach(event => {
      channel.bind(event, (data: unknown) => {
        eventsRef.current[event]?.(data)
      })
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(channelName)
      channelRef.current = null
    }
  }, [channelName])
}
