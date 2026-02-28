import type { RoomState, Participant, Answer } from '@/lib/types'

// ─────────────────────────────────────────────
// グローバル変数でルーム状態を保持
// Vercel の Node.js Runtime ではウォームインスタンス間で共有される
// ─────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var roomStore: Map<string, RoomState>
  // eslint-disable-next-line no-var
  var roomCodeIndex: Map<string, string>  // code → roomId
}

global.roomStore = global.roomStore ?? new Map<string, RoomState>()
global.roomCodeIndex = global.roomCodeIndex ?? new Map<string, string>()

// ─────────────────────────────────────────────
// CRUD 操作
// ─────────────────────────────────────────────

export function createRoom(room: RoomState): RoomState {
  global.roomStore.set(room.id, room)
  global.roomCodeIndex.set(room.code, room.id)
  console.log(`[RoomStore] Created room: ${room.id}, code: ${room.code}, total rooms: ${global.roomStore.size}`)
  return room
}

export function getRoom(roomId: string): RoomState | undefined {
  const room = global.roomStore.get(roomId)
  console.log(`[RoomStore] Get room: ${roomId}, found: ${room ? 'yes' : 'no'}, total rooms: ${global.roomStore.size}`)
  return room
}

export function getRoomByCode(code: string): RoomState | undefined {
  const roomId = global.roomCodeIndex.get(code.toUpperCase())
  console.log(`[RoomStore] Get room by code: ${code}, roomId: ${roomId || 'not found'}, total rooms: ${global.roomStore.size}`)
  if (!roomId) return undefined
  return global.roomStore.get(roomId)
}

export function updateRoom(roomId: string, updates: Partial<RoomState>): RoomState | null {
  const room = global.roomStore.get(roomId)
  if (!room) return null
  const updated = { ...room, ...updates }
  global.roomStore.set(roomId, updated)
  return updated
}

export function addParticipant(roomId: string, participant: Participant): RoomState | null {
  const room = global.roomStore.get(roomId)
  if (!room) return null
  const updated: RoomState = {
    ...room,
    participants: [...room.participants, participant],
  }
  global.roomStore.set(roomId, updated)
  return updated
}

export function addAnswer(roomId: string, answer: Answer): RoomState | null {
  const room = global.roomStore.get(roomId)
  if (!room) return null
  // 同じ参加者・同じ問題の回答は上書き
  const filtered = room.answers.filter(
    (a) => !(a.participantId === answer.participantId && a.questionId === answer.questionId)
  )
  const updated: RoomState = {
    ...room,
    answers: [...filtered, answer],
  }
  global.roomStore.set(roomId, updated)
  return updated
}

export function deleteRoom(roomId: string): boolean {
  const room = global.roomStore.get(roomId)
  if (!room) return false
  global.roomCodeIndex.delete(room.code)
  global.roomStore.delete(roomId)
  return true
}

export function getAllRooms(): RoomState[] {
  return Array.from(global.roomStore.values())
}

// 古いルームを掃除（1時間以上経過したものを削除）
export function cleanupOldRooms(maxAgeMs = 60 * 60 * 1000): void {
  const now = Date.now()
  for (const [id, room] of global.roomStore.entries()) {
    if (now - room.createdAt.getTime() > maxAgeMs) {
      global.roomCodeIndex.delete(room.code)
      global.roomStore.delete(id)
    }
  }
}
