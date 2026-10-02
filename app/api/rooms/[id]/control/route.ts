import { NextResponse } from 'next/server'
import { getRoom, updateRoom, deleteRoom } from '@/lib/room-store'
import { isValidMode, getAdminKeyFromRequest, toTeacherView } from '@/lib/utils'
import { questions } from '@/app/data/questions'
import { triggerRoomEvent } from '@/lib/pusher'
import type {
  QuestionChangeEvent,
  ShowAnswerEvent,
  RoomFinishedEvent,
} from '@/lib/types'

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
  const room = await getRoom(params.id)
  if (!room) {
    return NextResponse.json({ error: 'ルームが見つかりません' }, { status: 404 })
  }

  // ── リクエストボディ ──────────────────────────
  let body: ControlAction & { adminKey?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 })
  }

  // ── adminKey 認証（ヘッダー / クエリ / ボディのどれでも可）──
  const adminKey = getAdminKeyFromRequest(req)
    ?? (typeof body.adminKey === 'string' ? body.adminKey : undefined)
  if (!adminKey || adminKey !== room.adminKey) {
    return NextResponse.json({ error: '管理キーが不正です' }, { status: 403 })
  }

  switch (body.action) {
    // 問題を切り替える
    case 'set-question': {
      const questionId = body.questionId
      const question = questions.find((q) => q.id === questionId)
      if (!question) {
        return NextResponse.json({ error: '問題が見つかりません' }, { status: 404 })
      }
      // 出題形式は問題データに合わせる（採点も問題データの形式で行うため）
      const mode = question.questionType
      const updated = await updateRoom(params.id, {
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
      await triggerRoomEvent(params.id, 'question-change', event as unknown as Record<string, unknown>)
      return NextResponse.json({ ok: true, room: sanitize(updated) })
    }

    // 正答・解説の表示/非表示
    case 'show-answer': {
      const updated = await updateRoom(params.id, {
        showAnswer: body.showAnswer,
        showExplanation: body.showExplanation,
      })
      if (!updated) return NextResponse.json({ error: '更新失敗' }, { status: 500 })

      const event: ShowAnswerEvent = {
        showAnswer: body.showAnswer,
        showExplanation: body.showExplanation,
      }
      await triggerRoomEvent(params.id, 'show-answer', event as unknown as Record<string, unknown>)
      return NextResponse.json({ ok: true, room: sanitize(updated) })
    }

    // 出題モード変更
    case 'set-mode': {
      if (!isValidMode(body.mode)) {
        return NextResponse.json({ error: '不正なモードです' }, { status: 400 })
      }
      const updated = await updateRoom(params.id, { mode: body.mode })
      if (!updated) return NextResponse.json({ error: '更新失敗' }, { status: 500 })
      return NextResponse.json({ ok: true, room: sanitize(updated) })
    }

    // ルーム終了
    case 'finish-room': {
      const updated = await updateRoom(params.id, { status: 'finished' })
      if (!updated) return NextResponse.json({ error: '更新失敗' }, { status: 500 })

      const event: RoomFinishedEvent = { roomId: params.id }
      await triggerRoomEvent(params.id, 'room-finished', event as unknown as Record<string, unknown>)

      // 少し待ってからメモリから削除
      setTimeout(() => { void deleteRoom(params.id) }, 5000)

      return NextResponse.json({ ok: true })
    }

    default:
      return NextResponse.json({ error: '不明なアクションです' }, { status: 400 })
  }
}

// adminKey と参加者の sessionId を除いた安全なルーム情報を返す
function sanitize(room: Awaited<ReturnType<typeof updateRoom>>) {
  if (!room) return null
  return toTeacherView(room)
}
