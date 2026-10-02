import { NextRequest, NextResponse } from 'next/server'
import { getRoom } from '@/lib/room-store'
import { getAdminKeyFromRequest, toTeacherView } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 講師画面用：参加者・全員の回答を含むルーム情報。
// 生徒の回答が見えるため、講師の管理キーが必要。adminKey 自体と参加者の sessionId は返さない。
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const room = await getRoom(params.id)

    if (!room) {
      return NextResponse.json(
        { error: 'ルームが見つかりません' },
        { status: 404 }
      )
    }

    const adminKey = getAdminKeyFromRequest(request)
    if (!adminKey || adminKey !== room.adminKey) {
      return NextResponse.json({ error: '管理キーが不正です' }, { status: 403 })
    }

    return NextResponse.json(toTeacherView(room))
  } catch (error) {
    console.error('[GET /api/rooms/[id]/state]', error)
    return NextResponse.json(
      { error: 'ルーム情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}
