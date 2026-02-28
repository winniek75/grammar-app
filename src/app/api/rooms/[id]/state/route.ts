import { NextResponse } from 'next/server'
import { getRoom } from '@/lib/room-store'

export const runtime = 'nodejs'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const room = getRoom(params.id)
  if (!room) {
    return NextResponse.json({ error: 'ルームが見つかりません' }, { status: 404 })
  }

  // adminKey は返さない（講師も不要）
  const { adminKey: _adminKey, ...safe } = room
  return NextResponse.json(safe)
}
