import { v4 as uuidv4 } from 'uuid'
import type { Question } from '@/types'

// ─────────────────────────────────────────────
// ID 生成
// ─────────────────────────────────────────────

export function generateRoomId(): string {
  return uuidv4()
}

export function generateAdminKey(): string {
  return uuidv4()
}

export function generateParticipantId(): string {
  return uuidv4()
}

export function generateAnswerId(): string {
  return uuidv4()
}

// ─────────────────────────────────────────────
// 6桁入室コード生成（大文字英数字）
// ─────────────────────────────────────────────

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 紛らわしい文字を除く
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// ─────────────────────────────────────────────
// 回答の正誤チェック
// ─────────────────────────────────────────────

export function checkAnswer(question: Question, userAnswer: string): boolean {
  const correct = question.correctAnswer

  switch (question.questionType) {
    case 'choice':
      return userAnswer.toLowerCase() === correct.toLowerCase()

    case 'typing':
      return userAnswer.trim().toLowerCase() === correct.trim().toLowerCase()

    case 'sorting': {
      // sortWords を正しい順で並べた文字列と比較
      const userNorm = userAnswer.replace(/\s+/g, ' ').trim().toLowerCase()
      const correctNorm = correct.replace(/\s+/g, ' ').trim().toLowerCase()
      return userNorm === correctNorm
    }

    default:
      return false
  }
}

// ─────────────────────────────────────────────
// バリデーション
// ─────────────────────────────────────────────

export function isValidMode(mode: string): mode is 'choice' | 'typing' | 'sorting' {
  return ['choice', 'typing', 'sorting'].includes(mode)
}

export function isValidGrade(grade: number): grade is 1 | 2 | 3 {
  return [1, 2, 3].includes(grade)
}
