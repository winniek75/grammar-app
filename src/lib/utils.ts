import { v4 as uuidv4 } from 'uuid'
import { QuestionType } from '@/types'

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function generateAdminKey(): string {
  return uuidv4()
}

export function generateId(): string {
  return uuidv4()
}

export function checkAnswer(
  userAnswer: string,
  correctAnswer: string,
  mode: QuestionType
): boolean {
  if (mode === 'typing') {
    return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
  }
  if (mode === 'choice') {
    return userAnswer === correctAnswer
  }
  if (mode === 'sorting') {
    return userAnswer.trim() === correctAnswer.trim()
  }
  return false
}
