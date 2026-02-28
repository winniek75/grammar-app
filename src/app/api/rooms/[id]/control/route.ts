import { NextRequest, NextResponse } from 'next/server'
import { getRoom, updateRoom } from '@/lib/room-store'
import { pusherServer } from '@/lib/pusher'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { adminKey, action, ...payload } = body

    const room = getRoom(params.id)
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // adminKey チェック
    if (room.adminKey !== adminKey) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const channelName = `room-${params.id}`

    switch (action) {
      // ====================
      // 問題変更
      // ====================
      case 'setQuestion': {
        const { questionId, mode } = payload
        if (!questionId) {
          return NextResponse.json(
            { error: 'questionId is required' },
            { status: 400 }
          )
        }

        room.currentQuestionId = questionId
        room.mode = mode || room.mode
        room.showAnswer = false
        room.showExplanation = false
        room.status = 'active'
        updateRoom(params.id, room)

        // 生徒に通知
        await pusherServer.trigger(channelName, 'question-change', {
          questionId,
          mode: room.mode,
        })

        return NextResponse.json({ success: true })
      }

      // ====================
      // 正答・解説表示
      // ====================
      case 'showAnswer': {
        const { showAnswer, showExplanation } = payload

        room.showAnswer = showAnswer ?? room.showAnswer
        room.showExplanation = showExplanation ?? room.showExplanation
        updateRoom(params.id, room)

        // 生徒に通知
        await pusherServer.trigger(channelName, 'show-answer', {
          showAnswer: room.showAnswer,
          showExplanation: room.showExplanation,
          questionId: room.currentQuestionId,
        })

        return NextResponse.json({ success: true })
      }

      // ====================
      // モード変更（問題変更を伴わない）
      // ====================
      case 'setMode': {
        const { mode } = payload
        if (!['choice', 'typing', 'sorting'].includes(mode)) {
          return NextResponse.json(
            { error: 'Invalid mode' },
            { status: 400 }
          )
        }

        room.mode = mode
        updateRoom(params.id, room)

        // 現在の問題があれば生徒に再通知
        if (room.currentQuestionId) {
          await pusherServer.trigger(channelName, 'question-change', {
            questionId: room.currentQuestionId,
            mode: room.mode,
          })
        }

        return NextResponse.json({ success: true })
      }

      // ====================
      // 授業終了
      // ====================
      case 'finish': {
        room.status = 'finished'
        updateRoom(params.id, room)

        await pusherServer.trigger(channelName, 'room-finished', {
          message: '授業が終了しました',
        })

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Control API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
