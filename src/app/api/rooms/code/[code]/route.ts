import { NextResponse } from 'next/server'
import { getRoomByCode } from '@/lib/room-store'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const room = getRoomByCode(params.code)
  if (!room) {
    return NextResponse.json({ error: 'ルームが見つかりません' }, { status: 404 })
  }
  if (room.status === 'finished') {
    return NextResponse.json({ error: 'このルームは終了しています' }, { status: 410 })
  }

  return NextResponse.json({
    roomId: room.id,
    roomCode: room.code,
    status: room.status,
    participantCount: room.participants.length,
  })
}
