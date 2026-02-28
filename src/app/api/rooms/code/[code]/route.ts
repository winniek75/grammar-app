import { NextRequest, NextResponse } from 'next/server'
import { getRoomByCode } from '@/lib/room-store'

export async function GET(
  _request: NextRequest,
  { params }: { params: { code: string } }
) {
  const room = getRoomByCode(params.code.toUpperCase())
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  const { adminKey: _ak, ...safeRoom } = room
  return NextResponse.json(safeRoom)
}
