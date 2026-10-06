// ─────────────────────────────────────────────
// room-store.ts — Supabase + メモリ フォールバック版 (v3)
//
// Supabase が利用可能ならそちらに永続化する。
// 環境変数が未設定または Supabase に到達できない場合は
// メモリストアにフォールバックして動作し続ける。
//
// 必要な環境変数:
//   SUPABASE_URL              (例: https://xxxx.supabase.co)
//   SUPABASE_SERVICE_ROLE_KEY (server-only。クライアントに露出させないこと)
//
// 必要なテーブル定義: docs/supabase-grammar-rooms.sql
// ─────────────────────────────────────────────
import type { RoomState, Participant, Answer } from '@/lib/types'

// ── Supabase が使えるか判定 ──────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const useSupabase = !!(SUPABASE_URL && SERVICE_KEY)

const TABLE = useSupabase ? `${SUPABASE_URL}/rest/v1/grammar_rooms` : ''
const HEADERS: Record<string, string> = useSupabase
  ? {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }
  : {}

// ── メモリストア（フォールバック用） ─────────
declare global {
  // eslint-disable-next-line no-var
  var __grammarRooms: Map<string, RoomState> | undefined
}
function mem(): Map<string, RoomState> {
  if (!global.__grammarRooms) global.__grammarRooms = new Map()
  return global.__grammarRooms
}

// ── Supabase fetch（5秒タイムアウト付き） ────
async function sbFetch(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
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
  if (useSupabase) {
    try {
      const res = await sbFetch(TABLE, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(toRow(room)),
      })
      if (res.ok) {
        const [row] = (await res.json()) as RoomRow[]
        return toState(row)
      }
      console.warn('[room-store] Supabase createRoom failed:', res.status)
    } catch (e) {
      console.warn('[room-store] Supabase unreachable, using memory:', e)
    }
  }
  mem().set(room.id, { ...room })
  return room
}

export async function getRoom(roomId: string): Promise<RoomState | undefined> {
  if (useSupabase) {
    try {
      const res = await sbFetch(`${TABLE}?id=eq.${encodeURIComponent(roomId)}&limit=1`, {
        headers: HEADERS, cache: 'no-store',
      })
      if (res.ok) {
        const rows = (await res.json()) as RoomRow[]
        if (rows[0]) return toState(rows[0])
      }
    } catch { /* fall through to memory */ }
  }
  return mem().get(roomId)
}

export async function getRoomByCode(code: string): Promise<RoomState | undefined> {
  if (useSupabase) {
    try {
      const res = await sbFetch(`${TABLE}?code=eq.${encodeURIComponent(code)}&limit=1`, {
        headers: HEADERS, cache: 'no-store',
      })
      if (res.ok) {
        const rows = (await res.json()) as RoomRow[]
        if (rows[0]) return toState(rows[0])
      }
    } catch { /* fall through to memory */ }
  }
  for (const room of mem().values()) {
    if (room.code === code) return room
  }
  return undefined
}

