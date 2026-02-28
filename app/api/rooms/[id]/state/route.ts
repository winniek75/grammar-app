import { NextRequest, NextResponse } from 'next/server'
import { getRoom } from '@/lib/room-store'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = params.id
    const room = getRoom(roomId)

    if (!room) {
      return NextResponse.json(
        { error: 'ルームが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(room)
  } catch (error) {
    console.error('[GET /api/rooms/[id]/state]', error)
    return NextResponse.json(
      { error: 'ルーム情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}