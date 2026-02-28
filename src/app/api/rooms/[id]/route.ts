import { NextRequest, NextResponse } from 'next/server'
import { getRoom } from '@/lib/room-store'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const room = getRoom(params.id)
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }
  // Don't expose adminKey
  const { adminKey: _ak, ...safeRoom } = room
  return NextResponse.json(safeRoom)
}
