import { NextRequest, NextResponse } from 'next/server'
import { getRoom } from '@/lib/room-store'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const key = request.nextUrl.searchParams.get('key')

  const room = getRoom(params.id)
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  // adminKey チェック
  if (room.adminKey !== key) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // adminKey は返さない
  const { adminKey, ...safeRoom } = room

  return NextResponse.json(safeRoom)
}
