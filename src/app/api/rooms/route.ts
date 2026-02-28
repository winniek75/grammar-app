import { NextResponse } from 'next/server'
import { generateAdminKey, generateId, generateRoomCode } from '@/lib/utils'
import { setRoom } from '@/lib/room-store'
import { RoomState } from '@/types'

export async function POST() {
  const id = generateId()
  const code = generateRoomCode()
  const adminKey = generateAdminKey()

  const room: RoomState = {
    id,
    code,
    adminKey,
    mode: 'choice',
    currentQuestionId: null,
    showAnswer: false,
    showExplanation: false,
    status: 'waiting',
    participants: [],
    answers: [],
    createdAt: new Date(),
  }

  setRoom(room)

  return NextResponse.json({
    id,
    code,
    adminKey,
    teacherUrl: `/teacher/room/${id}?key=${adminKey}`,
    studentUrl: `/room/${code}`,
  })
}
