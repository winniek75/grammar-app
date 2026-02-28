import { NextResponse } from 'next/server'
import { createRoom } from '@/lib/room-store'
import { generateRoomId, generateAdminKey, generateRoomCode } from '@/lib/utils'
import type { RoomState, CreateRoomResponse } from '@/types'

export const runtime = 'nodejs'

export async function POST() {
  const roomId = generateRoomId()
  const adminKey = generateAdminKey()
  const roomCode = generateRoomCode()

  const room: RoomState = {
    id: roomId,
    code: roomCode,
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

  createRoom(room)

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ''
  const teacherUrl = `${baseUrl}/teacher/room/${roomId}?key=${adminKey}`

  const response: CreateRoomResponse = {
    roomId,
    roomCode,
    adminKey,
    teacherUrl,
    studentCode: roomCode,
  }

  return NextResponse.json(response, { status: 201 })
}
