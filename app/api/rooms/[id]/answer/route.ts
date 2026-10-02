import { NextResponse } from 'next/server'
import { getRoom, addAnswer } from '@/lib/room-store'
import { generateAnswerId, checkAnswer } from '@/lib/utils'
import { triggerRoomEvent } from '@/lib/pusher'
import { questions } from '@/app/data/questions'
import type { Answer, AnswerSubmittedEvent } from '@/lib/types'

export const runtime = 'nodejs'

const MAX_ANSWER_LENGTH = 200

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const room = await getRoom(params.id)
  if (!room) {
    return NextResponse.json({ error: 'ルームが見つかりません' }, { status: 404 })
  }
  if (room.status === 'finished') {
    return NextResponse.json({ error: 'このルームは終了しています' }, { status: 410 })
  }

  let body: {
    participantId?: unknown
    sessionId?: unknown
    questionId?: unknown
    answerText?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 })
  }

  const { participantId, sessionId, questionId, answerText } = body
  if (
    typeof participantId !== 'string' || !participantId ||
    typeof questionId !== 'string' || !questionId ||
    typeof answerText !== 'string'
  ) {
    return NextResponse.json({ error: '必須フィールドが不足しています' }, { status: 400 })
  }
  if (answerText.length > MAX_ANSWER_LENGTH) {
    return NextResponse.json({ error: '回答が長すぎます' }, { status: 400 })
  }

  // ── 本人確認 ────────────────────────────────
  // 参加者IDがこのルームの参加者であること、かつ入室時に本人だけへ渡した
  // sessionId が一致することを確認する（IDだけでは他人になりすませない）。
  const participant = room.participants.find((p) => p.id === participantId)
  if (
    !participant ||
    typeof sessionId !== 'string' ||
    !participant.sessionId ||
    participant.sessionId !== sessionId
  ) {
    return NextResponse.json(
      { error: 'このルームの参加者として確認できませんでした', code: 'not-participant' },
      { status: 403 }
    )
  }

  // 現在出題中の問題かどうかチェック
  if (!room.currentQuestionId || room.currentQuestionId !== questionId) {
    return NextResponse.json(
      { error: '現在の問題への回答ではありません', code: 'not-current' },
      { status: 409 }
    )
  }

  // 正答を表示したあとは受け付けない（答えを見てからの回答を記録しない）
  if (room.showAnswer) {
    return NextResponse.json(
      { error: '正答の表示後は回答できません', code: 'closed' },
      { status: 409 }
    )
  }

  // 1問につき1回だけ（正誤を見てからの答え直しを記録しない）
  const existing = room.answers.find(
    (a) => a.participantId === participantId && a.questionId === questionId
  )
  if (existing) {
    return NextResponse.json(
      {
        error: 'この問題にはすでに回答しています',
        code: 'already-answered',
        isCorrect: existing.isCorrect,
        answerText: existing.answerText,
      },
      { status: 409 }
    )
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
    // 名前はクライアントの申告ではなく、入室時にサーバへ保存したものを使う
    participantName: participant.name,
    answerText,
    isCorrect,
    answeredAt: now,
  }

  const updated = await addAnswer(params.id, answer)
  if (!updated) {
    return NextResponse.json({ error: '回答の保存に失敗しました' }, { status: 500 })
  }

  // Pusher で講師に通知（内容は載せず、講師画面が再取得する）
  const event: AnswerSubmittedEvent = {
    participantId,
    questionId,
    answeredAt: now.toISOString(),
  }
  await triggerRoomEvent(params.id, 'answer-submitted', event as unknown as Record<string, unknown>)

  return NextResponse.json({ isCorrect, answeredAt: now.toISOString() }, { status: 201 })
}
