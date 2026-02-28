import { NextResponse } from 'next/server'
import { getRoom, deleteRoom } from '@/lib/room-store'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const room = getRoom(params.id)
  if (!room) {
    return NextResponse.json({ error: 'ルームが見つかりません' }, { status: 404 })
  }

  // adminKey は返さない
  const { adminKey: _adminKey, ...safe } = room
  return NextResponse.json(safe)
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const adminKey =
    req.headers.get('x-admin-key') ??
    new URL(req.url).searchParams.get('key') ??
    undefined

  const room = getRoom(params.id)
  if (!room) {
    return NextResponse.json({ error: 'ルームが見つかりません' }, { status: 404 })
  }
  if (!adminKey || adminKey !== room.adminKey) {
    return NextResponse.json({ error: '管理キーが不正です' }, { status: 403 })
  }

  deleteRoom(params.id)
  return NextResponse.json({ ok: true })
}
