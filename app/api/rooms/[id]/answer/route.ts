import { NextResponse } from 'next/server'
import { getRoom, addAnswer } from '@/lib/room-store'
import { generateAnswerId, checkAnswer } from '@/lib/utils'
import { triggerRoomEvent } from '@/lib/pusher'
import { questions } from '@/src/data/questions'
import type { Answer, AnswerSubmittedEvent } from '@/types'

export const runtime = 'nodejs'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const room = getRoom(params.id)
  if (!room) {
    return NextResponse.json({ error: 'ルームが見つかりません' }, { status: 404 })
  }
  if (room.status === 'finished') {
    return NextResponse.json({ error: 'このルームは終了しています' }, { status: 410 })
  }

  let body: {
    participantId?: string
    participantName?: string
    questionId?: string
    answerText?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 })
  }

  const { participantId, participantName, questionId, answerText } = body
  if (!participantId || !participantName || !questionId || answerText === undefined) {
    return NextResponse.json({ error: '必須フィールドが不足しています' }, { status: 400 })
  }

  // 現在の問題かどうかチェック
  if (room.currentQuestionId && room.currentQuestionId !== questionId) {
    return NextResponse.json({ error: '現在の問題への回答ではありません' }, { status: 400 })
  }

  // 問題データから正誤判定
  const question = questions.find((q) => q.id === questionId)
  if (!question) {
    return NextResponse.json({ error: '問題が見つかりません' }, { status: 404 })
  }

  const isCorrect = checkAnswer(question, answerText)
  const now = new Date()

  const answer: Answer = {
    id: generateAnswerId(),
    questionId,
    participantId,
    participantName,
    answerText,
    isCorrect,
    answeredAt: now,
  }

  const updated = addAnswer(params.id, answer)
  if (!updated) {
    return NextResponse.json({ error: '回答の保存に失敗しました' }, { status: 500 })
  }

  // Pusher で講師に通知
  const event: AnswerSubmittedEvent = {
    participantId,
    participantName,
    questionId,
    answerText,
    isCorrect,
    answeredAt: now.toISOString(),
  }
  await triggerRoomEvent(params.id, 'answer-submitted', event as unknown as Record<string, unknown>)

  return NextResponse.json({ isCorrect, answeredAt: now.toISOString() }, { status: 201 })
}
