import { NextResponse } from 'next/server'
import { createRoom, getRoomByCode } from '@/lib/room-store'
import {
  generateRoomId,
  generateRoomCode,
  generateAdminKey,
  getTeacherUrl,
} from '@/lib/utils'
import type { RoomState, CreateRoomResponse } from '@/lib/types'

export const runtime = 'nodejs'

export async function POST() {
  try {
    // ルームコードの衝突を避けるため最大10回リトライ
    let code = generateRoomCode()
    for (let i = 0; i < 10; i++) {
      if (!getRoomByCode(code)) break
      code = generateRoomCode()
    }

    const roomId = generateRoomId()
    const adminKey = generateAdminKey()

    const room: RoomState = {
      id: roomId,
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

    createRoom(room)

    const response: CreateRoomResponse = {
      roomId,
      roomCode: code,
      adminKey,
      teacherUrl: getTeacherUrl(roomId, adminKey),
      studentCode: code,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('[POST /api/rooms]', error)
    return NextResponse.json({ error: 'ルームの作成に失敗しました' }, { status: 500 })
  }
}
