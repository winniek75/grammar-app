'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { Channel } from 'pusher-js'
import { subscribeToRoom, unsubscribeFromRoom } from '@/lib/pusher-client'
import type {
  QuestionChangeEvent,
  ShowAnswerEvent,
  AnswerSubmittedEvent,
  ParticipantJoinedEvent,
  RoomFinishedEvent,
} from '@/types'

interface UsePusherOptions {
  roomId: string | null
  onQuestionChange?: (data: QuestionChangeEvent) => void
  onShowAnswer?: (data: ShowAnswerEvent) => void
  onAnswerSubmitted?: (data: AnswerSubmittedEvent) => void
  onParticipantJoined?: (data: ParticipantJoinedEvent) => void
  onRoomFinished?: (data: RoomFinishedEvent) => void
}

export function usePusher({
  roomId,
  onQuestionChange,
  onShowAnswer,
  onAnswerSubmitted,
  onParticipantJoined,
  onRoomFinished,
}: UsePusherOptions) {
  const channelRef = useRef<Channel | null>(null)

  // コールバックをrefで保持→再購読なしに最新コールバックを使える
  const cbRef = useRef({
    onQuestionChange,
    onShowAnswer,
    onAnswerSubmitted,
    onParticipantJoined,
    onRoomFinished,
  })
  useEffect(() => {
    cbRef.current = { onQuestionChange, onShowAnswer, onAnswerSubmitted, onParticipantJoined, onRoomFinished }
  })

  useEffect(() => {
    if (!roomId) return

    const channel = subscribeToRoom(roomId)
    channelRef.current = channel

    // 講師→生徒
    channel.bind('question-change', (data: QuestionChangeEvent) => {
      cbRef.current.onQuestionChange?.(data)
    })
    channel.bind('show-answer', (data: ShowAnswerEvent) => {
      cbRef.current.onShowAnswer?.(data)
    })
    channel.bind('room-finished', (data: RoomFinishedEvent) => {
      cbRef.current.onRoomFinished?.(data)
    })

    // 生徒→講師
    channel.bind('answer-submitted', (data: AnswerSubmittedEvent) => {
      cbRef.current.onAnswerSubmitted?.(data)
    })
    channel.bind('participant-joined', (data: ParticipantJoinedEvent) => {
      cbRef.current.onParticipantJoined?.(data)
    })

    if (process.env.NODE_ENV === 'development') {
      channel.bind('pusher:subscription_succeeded', () => {
        console.log(`[Pusher] ✅ 購読成功: room-${roomId}`)
      })
      channel.bind('pusher:subscription_error', (err: unknown) => {
        console.error(`[Pusher] ❌ 購読エラー: room-${roomId}`, err)
      })
    }

    return () => {
      channel.unbind_all()
      unsubscribeFromRoom(roomId)
      channelRef.current = null
    }
  }, [roomId])

  return { channel: channelRef.current }
}

// 講師専用フック
interface UseTeacherRoomOptions {
  roomId: string | null
  onAnswerSubmitted?: (data: AnswerSubmittedEvent) => void
  onParticipantJoined?: (data: ParticipantJoinedEvent) => void
}
export function useTeacherRoom(opts: UseTeacherRoomOptions) {
  return usePusher(opts)
}

// 生徒専用フック
interface UseStudentRoomOptions {
  roomId: string | null
  onQuestionChange?: (data: QuestionChangeEvent) => void
  onShowAnswer?: (data: ShowAnswerEvent) => void
  onRoomFinished?: (data: RoomFinishedEvent) => void
}
export function useStudentRoom(opts: UseStudentRoomOptions) {
  return usePusher(opts)
}

// 講師の操作APIフック
interface UseControlRoomOptions {
  roomId: string | null
  adminKey: string | null
}
export function useControlRoom({ roomId, adminKey }: UseControlRoomOptions) {
  const callApi = useCallback(
    async (body: Record<string, unknown>) => {
      if (!roomId || !adminKey) throw new Error('roomId/adminKey が未設定')
      const res = await fetch(`/api/rooms/${roomId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `API エラー: ${res.status}`)
      }
      return res.json()
    },
    [roomId, adminKey]
  )

  const setQuestion = useCallback(
    (questionId: string, mode?: 'choice' | 'typing' | 'sorting') =>
      callApi({ action: 'set-question', questionId, mode }),
    [callApi]
  )
  const showAnswer = useCallback(
    (show: boolean, showExp: boolean) =>
      callApi({ action: 'show-answer', showAnswer: show, showExplanation: showExp }),
    [callApi]
  )
  const setMode = useCallback(
    (mode: 'choice' | 'typing' | 'sorting') => callApi({ action: 'set-mode', mode }),
    [callApi]
  )
  const finishRoom = useCallback(() => callApi({ action: 'finish-room' }), [callApi])

  return { setQuestion, showAnswer, setMode, finishRoom }
}
