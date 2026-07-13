// ─────────────────────────────────────────────
// room-store.ts — Supabase 永続化版 (v2, 2026-07-10)
//
// 旧実装はグローバル変数(メモリ)保存だったため、Vercel の
// サーバーレス環境ではインスタンス間で共有されず、
// コールドスタートで授業中のルームが消失する問題があった。
// 本実装は Supabase の grammar_rooms テーブルに永続化する。
//
// 必要な環境変数:
//   SUPABASE_URL              (例: https://xxxx.supabase.co)
//   SUPABASE_SERVICE_ROLE_KEY (server-only。クライアントに露出させないこと)
//
// 必要なマイグレーション: migrations/20260710_grammar_rooms.sql
// ─────────────────────────────────────────────
import type { RoomState, Participant, Answer } from '@/lib/types'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TABLE = `${SUPABASE_URL}/rest/v1/grammar_rooms`

const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

// ── row <-> RoomState 変換 ──────────────────
interface RoomRow {
  id: string
  code: string
  admin_key: string
  mode: RoomState['mode']
  current_question_id: string | null
  show_answer: boolean
  show_explanation: boolean
  status: RoomState['status']
  participants: Participant[]
  answers: Answer[]
  created_at: string
}

function toState(r: RoomRow): RoomState {
  return {
    id: r.id,
    code: r.code,
    adminKey: r.admin_key,
    mode: r.mode,
    currentQuestionId: r.current_question_id,
    showAnswer: r.show_answer,
    showExplanation: r.show_explanation,
    status: r.status,
    participants: r.participants ?? [],
    answers: r.answers ?? [],
    createdAt: new Date(r.created_at),
  }
}

function toRow(room: RoomState): Omit<RoomRow, 'created_at'> & { created_at?: string } {
  return {
    id: room.id,
    code: room.code,
    admin_key: room.adminKey,
    mode: room.mode,
    current_question_id: room.currentQuestionId,
    show_answer: room.showAnswer,
    show_explanation: room.showExplanation,
    status: room.status,
    participants: room.participants,
    answers: room.answers,
    created_at: room.createdAt?.toISOString(),
  }
}

function updatesToRow(u: Partial<RoomState>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (u.mode !== undefined) out.mode = u.mode
  if (u.currentQuestionId !== undefined) out.current_question_id = u.currentQuestionId
  if (u.showAnswer !== undefined) out.show_answer = u.showAnswer
  if (u.showExplanation !== undefined) out.show_explanation = u.showExplanation
  if (u.status !== undefined) out.status = u.status
  if (u.participants !== undefined) out.participants = u.participants
  if (u.answers !== undefined) out.answers = u.answers
  return out
}

// ── CRUD ─────────────────────────────────────
export async function createRoom(room: RoomState): Promise<RoomState> {
  const res = await fetch(TABLE, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(toRow(room)),
  })
  if (!res.ok) throw new Error(`createRoom failed: ${res.status} ${await res.text()}`)
  const [row] = (await res.json()) as RoomRow[]
  return toState(row)
}

export async function getRoom(roomId: string): Promise<RoomState | undefined> {
  const res = await fetch(`${TABLE}?id=eq.${encodeURIComponent(roomId)}&limit=1`, {
    headers: HEADERS, cache: 'no-store',
  })
  if (!res.ok) return undefined
  const rows = (await res.json()) as RoomRow[]
  return rows[0] ? toState(rows[0]) : undefined
}

export async function getRoomByCode(code: string): Promise<RoomState | undefined> {
  const res = await fetch(`${TABLE}?code=eq.${encodeURIComponent(code)}&limit=1`, {
    headers: HEADERS, cache: 'no-store',
  })
  if (!res.ok) return undefined
  const rows = (await res.json()) as RoomRow[]
  return rows[0] ? toState(rows[0]) : undefined
}

export async function updateRoom(
  roomId: string,
  updates: Partial<RoomState>
): Promise<RoomState | null> {
  const res = await fetch(`${TABLE}?id=eq.${encodeURIComponent(roomId)}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify(updatesToRow(updates)),
  })
  if (!res.ok) return null
  const rows = (await res.json()) as RoomRow[]
  return rows[0] ? toState(rows[0]) : null
}

export async function addParticipant(
  roomId: string,
  participant: Participant
): Promise<RoomState | null> {
  const room = await getRoom(roomId)
  if (!room) return null
  return updateRoom(roomId, { participants: [...room.participants, participant] })
}

export async function addAnswer(roomId: string, answer: Answer): Promise<RoomState | null> {
  const room = await getRoom(roomId)
  if (!room) return null
  // 同じ参加者・同じ問題の回答は上書き
  const filtered = room.answers.filter(
    (a) => !(a.participantId === answer.participantId && a.questionId === answer.questionId)
  )
  return updateRoom(roomId, { answers: [...filtered, answer] })
}

export async function deleteRoom(roomId: string): Promise<boolean> {
  const res = await fetch(`${TABLE}?id=eq.${encodeURIComponent(roomId)}`, {
    method: 'DELETE',
    headers: HEADERS,
  })
  return res.ok
}

export async function getAllRooms(): Promise<RoomState[]> {
  const res = await fetch(TABLE, { headers: HEADERS, cache: 'no-store' })
  if (!res.ok) return []
  return ((await res.json()) as RoomRow[]).map(toState)
}

// 古いルームを掃除(3時間以上経過したものを削除。授業をまたいでも安全な余裕を確保)
export async function cleanupOldRooms(maxAgeMs = 3 * 60 * 60 * 1000): Promise<void> {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString()
  await fetch(`${TABLE}?created_at=lt.${encodeURIComponent(cutoff)}`, {
    method: 'DELETE',
    headers: HEADERS,
  })
}