export async function updateRoom(
  roomId: string,
  updates: Partial<RoomState>
): Promise<RoomState | null> {
  if (useSupabase) {
    try {
      const res = await sbFetch(`${TABLE}?id=eq.${encodeURIComponent(roomId)}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify(updatesToRow(updates)),
      })
      if (res.ok) {
        const rows = (await res.json()) as RoomRow[]
        if (rows[0]) return toState(rows[0])
      }
    } catch { /* fall through to memory */ }
  }
  const store = mem()
  const existing = store.get(roomId)
  if (!existing) return null
  const updated = { ...existing, ...updates }
  store.set(roomId, updated)
  return updated
}

// ── 参加者・回答の追加 ────────────────────────
// participants / answers は1行のJSON列なので、「読む→足す→書く」だと、全員が同時に
// 答えたときに後から書いた人が前の人の分を上書きして消してしまう。
//  1) docs/supabase-grammar-rooms.sql のSQL関数があれば、それでDB側で1回の更新として追加する（確実）
//  2) 関数が無ければ、書いたあとに読み直して確認し、消えていたらやり直す（ほぼ防げるが完全ではない）
const WRITE_RETRIES = 5
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** SQL関数で追加する。関数が未作成(404)などで使えないときは undefined を返す */
async function appendViaRpc(
  fn: 'grammar_room_add_participant' | 'grammar_room_add_answer',
  args: Record<string, unknown>
): Promise<RoomState | null | undefined> {
  if (!useSupabase) return undefined
  try {
    const res = await sbFetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(args),
    })
    if (!res.ok) return undefined
    const data = (await res.json()) as RoomRow[] | RoomRow | null
    const row = Array.isArray(data) ? data[0] : data
    if (!row || !row.id) return null
    return toState(row)
  } catch {
    return undefined
  }
}

/** 読み直して確認しながら追加する（SQL関数が無いとき・メモリモードの代替） */
async function appendWithVerify(
  roomId: string,
  isPresent: (room: RoomState) => boolean,
  buildUpdate: (room: RoomState) => Partial<RoomState>
): Promise<RoomState | null> {
  for (let attempt = 0; attempt < WRITE_RETRIES; attempt++) {
    const room = await getRoom(roomId)
    if (!room) return null
    if (!isPresent(room)) {
      await updateRoom(roomId, buildUpdate(room))
    }
    await sleep(80 + Math.random() * 120)
    const first = await getRoom(roomId)
    if (!first) return null
    if (!isPresent(first)) continue
    await sleep(250 + Math.random() * 150)
    const second = await getRoom(roomId)
    if (!second) return null
    if (isPresent(second)) return second
  }
  return null
}

export async function addParticipant(
  roomId: string,
  participant: Participant
): Promise<RoomState | null> {
  const viaRpc = await appendViaRpc('grammar_room_add_participant', {
    p_room_id: roomId,
    p_participant: participant,
  })
  if (viaRpc !== undefined) return viaRpc
  return appendWithVerify(
    roomId,
    (room) => room.participants.some((p) => p.id === participant.id),
    (room) => ({ participants: [...room.participants, participant] })
  )
}

export async function addAnswer(roomId: string, answer: Answer): Promise<RoomState | null> {
  const viaRpc = await appendViaRpc('grammar_room_add_answer', {
    p_room_id: roomId,
    p_answer: answer,
  })
  if (viaRpc !== undefined) return viaRpc
  return appendWithVerify(
    roomId,
    (room) => room.answers.some((a) => a.id === answer.id),
    (room) => ({
      answers: [
        ...room.answers.filter(
          (a) => !(a.participantId === answer.participantId && a.questionId === answer.questionId)
        ),
        answer,
      ],
    })
  )
}

export async function deleteRoom(roomId: string): Promise<boolean> {
  mem().delete(roomId)
  if (useSupabase) {
    try {
      const res = await sbFetch(`${TABLE}?id=eq.${encodeURIComponent(roomId)}`, {
        method: 'DELETE',
        headers: HEADERS,
      })
      return res.ok
    } catch { return true }
  }
  return true
}

export async function getAllRooms(): Promise<RoomState[]> {
  if (useSupabase) {
    try {
      const res = await sbFetch(TABLE, { headers: HEADERS, cache: 'no-store' })
      if (res.ok) return ((await res.json()) as RoomRow[]).map(toState)
    } catch { /* fall through */ }
  }
  return [...mem().values()]
}

export async function cleanupOldRooms(maxAgeMs = 3 * 60 * 60 * 1000): Promise<void> {
  const cutoff = Date.now() - maxAgeMs
  if (useSupabase) {
    try {
      await sbFetch(`${TABLE}?created_at=lt.${encodeURIComponent(new Date(cutoff).toISOString())}`, {
        method: 'DELETE',
        headers: HEADERS,
      })
    } catch { /* ignore */ }
  }
  for (const [id, room] of mem()) {
    if (room.createdAt.getTime() < cutoff) mem().delete(id)
  }
}
