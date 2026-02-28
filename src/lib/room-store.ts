import { RoomState } from '@/types'

declare global {
  var roomStore: Map<string, RoomState>
}

if (!global.roomStore) {
  global.roomStore = new Map<string, RoomState>()
}

export const roomStore = global.roomStore

export function getRoom(id: string): RoomState | undefined {
  return roomStore.get(id)
}

export function getRoomByCode(code: string): RoomState | undefined {
  const rooms = Array.from(roomStore.values())
  return rooms.find(room => room.code === code)
}

export function setRoom(room: RoomState): void {
  roomStore.set(room.id, room)
}

export function deleteRoom(id: string): void {
  roomStore.delete(id)
}
