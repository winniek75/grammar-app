import { NextResponse } from 'next/server'
import { getRoom } from '@/lib/room-store'
import type { RoomStateResponse } from '@/types'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const room = getRoom(params.id)
  if (!room) {
    return NextResponse.json({ error: 'ルームが見つかりません' }, { status: 404 })
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
