import { NextResponse } from 'next/server'
import { getRoom, addParticipant } from '@/lib/room-store'
import { generateParticipantId } from '@/lib/utils'
import { triggerRoomEvent } from '@/lib/pusher'
import type { Participant, JoinRoomResponse, ParticipantJoinedEvent } from '@/types'

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

  let body: { name?: string; sessionId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 })
  }

  const name = body.name?.trim()
  if (!name || name.length === 0) {
    return NextResponse.json({ error: '名前を入力してください' }, { status: 400 })
  }
  if (name.length > 20) {
    return NextResponse.json({ error: '名前は20文字以内で入力してください' }, { status: 400 })
  }

  const participantId = generateParticipantId()
  const sessionId = body.sessionId ?? generateParticipantId()
  const now = new Date()

  const participant: Participant = {
    id: participantId,
    name,
    sessionId,
    joinedAt: now,
  }

  const updated = addParticipant(params.id, participant)
  if (!updated) {
    return NextResponse.json({ error: '参加者の追加に失敗しました' }, { status: 500 })
  }

  // Pusher で講師に通知
  const event: ParticipantJoinedEvent = {
    participantId,
    participantName: name,
    joinedAt: now.toISOString(),
  }
  await triggerRoomEvent(params.id, 'participant-joined', event as Record<string, unknown>)

  const response: JoinRoomResponse = {
    participantId,
    sessionId,
    roomId: room.id,
    roomCode: room.code,
  }

  return NextResponse.json(response, { status: 201 })
}
