import { NextResponse } from 'next/server'
import { getRoom, updateRoom, deleteRoom } from '@/lib/room-store'
import { isValidMode } from '@/lib/utils'
import { triggerRoomEvent } from '@/lib/pusher'
import type {
  QuestionChangeEvent,
  ShowAnswerEvent,
  RoomFinishedEvent,
} from '@/types'

export const runtime = 'nodejs'

type ControlAction =
  | { action: 'set-question'; questionId: string; mode?: string }
  | { action: 'show-answer'; showAnswer: boolean; showExplanation: boolean }
  | { action: 'set-mode'; mode: string }
  | { action: 'finish-room' }

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  // ── adminKey 認証 ────────────────────────────
  const adminKey = req.headers.get('x-admin-key')
    ?? new URL(req.url).searchParams.get('key')
    ?? undefined

  const room = getRoom(params.id)
  if (!room) {
    return NextResponse.json({ error: 'ルームが見つかりません' }, { status: 404 })
  }
  if (!adminKey || adminKey !== room.adminKey) {
    return NextResponse.json({ error: '管理キーが不正です' }, { status: 403 })
  }

  // ── リクエストボディ ──────────────────────────
  let body: ControlAction
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 })
  }

  switch (body.action) {
    // 問題を切り替える
    case 'set-question': {
      const mode = body.mode && isValidMode(body.mode) ? body.mode : room.mode
      const updated = updateRoom(params.id, {
        currentQuestionId: body.questionId,
        mode,
        showAnswer: false,
        showExplanation: false,
        status: 'active',
      })
      if (!updated) return NextResponse.json({ error: '更新失敗' }, { status: 500 })

      const event: QuestionChangeEvent = {
        questionId: body.questionId,
        mode,
        showAnswer: false,
        showExplanation: false,
      }
      await triggerRoomEvent(params.id, 'question-change', event)
      return NextResponse.json({ ok: true, room: sanitize(updated) })
    }

    // 正答・解説の表示/非表示
    case 'show-answer': {
      const updated = updateRoom(params.id, {
        showAnswer: body.showAnswer,
        showExplanation: body.showExplanation,
      })
      if (!updated) return NextResponse.json({ error: '更新失敗' }, { status: 500 })

      const event: ShowAnswerEvent = {
        showAnswer: body.showAnswer,
        showExplanation: body.showExplanation,
      }
      await triggerRoomEvent(params.id, 'show-answer', event)
      return NextResponse.json({ ok: true, room: sanitize(updated) })
    }

    // 出題モード変更
    case 'set-mode': {
      if (!isValidMode(body.mode)) {
        return NextResponse.json({ error: '不正なモードです' }, { status: 400 })
      }
      const updated = updateRoom(params.id, { mode: body.mode })
      if (!updated) return NextResponse.json({ error: '更新失敗' }, { status: 500 })
      return NextResponse.json({ ok: true, room: sanitize(updated) })
    }

    // ルーム終了
    case 'finish-room': {
      const updated = updateRoom(params.id, { status: 'finished' })
      if (!updated) return NextResponse.json({ error: '更新失敗' }, { status: 500 })

      const event: RoomFinishedEvent = { roomId: params.id }
      await triggerRoomEvent(params.id, 'room-finished', event)

      // 少し待ってからメモリから削除
      setTimeout(() => deleteRoom(params.id), 5000)

      return NextResponse.json({ ok: true })
    }

    default:
      return NextResponse.json({ error: '不明なアクションです' }, { status: 400 })
  }
}

// adminKey を除いた安全なルーム情報を返す
function sanitize(room: ReturnType<typeof updateRoom>) {
  if (!room) return null
  const { adminKey: _adminKey, ...safe } = room
  return safe
}
