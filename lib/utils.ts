import { v4 as uuidv4 } from 'uuid'
import type { Question } from '@/lib/types'

// ─────────────────────────────────────────────
// ID / コード生成
// ─────────────────────────────────────────────

/** UUID v4 を生成（adminKey に使用） */
export function generateAdminKey(): string {
  return uuidv4()
}

/** ルームID（UUID v4） */
export function generateRoomId(): string {
  return uuidv4()
}

/** 6桁大文字英数字のルームコード生成 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 混同しやすい文字を除外
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/** 参加者ID（UUID v4） */
export function generateParticipantId(): string {
  return uuidv4()
}

/** 回答ID（UUID v4） */
export function generateAnswerId(): string {
  return uuidv4()
}

// ─────────────────────────────────────────────
// 回答の正誤判定
// ─────────────────────────────────────────────

/**
 * 回答が正解かどうかを判定する
 * - choice: 選択肢ID（'a','b','c','d'）を完全一致
 * - typing: 大文字小文字・前後空白を無視して比較
 * - sorting: 単語を結合した文字列で比較
 */
export function checkAnswer(
  question: Question,
  answerText: string
): boolean {
  const correct = question.correctAnswer

  switch (question.questionType) {
    case 'choice':
      return answerText.trim().toLowerCase() === correct.trim().toLowerCase()

    case 'typing':
      return (
        answerText.trim().toLowerCase().replace(/\s+/g, ' ') ===
        correct.trim().toLowerCase().replace(/\s+/g, ' ')
      )

    case 'sorting':
      return (
        answerText.trim().toLowerCase().replace(/\s+/g, ' ') ===
        correct.trim().toLowerCase().replace(/\s+/g, ' ')
      )

    default:
      return false
  }
}

// ─────────────────────────────────────────────
// URL ヘルパー
// ─────────────────────────────────────────────

export function getTeacherUrl(roomId: string, adminKey: string, baseUrl = ''): string {
  return `${baseUrl}/teacher/room/${roomId}?key=${adminKey}`
}

export function getStudentUrl(roomCode: string, baseUrl = ''): string {
  return `${baseUrl}/room/${roomCode}`
}

// ─────────────────────────────────────────────
// 型ガード
// ─────────────────────────────────────────────

export function isValidMode(value: unknown): value is 'choice' | 'typing' | 'sorting' {
  return value === 'choice' || value === 'typing' || value === 'sorting'
}
