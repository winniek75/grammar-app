import { NextRequest, NextResponse } from 'next/server'
import { getRoom, setRoom } from '@/lib/room-store'
import { pusherServer } from '@/lib/pusher'
import { generateId } from '@/lib/utils'
import { Participant } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const room = getRoom(params.id)
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  const { name } = await request.json()
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const participantId = generateId()
  const participant: Participant = {
    id: participantId,
    name: name.trim(),
    sessionId: generateId(),
    joinedAt: new Date(),
  }

  room.participants.push(participant)
  setRoom(room)

  await pusherServer.trigger(`room-${room.id}`, 'participant-joined', {
    participantId: participant.id,
    name: participant.name,
  })

  return NextResponse.json({
    participantId,
    roomId: room.id,
    currentQuestionId: room.currentQuestionId,
    mode: room.mode,
    showAnswer: room.showAnswer,
    status: room.status,
  })
}
