import { NextResponse } from 'next/server'
import { getRoomByCode } from '@/lib/room-store'
import type { RoomStateResponse } from '@/types'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const code = params.code.trim().toUpperCase()
  const room = getRoomByCode(code)

  if (!room) {
    return NextResponse.json({ error: 'ルームが見つかりません' }, { status: 404 })
  }
  if (room.status === 'finished') {
    return NextResponse.json({ error: 'このルームは終了しています' }, { status: 410 })
  }

  const response: RoomStateResponse = {
    id: room.id,
    code: room.code,
    mode: room.mode,
    currentQuestionId: room.currentQuestionId,
    showAnswer: room.showAnswer,
    showExplanation: room.showExplanation,
    status: room.status,
    participantCount: room.participants.length,
    answerCount: room.answers.length,
  }

  return NextResponse.json(response)
}
